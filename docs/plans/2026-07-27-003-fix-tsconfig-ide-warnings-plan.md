---
title: Fix TypeScript IDE Warnings - Plan
type: fix
date: '2026-07-27'
topic: tsconfig-ide-warnings
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-brainstorm
execution: code
---

## Goal Capsule

- **Objective:** Eliminate TypeScript IDE diagnostics in the frontend package caused by outdated `tsconfig.json` settings after the Phase 1 TS 5 upgrade — without changing runtime behavior.
- **Product Authority:** User report of two IDE errors (`rootDir` and deprecated `esModuleInterop=false`); Product Contract below.
- **Execution profile:** Smoke-first local verification (`npm run build`); no new tests or deploys.
- **Stop conditions:** Both IDE diagnostics gone; `npm run build` exits 0; no import-style rewrites required. Pause if enabling interop or `moduleResolution: bundler` surfaces new type errors that need source changes beyond config.
- **Tail ownership:** Commit/push only if the user asks; Vercel auto-deploy remains disabled.
- **Open Blockers:** None.

## Product Contract

**Product Contract preservation:** Product Contract unchanged.

### Summary

Modernize the root frontend TypeScript config so the IDE and `npm run build` agree on project layout and module interop. The user chose a proper fix over silencing deprecations with `ignoreDeprecations`.

### Problem Frame

After upgrading to TypeScript 5.8, the IDE surfaces:

