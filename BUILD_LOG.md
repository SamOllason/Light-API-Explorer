# Build Log — Design Decisions & Rationale

> Documentation of key architectural and UX decisions made while building the Close Readiness Radar.

---

## 1. Why Cursor Pagination Over Offset?

**Decision:** Implemented `nextCursor`/`prevCursor` tokens instead of `?page=2` style pagination.

**Rationale:**
- **Stability**: Offset breaks when records are inserted/deleted mid-session
  - Example: User on page 2 (offset=20), 5 new invoices created → sees duplicates or skips items
  - Cursor anchors to specific record → always consistent
  
- **Performance**: No expensive `COUNT(*)` queries for total count
  - At scale (millions of records), counting is slow
  - "Has more?" boolean is sufficient for UX
  
- **Honest UX**: "More results available" vs. misleading "Page 1 of 47"
  - Total changes as you paginate (new records, deletions)
  - Better to show `hasMore` than false precision

**Trade-off:** Can't jump to arbitrary page (no "Go to page 10"). Acceptable for most finance workflows where users scan chronologically.

---

## 2. Why Forward-Only State Machines?

**Decision:** Invoice states only advance forward (INIT → SUBMITTED → APPROVED → PAID). No backwards transitions.

**Rationale:**
- **Audit requirements**: Finance regulations require immutable records
  - Once approved, can't "unapprove" without creating a reversal entry
  - Trail must be clear for auditors
  
- **Prevents errors**: Backwards transitions create accounting inconsistencies
  - Example: Marking invoice "DRAFT" after it's posted → breaks GL integrity
  
- **Clear workflows**: Users know the flow is always forward
  - Reduces training time, prevents mistakes

**Trade-off:** If user needs to "undo," must use compensating actions (credit notes, cancellations). This matches real accounting practice.

---

## 3. Why Mock AI Assistant Instead of Real ML?

**Decision:** Built rule-based contextual suggestions instead of calling real AI API.

**Rationale:**
- **Demonstrates thinking**: Shows product vision without ML infrastructure
  - "I noticed 2 AR drafts..." is rule-based but feels intelligent
  
- **Predictable behavior**: Rule-based = deterministic for demo
  - Real ML might suggest wrong things → confuses reviewers
  
- **Architecture for future**: Interface is ready for real ML
  - Swap rules for `POST /ai/suggest` call later
  
- **Faster to build**: No need to train models or prompt-engineer

**Trade-off:** Less impressive than GPT-powered chat. BUT: Shows I understand AI-native product design without over-engineering a demo.

---

## 4. Why "Explain Posting" Feature?

**Decision:** Added side panel showing GL line → Invoice → Product defaults trail.

**Rationale:**
- **Finance literacy gap**: Most engineers (and many finance team members) don't understand where postings come from
  
- **Debugging tool**: When numbers don't match, users need to trace back
  - "Why did this post to account 4000 instead of 5000?"
  - Answer: Product default overrode invoice line entry
  
- **Training value**: New employees learn system faster
  - See actual examples of "invoice line → GL posting" flow
  
- **Differentiator**: Shows I understand accounting mechanics
  - Rare for engineering candidates to grasp double-entry

**Trade-off:** Adds UI complexity. But: Valuable for finance teams, shows product thinking beyond CRUD.

---

## 5. Why Readiness Scoring Model?

**Decision:** Used penalty system (start at 100, subtract per blocker) instead of complex algorithm.

**Formula:**
```
score = 100 
  - (arDraftCount × 30)
  - (apInitCount × 25)
  - (cardUnclassCount × 15)
  - (fxFlagCount × 20)
```

**Rationale:**
- **Simple to explain**: Finance teams understand "each draft costs 30 points"
  
- **Configurable weights**: Easy to adjust penalties per company policy
  - Some companies care more about FX, others about AR
  
- **Visual feedback**: 0-100 scale maps naturally to progress bar
  
- **Prioritization**: High penalties → users fix those blockers first

