# Friendly Operations Desk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign SmartBiz Analyzer into a responsive, approachable Indonesian business workspace and fix the UI defects found during the audit.

**Architecture:** Keep the current route/component boundaries and API contracts. Introduce a shared responsive shell and page-level presentation primitives, then migrate each route to the new visual system while making request states explicit.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, Radix UI, Recharts, Framer Motion

**Spec:** `docs/superpowers/specs/2026-11-25-friendly-operations-desk-design.md`

## Global Constraints

- Preserve all routes and backend request/response shapes.
- Add no runtime dependency.
- Product copy is Indonesian; filenames and raw business values remain unchanged.
- Support 360, 768, 1024, and 1440 pixel widths.
- Respect visible keyboard focus and `prefers-reduced-motion`.

## Review Focus

- API unavailable: each route distinguishes failure from an empty dataset and offers recovery.
- Long filenames and business labels: text wraps or truncates without pushing actions off-screen.
- Mobile keyboard and bottom navigation: fixed controls do not hide editable content.
- Wide data tables: overflow remains inside the table surface and the page does not gain horizontal scroll.
- System theme: the toggle always resolves to the currently displayed theme.

---

### Task 1: Responsive application shell and design tokens

**Files:**
- Modify: `frontend/src/app/globals.css`
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/src/components/layout/Sidebar.tsx`
- Modify: `frontend/src/components/layout/Topbar.tsx`
- Create: `frontend/src/components/layout/MobileNav.tsx`
- Test: `frontend/tests/ui-contracts.test.mjs`

**Interfaces:**
- Produces: responsive desktop navigation, mobile top bar, mobile bottom navigation, shared `.page-shell`, `.page-heading`, and `.surface` styles.

- [ ] Write source-contract tests for mobile navigation, responsive rail visibility, Indonesian labels, focus styles, and reduced motion.
- [ ] Run `node --test frontend/tests/ui-contracts.test.mjs` and verify the new contracts fail.
- [ ] Implement the shell, tokens, navigation, and responsive spacing.
- [ ] Run the contract tests and verify they pass.

### Task 2: Dashboard and reusable data surfaces

**Files:**
- Modify: `frontend/src/app/page.tsx`
- Modify: `frontend/src/components/dashboard/QuickStats.tsx`
- Modify: `frontend/src/components/dashboard/RecentAnalyses.tsx`
- Modify: `frontend/src/components/dashboard/KpiCard.tsx`
- Modify: `frontend/src/hooks/useAnalysis.ts`
- Test: `frontend/tests/ui-contracts.test.mjs`

**Interfaces:**
- Consumes: shell surface and heading styles from Task 1.
- Produces: explicit dashboard retry state and responsive summary layout.

- [ ] Add failing contracts for dashboard error recovery, single-column mobile statistics, and Indonesian copy.
- [ ] Expose dashboard error and `refetch` from `useDashboard()`.
- [ ] Rebuild dashboard hierarchy, loading skeletons, error state, empty state, and recent analysis rows.
- [ ] Run contract tests.

### Task 3: Upload, insights, and explorer routes

**Files:**
- Modify: `frontend/src/app/upload/page.tsx`
- Modify: `frontend/src/components/upload/DropZone.tsx`
- Modify: `frontend/src/app/insights/page.tsx`
- Modify: `frontend/src/app/explorer/page.tsx`
- Modify: `frontend/src/components/analysis/InsightCard.tsx`
- Modify: `frontend/src/components/analysis/RecommendationList.tsx`
- Test: `frontend/tests/ui-contracts.test.mjs`

**Interfaces:**
- Consumes: shell surface styles from Task 1.
- Produces: responsive upload rows, visible query failures, mobile-safe filters/tabs/tables, consistent Indonesian content.

- [ ] Add failing contracts for route-level error states, mobile row stacking, and local table overflow.
- [ ] Implement explicit loading/error/empty states without changing API calls.
- [ ] Make controls and data surfaces responsive and translate interface copy.
- [ ] Run contract tests.

### Task 4: Analysis detail, charts, and chat

**Files:**
- Modify: `frontend/src/app/analysis/[id]/page.tsx`
- Modify: `frontend/src/components/charts/ChartContainer.tsx`
- Modify: `frontend/src/components/analysis/ChatDrawer.tsx`
- Modify: `frontend/src/components/analysis/AnomalyAlert.tsx`
- Test: `frontend/tests/ui-contracts.test.mjs`

**Interfaces:**
- Consumes: shared shell and surface styles.
- Produces: horizontally scrollable analysis tabs, compact responsive headers, full-width mobile chat, safe empty chart/insight/recommendation states.

- [ ] Add failing contracts for scrollable tabs, mobile chat width/offset, and empty result states.
- [ ] Implement the responsive analysis and chat presentation.
- [ ] Run contract tests.

### Task 5: Verification and responsive audit

**Files:**
- Modify if required by findings: files from Tasks 1–4.

**Interfaces:**
- Consumes: completed frontend implementation.
- Produces: buildable application with documented responsive checks.

- [ ] Run `node --test frontend/tests/ui-contracts.test.mjs`.
- [ ] Run `npm run build` in `frontend` and resolve every TypeScript/build error.
- [ ] Start the local app with Webpack and inspect `/`, `/upload`, `/insights`, `/explorer`, and an invalid `/analysis/:id` at 360, 768, 1024, and 1440 widths using the available browser tooling.
- [ ] Check browser console output and fix application errors introduced by the change.
- [ ] Review the implementation against every goal and anti-goal in the spec.

