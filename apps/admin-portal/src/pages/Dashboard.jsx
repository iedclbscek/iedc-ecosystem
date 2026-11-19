import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowDownToLine, ArrowUpRight, CalendarDays, CheckCircle2, ChevronRight, CircleDot, Clock3, FilePenLine, Send, UsersRound } from 'lucide-react';
import api from '../api/axios';
import { useViewMode } from '../context/ViewModeContext';
import PageSkeleton from '../components/PageSkeleton';
import FormAlert from '../components/FormAlert';
import './dashboard.css';

const statuses = [
  ['published', 'Published', '#355efa'], ['draft', 'Draft', '#58c997'],
  ['completed', 'Completed', '#ff994c'], ['cancelled', 'Cancelled', '#adb0bf'],
];
const number = value => Number(value || 0).toLocaleString('en-IN');
const formatDate = (value, options) => new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', ...options }).format(new Date(value));
const shortDate = value => formatDate(value, {day:'numeric', month:'short'});
const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function Metric({ title, value, icon, caption, to }) {
  const content = <><span className="ds-metric-label">{title}{icon}</span><strong>{number(value)}</strong><small>{caption}</small></>;
  return to ? <Link className="ds-card ds-metric" to={to}>{content}</Link> : <div className="ds-card ds-metric">{content}</div>;
}

function ActivityChart({ daily }) {
  const peak = Math.max(1, ...daily.map(d => d.count));
  const x = i => 26 + i / Math.max(1, daily.length - 1) * 346;
  const y = n => 88 - n / peak * 72;
  const line = daily.map((d, i) => (i ? 'L' : 'M') + x(i) + ' ' + y(d.count)).join(' ');
  return <div className="ds-trend" role="img" aria-label={`Daily event creation from ${daily[0].date} through ${daily.at(-1).date}, highest daily count ${number(Math.max(...daily.map(d => d.count)))}`}>
    <svg viewBox="0 0 378 103" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="event-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#4569ff" stopOpacity=".24"/><stop offset="1" stopColor="#4569ff" stopOpacity=".015"/></linearGradient></defs>
      {[peak, ...(peak > 1 ? [Math.floor(peak / 2)] : []), 0].map(n => <g key={n}>
        <path d={`M26 ${y(n)} H374`} stroke="#e5e7ed" strokeDasharray="4 4" fill="none"/>
        <text x="19" y={y(n)+3} textAnchor="end" fill="#777c88" fontSize="9">{number(n)}</text>
      </g>)}
      <path d={line + ' L372 88 L26 88 Z'} fill="url(#event-area)"/>
      <path d={line} fill="none" stroke="#315bff" strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinejoin="round"/>
    </svg>
    <div className="ds-ticks">{[0, Math.floor(daily.length/2), daily.length-1].map(i => <span key={i}>{shortDate(daily[i].date)}</span>)}</div>
  </div>;
}

function Activity({ events, activity }) {
  const current = activity.daily.reduce((sum, day) => sum + day.count, 0);
  const previous = activity.previousTotal;
  const delta = previous ? Math.round((current - previous) * 100 / previous) : null;
  const total = Object.values(events).reduce((sum, n) => sum + n, 0);
  return <section className="ds-card ds-panel ds-activity">
    <h2>Event activity</h2>
    <div className="ds-plot-row"><div className="ds-plot-value"><strong>{number(current)}</strong><small>events created</small>
      <p>{delta !== null && <span className={'ds-change ' + (delta < 0 ? 'down' : '')}>{delta > 0 ? '+' : ''}{delta}%</span>} {number(previous)} in prior period</p>
    </div><ActivityChart daily={activity.daily}/></div>
    <section className="ds-breakdown"><h3>Event pipeline</h3><div className="ds-segments">{statuses.map(([key,label,color]) => <div key={key} style={{'--segment':color}}>
      <b><i/>{number(events[key])}</b><span>{label}</span><div className="ds-segment-track"><i style={{width:(total ? (events[key] || 0) / total * 100 : 0) + '%'}}/></div>
    </div>)}</div></section>
  </section>;
}

function ActiveDays({ daily }) {
  const days = Array(7).fill(0);
  for (const d of daily) days[new Date(d.date).getUTCDay()] += d.count;
  const peak = Math.max(...days);
  return <section className="ds-card ds-panel"><h2>Most active days</h2><p className="ds-note">Events created by weekday</p>
    <div className="ds-bars">{days.map((value, index) => <div key={index} className={value && value === peak ? 'best' : ''}>
      <div className="ds-bar-area"><small>{number(value)}</small><i style={{height:Math.max(3, peak ? 74 * value/peak : 0) + 'px'}} /></div><span>{weekdayNames[index]}</span>
    </div>)}</div>
  </section>;
}

function Publication({ events, total }) {
  const rate = total ? Math.round(100 * (events.published || 0) / total) : 0;
  return <section className="ds-card ds-panel ds-publication"><h2>Published share</h2>
    <div className="ds-gauge" role="img" aria-label={`${rate}% of workspace events have published status`}>
      <svg aria-hidden="true" viewBox="0 0 200 105">{Array.from({length:40}, (_,i) => <line key={i} x1="12" y1="96" x2="29" y2="96" strokeWidth="4" transform={`rotate(${i * 180 / 39} 100 96)`} stroke={(i+.5)/40 <= rate/100 ? '#53d08b' : '#e6e8ed'}/>)}</svg>
      <div><strong>{rate}%</strong><small>{number(events.published)} of {number(total)} events</small></div>
    </div>
  </section>;
}

