---
description: "Use when implementing receipt upload, sheet parsing, validation, receipt template rendering, or merged PDF export in the ReceiptsGen app."
applyTo: "src/**/*.tsx"
---

# Receipt Feature Instructions

Apply these rules when working on receipt-related code.

## Accepted Inputs

1. Accept `.xlsx` and `.csv` uploads.
2. Parse first sheet by default for `.xlsx` unless user selects otherwise.
3. Normalize headers to a stable internal schema.

## Schema and Mapping

1. Internal row model must include:
- `receiptNumber`
- `date`
- `name`
- `flatShopNo`
- `rupeesText`
- `cashOrChequeNo`
- `dated`
- `bank`
- `amountBreakdown` (object with receipt table fields)
- `totalAmount`
2. Implement explicit column mapping UI for unknown headers.
3. Preserve original source row index for error reporting.

## Validation Behavior

1. Validate each row before rendering/export.
2. Required field missing -> mark row invalid.
3. Invalid numeric/date format -> mark row invalid.
4. Continue processing valid rows; do not abort full batch on bad rows.
5. Show an error summary with row number and field-level reason.

## Layout Fidelity Requirements

1. Keep receipt dimensions and section placement consistent with the provided sample image.
2. Maintain strong table borders and clear text alignment for amount rows.
3. Keep signature and total amount regions fixed in predictable positions.
4. Ensure generated pages are print-safe and do not clip content.

## PDF Export Requirements

1. Export one merged PDF as default output.
2. Each valid row becomes one page in the merged PDF.
3. Target smooth handling for 150-200 rows with visible progress.
4. Use chunked/async loops to avoid UI freezes.
5. Include a completion summary in UI after export.

## Implementation Guardrails

1. Prefer deterministic transforms over heuristic magic.
2. Avoid silently filling missing required values.
3. Keep parser, validator, renderer, and exporter as separate modules.
4. Add utility tests for normalization and validation logic when test setup exists.