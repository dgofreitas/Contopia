# Disaster Recovery Playbook

**Contopia** — Recovery procedures for infrastructure and data incidents.

---

## Recovery Time Objectives (RTO) / Recovery Point Objectives (RPO)

| Asset | RTO | RPO | Strategy |
|-------|-----|-----|----------|
| `mongodb_data` volume | 2h | 15min | Volume snapshots + mongodump cron |
| `minio_data` volume | 4h | 1h | Volume snapshots + `mc mirror` |
| nginx config | 30min | N/A | Rebuild from repo (git) |
| Docker images | 15min | N/A | Rebuild from Dockerfiles + registry |

---

## Scenario 1: MongoDB Data Corruption

### Indicators
- Backend health check failing with database errors
- `mongosh` ping returning unexpected results
- `docker compose logs mongodb` showing WiredTiger errors

### Recovery Steps

```bash
# 1. Stop dependent services
docker compose -f docker-compose.yml -f docker-compose.prod.yml stop backend

# 2. Stop MongoDB
docker compose -f docker-compose.yml -f docker-compose.prod.yml stop mongodb

# 3. Identify latest snapshot
#   AWS EBS:  aws ec2 describe-snapshots --filters Name=tag:Volume,Values=contopia_mongodb_data
#   Local:    ls -la /backups/mongodb/

# 4. Restore volume from snapshot (cloud-dependent, example for AWS):
#   aws ec2 create-volume --snapshot-id snap-0abc123 ... --availability-zone us-east-1a
#   Attach volume and restart MongoDB

# Alternative: Restore from mongodump (if no snapshot)
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm \
  -v /backups/mongodb:/backups:ro \
  mongodb \
  mongorestore --uri="mongodb://mongodb:27017" --drop /backups/latest/

# 5. Restart MongoDB
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d mongodb

# 6. Verify recovery
docker compose exec mongodb mongosh --quiet --eval 'db.runCommand("ping")'

# 7. Restart backend
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d backend
```

### Prevention
- Schedule daily mongodump: `0 2 * * * /opt/contopia/scripts/backup-mongodb.sh`
- Enable MongoDB replication (3-node replica set) for HA
- Monitor disk space on `mongodb_data` volume

---

## Scenario 2: MinIO Object Storage Data Loss

### Indicators
- Image uploads returning 404
- MinIO health check failing
- `mc admin info` showing degraded disks

### Recovery Steps

```bash
# 1. Stop MinIO
docker compose -f docker-compose.yml -f docker-compose.prod.yml stop minio

# 2. Restore from volume snapshot (same pattern as MongoDB)
#   Identify snapshot tagged contopia_minio_data

# 3. Alternative: Restore from s3 mirror
mc mirror --overwrite backup-bucket/contopia contopia-bucket/

# 4. Restart MinIO
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d minio

# 5. Verify recovery
docker compose exec minio mc ping local
```

---

## Scenario 3: Full Host Failure (Bare Metal / VM)

### Recovery Steps

```bash
# 1. Provision new host with Docker Engine + Docker Compose
#    See: docs/infrastructure/server-setup.md

# 2. Clone repository
git clone <repo-url> /opt/contopia
cd /opt/contopia

# 3. Restore volumes from backup snapshots
#    (See Scenario 1 and 2 for per-service recovery)

# 4. Copy secrets to new host
#    From Vault or secure backup:
#    - .env (or .env.production)
#    - /etc/docker/secrets/ (if using Docker secrets)

# 5. Start stack
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 6. Verify all services
docker compose ps                     # All services "healthy"
docker compose exec backend wget --spider http://localhost:8000/health
curl -f http://localhost:8088/health  # Should return 200

# 7. Update DNS / load balancer to point to new host
```

---

## Scenario 4: TLS Certificate Expiry

### Indicators
- Browser TLS errors on `https://contopia.com`
- `curl -v https://contopia.com` shows expired certificate

### Recovery Steps

```bash
# If using Let's Encrypt / certbot (standalone):
certbot renew --force-renewal

# If using certbot with nginx plugin:
certbot --nginx -d contopia.com -d www.contopia.com

# Reload nginx
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec nginx nginx -s reload

# Verify
echo | openssl s_client -connect contopia.com:443 2>/dev/null | openssl x509 -noout -dates
```

**Prevention**: Set up `certbot renew` cron (checks twice daily by default when installed via package).

---

## Scenario 5: Redis Cache Failure

### Indicators
- Backend logs showing Redis connection errors
- Performance degradation (cache misses)
- `redis-cli ping` returns error

### Recovery

Redis is a cache — data loss is acceptable. Redis automatically recovers when restarted. No backup/restore needed.

```bash
# Restart Redis
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart redis

# Verify
docker compose exec redis redis-cli ping   # Should return PONG
docker compose restart backend             # Re-establish connections
```

---

## Backup Schedule Reference

| Asset | Method | Frequency | Retention | Script |
|-------|--------|-----------|-----------|--------|
| MongoDB | `mongodump` | Daily @ 2 AM | 7 days | `scripts/backup-mongodb.sh` |
| MinIO | `mc mirror` | Hourly | 30 days | `scripts/backup-minio.sh` |
| Volumes | Filesystem snapshots | Daily | 7 days | Cloud-native (EBS/zfs snap) |
| Configs | Git repository | Continuous | Infinite | `git push` |
| Secrets | HashiCorp Vault | Continuous | Vault-managed | N/A |

---

## Emergency Contacts

| Role | Contact | Escalation (if no response in 15 min) |
|------|---------|--------------------------------------|
| DevOps Lead | TBD | TBD |
| Backend Lead | TBD | TBD |
| DBA | TBD | TBD |
| Cloud Provider Support | TBD | TBD |

---

## Post-Incident Checklist

- [ ] Root cause documented in `docs/incidents/YYYY-MM-DD-incident.md`
- [ ] Monitoring alert tuned to catch this earlier next time
- [ ] Playbook updated if procedures changed
- [ ] Backup schedule verified to contain recent data
- [ ] Team debrief scheduled within 48h
