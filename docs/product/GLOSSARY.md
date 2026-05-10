# Estante Digital — Domain Glossary

> All members of the product and engineering teams should use these terms consistently.

---

## 📚 Product Terms

| Term | Definition |
|------|------------|
| **Bookshelf (Estante)** | The primary visual interface where books are displayed as spines on horizontal shelves. The main navigation and emotional anchor of the product. |
| **Book (Livro)** | A digital item containing text content (chapters), metadata (title, author, summary), and visual assets (cover, spine, edge). Can be original (written in-app) or imported. |
| **Spine (Lombada)** | The visual representation of a book on the shelf — typically a vertical rectangle showing color, title, and optional favorite indicator. |
| **Cover (Capa)** | The front face of the book, displayed when a book is pulled from the shelf. Contains title, author, artwork, and optional summary. |
| **Edge (Corte)** | The decorative visible edge of a book when pulled out from the shelf. Optional design element. |
| **Shelf Sorting (Organização)** | The method by which books are arranged on the shelf: Alphabetical, Favorites First, or Recently Read. |
| **Favorite (Favorito)** | A user-marked status on a book, indicated by a heart or star, affecting shelf sorting and visual treatment. |
| **Draft (Rascunho)** | A book that is being written but not yet published to the bookshelf. Only visible in the writing list. |
| **Published (Publicado)** | A book that appears on the main bookshelf. Irreversible (or requires explicit unpublish). |
| **Reader (Leitor)** | The full-screen immersive interface for reading a book's content. |
| **Writing (Escrita)** | The book creation and editing interface, including chapter management and rich text editing. |
| **Cover Designer (Designer de Capa)** | The tool for creating or uploading cover, spine, and edge visuals for a book. |
| **Import (Importação)** | The process of bringing an external file (TXT, PDF, EPUB) into the platform as a book. |
| **Summary (Resumo)** | An optional short description of a book, displayed on the cover view before reading. |

---

## 👥 User Terms

| Term | Definition |
|------|------------|
| **Child Account (Conta da Criança)** | The primary user account for the child (e.g., Julia). Used for writing, reading, and organizing. |
| **Parent Account (Conta do Responsável)** | The linked adult account (e.g., Mãe da Julia) used for safety controls, data export, and account management. |
| **Parent Dashboard (Painel do Responsável)** | A secure view where parents see aggregated activity, export data, and manage privacy settings. |
| **Session (Sessão)** | A logged-in period of app usage. Times out after 30 minutes of inactivity. |

---

## 🏗️ Technical Terms

| Term | Definition |
|------|------------|
| **Asset** | Any uploaded or generated image file used for a book's cover, spine, edge, or illustration. |
| **PWA (Progressive Web App)** | The planned deployment model: a web app installable on mobile devices with offline support via Service Workers. |
| **Service Worker** | A browser script that enables offline caching, background sync, and app-like behavior. |
| **IndexedDB** | A browser-based structured data store used for offline book content and progress. |
| **CDN (Content Delivery Network)** | Used to serve static assets (covers, JS, CSS) quickly from edge locations. |
| **COPPA** | Children's Online Privacy Protection Act (US). Requires parental consent and data minimization for users under 13. |
| **GDPR** | General Data Protection Regulation (EU). Grants rights to data access, portability, and erasure. |
| **LGPD** | Lei Geral de Proteção de Dados (Brazil). Similar to GDPR; applies to Brazilian users. |
| **WCAG 2.1 AA** | Web Content Accessibility Guidelines Level AA. The minimum accessibility standard for all core flows. |
| **OWASP Top 10** | Standard taxonomy of the most critical web application security risks. |

---

## 🗂️ Process Terms

| Term | Definition |
|------|------------|
| **MVP** | Minimum Viable Product — the first releasable version proving core value (Q2 2026). |
| **Epic** | A large body of work that can be broken down into user stories. Documented in `EPIC-XXX.md`. |
| **Story** | A granular, implementable work item derived from an epic. Documented in `STORY-XXX.md`. |
| **JTBD** | Jobs-To-Be-Done — a framework describing user motivations: "When I [situation], I want to [motivation], so I can [outcome]." |
| **MoSCoW** | Prioritization framework: Must Have, Should Have, Could Have, Won't Have. |
| **OKR** | Objectives and Key Results — measurable goals used to align the team. |

---

*Last updated: 2026-05-07*  
*Owner: ProductOwner*
