# Copilot Instructions

You are helping me build a small, opinionated product-engineering artifact to accompany a job application for Light (Smart Financial Platform). The goal isn't to hit real endpoints; it's to demonstrate how I THINK: API ergonomics, workflow-first UX, and taste.

## WHY WE'RE DOING THIS (context & narrative)

- Light says "Retire the ERP" and "software that feels alive." I want to show product-engineer thinking: state machines, cursor pagination, filters/sort syntax, and UX that makes finance feel calm and obvious.
- We're deliberately NOT using a real API key. This is about ergonomics and UX around finance states, not payloads.
- The artifact should make it easy to record a 90s Loom: a quick demo + rationale (cursor > offset, guardrails on transitions, tasteful interactions).

## OUTCOMES (deliverables)

1. **A tiny TypeScript fake SDK (`packages/sdk`)** that mirrors Light API shapes:
   - `accountingDocuments.list({ filter, sort, limit, cursor })` with filter/sort parsing and cursor-based pagination (`"0"` base64 → `"MA=="`).
   - `invoicePayables.create(...)`, `advance(id)`, `setStatus(id, status)` with guarded forward transitions (`DRAFT → SUBMITTED → APPROVED → POSTED → PAID`).
   - Simulated latency + optional failRate; deterministic seeded data; no external network calls or secrets.

2. **A Next.js App Router + Tailwind demo (`apps/demo`)** that consumes the SDK:
   - Left: filter/sort/limit controls + cursor pagination.
   - Right: workflow view for a selected invoice with an "Advance State" button and status chips.
   - Microcopy that explains the accounting consequence of each state (human language, calm tone).

3. **Readmes** that explain the WHY, the tradeoffs (cursor vs offset; totals deprecated), and suggested next steps.

## DESIGN PRINCIPLES

- **Finance as state machine**: transitions have guardrails; UI should prevent invalid moves and explain why.
- **Cursor pagination over offset**: stability, performance, and UX that supports "continue where I left off."
- **Server-close to data, client-close to fingers**: keep interactive bits as client components; initial rendering can be server-oriented (but keep this simple for the demo).
- **Taste over features**: small, cohesive, alive.

## REPO STRUCTURE (pnpm, Node 20+, TS, ESM)

- Root: `package.json`, `pnpm-workspace.yaml`, `.gitignore`, scripts: `"build"`, `"typecheck"`, `"dev:demo"`.
- `packages/sdk`: `src/{types.ts,index.ts,client.ts,utils/latency.ts,pagination.ts,filters.ts,db.ts,modules/{accountingDocuments.ts,invoicePayables.ts}}`, `tsconfig.json`, `package.json`, `README.md`.
- `apps/demo`: Next.js App Router, Tailwind. Files: `app/page.tsx`, `app/globals.css`, Tailwind config, `package.json`, `tsconfig.json`, `README.md`.

## SDK DETAILS

- **Types**: `AccountingDocument` with fields like `status`, `documentType`, `createdAt`, `documentDate`, `businessPartnerName`, `totalTransactionAmountInMajors`, `currency`.
- **Filters**: `field:operator:value` with operators `eq, ne, in, not_in, gt, gte, lt, lte`. Supported fields: `status, createdAt, documentDate, businessPartnerName, totalTransactionAmountInMajors, currency`.
- **Sorting**: `field:direction` (e.g., `totalTransactionAmountInMajors:desc,createdAt:asc`).
- **Pagination**: cursor string encodes numeric start index in base64; `"0"` → `"MA=="`; response has `{ records, hasMore, nextCursor, prevCursor }`. No `offset`. `total` nullable/deprecated.

## DEMO UI DETAILS

- **Left panel**: inputs for `filter`, `sort`, `limit` (20/50/100/200), list of records, Prev/Next using cursors.
- **Right panel**: selected document workflow with chips for `DRAFT/SUBMITTED/APPROVED/POSTED/PAID`, "Advance State" button, and hover tooltips describing accounting consequences (plain language).
- Minimal Tailwind utilities: `.btn`, `.chip`, `.badge`, `.input`, `.select`. Keep it clean and tasteful.

## STATE MACHINE TRANSITIONS

```
DRAFT → SUBMITTED → APPROVED → POSTED → PAID
```

Each transition has accounting consequences:
- **DRAFT**: Document is being prepared; not yet visible to approvers.
- **SUBMITTED**: Ready for review; locked from edits.
- **APPROVED**: Approved for posting; financial commitment confirmed.
- **POSTED**: Recorded in the ledger; affects financial statements.
- **PAID**: Payment completed; cash flow updated.

## ACCEPTANCE CRITERIA

- `pnpm i && pnpm -r build && pnpm --filter apps/demo dev` runs without external network calls.
- `accountingDocuments.list` returns deterministic seeded data; filters/sorts apply; cursors work (Prev/Next consistent).
- `invoicePayables.create/advance/setStatus` enforce forward-only transitions with helpful errors.
- Demo shows initial list + interactive workflow + readable microcopy.
- Code is small, readable, and easy to iterate on in Copilot.

## TECH STACK NOTES

- **ESM modules**: All config files should use `export default` not `module.exports` (project has `"type": "module"`).
- **Next.js App Router**: Use `app/` directory structure, `page.tsx` for routes, `layout.tsx` for layouts.
- **Client Components**: Use `'use client'` directive for interactive components with hooks.
- **Tailwind CSS**: Utility-first styling with `@apply` for reusable component classes in `globals.css`.

## POLISH PASS CHECKLIST (future iterations)

- [ ] Microcopy tweaks (calm, human tone)
- [ ] Subtle animations (transitions, loading states)
- [ ] Guardrail messages (explain why invalid moves are blocked)
- [ ] Accessibility wins (focus states, ARIA labels, keyboard navigation)
- [ ] Role-based view toggles (Accountant | Operator | Founder)
- [ ] SSE/WebSocket for "alive" feel (real-time updates)
