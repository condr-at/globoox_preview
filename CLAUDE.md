# Globoox Preview

## 🎯 Overview
Next.js 16 frontend for Globooks. Modern React reader UI consuming the Nuxt backend API. Supabase auth with shadcn/ui components.

**Tech:** Next.js 16, React 19, TypeScript, Supabase SSR, shadcn/ui, Tailwind, Zustand  
**Backend:** `../` (Nuxt API at https://globooks.onrender.com)

## 🚨 Critical Rules
1. **Never commit `.env.local`** - Contains Supabase secrets
2. **Use server components** - Default to RSC, add 'use client' only when needed
3. **Supabase SSR** - Use `@supabase/ssr` for server-side auth
4. **shadcn/ui** - Components in `components/ui/`, don't modify directly
5. **Backend API** - All data from parent Nuxt API, not direct DB access

## 🚀 Quick Start
```bash
npm install                    # Install deps
# Create .env.local with:
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
npm run dev                    # http://localhost:3000
```

## 🐛 Troubleshooting
| Issue | Fix |
|-------|-----|
| Auth not working | Check env vars, verify callback route |
| Hydration error | Mark component with 'use client' |
| shadcn missing | Run `npx shadcn@latest add <component>` |
| API errors | Verify backend is running, check CORS |

## 📂 Key Structure
```
src/app/           → App router pages
  auth/callback/   → OAuth callback handler
components/ui/     → shadcn/ui components
docs/              → Architecture docs
public/            → Static assets, covers
```

## 📞 Where to Find More
- **API architecture:** `docs/api-architecture.md`
- **Fast start (RU):** `docs/faststart.md`
- **Parent API:** `../BACKEND_API.md`
- **DB schema:** `../supabase/schema.sql`
- **shadcn config:** `components.json`

---

# Tier 2: Contextual Details

## Auth Callback Flow
```typescript
// src/app/auth/callback/route.ts
// Handles OAuth redirect from Supabase
// Exchanges code for session, redirects to app
```

## State Management
- **Zustand** for client state
- **React Query** pattern for server state (if added)
- **Supabase realtime** for live updates (if needed)

## UI Components
- **Radix UI** primitives via shadcn
- **Framer Motion** for animations
- **Lucide** for icons
- **next-themes** for dark mode

## API Integration
All API calls go to parent Nuxt backend:
```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://globooks.onrender.com'

// Books
GET ${API_BASE}/api/books
GET ${API_BASE}/api/books/{id}/chapters

// Chapters
GET ${API_BASE}/api/chapters/{id}/content?lang=XX
POST ${API_BASE}/api/chapters/{id}/translate

// Translation
POST ${API_BASE}/api/translate
POST ${API_BASE}/api/detect-language
```
