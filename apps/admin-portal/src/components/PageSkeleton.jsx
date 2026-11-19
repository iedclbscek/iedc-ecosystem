export default function PageSkeleton({ label = 'Loading workspace' }) {
  return <div className="page-skeleton" role="status" aria-label={label}>
    <div className="skeleton-block sk-title" />
    <div className="sk-metrics">{[0,1,2,3].map(slot => <div key={slot} className="skeleton-block"/>)}</div>
    <div className="sk-columns"><div className="skeleton-block" /><div className="skeleton-block" /></div>
  </div>;
}
