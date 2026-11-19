import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, ChevronLeft, ChevronRight, Clock3, History, LogIn, LogOut, RefreshCw, Search, ShieldCheck, UsersRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { banMembershipId, checkInMember, forceCheckOutMember, getActiveMembers, getCheckInHistory, unbanMembershipId } from '../api/adminService';
import { TableSkeleton } from '../components/InlineSkeleton';
import PortalDialog from '../components/PortalDialog';
import FormAlert from '../components/FormAlert';

const activeLimit = 10;
const dateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const updatedAt = value => value && Number.isFinite(Date.parse(value)) ? dateFormat.format(new Date(value)) : '—';

function Pager({ page, pages, total, unit, changePage, pending }) {
  return (
    <div className="op-footer">
      <span aria-live="polite">Page {page} of {pages} · {total} {unit}{total === 1 ? '' : 's'}</span>
      <div className="op-pager">
        <button className="op-icon" aria-label="Previous page" disabled={page <= 1 || pending} onClick={() => changePage(page - 1)}><ChevronLeft size={16} /></button>
        <button className="op-icon" aria-label="Next page" disabled={page >= pages || pending} onClick={() => changePage(page + 1)}><ChevronRight size={16} /></button>
      </div>
    </div>
  );
}

function MemberCell({ person }) {
  return <td className="member-identity"><strong className="font-semibold">{person.userName || 'Unknown member'}</strong><span className="op-member-sub">{person.membershipId}</span></td>;
}

function CountCard({ title, count, icon, loading }) {
  const Icon = icon;
  return <div className="op-card p-4 sm:p-5">
    <div className="flex items-start justify-between gap-2"><span className="text-[13px] font-semibold">{title}</span><Icon size={17} className="shrink-0 text-[#315bfa]" aria-hidden="true" /></div>
    <div className="mt-3 text-3xl font-semibold tracking-tight">{loading ? <span className="block h-8 w-12 animate-pulse rounded-lg bg-slate-100" aria-label="Loading" /> : count ?? '—'}</div>
  </div>;
}

function LoadError({ message, onRetry }) {
  return <FormAlert className="m-4">{message} <button type="button" onClick={onRetry}>Try again</button></FormAlert>;
}

