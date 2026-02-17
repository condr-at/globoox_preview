# Reader: Pagination, Gestures, Progress & Language

## 1) Current State (as per codebase)

| Area | Current Status | Notes |
|---|---|---|
| Page-based layout | No | Currently a long scroll through the entire chapter |
| Drag/swipe page turning | No | No gesture handlers implemented |
| Tap on screen edges | No | Tap zones not implemented |
| Block-level progress (`anchorBlock`) | No | Only chapter + % is saved |
| Server-side progress saving | No | Endpoint missing |
| Language switch without losing block anchor | No | Language changes, but block anchor is not preserved |
| Progressive translation | Yes | `IntersectionObserver` + `POST /translate` |

### Reader UX
- The current reader is a vertically scrolling single-chapter view, not a paginated mode.
- Chapter navigation uses `prev/next` buttons and a TOC.
- No `drag/swipe` gestures for page turning.
- No near-edge tap zones for page turning.

### Data Model & Rendering
- Content arrives as a `ContentBlock[]` array (each block has an `id` and `position`).
- Blocks are rendered sequentially as one long column.
- Pagination (splitting content into viewport-sized pages) is not implemented.

### Progress Saving
- Progress is saved locally only via Zustand (`persist` to local storage).
- Progress format: `bookId -> { chapter, progress%, lastRead }`.
- No block-level reading anchor (`blockId`/`position`) is saved.
- No server-side endpoint for reading position exists.

### Language & Translation
- On language switch, `PATCH /api/books/:id/language` is called (saves `selected_language` for the book).
- Chapter content is then re-fetched for the new language.
- No block-level anchoring is applied during language switch.

### Progressive Translation
- Progressive translation is present in the project:
  - The `useViewportTranslation` hook tracks blocks via `IntersectionObserver`.
  - Visible blocks are batched and sent to `POST /api/chapters/:id/translate`.
  - Translated blocks are merged into `displayBlocks`.
- Note: `GET /content?lang=XX` runs in parallel — the backend contract should be explicitly defined to avoid a dual/conflicting translation strategy.

---

## 2) Gaps vs. Target State

### Frontend work needed
- Page-based chapter layout fitted to the current viewport (replacing the scroll column).
- Page turning:
  - `drag/swipe` left/right (not from the very edge, to avoid conflicts with system gestures).
  - `tap` in near-edge zones for next/prev page.
- Reading position logic based on `anchorBlock`:
  - The anchor is the topmost block on the current page.
  - Saved and restored as the primary source of truth.
- On language switch:
  - Preserve the same `anchorBlock`.
  - Rebuild pages for the new language starting from that anchor.
  - The visual page number may change — this is expected behavior.

### Backend work needed
- Endpoint to read/write reading position (minimum: block anchor).
- Should accept and return not just `blockId`, but also `chapterId` + `blockPosition` (for resilience if `blockId` has changed).

---

## 3) What to Request from Backend

### MVP Minimum
- `PUT /api/books/:bookId/reading-position`
  - Body:
```json
{
  "chapter_id": "ch-...",
  "block_id": "cb-...",
  "block_position": 123,
  "lang": "EN",
  "updated_at_client": "2026-02-17T12:00:00Z"
}
```
- `GET /api/books/:bookId/reading-position`
  - Response:
```json
{
  "book_id": "book-...",
  "chapter_id": "ch-...",
  "block_id": "cb-...",
  "block_position": 123,
  "lang": "EN",
  "updated_at": "2026-02-17T12:00:05Z"
}
```

### Contract Requirements
- `PUT` must be idempotent.
- Last-write-wins by `updated_at`.
- If `block_id` is not found in the current chapter revision: fallback to `block_position` (nearest valid block).
- If no position is saved: return `404` or `null` (to be agreed upon upfront).

### Optional (post-MVP)
- `POST /api/books/:bookId/reading-position/batch` for throttled bulk updates.
- Chapter/block versioning (`content_version`) for reliable restoration after re-import.

---

## 4) Page Numbers: MVP Recommendation

Absolute page numbers (`Page 37 of 412`) are **not recommended for MVP** because:
- Page count depends on language, font, screen size, and safe area insets.
- With progressive/mosaic translation, total page count cannot be computed reliably or cheaply.
- The risk of UX errors outweighs the value at this stage.

**Recommended for MVP:**
- Show chapter + relative progress:
  - `Chapter 3`
  - `Block 128 / 642` (or `%` of blocks in the chapter)
- Add page numbers later, once either:
  - Full chapter translation is available, or
  - Background pre-layout of the full chapter is supported for a given config (lang + font + viewport).

---

## 5) Roadmap to Target State

### Phase 0: Lock Down Contracts (quick)
- Agree on the backend `reading-position` endpoint.
- Agree on the translation source of truth:
  - Either `GET /content?lang` returns the fully localized content,
  - Or the frontend handles lazy translation via `/translate`.
- Eliminate ambiguity in the contract.

### Phase 1: Anchor-First Progress
- Add a client model: `readingPosition[bookId] = { chapterId, blockId, blockPosition, updatedAt }`.
- Update the anchor on every successful page turn (throttled/debounced).
- Sync anchor to backend.
- On reader entry: restore anchor first, then build the page from it.

### Phase 2: Paginator
- Implement `paginateBlocks(blocks, startAnchor, layoutConfig)`:
  - Input: `blocks`, viewport height/width, typography settings.
  - Output: array of pages, each with a `topBlockId` + list of visible blocks/fragments.
- For now, avoid complex text-fragment splitting within a paragraph (if a block doesn't fit, carry it over whole); refine later.

### Phase 3: Gestures & Tap Zones
- Add an interaction layer over the page:
  - Central safe zone for drag/swipe (avoiding system edge zones).
  - Near-edge tap zones for `prev/next`.
- Constraints:
  - Do not intercept gestures inside input fields or menu overlays.
  - Do not break the iOS system back gesture.

### Phase 4: Language Switch Without Losing Position
- Before switching: capture the current `anchorBlock`.
- After receiving/updating blocks for the new language:
  - Find the same `blockId` (or fall back by `position`).
  - Rebuild pages.
  - Open the page where that block is at the top.

### Phase 5: Polish & Observability
- Metrics: page-turn latency, translation queue latency, anchor restore success rate.
- Error logging for `anchor not found` cases.

---

## 6) Risks & Mitigations

- **Risk:** Conflict between two translation strategies (`GET /content?lang` vs. viewport translate).
  **Mitigation:** Single contract + feature flag for the mode.

- **Risk:** Heavy pre-layout cost on large chapters.
  **Mitigation:** Incremental pagination from anchor (windowed) — do not compute the full chapter at once.

- **Risk:** Position jumps when translations arrive asynchronously.
  **Mitigation:** Lock `anchorBlock` as source of truth and rebuild pages deterministically.

---

## 7) Definition of Done

- Reader opens a book at the saved `anchorBlock`.
- Page turning works via drag and tap, without conflicting with system edge gestures.
- On language switch, the user stays at the same logical position (`anchorBlock`), even if the visual page number changes.
- Position is saved to the backend and restored across devices/sessions.
- With partial translation, the reader remains stable with no spurious page numbers.