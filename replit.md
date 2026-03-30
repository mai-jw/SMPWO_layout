# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains the "展示カート作成ツール" (Exhibition Cart Creation Tool) as the main artifact.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (api-server)
- **External DB**: Supabase (PostgreSQL + Storage) — used by exhibition-cart frontend
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (for api-server), Vite (for frontend)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (port 8080, /api)
│   └── exhibition-cart/    # React+Vite frontend (port 18263, /)
│       ├── src/
│       │   ├── lib/supabase.ts      # Supabase client + detectCategoryAndLanguage()
│       │   ├── hooks/use-items.ts   # React Query hooks for Supabase items table
│       │   ├── pages/
│       │   │   ├── CartEditor.tsx   # Main cart editor (sidebar + canvas + exports)
│       │   │   ├── ItemsList.tsx    # Gallery view (/gallery)
│       │   │   └── UploadAdmin.tsx  # Image upload admin (/upload)
│       │   └── components/layout/Navbar.tsx
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Exhibition Cart Tool Features

### Pages
- `/` — CartEditor: Main cart layout editor with sidebar + cart canvas + export
- `/gallery` — ItemsList: Gallery view of all uploaded items
- `/upload` — UploadAdmin: Drag-and-drop image upload with auto-detect category/language

### CartEditor Features
- Left sidebar: filter images by すべて / ポスター / 日本語 / 外国語
- Cart canvas: 1 poster slot + 3 shelves × 2 slots = 7 slots total
- Click-to-assign: click sidebar image → click slot to place
- Export buttons: PNG, PDF (A4), Excel (.xlsx) — all client-side
- State: browser useState (no persistence yet)

### Supabase Setup Required
The frontend connects directly to Supabase. The following must be configured:

1. **`items` table** in Supabase:
```sql
create table public.items (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  url text not null,
  category text not null default 'general',
  language text not null default 'other',
  created_at timestamp with time zone default now()
);
```

2. **Storage bucket**: Create `exhibition-images` bucket (Public)

3. **Environment variables** (Replit Secrets):
   - `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
   - (Optionally: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` with same values)

### File naming convention for auto-detect
- `_poster` in filename → category: poster
- `_jp` in filename → language: ja (日本語)
- `_en` in filename → language: en (英語)

## TypeScript & Composite Projects

Every lib package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists lib packages as project references.

- **Always typecheck from root**: `pnpm run typecheck`
- `emitDeclarationOnly` — `.d.ts` files only during typecheck
- Artifact packages are leaf nodes — not in root tsconfig references

## Root Scripts

- `pnpm run build` — typecheck + recursive build
- `pnpm run typecheck` — `tsc --build --emitDeclarationOnly`

## Packages

### `artifacts/exhibition-cart` (`@workspace/exhibition-cart`)
React+Vite frontend. Key deps: `@supabase/supabase-js`, `html2canvas`, `jspdf`, `xlsx`, `react-dropzone`, `framer-motion`, `@tanstack/react-query`, `wouter`.

### `artifacts/api-server` (`@workspace/api-server`)
Express 5 API server. Routes in `src/routes/`. Uses `@workspace/api-zod` for validation.

### `lib/api-spec` (`@workspace/api-spec`)
OpenAPI spec + Orval config. Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/db` (`@workspace/db`)
Drizzle ORM with PostgreSQL. Requires `DATABASE_URL`.