export default function Makerspace() {
  const client = useQueryClient();
  const [tab, setTab] = useState('active');
  const [membershipId, setMembershipId] = useState('');
  const [activePage, setActivePage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [dialog, setDialog] = useState(null);
  const [restoreId, setRestoreId] = useState('');
  useEffect(() => {
    if (search.trim() === filter) return;
    const timer = setTimeout(() => { setFilter(search.trim()); setHistoryPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search, filter]);

  const active = useQuery({ queryKey: ['activeMembers'], queryFn: getActiveMembers, refetchInterval: 5000 });
  const historyTotals = useQuery({ queryKey: ['checkInHistory', 1, 20, '', ''], queryFn: () => getCheckInHistory(1, 20) });
  const history = useQuery({
    queryKey: ['checkInHistory', historyPage, limit, filter, action],
    queryFn: () => getCheckInHistory(historyPage, limit, { membershipId: filter, action }),
    enabled: tab === 'history',
    placeholderData: keepPreviousData,
  });
  function refresh() {
    client.invalidateQueries({ queryKey: ['activeMembers'] });
    client.invalidateQueries({ queryKey: ['checkInHistory'] });
    client.invalidateQueries({ queryKey: ['overview'] });
  }
  const attendance = useMutation({
    mutationFn: ({ type, id }) => type === 'in' ? checkInMember({ membershipId: id, action: 'IN' }) : forceCheckOutMember(id),
    onSuccess: (response, { type }) => {
      if (type === 'in') setMembershipId('');
      toast.success(response.userName + (type === 'in' ? ' checked in' : ' checked out'));
      refresh();
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Could not update attendance'),
  });
  const access = useMutation({
    mutationFn: ({ type, id }) => type === 'restore' ? unbanMembershipId(id) : banMembershipId(id),
    onSuccess: (response, { type }) => {
      toast.success((type === 'restore' ? 'Restored access for ' : 'Blocked access for ') + response.membershipId);
      setDialog(null);
      setRestoreId('');
      refresh();
    },
  });
  const members = active.data?.data || [];
  const activePages = Math.max(1, Math.ceil(members.length / activeLimit));
  const displayPage = Math.min(activePage, activePages);
  const records = history.data?.data || [];
  const restoring = dialog?.type === 'restore';
  function closeAccessDialog() {
    access.reset();
    setDialog(null);
  }

  return (
    <div className="op-page">
      <header className="op-header">
        <div><h1>Makerspace</h1><p>Member attendance and workspace access.</p></div>
        <div className="op-actions">
          <button className="op-secondary" onClick={refresh} disabled={active.isFetching || history.isFetching}><RefreshCw size={15} /> Refresh</button>
          <button className="op-secondary" onClick={() => { setRestoreId(''); setDialog({ type: 'restore' }); }}><ShieldCheck size={15} /> Restore access</button>
        </div>
      </header>
      <div className="grid grid-cols-2 items-stretch gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <section className="op-card col-span-2 p-4 sm:p-5 lg:col-span-1">
          <h2 className="op-section-title mb-3">Check-in desk</h2>
          <form className="flex flex-wrap items-center gap-2" onSubmit={event => { event.preventDefault(); if (membershipId.trim()) attendance.mutate({ type: 'in', id: membershipId.trim() }); }}>
            <label className="op-field min-w-0 basis-40 grow"><span className="sr-only">Membership ID to check in</span>
              <input value={membershipId} autoComplete="off" placeholder="Membership ID" required disabled={attendance.isPending} onChange={event => setMembershipId(event.target.value)} />
            </label>
            <button className="op-primary" disabled={!membershipId.trim() || attendance.isPending}><LogIn size={15} />Check in</button>
          </form>
        </section>
        <CountCard title="Checked in now" icon={UsersRound} count={active.data?.total} loading={active.isPending} />
        <CountCard title="Attendance records" icon={History} count={historyTotals.data?.total} loading={historyTotals.isPending} />
      </div>

      <div className="op-tabs" role="group" aria-label="Attendance view">
        <button className="op-tab" aria-pressed={tab === 'active'} onClick={() => setTab('active')}><UsersRound size={15} /> Checked in</button>
        <button className="op-tab" aria-pressed={tab === 'history'} onClick={() => setTab('history')}><Clock3 size={15} /> Attendance history</button>
      </div>
      {tab === 'active' ? <section className="op-card overflow-hidden">
        <div className="op-card-head"><h2>Checked-in members</h2>{active.data && <span className="op-count">{members.length} present</span>}</div>
        {active.isPending ? <TableSkeleton label="Loading checked-in members" columns={4} /> : active.isError ? (
          <LoadError message="Could not load checked-in members." onRetry={() => active.refetch()} />
        ) : !members.length ? <p className="op-empty">No members are currently checked in.</p> : (
          <>
            <div className="op-scroll"><table className="op-table op-member-table" aria-label="Checked-in members">
              <thead><tr>{['Member', 'Checked in', 'Status', 'Actions'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
              <tbody>{members.slice((displayPage - 1) * activeLimit, displayPage * activeLimit).map(member => (
                <tr key={member._id}>
                  <MemberCell person={member} />
                  <td className="member-attribute whitespace-nowrap" data-label="Checked in">{updatedAt(member.lastUpdated)}</td>
                  <td className="member-state"><span className="op-status active">Checked in</span></td>
                  <td className="member-actions"><div className="flex gap-1.5">
                    <button className="op-icon" title="Check out" aria-label={'Check out ' + member.membershipId} disabled={attendance.isPending || access.isPending}
                      onClick={() => attendance.mutate({ type: 'out', id: member.membershipId })}><LogOut size={15} /></button>
                    <button className="op-icon danger" title="Block access" aria-label={'Block access for ' + member.membershipId} disabled={attendance.isPending || access.isPending}
                      onClick={() => setDialog({ type: 'block', member })}><Ban size={15} /></button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table></div>
            {activePages > 1 && <Pager page={displayPage} pages={activePages} total={members.length} unit="member" changePage={setActivePage} />}
          </>
        )}
      </section> : <section className="op-card overflow-hidden" aria-busy={history.isFetching}>
        <div className="op-card-head"><h2>Attendance history</h2>{history.data && <span className="op-count">{history.data.total} {history.data.total === 1 ? 'record' : 'records'}</span>}</div>
        <div className="flex flex-wrap items-center gap-2 px-4 pb-4 sm:px-5">
          <label className="op-search w-full sm:w-auto sm:flex-1"><Search size={16} aria-hidden="true" />
            <input type="search" aria-label="Filter history by membership ID" placeholder="Exact membership ID" value={search} onChange={event => setSearch(event.target.value)} />
          </label>
          <label className="op-field"><span className="sr-only">Attendance action</span>
            <select aria-label="Attendance action" value={action} onChange={event => { setAction(event.target.value); setHistoryPage(1); }}>
              <option value="">All actions</option><option value="IN">Check-in</option><option value="OUT">Check-out</option>
            </select>
          </label>
          <label className="op-field"><span className="sr-only">Rows per page</span>
            <select aria-label="Rows per page" value={limit} onChange={event => { setLimit(Number(event.target.value)); setHistoryPage(1); }}>
              {[10, 20, 50].map(size => <option value={size} key={size}>{size} per page</option>)}
            </select>
          </label>
          {(action || search) && <button className="op-secondary" onClick={() => { setSearch(''); setFilter(''); setAction(''); setHistoryPage(1); }}>Clear filters</button>}
        </div>
        {history.isPending ? <TableSkeleton label="Loading attendance history" columns={3} /> : history.isError ? (
          <LoadError message="Could not load attendance history." onRetry={() => history.refetch()} />
        ) : !records.length ? <p className="op-empty">No attendance records found.</p> : (
          <div className="op-scroll"><table className="op-table op-member-table" aria-label="Attendance history">
            <thead><tr>{['Member', 'Action', 'Recorded at'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
            <tbody>{records.map(record => (
              <tr key={record._id}><MemberCell person={record} />
                <td className="member-actions"><span className={'op-status ' + (record.action === 'IN' ? 'active' : 'rejected')}>{record.action === 'IN' ? 'Check-in' : 'Check-out'}</span></td>
                <td className="member-attribute" data-label="Recorded at">{updatedAt(record.timestamp)}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
        {history.data && !history.isError && <Pager page={history.data.page} pages={history.data.totalPages} total={history.data.total} unit="record" changePage={setHistoryPage} pending={history.isPlaceholderData} />}
      </section>}

      {dialog && <PortalDialog labelledBy="makerspace-access-title" busy={access.isPending} onClose={closeAccessDialog}>
        <div className="op-dialog-head"><h2 id="makerspace-access-title">{restoring ? 'Restore makerspace access' : 'Block makerspace access'}</h2></div>
        <form onSubmit={event => { event.preventDefault(); access.mutate({ type: dialog.type, id: restoring ? restoreId.trim() : dialog.member.membershipId }); }}>
          <div className="p-5">
            {restoring ? <label className="op-field">Blocked membership ID<input required value={restoreId} autoComplete="off" disabled={access.isPending} onChange={event => setRestoreId(event.target.value)} /></label> :
              <p className="op-caption">{dialog.member.userName || dialog.member.membershipId} will be checked out and blocked from checking in again until access is restored.</p>}
          </div>
          {access.isError && <FormAlert className="mx-5 mb-4">{access.error?.response?.data?.message || 'Could not update makerspace access. Check your connection and try again.'}</FormAlert>}
          <div className="op-dialog-foot">
            <button type="button" className="op-secondary" disabled={access.isPending} onClick={closeAccessDialog}>Cancel</button>
            <button className={restoring ? 'op-primary' : 'op-danger'} disabled={access.isPending || (restoring && !restoreId.trim())}>{access.isPending ? 'Saving…' : restoring ? 'Restore access' : 'Block access'}</button>
          </div>
        </form>
      </PortalDialog>}
    </div>
  );
}
