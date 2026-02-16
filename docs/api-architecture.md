# API Architecture: Globoox

## TL;DR (коротко и понятно)

**Что это?** Документ описывает, как приложение работает с данными — книги, главы, контент, переводы.

**Проблема сейчас:** Данные зашиты в JSON-файлы и импортируются напрямую в компоненты. Когда появится реальный сервер — придётся переписывать много кода.

**Решение:** Всё общение с данными идёт через Next.js API Routes (`/api/*`). Сейчас они читают локальные JSON-файлы (`mock-api/`), потом — просто переключаются на реальный сервер. Фронт ничего не знает и не меняется.

**Переводы:** Контент книги — это набор блоков (абзацев). Когда пользователь переключает язык, блоки, которые он читает сейчас, уходят на перевод в первую очередь. По мере скролла — следующие блоки. Если перевод не готов — показывается скелетон, когда готов — появляется текст.

---

## Архитектура

```
┌─────────────────────────────────────────┐
│            UI Components                │
│  (Library, Reader, Store, Profile)      │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│           Custom Hooks                  │
│  useBooks · useChapters                 │
│  useChapterContent · useTranslation     │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│           API Client                    │
│           src/lib/api.ts                │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐  ← единственное место замены
│       Next.js API Routes                │
│       src/app/api/*                     │
└──────┬──────────────────────────────────┘
       │                    │
┌──────▼──────┐    ┌────────▼────────┐
│  mock-api/  │    │  Реальный       │
│  JSON файлы │    │  сервер         │
│  (сейчас)   │    │  (потом)        │
└─────────────┘    └─────────────────┘
```

Чтобы переключиться с mock на реальный сервер — меняется только реализация внутри `/api/*` роутов (или ставится `NEXT_PUBLIC_API_URL`).

---

## API Контракты

### Книги

#### `GET /api/books`
Список всех книг пользователя.

