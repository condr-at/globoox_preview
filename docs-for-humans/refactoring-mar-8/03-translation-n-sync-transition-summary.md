# Translation / Sync Transition Summary (Mar 8)

Этот документ нужен как сводка поверх мар-7 документов:

- что именно уже было доведено;
- что уже можно считать новой базой;
- что еще остается transitional.

## 1. Translation v2

### Финальная модель

- source of truth для готовности блока на языке:
  - наличие target text для `(blockId, lang)`
- `/content?lang=X`
  - snapshot/fallback loader
  - не source of truth для ready-state
- `POST /api/chapters/:id/blocks/text`
  - основной reconcile path
- `POST /translate`
  - stream/push path

### Фронтенд

Сделано:

- Reader не принимает primary решения по голому `block.text`;
- fallback никогда не записывается как target text;
- `blocks/text` используется как reconcile;
- stale `pending -> missing -> retry` path добавлен;
- recovery больше не должен терять missing blocks после stale pending cleanup;
- frontend decision-making сузили до `targetLangReady`.

### Бэкенд

Сделано:

- `blocks/text` и `translate-status` сидят на общем helper;
- stale pending cleanup реализован;
- server-side persist path чище, чем раньше;
- no separate alternative truth для ready-state на сервере.

## 2. Reading position

Сделано:

- exact fragment restore;
- font size change restore;
- Library -> return restore;
- startup restore по local anchor;
- cache restore больше не должен обходить local anchor restore;
- startup path Reader учитывает local `anchor.chapterId`.

Итог:

- reading position теперь хранится и в local persisted store;
- и в cached/server reading-position path;
- restore должен работать и после reload.

## 3. Pagination

Сделано:

- hidden pagination probe был приближен к реальному page root;
- убран вредный post-render rescue, который мутировал fragments на глазах;
- IDB `chapter_layout` cache добавлен;
- Reader использует:
  - memory cache
  - потом IDB layout cache
  - потом fresh hidden pass

Текущее состояние:

- correctness pagination сильно лучше, чем до pass;
- layout reuse уже работает;
- stable prefix + background tail еще не доведены как отдельный этап.

## 4. Offline-like behavior

Важно:

- полноценного offline mode нет;
- но есть `offline-first cache reuse`.

Это означает:

- cached book meta может подняться локально;
- cached chapter content может подняться локально;
- cached chapter layout может подняться локально;
- reading position хранится локально;
- но новая книга/новый перевод без сети не гарантируются.

## 5. Что еще остается transitional

1. compat fields `isTranslated` / `is_pending`
- уже не primary truth;
- но еще живут как compat payload.

2. legacy server endpoints
- `translate-status`
- `content-version`
- `translate-range`

3. old IDB migration layer
- `STORE_CHAPTER_CONTENT_V1`

4. possible old frontend surface in `globoox`
- Nuxt/Vue reader/upload UI
- `epubjs` path

## 6. Что считать новой базой

После этого перехода базой считать:

- Reader + Translation logic живет в `globoox_preview`;
- `Text[blockId, lang]` — truth;
- `blocks/text` — reconcile;
- `translate` — push;
- `targetLangReady` — primary frontend ready flag;
- reading position и layout cache уже интегрированы в новую модель.
