import { FIELD_LABELS, REQUIRED_FIELDS } from '../constants'
import type { ReceiptMapping } from '../types'

type ColumnMappingSectionProps = {
  headers: string[]
  mapping: ReceiptMapping
  disabled: boolean
  onChange: (field: string, value: string) => void
}

export function ColumnMappingSection({ headers, mapping, disabled, onChange }: ColumnMappingSectionProps) {
  return (
    <section className="panel">
      <h2>Column Mapping</h2>
      <p className="subline">Adjust only if your header names differ from expected receipt fields.</p>
      <div className="mapping-grid">
        {Object.entries(FIELD_LABELS).map(([field, label]) => (
          <label key={field} className="mapping-item">
            <span>
              {label}
              {REQUIRED_FIELDS.includes(field as keyof typeof FIELD_LABELS) && <strong> *</strong>}
            </span>
            <select value={mapping[field] ?? ''} onChange={(event) => onChange(field, event.target.value)} disabled={disabled}>
              <option value="">Auto</option>
              {headers.map((header) => (
                <option key={header} value={header}>
                  {header}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </section>
  )
}
