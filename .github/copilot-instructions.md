# ReceiptsGen Workspace Instructions

This repository builds a React + TypeScript web app that:
- accepts `.xlsx` and `.csv` files,
- maps each row to a receipt,
- validates row data,
- renders a near-exact society receipt template,
- exports one merged PDF for 150-200 receipts.

## Product Priorities

1. Receipt layout fidelity is a core requirement.
2. Data correctness is more important than permissive parsing.
3. PDF generation must stay responsive for batches up to 200 receipts.
4. Keep implementation frontend-first unless explicitly asked for backend.

## Architecture Rules

1. Use React with TypeScript.
2. Keep receipt feature code grouped under `src/features/receipts/` when possible.
3. Separate responsibilities:
- parsing: file to normalized rows,
- validation: schema and row errors,
- rendering: receipt component and print styles,
- export: merged PDF generation and download.
4. Keep pure utilities side-effect free.
5. Avoid hidden global state; prefer explicit props and typed interfaces.

## Data and Validation Rules

1. Required fields per row:
- `receiptNumber`
- `date`
- `name`
- `flatShopNo`
- `totalAmount`
2. Support both CSV and XLSX with header normalization.
3. Provide deterministic column mapping when sheet headers do not match expected names.
4. Reject invalid rows with clear row-level errors.
5. Never silently coerce invalid amount/date values.

## Receipt Rendering Rules

1. Match the provided receipt image structure closely:
- header band with society name/address,
- receipt number and date boxes,
- member detail lines,
- right-side amount table,
- signature/footer area,
- rupee total box.
2. Use print-aware CSS with A4 sizing and stable page breaks.
3. Keep typography, border thickness, spacing, and alignment consistent across rows.
4. Do not introduce visual redesign unless asked.

## PDF Export Rules

1. Default output is one merged PDF containing all valid receipts.
2. One source row must produce exactly one receipt page.
3. Show progress for medium batches and prevent duplicate export clicks while running.
4. Use chunked processing for large in-browser loops to keep UI responsive.
5. Export summary must include:
- valid row count,
- invalid row count,
- skipped row reasons.

## Quality Rules

1. Prefer small, composable components and typed helper functions.
2. Add concise comments only for non-obvious logic.
3. Keep naming explicit (`normalizedRows`, `validationErrors`, `receiptPages`).
4. Avoid adding dependencies unless they solve a clear need.
5. Preserve existing behavior unless the task explicitly requires change.

## Non-Goals for MVP

1. No backend queue or worker system.
2. No multi-template builder.
3. No authentication or database persistence.
