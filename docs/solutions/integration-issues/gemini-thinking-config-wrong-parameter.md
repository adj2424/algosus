---
title: Gemini 3.x thinking cannot be disabled with thinkingBudget
date: 2026-07-28
category: integration-issues
module: functions/src/buy.ts
problem_type: integration_issue
component: tooling
symptoms:
  - "Code review flagged thinkingConfig: { thinkingBudget: 0 } as likely to fail generateContent calls on gemini-3.6-flash"
  - "thinkingBudget is a Gemini 2.5-era parameter silently inapplicable to Gemini 3.x thinking control"
root_cause: wrong_api
resolution_type: code_fix
severity: medium
tags: [gemini, google-genai, thinking-config, llm-integration, api-migration]
---

# Gemini 3.x thinking cannot be disabled with thinkingBudget

## Problem

While migrating `functions/src/buy.ts` from OpenAI to Gemini (`@google/genai`), the initial implementation set `thinkingConfig: { thinkingBudget: 0 }` to minimize latency/cost on the default model `gemini-3.6-flash`, by direct analogy with OpenAI's old `max_output_tokens`/`store` style config object. This looked reasonable but targets the wrong API generation for the model in use.

## Symptoms

- A code-review pass (bugbot persona) flagged the parameter as likely to break the weekly scheduled buy: "Gemini 3.x models use `thinkingLevel` ... and do not support fully turning reasoning off via `thinkingBudget: 0`."
- No runtime symptom was observed directly (caught pre-deploy in review), but the risk was `generateContent` either erroring or defaulting to full thinking, potentially exhausting `maxOutputTokens: 512` on reasoning tokens before ever emitting the ticker list.

## What Didn't Work

- Assuming `thinkingBudget` (an integer 0/-1/N token budget) is the universal Gemini thinking-control knob across model generations. It is real and typed in the SDK (`ThinkingConfig.thinkingBudget`), so it type-checks and looks correct — but it is the **Gemini 2.5** control surface, not the Gemini 3.x one.

## Solution

Read the installed SDK's own type declarations to confirm both fields exist, then check Google's current docs for which one the target model expects:

```bash
# functions/node_modules/@google/genai/dist/genai.d.ts
Select-String -Path "genai.d.ts" -Pattern "Thinking"
```

This surfaced `ThinkingConfig.thinkingLevel?: ThinkingLevel` alongside `thinkingBudget?: number`, and a separate `export declare enum ThinkingLevel { MINIMAL, LOW, MEDIUM, HIGH }`. Cross-checked against [ai.google.dev thinking docs](https://ai.google.dev/gemini-api/docs/generate-content/thinking): Gemini 3.x models (including `gemini-3.6-flash`) use `thinkingLevel`; Gemini 2.5 models use `thinkingBudget` and don't support `thinkingLevel` at all. Gemini 3 Flash cannot fully disable thinking — `minimal` is the closest approximation, not a true zero.

Fixed call site:

```typescript
import { ThinkingLevel } from '@google/genai';

const res = await Gemini.models.generateContent({
  model: GeminiModel,
  contents: STOCK_PICK_PROMPT,
  config: {
    temperature: 0.8,
    maxOutputTokens: 512,
    thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL }
  }
});
```

(Previously: `thinkingConfig: { thinkingBudget: 0 }`.)

## Why This Works

`thinkingBudget` and `thinkingLevel` are two generations of the same feature, not interchangeable settings within one config object — the SDK exposes both fields on `ThinkingConfig` because it serves multiple model families simultaneously, but a given model only honors the field matching its own generation. Passing the wrong one is not caught by TypeScript (both are valid, typed, optional fields on the same interface) and may not error at the API layer either; it can silently no-op, leaving the model on its default thinking level (`medium` for `gemini-3.6-flash`) rather than the intended low-latency setting.

## Prevention

- When wiring generation-config parameters for a specific Gemini model, verify the parameter against **that model's** current docs page, not just against the SDK's TypeScript types — the SDK's config surface is a superset across model generations, so type-correctness does not imply model-applicability.
- For `@google/genai`, prefer `thinkingLevel` for any `gemini-3.x`+ model; reserve `thinkingBudget` for `gemini-2.5-*` models only.
- Do not assume a "disable" setting exists — Gemini 3 Flash and Flash-Lite cannot fully disable thinking; `ThinkingLevel.MINIMAL` is the closest approximation, and product logic downstream of the response (e.g. `maxOutputTokens` budgeting) should account for some residual thinking-token consumption even at `minimal`.

## Related Issues

- Introduced and fixed in the same session as `docs/plans/2026-07-28-001-feat-gemini-stock-picks-plan.md` (OpenAI → Gemini pivot for `scheduleBuy`).