**Query params:** `?status=active|hidden` (опционально)

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "title": "The Venture Mindset",
    "author": "Ilya Strebulaev and Alex Dang",
    "cover_url": "/covers/venture.jpg",
    "original_language": "en",
    "available_languages": ["en", "ru", "es", "fr"],
    "status": "active",
    "created_at": "2025-01-10T12:00:00Z"
  }
]
```

---

#### `GET /api/books/:id`
Одна книга по ID.

**Response:** Тот же объект `ApiBook` (см. выше), или `404`.

---

#### `POST /api/books`
Создать книгу.

**Request body:**
```json
{
  "title": "Book Title",
  "author": "Author Name",
  "cover_url": "/covers/example.jpg",
  "source_language": "en"
}
```

**Response:** Созданный объект `ApiBook`.

---

#### `PATCH /api/books/:id`
Обновить книгу (статус, название, автора).

**Request body** (все поля опциональны):
```json
{
  "status": "hidden",
  "title": "New Title",
  "author": "New Author"
}
```

**Response:** Обновлённый объект `ApiBook`.

---

#### `DELETE /api/books/:id`
Удалить книгу.

**Response:**
```json
{ "success": true }
```

---

### Главы

#### `GET /api/books/:id/chapters`
Список глав книги.

**Response:**
```json
[
  {
    "id": "ch-venture-01",
    "book_id": "550e8400-e29b-41d4-a716-446655440001",
    "index": 1,
    "title": "Introduction: What is Saasbee and why does it matter?",
    "created_at": "2025-01-10T12:00:00Z"
  }
]
```

---

### Контент

#### `GET /api/chapters/:id/content`
Контент главы — массив блоков на запрошенном языке.

**Query params:** `?lang=en` (обязателен, default: `en`)

**Response:** массив блоков, тип определяет форму объекта:

```json
[
  { "id": "cb-001", "position": 0, "type": "heading", "level": 2, "text": "Introduction" },
  { "id": "cb-002", "position": 1, "type": "paragraph", "text": "In November 2012..." },
  { "id": "cb-003", "position": 2, "type": "quote", "text": "Venture is a mindset..." },
  { "id": "cb-004", "position": 3, "type": "list", "ordered": false, "items": ["Item A", "Item B"] },
  { "id": "cb-005", "position": 4, "type": "image", "src": "/img/chart.png", "alt": "Chart", "caption": "Fig. 1" },
  { "id": "cb-006", "position": 5, "type": "hr" }
]
```

**Правило `null`:** применяется только к переводимым полям. Нетекстовые блоки (`image`, `hr`) приходят целиком всегда.

| Тип | Переводимые поля | Значение `null` |
|-----|-----------------|-----------------|
| `paragraph` | `text` | перевод не готов |
| `heading` | `text` | перевод не готов |
| `quote` | `text` | перевод не готов |
| `list` | `items` (весь массив) | перевод не готов |
| `image` | `caption` (опционально) | перевод caption не готов |
| `hr` | — | не применяется |

Фронт обязан обрабатывать `null` в переводимых полях как "контент в процессе" и показывать скелетон.

---

### Перевод

#### `POST /api/chapters/{chapterId}/translate`
Запросить перевод конкретных блоков главы.

**Request body:**
```json
{
  "lang": "fr",
  "blockIds": ["cb-venture-001", "cb-venture-002", "cb-venture-003"]
}
```

**Response:** массив блоков в том же формате, что и `GET /content` — но с возможным `null` в переводимых полях:
```json
[
  { "id": "cb-venture-001", "position": 0, "type": "heading", "level": 1, "text": "Introduction : Qu'est-ce que Saasbee..." },
  { "id": "cb-venture-002", "position": 1, "type": "paragraph", "text": "En novembre 2012..." },
  { "id": "cb-venture-003", "position": 2, "type": "list", "ordered": false, "items": null }
]
```

- Переводимое поле не `null` — перевод готов, рендерим
- Переводимое поле `null` — перевод в процессе, держим скелетон
- `image` и `hr` — возвращаются без изменений (нечего переводить)

Для блоков с `null` клиент ждёт пуша от сервера (WebSocket/SSE).
Если сервер молчит дольше **N секунд** → fallback: повторный `POST /api/chapters/{chapterId}/translate` с теми же blockIds.

---

## Модели данных

### ApiBook
```typescript
interface ApiBook {
  id: string                          // UUID
  title: string
  author: string | null
  cover_url: string | null
  original_language: string | null    // "en", "ru", "fr", etc.
  available_languages: string[]       // языки, для которых есть (хотя бы частичный) кэш переводов
  status: 'active' | 'hidden'
  created_at: string                  // ISO 8601
}
```

### ApiChapter
```typescript
interface ApiChapter {
  id: string          // "ch-venture-01"
  book_id: string     // UUID книги
  index: number       // порядковый номер (1, 2, 3...)
  title: string       // название на языке оригинала
  created_at: string
}
```

### ContentBlock

```typescript
type ContentBlock =
  | ParagraphBlock
  | HeadingBlock
  | QuoteBlock
  | ListBlock
  | ImageBlock
  | HrBlock

interface BaseBlock {
  id: string        // "cb-venture-001"
  position: number  // порядок в главе (0-based)
}

interface ParagraphBlock extends BaseBlock {
  type: 'paragraph'
  text: string | null           // null = перевод не готов
}

interface HeadingBlock extends BaseBlock {
  type: 'heading'
  level: 1 | 2 | 3             // h1, h2, h3
  text: string | null           // null = перевод не готов
}

interface QuoteBlock extends BaseBlock {
  type: 'quote'
  text: string | null           // null = перевод не готов
}

interface ListBlock extends BaseBlock {
  type: 'list'
  ordered: boolean              // true = <ol>, false = <ul>
  items: string[] | null        // null = весь список ещё не переведён
}

interface ImageBlock extends BaseBlock {
  type: 'image'
  src: string                   // URL изображения (не переводится)
  alt: string                   // alt-текст (не переводится)
  caption?: string | null       // undefined = нет подписи; null = перевод caption не готов
}

interface HrBlock extends BaseBlock {
  type: 'hr'                    // разделитель сцены, нет переводимых полей
}
```

### TranslateRequest / TranslateResponse
```typescript
interface TranslateRequest {
  lang: string        // "ru", "es", "fr", "de" — целевой язык
  blockIds: string[]  // ID блоков для перевода
}

