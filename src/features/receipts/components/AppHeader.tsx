type AppHeaderProps = {
  onDownloadSample: () => void
  disableSample: boolean
}

export function AppHeader({ onDownloadSample, disableSample }: AppHeaderProps) {
  return (
    <section className="app-header card card-outline card-primary">
      <div className="card-body d-flex flex-wrap align-items-start justify-content-between gap-3">
        <div>
          <h1 className="h3 mb-1">Receipts Generator</h1>
          <p className="subline mb-0">Switch between sheet upload and quick manual receipt generation.</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button type="button" className="btn btn-outline-primary btn-sm" onClick={onDownloadSample} disabled={disableSample}>
            Download Sample CSV
          </button>
        </div>
      </div>
    </section>
  )
}
