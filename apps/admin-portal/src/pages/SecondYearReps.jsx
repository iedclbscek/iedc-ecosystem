import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowUpRight, CheckCheck, ChevronLeft, ChevronRight, ClipboardList, Download, FileClock, ListChecks, LockKeyhole, Search, Trash2, UnlockKeyhole } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { deleteSecondYearRep, fetchSecondYearRep, fetchSecondYearReps, fetchSecondYearRepsSettings, updateSecondYearRep, updateSecondYearRepsSettings } from '../api/adminService';
import { RowsSkeleton, TableSkeleton } from '../components/InlineSkeleton';
import PortalDialog from '../components/PortalDialog';
import FormAlert from '../components/FormAlert';

const statusColors = {
  Applied: 'bg-slate-100 text-slate-700',
  Reviewed: 'bg-blue-50 text-blue-800',
  Shortlisted: 'bg-violet-50 text-violet-800',
  Interview: 'bg-amber-50 text-amber-800',
  Selected: 'bg-emerald-50 text-emerald-800',
  Rejected: 'bg-rose-50 text-rose-800',
};
const questions = [
  ['motivation', 'Why do you want to be part of IEDC, and what do you hope to learn or contribute through it?'],
  ['teamworkInitiative', 'Tell us about a time when you worked with a team or took initiative to get something done. What was your role, and what did you learn?'],
  ['representativeIdea', 'Imagine you are an IEDC Second-Year Representative. What is one problem or opportunity you notice among Second-Year students, and what would you do to address it?'],
];
const metrics = [
  ['total', 'Total applications', <ClipboardList size={17} />],
  ['applied', 'Awaiting review', <FileClock size={17} />],
  ['shortlisted', 'Shortlisted', <ListChecks size={17} />],
  ['selected', 'Selected', <CheckCheck size={17} />],
];
const dateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const dateLabel = (date) => date && Number.isFinite(Date.parse(date)) ? dateFormat.format(new Date(date)) : '—';

function ConfirmChange({ title, description, onConfirm, onClose, busy, danger, error }) {
  return (
    <PortalDialog labelledBy="rep-confirm-title" onClose={onClose} busy={busy}>
      <div className="op-dialog-head"><h2 id="rep-confirm-title">{title}</h2></div>
      <p className="op-caption p-5">{description}</p>
      {error && <FormAlert className="mx-5 mb-4">{error}</FormAlert>}
      <div className="op-dialog-foot">
        <button className="op-secondary" onClick={onClose} disabled={busy}>Cancel</button>
        <button className={danger ? 'op-danger' : 'op-primary'} onClick={onConfirm} disabled={busy}>
          {busy ? 'Saving…' : title}
        </button>
      </div>
    </PortalDialog>
  );
}