// Response — тот же ContentBlock[], что и GET /content
// null в переводимых полях = перевод ещё не готов (pending)
type TranslateResponse = ContentBlock[]
```

---

## Прогрессивный перевод (как это работает)

Ключевой принцип: **фронт всегда говорит беку, какие конкретно блоки переводить**.
Никогда не "переведи всю главу" — только "переведи вот эти ID на вот этот язык".

### Две фазы

#### Фаза 1 — смена языка (с анимацией)

```
Пользователь переключает язык
        ↓
Запускается анимация перевода
        ↓
useTranslation собирает: видимые блоки + блоки следующей "страницы" (lookahead)
        ↓
POST /api/chapters/{chapterId}/translate { lang, blockIds: [...] }
        ↓
Блоки с text != null → появляются сразу (анимация завершается)
Блоки с text == null → держим скелетон, ждём пуш от сервера (WebSocket/SSE)
        ↓ (если сервер молчит N секунд)
Fallback: повторный POST /api/chapters/{chapterId}/translate с теми же blockIds
```

#### Фаза 2 — фоновый перевод по мере чтения (без анимации)

```
Пользователь читает, скроллит вниз
        ↓
IntersectionObserver фиксирует: до конца переведённого контента осталось < THRESHOLD блоков
        ↓
Тихо, без анимации:
POST /api/chapters/{chapterId}/translate { lang, blockIds: [следующая порция] }
        ↓
Блоки с text != null → рендерятся сразу при скролле до них
Блоки с text == null → скелетон до пуша от сервера
```

`THRESHOLD = 10` блоков до края переведённого контента (константа, настраивается).

### Lookahead при смене языка

```
[блок 1] ● видимый       → Фаза 1
[блок 2] ● видимый       → Фаза 1
[блок 3] ○ следующая стр → Фаза 1
[блок 4] ○ следующая стр → Фаза 1
─────────────────────────────────────────
[блок 5]   далеко         → Фаза 2 (фон)
[блок 6]   далеко         → Фаза 2 (фон)
```

`LOOKAHEAD = ~экран вперёд` (в блоках, зависит от контента).

### Хук useTranslation

```typescript
function useTranslation(blocks: ContentBlock[], targetLang: Language) {
  // Состояние: Map<blockId, translatedValue | null>
  // IntersectionObserver следит за видимостью блоков
  //
  // Фаза 1: при смене targetLang — приоритетная очередь (видимые + lookahead)
  // Фаза 2: при приближении к краю переведённого контента — фоновая очередь
  //
  // Батч отправки: каждые 300ms собираем накопленную очередь → POST /api/chapters/{chapterId}/translate

  return {
    getTranslation: (blockId: string) => string | string[] | null,
    registerBlock:  (blockId: string, el: HTMLElement | null) => void
  }
}
```

### ContentBlockRenderer

```tsx
function ContentBlockRenderer({ block, getTranslation, registerBlock }) {
  const ref = useCallback(el => registerBlock(block.id, el), [block.id])

  // hr и image не переводятся — рендерим сразу
  if (block.type === 'hr')    return <hr ref={ref} />
  if (block.type === 'image') return (
    <figure ref={ref}>
      <img src={block.src} alt={block.alt} />
      {block.caption != null && <figcaption>{block.caption}</figcaption>}
    </figure>
  )

  // Переводимые блоки — ждём текст
  const translation = getTranslation(block.id)
  if (translation === null) return <BlockSkeleton type={block.type} ref={ref} />

  switch (block.type) {
    case 'heading':   return <h2 ref={ref}>{translation}</h2>   // h1/h2/h3 по block.level
    case 'paragraph': return <p ref={ref}>{translation}</p>
    case 'quote':     return <blockquote ref={ref}>{translation}</blockquote>
    case 'list':
      const Tag = block.ordered ? 'ol' : 'ul'
      return <Tag ref={ref}>{(translation as string[]).map(item => <li>{item}</li>)}</Tag>
  }
}
```

---

## Mock режим

### Структура Translation Cache

Существующие переводы из `demo-books.json` (ru/es/fr) переупакованы в кэш-файлы,
которые зеркалят то, что будет в кэше реального сервера:

```
src/data/mock-api/
  books.json
  chapters.json
  content/
    ch-venture-01.json    ← контент на языке оригинала (en)
    ch-nexus-01.json
    ch-evolution-01.json
    ch-iran-01.json
  translations/
    ch-venture-01.json    ← переводы по block_id
    ch-nexus-01.json
    ch-evolution-01.json
    ch-iran-01.json
