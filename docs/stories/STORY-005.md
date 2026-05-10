# STORY-005: Core REST API Scaffolding & CRUD Endpoints

**Epic**: EPIC-010
**Persona**: Julia — The Young Author
**Priority**: Must Have
**Story Points**: 5
**Dependencies**: STORY-004

## User Story
As a young author, I want the app to communicate with a fast and secure backend, so that my books, chapters, and assets are saved and retrieved reliably.

## Acceptance Criteria
1. **GIVEN** an authenticated user, **WHEN** they call `GET /api/books`, **THEN** a paginated list of their books (with metadata and spine color) is returned in <500ms P95.
2. **GIVEN** an authenticated user, **WHEN** they call `POST /api/books` with a title and optional summary, **THEN** a new book record is created and returned with its ID.
3. **GIVEN** an authenticated user, **WHEN** they call `GET /api/books/:id/chapters`, **THEN** all chapters for that book are returned in order.
4. **GIVEN** an authenticated user, **WHEN** they call `PUT /api/chapters/:id` with updated content, **THEN** the chapter is updated and a success response is returned.
5. **GIVEN** an unauthenticated or unauthorized request, **WHEN** any protected endpoint is called, **THEN** a `401` or `403` response is returned with a child-friendly error message.
6. **GIVEN** any API request, **WHEN** it contains invalid input (e.g., empty title, oversized payload), **THEN** a `400` response with clear validation messages is returned.

## Related NFRs
- **NFR-PERF-05**: API P95 latency <500ms for standard CRUD operations.
- **NFR-SEC-01**: All endpoints enforce TLS 1.2+.
- **NFR-SEC-04**: Strict input validation and sanitization on all parameters and bodies.
- **NFR-SEC-06**: Rate limiting applied per user (e.g., 100 req/min).
- **NFR-SEC-07**: No third-party scripts injected via API responses.
- **NFR-OBS-04**: All API logs include request ID, hashed user ID, timestamp.

## Technical Notes
- RESTful JSON API (can be GraphQL if team prefers, but REST is safer for mobile caching).
- Standard response envelope: `{ data, error, meta }`.
- Implement global middleware: authentication, rate limiting, request ID injection, structured logging.
- Error messages must be safe for children: avoid stack traces or technical details in client-facing payloads.
- Version the API (`/api/v1/...`) from day one.
- Include OpenAPI/Swagger spec generation for documentation.

## QA Notes
- Load test `GET /api/books` with 10k concurrent users (NFR-SCL-01).
- Verify rate limiting triggers after threshold and returns `429`.
- Test malformed JSON payloads, SQL injection attempts, and XSS payloads — all should be sanitized/rejected.
- Confirm response times via `k6` or `artillery` for P95 <500ms.
- Check that error responses do not leak internal paths or SQL queries.