function ApplicationDetail({ applicationId, onBack }) {
  const client = useQueryClient();
  const [draft, setDraft] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const detail = useQuery({ queryKey: ['secondYearRep', applicationId], queryFn: () => fetchSecondYearRep(applicationId) });
  const app = detail.data;

  function refreshLists() {
    client.invalidateQueries({ queryKey: ['secondYearReps'] });
    client.invalidateQueries({ queryKey: ['overview'] });
  }
  const update = useMutation({
    mutationFn: (changes) => updateSecondYearRep(applicationId, changes),
    onSuccess: ({ application }, changes) => {
      client.setQueryData(['secondYearRep', applicationId], application);
      if (changes.remarks !== undefined) setDraft(null);
      if (changes.status) refreshLists();
      setConfirmation(null);
      toast.success(changes.status ? 'Application status updated' : 'Reviewer notes saved');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Could not update application'),
  });
  const remove = useMutation({
    mutationFn: () => deleteSecondYearRep(applicationId),
    onSuccess: () => {
      refreshLists();
      onBack();
      toast.success('Application deleted');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Could not delete application'),
  });
  const busy = update.isPending || remove.isPending;
  const snapshot = app?.memberSnapshot || {};
  const decision = confirmation === 'delete' ? remove : update;
  const savedNotes = app?.review?.remarks || '';
  const notes = draft ?? savedNotes;

  return (
    <div className="op-page">
      <header className="op-header">
        <div><h1>Application review</h1><p>{app ? 'Submitted ' + dateLabel(app.createdAt) : 'Second-year representatives'}</p></div>
        <button className="op-secondary" onClick={onBack} disabled={busy}><ArrowLeft size={15} /> Applications</button>
      </header>
      {detail.isPending ? <div className="op-card"><RowsSkeleton label="Loading application" /></div> : detail.isError || !app ? (
        <FormAlert>Could not load the application. <button type="button" onClick={() => detail.refetch()}>Try again</button></FormAlert>
      ) : (
        <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.6fr)]">
          <section className="op-card">
            <div className="op-card-head">
              <div className="min-w-0 break-words"><h2>{snapshot.name || 'Unnamed applicant'}</h2><p className="op-caption">{app.membershipId}</p></div>
            </div>
            <dl className="grid gap-3 border-t border-slate-100 p-5">
              {[['Department', snapshot.department], ['Class', snapshot.class], ['Admission number', snapshot.admissionNumber], ['Email', snapshot.email], ['Phone', snapshot.phone]].map(([label, value]) => (
                <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="break-words text-sm font-medium">{value || 'Not provided'}</dd></div>
              ))}
            </dl>
            <div className="grid gap-4 border-t border-slate-100 p-5">
              <label className="op-field">Application status
                <select aria-label="Application status" value={app.status} disabled={busy} onChange={event => {
                  const status = event.target.value;
                  if (['Selected', 'Rejected'].includes(status)) {
                    update.reset();
                    setConfirmation(status);
                  }
                  else update.mutate({ status });
                }}>
                  {Object.keys(statusColors).map(status => <option key={status}>{status}</option>)}
                </select>
              </label>
              <button className="op-secondary justify-self-start" disabled={busy} onClick={() => setConfirmation('delete')}><Trash2 size={14} /> Delete application</button>
            </div>
          </section>
          <div className="grid min-w-0 gap-4">
            <section className="op-card">
              <div className="op-card-head"><h2>Application responses</h2></div>
              {questions.map(([field, question]) => (
                <div key={field} className="border-t border-slate-100 p-5">
                  <h3 className="text-sm font-semibold">{question}</h3>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">{app[field] || 'Not provided'}</p>
                </div>
              ))}
            </section>
            <section className="op-card">
              <div className="op-card-head"><h2><label htmlFor="rep-notes">Reviewer notes</label></h2></div>
              <div className="op-field px-5 pb-4">
                <textarea id="rep-notes" rows={4} value={notes} disabled={busy} placeholder="Add your evaluation…" onChange={event => setDraft(event.target.value)} />
              </div>
              <div className="op-footer">
                <span>{app.review?.reviewedAt && 'Updated ' + dateLabel(app.review.reviewedAt)}{app.review?.reviewedBy?.name && ' by ' + app.review.reviewedBy.name}</span>
                <button className="op-primary" disabled={busy || notes === savedNotes} onClick={() => update.mutate({ remarks: notes })}>{update.isPending ? 'Saving…' : 'Save notes'}</button>
              </div>
            </section>
          </div>
        </div>
      )}
      {confirmation && <ConfirmChange
        title={confirmation === 'delete' ? 'Delete application' : 'Mark as ' + confirmation.toLowerCase()}
        error={decision.isError
          ? decision.error?.response?.data?.message || 'Could not save this change. Try again.'
          : ''}
        description={confirmation === 'delete' ? 'Permanently delete this application and its reviewer notes?' : 'Change the application status for ' + (snapshot.name || app.membershipId) + '?'}
        danger={confirmation === 'delete' || confirmation === 'Rejected'} busy={busy}
        onClose={() => { update.reset(); remove.reset(); setConfirmation(null); }} onConfirm={() => confirmation === 'delete' ? remove.mutate() : update.mutate({ status: confirmation })}
      />}
    </div>
  );
}

