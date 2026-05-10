# STORY-004: Core Data Model & Database Migrations

**Epic**: EPIC-010
**Persona**: Julia — The Young Author
**Priority**: Must Have
**Story Points**: 5
**Dependencies**: STORY-003

## User Story
As a young author, I want my books, chapters, and progress to be stored reliably in a structured way, so that the platform can scale and my data is safe.

## Acceptance Criteria
1. **GIVEN** a new database schema, **WHEN** migrations are applied, **THEN** tables for `users`, `books`, `chapters`, `assets`, `reading_progress`, and `activity_logs` are created with proper indexes and relationships.
2. **GIVEN** the schema design, **WHEN** reviewed, **THEN** it enforces foreign keys, cascading deletes where appropriate, and constraints (e.g., `books.status` enum: `draft`, `published`).
3. **GIVEN** a book record, **WHEN** queried by user ID, **THEN** the query returns all related chapters and assets in <100ms for up to 50 books (NFR-PERF-05).
4. **GIVEN** the `users` table, **WHEN** a parent account is created, **THEN** a `parent_id` or inverse relationship links child to parent with no orphan records.
5. **GIVEN** a migration rollback script, **WHEN** executed, **THEN** all tables are dropped cleanly without affecting other environments.

## Related NFRs
- **NFR-PERF-05**: API/database query P95 <500ms; shelf load query <100ms.
- **NFR-SCL-02**: Schema supports up to 100 books and 500MB assets per user.
- **NFR-SCL-03**: Database handles 1 million books without query degradation (indexed).
- **NFR-PRV-03**: Data minimization — no fields beyond functional necessity.
- **NFR-AVL-02**: Migrations are versioned and reversible for daily backup integrity.

## Technical Notes
- Use PostgreSQL (or equivalent relational DB). Define schema with an ORM (e.g., Prisma, Django ORM, SQLAlchemy) that generates migration files.
- Key relationships: `users` 1:N `books`; `books` 1:N `chapters`; `books` 1:N `assets`; `users` 1:N `reading_progress`.
- `assets` table stores: `url`, `type` (`cover`, `spine`, `edge`, `upload`), `mime_type`, `size_bytes`, `uploaded_at`.
- `reading_progress` table stores: `book_id`, `last_chapter_id`, `last_position`, `percentage`, `updated_at`.
- Enforce `ON DELETE CASCADE` on chapters/assets when a book is deleted; soft-delete users for GDPR/LGPD compliance.
- Add indexes on: `books.user_id`, `chapters.book_id`, `assets.book_id`, `reading_progress.user_id`.

## QA Notes
- Verify migrations run cleanly in dev, staging, and prod-like environments.
- Run `EXPLAIN ANALYZE` on typical shelf query and confirm <100ms.
- Test foreign key constraints (attempt to insert orphan chapter → should fail).
- Verify rollback script in a disposable database instance.
- Check that no PII beyond first name and parent email exists in schema.
