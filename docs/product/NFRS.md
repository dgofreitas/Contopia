# Estante Digital — Non-Functional Requirements

> Cross-cutting concerns that apply to all epics. Every user story must satisfy relevant NFRs.

---

## 🏎️ Performance

### NFR-PERF-01: Shelf Render Speed
The bookshelf MUST render with all visible spines within 500ms for up to 50 books on a mid-range mobile device (2019+).

### NFR-PERF-02: Reader Content Load
The book reader MUST display the first page of content within 1 second for books up to 50,000 words.

### NFR-PERF-03: Writing Latency
The rich text editor MUST maintain a typing latency below 50ms for documents up to 10,000 words on mobile.

### NFR-PERF-04: Animation Framerate
All animations MUST run at a minimum of 60fps on target devices (mid-range mobile, tablet).

### NFR-PERF-05: API Response Time
Authenticated API endpoints MUST respond with P95 latency below 500ms for standard CRUD operations.

### NFR-PERF-06: Offline Save Speed
Local autosave during offline writing MUST complete within 100ms.

### NFR-PERF-07: Import Processing Time
File import and parsing MUST complete within 60 seconds for files up to 25MB.

---

## 🔒 Security

### NFR-SEC-01: Encryption in Transit
All data in transit MUST use TLS 1.2 or higher. No unencrypted HTTP endpoints.

### NFR-SEC-02: Encryption at Rest
User-generated content (book text, covers, uploads) MUST be encrypted at rest using AES-256 or equivalent.

### NFR-SEC-03: Authentication
Sessions MUST expire after 30 minutes of inactivity. Re-authentication required for destructive actions (account deletion).

### NFR-SEC-04: Input Validation
All user inputs (text, file uploads, API parameters) MUST be validated and sanitized to prevent injection attacks.

### NFR-SEC-05: File Upload Safety
Uploaded images MUST be validated for MIME type, stripped of EXIF data, and capped at 5MB. Executables rejected.

### NFR-SEC-06: Rate Limiting
API endpoints MUST implement rate limiting to prevent abuse (e.g., 100 requests/minute per user).

### NFR-SEC-07: No External Scripts
The reader and writing environments MUST NOT load or execute third-party scripts that could track users or inject content.

### NFR-SEC-08: Dependency Scanning
All dependencies MUST be scanned for known vulnerabilities prior to each release.

---

## 🛡️ Privacy & Compliance

### NFR-PRV-01: COPPA Compliance
The platform MUST comply with the Children's Online Privacy Protection Act (COPPA):
- Parental consent obtained via verified email before account activation.
- Minimal PII collected; no geolocation, no behavioral profiling for ads.
- Parent can access, export, and delete child's data.

### NFR-PRV-02: GDPR / LGPD Compliance
The platform MUST comply with GDPR (EU) and LGPD (Brazil):
- Lawful basis for processing: consent (parent) and contract (service provision).
- Right to access: parent can request all data.
- Right to erasure: parent can delete account; data purged within 30 days.
- Data portability: export in open formats (ZIP with JSON + TXT/EPUB).

### NFR-PRV-03: Data Minimization
Only data strictly necessary for the core product function MUST be collected and retained.

### NFR-PRV-04: No Third-Party Tracking
No advertising identifiers, tracking pixels, or third-party analytics cookies for children.
- Product analytics (if any) MUST be anonymized and aggregate-only.
- Parent dashboard may use essential cookies only.

### NFR-PRV-05: No Marketing to Children
No promotional emails, push notifications, or upsells targeted at child accounts.

### NFR-PRV-06: Audit Logs
Data access and modification events MUST be logged for security and compliance review (retained 12 months).

---

## ♿ Accessibility

### NFR-ACC-01: WCAG 2.1 AA
All core user flows (shelf navigation, reading, writing, cover design) MUST meet WCAG 2.1 Level AA.

### NFR-ACC-02: Keyboard Navigation
All interactive elements MUST be operable via keyboard (Tab, Enter, Escape, Arrow keys).

### NFR-ACC-03: Screen Reader Support
Bookshelf, reader, and editor MUST provide meaningful labels, roles, and state announcements for screen readers.

### NFR-ACC-04: Color Contrast
Text and interactive elements MUST maintain a minimum contrast ratio of 4.5:1 (3:1 for large text/decorative).

### NFR-ACC-05: Reduced Motion
All animations MUST respect `prefers-reduced-motion` and degrade to instant transitions or subtle fades.

### NFR-ACC-06: Font Size
Reader MUST support at least three font sizes (small, medium, large). System font scaling MUST be respected.

### NFR-ACC-07: Language Support
UI MUST support Portuguese (primary) and English (MVP). Additional languages may be added post-MVP.

---

## 🏗️ Scalability

### NFR-SCL-01: Concurrent Users
MVP infrastructure MUST support 10,000 concurrent users without degradation.

### NFR-SCL-02: Book Storage
Users MUST be able to store up to 100 books and 500MB of assets (covers, uploads) without performance loss.

### NFR-SCL-03: Database Growth
Database schema MUST handle 1 million books without query degradation (indexed appropriately).

### NFR-SCL-04: Asset Delivery
Static assets (covers, illustrations, JS/CSS) MUST be served via CDN with edge caching.

---

## 🔌 Availability & Reliability

### NFR-AVL-01: Uptime SLA
Core services (auth, shelf, read, write) MUST maintain 99.5% uptime.

### NFR-AVL-02: Backup & Recovery
Database backups MUST run daily with a Recovery Point Objective (RPO) of <24 hours.

### NFR-AVL-03: Disaster Recovery
In the event of catastrophic failure, service restoration MUST be achievable within 4 hours.

### NFR-AVL-04: Graceful Degradation
If API is unavailable, the client MUST show cached data where possible (offline mode) and friendly error messages (online).

---

## 📊 Observability

### NFR-OBS-01: Error Tracking
All unhandled exceptions MUST be captured in an error tracking system with user impact context.

### NFR-OBS-02: Performance Monitoring
Core Web Vitals and API latencies MUST be monitored with alerting thresholds.

### NFR-OBS-03: Health Checks
All services MUST expose health check endpoints for monitoring and load balancing.

### NFR-OBS-04: Logging
Application logs MUST include request IDs, user IDs (hashed), timestamps, and relevant context for debugging.

---

*Last updated: 2026-05-07*  
*Owner: ProductOwner*