export default function SecondYearReps() {
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get('status');
    return Object.hasOwn(statusColors, requested) ? requested : '';
  });
  const [selected, setSelected] = useState(null);
  const [confirmSettings, setConfirmSettings] = useState(false);
  useEffect(() => {
    if (search.trim() === debounced) return;
    const timer = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search, debounced]);

  const list = useQuery({
    queryKey: ['secondYearReps', page, debounced, status, department],
    queryFn: () => fetchSecondYearReps({ page, search: debounced, department, status }),
    placeholderData: keepPreviousData,
  });
  const data = list.data;
  const settings = useQuery({ queryKey: ['secondYearRepsSettings'], queryFn: fetchSecondYearRepsSettings });
  const open = settings.data?.isOpen;
  const toggle = useMutation({
    mutationFn: (isOpen) => updateSecondYearRepsSettings({ isOpen }),
    onSuccess: (result) => {
      client.setQueryData(['secondYearRepsSettings'], result);
      setConfirmSettings(false);
      toast.success(result.message);
    },
  });
  const exportCsv = useMutation({
    mutationFn: async () => {
      const response = await api.get('/admin/second-year-reps/export/csv', { params: { search: debounced, department, status }, responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'second-year-representatives.csv';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    onSuccess: () => toast.success('CSV downloaded'),
    onError: () => toast.error('Could not export applications'),
  });

  if (selected) return <ApplicationDetail key={selected} applicationId={selected} onBack={() => setSelected(null)} />;

  return (
    <div className="op-page">
      <header className="op-header">
        <div><h1>Second-year representatives</h1><p>{typeof open === 'boolean' ? 'Applications are ' + (open ? 'open' : 'closed') + '.' : settings.isError ? 'Application settings unavailable.' : 'Loading application settings…'}</p></div>
        <div className="op-actions">
          <button className="op-secondary" onClick={() => exportCsv.mutate()} disabled={exportCsv.isPending || list.isFetching || search.trim() !== debounced || !data}>
            <Download size={15} />{exportCsv.isPending ? 'Exporting…' : 'Export CSV'}
          </button>
          {settings.isError ? <button className="op-primary" onClick={() => settings.refetch()}>Retry settings</button> :
            <button className="op-primary" disabled={typeof open !== 'boolean' || toggle.isPending} onClick={() => setConfirmSettings(true)}>
              {open ? <LockKeyhole size={15} /> : <UnlockKeyhole size={15} />}{open ? 'Close applications' : 'Open applications'}
            </button>}
        </div>
      </header>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map(([key, label, icon]) => (
          <div className="op-card p-4 sm:p-5" key={key}>
            <div className="flex items-start justify-between gap-2"><span className="text-[13px] font-semibold">{label}</span><span aria-hidden="true" className="shrink-0 text-[#315bfa]">{icon}</span></div>
            <div className="mt-3 text-3xl font-semibold tracking-tight">{data ? data.stats[key] : list.isPending ? <span aria-label="Loading" className="block h-8 w-12 animate-pulse rounded-lg bg-slate-100" /> : '—'}</div>
          </div>
        ))}
      </div>
      <section className="op-card overflow-hidden" aria-busy={list.isFetching}>
        <div className="op-card-head"><h2>Applications</h2>{data && <span className="op-count">{data.total} {data.total === 1 ? 'application' : 'applications'}</span>}</div>
        <div className="flex flex-wrap items-center gap-2 px-4 pb-4 sm:px-5">
          <label className="op-search w-full sm:w-auto sm:flex-1">
            <Search size={16} aria-hidden="true" /><input type="search" value={search} aria-label="Search applications" placeholder="Name, email or ID" onChange={event => setSearch(event.target.value)} />
          </label>
          <label className="op-field max-w-full"><span className="sr-only">Department</span>
            <select aria-label="Department" value={department} onChange={event => { setDepartment(event.target.value); setPage(1); }}>
              <option value="">All departments</option>{(data?.departments || []).map(value => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label className="op-field"><span className="sr-only">Filter by status</span>
            <select aria-label="Filter by status" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}>
              <option value="">All statuses</option>{Object.keys(statusColors).map(value => <option key={value} value={value}>{value}{data && ' (' + data.stats[value.toLowerCase()] + ')'}</option>)}
            </select>
          </label>
        </div>
        {list.isPending ? <TableSkeleton label="Loading applications" /> : list.isError ? (
          <FormAlert className="m-4">Could not load applications. <button type="button" onClick={() => list.refetch()}>Try again</button></FormAlert>
        ) : !data.applications.length ? (
          <div className="op-empty"><p>No applications match these filters.</p>
            {(search || department || status) && <button className="op-secondary" onClick={() => { setStatus(''); setDepartment(''); setSearch(''); setDebounced(''); setPage(1); }}>Clear filters</button>}
          </div>
        ) : (
          <div className="op-scroll"><table className="op-table op-member-table" aria-label="Second-year applications">
            <thead><tr>{['Applicant', 'Department', 'Submitted', 'Status', 'Review'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
            <tbody>{data.applications.map(app => (
              <tr key={app._id}>
                <td className="member-identity"><strong className="font-semibold">{app.name || 'Unnamed applicant'}</strong><span className="op-member-sub">{[app.membershipId, app.admissionNumber].filter(Boolean).join(' · ')}</span></td>
                <td className="member-attribute" data-label="Department">{app.department || '—'}{app.class && <span className="op-member-sub">{app.class}</span>}</td>
                <td className="member-attribute whitespace-nowrap" data-label="Submitted">{dateLabel(app.submittedAt)}</td>
                <td className="member-state"><span className={'whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium ' + (statusColors[app.status] || statusColors.Applied)}>{app.status}</span></td>
                <td className="member-actions"><button className="op-icon" aria-label={'Review ' + (app.name || app.membershipId)} onClick={() => setSelected(app._id)}><ArrowUpRight size={16} /></button></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
        {data && !list.isError && <div className="op-footer">
          <span aria-live="polite">Page {data.page} of {data.pages}</span>
          <div className="op-pager">
            <button className="op-icon" aria-label="Previous applications page" disabled={data.page <= 1 || list.isPlaceholderData} onClick={() => setPage(data.page - 1)}><ChevronLeft size={16} /></button>
            <button className="op-icon" aria-label="Next applications page" disabled={data.page >= data.pages || list.isPlaceholderData} onClick={() => setPage(data.page + 1)}><ChevronRight size={16} /></button>
          </div>
        </div>}
      </section>
      {confirmSettings && <ConfirmChange title={open ? 'Close applications' : 'Open applications'} description={open ? 'Second-year students will lose access to the application form.' : 'Second-year students will be able to submit new applications.'} danger={open} busy={toggle.isPending}
        error={toggle.isError ? toggle.error?.response?.data?.message || 'Could not update application availability. Try again.' : ''}
        onClose={() => { toggle.reset(); setConfirmSettings(false); }} onConfirm={() => toggle.mutate(!open)} />}
    </div>
  );
}
