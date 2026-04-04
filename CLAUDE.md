# KARYAKARTA Web — Claude Code Rules

## Git
- Branch: main. ALWAYS push to main.
- Push: git add -A && git commit -m "..." && git branch -M main && git push origin main --force
- NEVER create feature branches.

## Stack
- Next.js 15 + TypeScript + Tailwind CSS + Prisma + PostgreSQL
- Font: Inter (Google Fonts)
- UI library: shadcn/ui (only when needed)

## Design
- Dark-first. CSS custom properties in globals.css.
- All colors from CSS variables — NEVER hardcode hex in components.
- Indian number formatting: ₹X,XX,XXX (lakh system).
- Apple-style glass morphism with subtle borders and backdrop-filter.
- Animated canvas art on dashboard module cards.

## TypeScript
- Run `npx tsc --noEmit` before every push.
- Fix ALL TypeScript errors before pushing.
- No `any` types. Use proper interfaces.

## Prisma
- Run `npx prisma generate` after schema changes.
- Run `npx prisma db push` for dev (no migrations yet).