function Schedule({ events, path }) {
  return <section className="ds-card ds-panel ds-schedule"><header><h2>Upcoming events</h2><Link to={path}>View events <ChevronRight size={14}/></Link></header>
    {events.length ? <div className="ds-table-wrap"><table><thead><tr><th>Event</th><th>Date</th><th>Status</th></tr></thead><tbody>
      {events.map(e => <tr key={e._id}><td><div className="ds-event-name"><span><CalendarDays size={16}/></span><div><b>{e.title}</b>{(e.venue || e.location) && <small>{e.venue || e.location}</small>}</div></div></td>
        <td><time dateTime={e.startAt}>{shortDate(e.startAt)}</time></td><td><span className={'ds-status ' + (e.status || 'published')}>{e.status || 'published'}</span></td></tr>)}
    </tbody></table></div> : <p className="ds-empty">No upcoming events are scheduled.</p>}
  </section>;
}

function exportSummary(data) {
  const rows = [['Metric', 'Value']];
  for (const [key,label] of statuses) if (data.events) rows.push([label + ' events',data.events[key] || 0]);
  if (data.students !== null) rows.push(['Student registrations',data.students]);
  if (data.newStudents !== null) rows.push(['New registrations in selected period',data.newStudents]);
  if (data.pending !== null) rows.push(['Applications awaiting review',data.pending]);
  if (data.activity) rows.push([], ['Date','Events created'], ...data.activity.daily.map(day => [day.date,day.count]));
  const url = URL.createObjectURL(new Blob([rows.map(row => row.join(',')).join('\r\n')], {type:'text/csv;charset=utf-8'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'iedc-dashboard-' + new Date().toISOString().slice(0,10) + '.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Dashboard() {
  const { mode, clubId } = useViewMode();
  const club = mode === 'club' ? clubId : null;
  const [days, setDays] = useState(30);
  const path = club ? '/events' : '/events?scope=iedc';
  const query = useQuery({
    queryKey: ['overview', club || 'iedc', days],
    queryFn: async ({ signal }) => (await api.get('/admin/overview', { params: { clubId: club || undefined, days }, signal })).data,
    placeholderData: (previous, previousQuery) => previousQuery?.queryKey[1] === (club || 'iedc') ? previous : undefined,
    staleTime: 0,
  });
  if (query.isPending) return <PageSkeleton label="Loading dashboard" />;
  if (query.isError) return <section className="op-page"><header className="op-header"><h1>Dashboard</h1></header>
    <FormAlert>Could not load this workspace. <button type="button" onClick={() => query.refetch()}>Try again</button></FormAlert>
  </section>;
  const { events, pending, students, newStudents, upcoming, activity } = query.data;
  const total = Object.values(events || {}).reduce((sum, n) => sum + n, 0);
  const newEvents = activity?.daily.reduce((sum, day) => sum + day.count, 0) || 0;
  return <div className="ds-dashboard" aria-busy={query.isFetching}>
    <header className="ds-heading"><h1>Dashboard</h1><div className="ds-tools">
      {activity && <div className="ds-range"><span><CalendarDays size={15}/>{shortDate(activity.start)} – {shortDate(activity.end)}</span>
        <select aria-label="Activity period" value={days} onChange={e => setDays(Number(e.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select></div>}
      <button className="ds-primary" disabled={query.isPlaceholderData} onClick={() => exportSummary(query.data)}><ArrowDownToLine size={15}/>Export</button>
    </div></header>
    <div className="ds-metrics">
      {events && <Metric title="Total events" value={total} caption={number(newEvents) + ' created this period'} icon={<CalendarDays/>} to={path} />}
      {events && <Metric title="Published events" value={events.published} caption="Currently published" icon={<Send/>}/>}
      {students !== null ? <Metric title="Student registrations" value={students} caption={number(newStudents) + ' new this period'} icon={<UsersRound/>} to="/registrations"/> : events && <Metric title="Draft events" value={events.draft} caption="Awaiting publication" icon={<FilePenLine/>}/>}
      {pending !== null ? <Metric title="Awaiting review" value={pending} caption="First-year applications" icon={<Clock3/>} to="/first-year-reps?status=Applied"/> : events && <Metric title="Completed events" value={events.completed} caption="Marked complete" icon={<CheckCircle2/>}/>}
    </div>
    {events && activity && <div className="ds-columns"><div className="ds-stack"><Activity events={events} activity={activity}/><Schedule events={upcoming} path={path}/></div>
      <div className="ds-stack"><ActiveDays daily={activity.daily}/><Publication events={events} total={total}/>
        {upcoming[0] && <section className="ds-card ds-panel ds-next"><header><h2>Next on the calendar</h2><CircleDot size={15}/></header><strong>{upcoming[0].title}</strong><p>{formatDate(upcoming[0].startAt,{weekday:'short',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})} IST</p><Link to={path}>Open events <ArrowUpRight size={14}/></Link></section>}
      </div></div>}
    {!events && students === null && pending === null && <section className="ds-card ds-panel"><h2>Workspace access</h2><p>Ask your administrator to assign the tools you need.</p></section>}
  </div>;
}