**Trade-off:** Oversimplifies (e.g., doesn't account for invoice amounts). BUT: Good enough for MVP, easy to enhance later with weighted amounts.

---

## 6. Why In-Memory State Instead of Database?

**Decision:** MockLightClient stores fixtures in memory, mutations aren't persisted.

**Rationale:**
- **Speed of iteration**: No DB setup, migrations, or connection management
  
- **Deterministic**: Every refresh = clean state, easy to demo
  
- **Portable**: Works anywhere Node.js runs, no external dependencies
  
- **Focus on UX**: Spent time on interactions, not DB schema

**Trade-off:** Refresh = lose data. BUT: This is a demo, not production. Real HttpLightClient would persist server-side.

---

## 7. Why Rule-Based AI Suggestions?

**Examples:**
- "I noticed 2 AR drafts. Want me to open them?"
- "FX revaluation last run: 3 days ago. Revalue now?"
- "Tip: I learn from your workflow patterns"

**Logic:**
```typescript
if (arInvoices.length > 0) {
  suggest("Open all AR drafts?", onOpenAll);
}
if (fxFlags.length > 0 && daysSinceRevaluation > 2) {
  suggest("Revalue FX now?", onRevalue);
}
```

**Rationale:**
- **Contextual**: Suggestions only appear when relevant
  - No spam, no generic prompts
  
- **Actionable**: Every suggestion has a button → immediate action
  
- **Learning hint**: "I learn from your patterns" → implies future ML
  
- **Low-effort, high-impact**: Simple rules feel smart

**Trade-off:** Not true AI, just conditionals. BUT: Shows product thinking without over-engineering.

---

## 8. Why Professional Enterprise UX Over "Fun" Design?

**Decision:** Clean, data-dense tables. No playful illustrations or gamification.

**Rationale:**
- **Audience**: CFOs, controllers, accountants → need information density
  - Not consumer app users who want delightful animations
  
- **Credibility**: Finance software = trust, accuracy, speed
  - Overly playful design undermines credibility
  
- **Light's brand**: Reviewed Light.inc website → clean, professional
  - Spotify/Klarna designers (from job req) = consumer-grade but serious
  
- **Data first**: Finance users scan lots of data fast
  - Big colorful cards slow them down

**Trade-off:** Less "fun" than consumer apps. BUT: Matches Light's actual product aesthetic and user needs.

---

## 9. Why Mock SDK Package Instead of Inline Data?

**Decision:** Created `packages/mock-sdk/` as separate package with types, fixtures, client.

**Rationale:**
- **Reusability**: Demo app + test suites can both use MockLightClient
  
- **Type safety**: Shared TypeScript interfaces ensure consistency
  - `InvoiceReceivable` type used in SDK, API routes, and UI
  
- **Real-world structure**: Mimics how actual SDK would be packaged
  - Shows I understand monorepo patterns, workspace deps
  
- **Easy swap**: Change one import to switch from mock → real HTTP client
  ```ts
  // clientFactory.ts
  if (useMock) return new MockLightClient();
  else return new HttpLightClient();
  ```

**Trade-off:** More files, more boilerplate. BUT: Cleaner architecture, easier to extend.

---

## 10. Why Inline Actions Over Modal Forms?

**Decision:** Blockers drawer has "Open" / "Approve" / "Classify" buttons inline, not "View Details" → modal → form → submit.

**Rationale:**
- **Speed**: Fewer clicks = faster workflows
  - Finance teams process dozens of invoices daily
  
- **Context**: User sees invoice details + action button together
  - No context switching between screens
  
- **Modern UX**: Linear, Notion, Slack use inline actions everywhere
  - Light's designers (ex-Spotify/Klarna) would expect this
  
- **Feels alive**: Immediate feedback (optimistic updates, score recalculates)

**Trade-off:** Less space for complex forms. BUT: Most close-readiness actions are simple (approve, open, classify).

---

## Key Learnings

1. **Finance UX ≠ Consumer UX**: Data density and speed matter more than delight
2. **Mocked AI can feel real**: Rule-based suggestions + good microcopy = intelligent feel
3. **Audit trails matter**: Immutable records, forward-only states, explain posting
4. **Simple scoring works**: Don't over-engineer algorithms for MVP
5. **Architecture for swap**: Mock SDK → Real HTTP client should be one-line change

---

## What I'd Measure in Production

- **Time to close**: Baseline (current) vs. with Close Readiness Radar
- **Blocker resolution rate**: % of users who fix blockers inline vs. in separate tools
- **AI suggestion acceptance**: Which suggestions users click vs. ignore
- **Explain Posting usage**: Do users click? Do they understand better after?
- **Score accuracy**: Do 90+ scores actually mean "close-ready"? Adjust weights.

---

*Last updated: Jan 10, 2026*