1. **Missing `rootDir`** — with `include: ["src"]`, TS expects an explicit `rootDir` (see [TS 6 migration guidance](https://aka.ms/ts6)).
2. **Deprecated `esModuleInterop: false`** — will stop working in TS 7.0; the config still sets the old explicit `false`.

The frontend already uses default imports throughout (`react`, MUI, local components). `allowSyntheticDefaultImports: true` masks the mismatch today, but the setting is inconsistent with Vite/ESM runtime behavior.

### Key Decisions

- **Proper modernization over silence.** Set `rootDir` and flip `esModuleInterop` to `true` rather than adding `"ignoreDeprecations": "6.0"`. (session-settled: user-directed — chosen over minimal ignoreDeprecations path: fixes root cause and aligns with TS 5+ defaults)
- **Frontend root config only.** Touch `tsconfig.json` (and `tsconfig.node.json` only if the same warning class appears there after the root fix). Do not expand into a functions-package audit in this pass. (session-settled: user-directed — chosen over full sweep: scope matches the reported IDE errors)

### Requirements

- R1. Set explicit `rootDir` in root `tsconfig.json` matching the `include` source root (`./src`).
- R2. Enable `esModuleInterop: true` (or remove the deprecated `false` override if the effective default satisfies the IDE).
- R3. Align other compiler options with Vite + TS 5+ conventions where change is zero-risk (e.g. `moduleResolution: "bundler"` if compatible with existing build — planner decides).
- R4. Resolve both reported IDE diagnostics with no new TypeScript errors in `src/`.
- R5. `npm run build` at repo root continues to exit 0.

### Scope Boundaries

**In scope:**

- Root `tsconfig.json`
- `tsconfig.node.json` only if needed for the same warning class on `vite.config.ts`

**Out of scope:**

- `functions/tsconfig.json` audit
- Root ESLint, Prettier, or CI setup
- Changing import style across `src/` (should be unnecessary if interop is enabled)
- Firebase or Vercel deploy changes

### Success Criteria

- Both IDE warnings no longer appear when opening frontend source files.
- `npm run build` passes unchanged from a behavior perspective (same bundle output shape).

## Planning Contract

### Key Technical Decisions

- KTD1. **Set `rootDir` to `./src`.** Matches `include: ["src"]` and anticipates TS 6’s default of `.` (config directory), which would otherwise disagree with a `src/`-only include. (instantiates Product Contract Key Decision: proper modernization; session-settled: user-directed — chosen over ignoreDeprecations)
- KTD2. **Set `esModuleInterop` to `true`.** Aligns with TS 5+/6 defaults and existing default-import usage; leave `allowSyntheticDefaultImports: true` as-is (redundant but harmless). (instantiates Product Contract Key Decision: proper modernization; session-settled: user-directed — chosen over ignoreDeprecations)
- KTD3. **Adopt `moduleResolution: "bundler"` on the root config.** Resolves Deferred-to-Planning item; Vite’s create-vite React-TS template and TS 6 guidance both prefer bundler mode for Vite/`noEmit` apps; `Node`/`node10` is deprecated on the TS 6 path. Zero-risk under R3 because Vite already owns resolution at build time. (planner-resolved from R3)
- KTD4. **Do not add `rootDir` to `tsconfig.node.json` unless the IDE still warns after U1.** `include: ["vite.config.ts"]` sits beside that config; TS’s default `rootDir` of `.` already matches. Touch `tsconfig.node.json` only for the same warning class (Product Contract scope). Optionally set `moduleResolution: "bundler"` there only if editing the file for a real diagnostic — do not open a second modernization pass. (planner-resolved from Deferred-to-Planning)

### Assumptions

- Enabling `esModuleInterop` will not require rewriting imports in `src/` (default imports already dominate; `allowSyntheticDefaultImports` already true).
- Root `npm run build` (`tsc && vite build`) is sufficient proof; no frontend unit-test suite exists.
- `tsconfig.node.json` will likely need no change after the root fix.

### Sequencing

1. U1 — root `tsconfig.json` modernizations (KTD1–KTD3)
2. U2 — conditional `tsconfig.node.json` check + local verification (KTD4, R4–R5)

### Research Notes

- External: Vite create-vite `tsconfig.app.json` uses `moduleResolution: "bundler"`; TS 6 docs deprecate `moduleResolution: node`/`node10` and default `rootDir` to the config directory; `esModuleInterop` defaults to enabled.
- Local: Root config has `esModuleInterop: false`, `moduleResolution: "Node"`, `include: ["src"]`, `noEmit: true`, project reference to `tsconfig.node.json`. Frontend sources already use default imports from `react` and MUI.

## Implementation Units

### U1. Modernize root `tsconfig.json`

- **Goal:** Clear the two reported IDE diagnostics and align resolution with Vite by updating root compiler options only.
- **Requirements:** R1, R2, R3, R4; KTD1, KTD2, KTD3
- **Files:** `tsconfig.json`
- **Approach:** Set `rootDir` to `./src`; set `esModuleInterop` to `true`; change `moduleResolution` from `Node` to `bundler`. Do not alter `include`, `references`, `jsx`, `strict` flags, or `noEmit`. Do not add `ignoreDeprecations`.
- **Test expectation:** none — pure config change; proof is U2 / Verification Contract.
- **Verification:** IDE no longer flags missing `rootDir` or deprecated `esModuleInterop=false` on the root project; `tsc` accepts the updated options.

### U2. Conditional node config + build smoke

- **Goal:** Confirm the frontend typecheck/build still passes and only touch `tsconfig.node.json` if the same warning class remains for `vite.config.ts`.
- **Requirements:** R4, R5; KTD4
- **Files:** `tsconfig.node.json` (conditional), `package.json` (read-only — `build` script)
- **Approach:** After U1, check whether the IDE still reports the same `rootDir` / deprecated-interop class against the node project. If yes, add the minimal fix (`rootDir: "."` and/or interop/`moduleResolution` alignment). If no, leave `tsconfig.node.json` unchanged. Run root `npm run build`.
- **Dependencies:** U1
- **Test expectation:** none — pure config / smoke verification; no feature behavior under test.
- **Verification:** `npm run build` exits 0; no new TypeScript errors under `src/`; `tsconfig.node.json` unchanged unless the same diagnostic class required it.

## Verification Contract

| Gate | Command / check | Applies to | Pass signal |
|---|---|---|---|
| Frontend typecheck + bundle | `npm run build` (repo root) | U1, U2 | Exit 0 |
| IDE diagnostics | Open files under `src/` (and `vite.config.ts` if node config touched) | U1, U2 | No missing-`rootDir` or deprecated-`esModuleInterop=false` diagnostics |
| Scope guard | Diff review | U1, U2 | No `functions/` tsconfig or `src/` import-style edits unless forced by new type errors (stop condition) |

No `release:validate` or behavioral eval — config-only fix; Vercel deploy stays off.

## Definition of Done

**Global**

- [ ] R1–R5 satisfied
- [ ] Both reported IDE warnings gone
- [ ] `npm run build` exits 0
- [ ] Diff limited to root frontend tsconfig file(s); no abandoned experimental options left in the diff
- [ ] No commit/push/deploy unless the user requests it

**Per unit**

- [ ] U1: `rootDir`, `esModuleInterop: true`, and `moduleResolution: "bundler"` present on root `tsconfig.json`
- [ ] U2: Build smoke green; `tsconfig.node.json` touched only if the same warning class required it