```

Формат `translations/ch-*.json`:
```json
{
  "ru": {
    "cb-venture-001": "Введение: что такое Saasbee...",
    "cb-venture-002": "В ноябре 2012 года..."
  },
  "es": {
    "cb-venture-001": "Introducción: ¿qué es Saasbee?...",
    "cb-venture-002": "En noviembre de 2012..."
  },
  "fr": {
    "cb-venture-001": "Introduction : Qu'est-ce que Saasbee...",
    "cb-venture-002": "En novembre 2012..."
  }
}
```

### Поведение mock `POST /api/chapters/{chapterId}/translate`

1. Смотрит в `translations/ch-{chapterId}.json` по переданному `lang`
2. Для каждого `blockId` из запроса:
   - Есть в кэше → возвращает полный блок с переведённым текстом
   - Нет в кэше → возвращает блок с `null` в переводимых полях; через ~1.5с повторный запрос вернёт фиктивный перевод

### Mock WebSocket

В mock-режиме WebSocket не реализуем — используется только polling-fallback (повторный запрос через N секунд). Этого достаточно для разработки.

---

## Переключение на реальный сервер

**Что нужно изменить:**

1. Установить переменную окружения:
   ```env
   NEXT_PUBLIC_API_URL=https://api.globoox.com
   ```
   Тогда `src/lib/api.ts` будет ходить на реальный сервер напрямую, минуя Next.js Routes.

   **ИЛИ**

2. Изменить реализацию в `src/app/api/*` роутах — вместо чтения JSON файлов делать `fetch` к реальному серверу. Полезно, если нужна авторизация на сервере или трансформация данных.

**Что НЕ меняется:**
- Все хуки (`useBooks`, `useChapters`, `useChapterContent`, `useTranslation`)
- Все компоненты (`Library`, `Reader`, `ContentBlockRenderer`)
- Контракты API (форматы запросов и ответов)
- Zustand store (прогресс чтения, настройки)

---

## Файлы проекта

### Существующие (изменить)
| Файл | Что изменить |
|------|-------------|
| `src/lib/api.ts` | Добавить: `fetchChapters`, `fetchContent`, `translateBlocks` |
| `src/app/library/page.tsx` | Убрать `import demoBooks`, использовать `useBooks()` |
| `src/app/reader/[id]/page.tsx` | Переключить на `useChapters` + `useChapterContent` |
| `src/components/Reader/ReaderView.tsx` | Рендер `ContentBlock[]` + `useTranslation` |

### Создать (Next.js API Routes)
| Файл | Назначение |
|------|-----------|
| `src/app/api/books/route.ts` | GET (список) + POST (создать) |
| `src/app/api/books/[id]/route.ts` | GET + PATCH + DELETE |
| `src/app/api/books/[id]/chapters/route.ts` | GET главы книги |
| `src/app/api/chapters/[id]/content/route.ts` | GET контент главы |
| `src/app/api/chapters/[id]/translate/route.ts` | POST перевод блоков (lang + blockIds) |

### Создать (Хуки)
| Файл | Назначение |
|------|-----------|
| `src/lib/hooks/useChapters.ts` | Список глав по bookId |
| `src/lib/hooks/useChapterContent.ts` | Контент главы по chapterId |
| `src/lib/hooks/useTranslation.ts` | Прогрессивный перевод блоков |

### Создать (Компоненты)
| Файл | Назначение |
|------|-----------|
| `src/components/Reader/ContentBlockRenderer.tsx` | Рендер одного блока (текст или скелетон) |

### Создать (Mock данные)
| Файл | Назначение |
|------|-----------|
| `src/data/mock-api/translations/ch-venture-01.json` | Кэш переводов главы |
| `src/data/mock-api/translations/ch-nexus-01.json` | Кэш переводов главы |
| `src/data/mock-api/translations/ch-evolution-01.json` | Кэш переводов главы |
| `src/data/mock-api/translations/ch-iran-01.json` | Кэш переводов главы |
