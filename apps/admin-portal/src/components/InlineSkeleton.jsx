const widths = ['w-3/4', 'w-1/2', 'w-5/6', 'w-2/3'];

export function RowsSkeleton({ rows = 5, columns = 4, compact = false, label = 'Loading rows' }) {
  return (
    <div role="status" aria-label={label} className="divide-y divide-slate-100 animate-pulse">
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className={`grid gap-4 ${compact ? 'px-4 py-3' : 'px-6 py-4'}`} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }, (_, column) => (
            <div key={column} className={`h-3 rounded-full bg-slate-200 ${widths[(row + column) % widths.length]}`} />
          ))}
        </div>
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function TableSkeleton({ rows = 6, columns = 5, label = 'Loading table' }) {
  return (
    <div className="overflow-hidden bg-white" role="status" aria-label={label}>
      <div className="grid gap-4 border-b border-slate-100 bg-slate-50 px-6 py-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }, (_, column) => (
          <div key={column} className="h-2.5 w-2/3 rounded-full bg-slate-200" />
        ))}
      </div>
      <RowsSkeleton rows={rows} columns={columns} compact label={label} />
    </div>
  );
}
