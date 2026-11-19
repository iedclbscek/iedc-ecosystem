import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Code2, Eye, FileText, Mail, MailPlus, Plus, Save, Search, Send, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { createEmailTemplate, deleteEmailTemplate, fetchActiveMemberAudience, fetchEmailTemplate, fetchEmailTemplates,
  sendBulkEmailTemplate, sendTestEmailTemplate, updateEmailTemplate } from '../api/adminService';
import { RowsSkeleton } from '../components/InlineSkeleton';
import PortalDialog from '../components/PortalDialog';
import FormAlert from '../components/FormAlert';
import './mailer.css';

const blank = { key: '', name: '', subject: '', html: '' };
const placeholderPattern = /{{\s*([a-zA-Z0-9_.-]+)\s*}}/g;
const message = (error, fallback) => error?.response?.data?.message || fallback;

async function readRecipients(file) {
  let rows;
  if (/\.csv$/i.test(file.name)) {
    const { default: Papa } = await import('papaparse');
    const parsed = Papa.parse(await file.text(), { header: true, skipEmptyLines: 'greedy' });
    if (parsed.errors.some(error => error.type === 'Quotes')) throw new Error('Check the quoted fields in your CSV and try again.');
    rows = parsed.data;
  } else if (/\.xlsx?$/i.test(file.name)) {
    const XLSX = await import('xlsx');
    const book = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const sheet = book.Sheets[book.SheetNames[0]];
    rows = sheet ? XLSX.utils.sheet_to_json(sheet, { defval: '' }) : [];
  } else {
    throw new Error('Choose a CSV, XLSX or XLS file.');
  }
  if (!rows.length) throw new Error('The file has no recipient rows.');
  const emailKey = Object.keys(rows[0]).find(key => key.trim().toLowerCase() === 'email');
  if (!emailKey) throw new Error('Include a column named email in your file.');
  const recipients = [];
  for (const row of rows) {
    const email = String(row[emailKey] ?? '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
    const data = Object.fromEntries(Object.entries(row).filter(([key, value]) => key !== emailKey && String(value ?? '').trim())
      .map(([key, value]) => [key.trim(), String(value).trim()]));
    recipients.push({ email, data });
  }
  if (recipients.length > 2000) throw new Error('Choose a file with 2,000 or fewer valid recipients.');
  return { recipients, skipped: rows.length - recipients.length };
}

function BulkSend({ template, onClose }) {
  const [mode, setMode] = useState('upload');
  const [department, setDepartment] = useState('');
  const [yearOfJoining, setYearOfJoining] = useState('');
  const [page, setPage] = useState(1);
  const [fileState, setFileState] = useState(null);
  const fileRequest = useRef(0);
  const hasFilters = Boolean(department || yearOfJoining);
  const filters = {
    ...(department ? { department } : {}),
    ...(yearOfJoining ? { yearOfJoining } : {}),
  };
  const allMembers = useQuery({
    queryKey: ['active-member-email-audience', '', '', 1],
    queryFn: () => fetchActiveMemberAudience({ page: 1 }),
    enabled: mode === 'all',
    staleTime: 0,
  });
  const matchingMembers = useQuery({
    queryKey: ['active-member-email-audience', department, yearOfJoining, page],
    queryFn: () => fetchActiveMemberAudience({ ...filters, page }),
    enabled: mode === 'all' && (hasFilters || page > 1),
    placeholderData: (previous, previousQuery) => previousQuery?.queryKey[1] === department &&
      previousQuery.queryKey[2] === yearOfJoining ? previous : undefined,
    staleTime: 0,
  });
  const audience = hasFilters || page > 1 ? matchingMembers : allMembers;
  const checkingAudience = audience.isFetching || audience.isPending || audience.isPlaceholderData;
  const total = audience.data?.total ?? 0;
  const totalPages = audience.data?.totalPages ?? 1;
  const audienceOptions = allMembers.data ?? audience.data;
  const send = useMutation({
    mutationFn: sendBulkEmailTemplate,
    onSuccess: result => {
      if (result.mode === 'all' && result.total === 0) {
        void audience.refetch();
        return;
      }
      if (result.failed) return;
      toast.success(`Email sent to ${result.sent} ${result.sent === 1 ? 'recipient' : 'recipients'}.`);
      onClose();
    },
  });
  async function loadFile(event) {
    const file = event.target.files?.[0];
    const request = ++fileRequest.current;
    if (!file) { setFileState(null); return; }
    setFileState({ loading: true });
    try {
      const parsed = await readRecipients(file);
      if (request === fileRequest.current) setFileState(parsed);
    } catch (err) {
      if (request === fileRequest.current) setFileState({ error: err.message || 'The file could not be read.' });
    }
  }
  const recipients = fileState?.recipients || [];
  const deliveryFailed = (send.data?.failed ?? 0) > 0;
  const canSend = !send.isPending && !deliveryFailed && (mode === 'all'
    ? !checkingAudience && !audience.isError && total > 0 && page <= totalPages
    : recipients.length > 0);
  return <PortalDialog labelledBy="bulk-title" className="[--dialog-width:43rem]" onClose={onClose} busy={send.isPending}>
    <header className="op-dialog-head"><div><h2 id="bulk-title">Bulk send</h2><p className="op-caption">{template.name}</p></div></header>
    <form onSubmit={event => {
      event.preventDefault();
      if (canSend) send.mutate({ id: template._id, ...(mode === 'all'
        ? { sendTo: 'all', filters: hasFilters ? filters : undefined }
        : { sendTo: 'list', recipients }) });
    }}>
      <fieldset className="mail-dialog-fields" disabled={send.isPending}>
        <legend className="sr-only">Recipients</legend>
        <div className="mail-options">
          {['upload', 'all'].map(value => <label key={value}>
            <input type="radio" checked={mode === value} name="recipient-mode" disabled={deliveryFailed} onChange={() => {
              setMode(value); setFileState(null); send.reset(); fileRequest.current++;
            }} />{value === 'all' ? 'All active members' : 'Import recipients'}
          </label>)}
        </div>
        {mode === 'upload' ? <>
          <label className="op-field">Recipient file<input type="file" accept=".csv,.xlsx,.xls" className="mail-upload" onChange={loadFile} disabled={deliveryFailed} aria-describedby="import-help" /></label>
          <p className="op-caption" id="import-help">Use a CSV or Excel file with an <code>email</code> column. Additional columns supply template variables.</p>
          {fileState?.loading && <p className="op-caption" role="status">Reading file…</p>}
          {fileState?.error && <FormAlert>{fileState.error}</FormAlert>}
          {fileState?.recipients && <p role="status" className="mail-notice">{recipients.length} valid · {fileState.skipped} skipped</p>}
        </> : <>
          <fieldset className="mail-data">
            <legend>Filter active members</legend>
            <div className="op-field">
              <label htmlFor="mail-audience-department">Department</label>
              <select id="mail-audience-department" value={department} disabled={!audienceOptions || deliveryFailed} onChange={event => {
                setDepartment(event.target.value);
                setPage(1);
                send.reset();
              }}>
                <option value="">All departments</option>
                {(audienceOptions?.departments ?? []).map(value => <option key={value}>{value}</option>)}
              </select>
            </div>
            <div className="op-field">
              <label htmlFor="mail-audience-year">Joining year</label>
              <select id="mail-audience-year" value={yearOfJoining} disabled={!audienceOptions || deliveryFailed} onChange={event => {
                setYearOfJoining(event.target.value);
                setPage(1);
                send.reset();
              }}>
                <option value="">All joining years</option>
                {(audienceOptions?.years ?? []).map(value => <option key={value}>{value}</option>)}
              </select>
            </div>
          </fieldset>
          {audience.isError
            ? <FormAlert>
              {audience.error?.response?.status === 403
                ? 'Your account cannot view this email audience. Ask an administrator to check your Mailer access.'
                : <>Could not load the matching members. <button type="button" onClick={() => audience.refetch()}>Try again</button></>}
            </FormAlert>
            : <section className="mail-audience" aria-labelledby="mail-matches" aria-busy={checkingAudience}>
              <header><h3 id="mail-matches">Matching members</h3>
                <span className="op-count" role="status">{checkingAudience ? 'Checking…' : `${total.toLocaleString()} ${total === 1 ? 'recipient' : 'recipients'}`}</span>
              </header>
              {checkingAudience
                ? <RowsSkeleton rows={4} columns={2} compact label="Loading matching members" />
                : total === 0
                  ? <p className="mail-audience-empty">No active members with valid email addresses match this selection. Pending and rejected registrations are excluded.</p>
                  : page > totalPages
                    ? <p className="mail-audience-empty">This page is no longer available.{' '}
                      <button className="underline" type="button" onClick={() => setPage(totalPages)}>Show the last page</button></p>
                    : <ul aria-label="Email recipients">
                      {audience.data?.members?.map(member => (
                        <li key={member.id}>
                          <div className="mail-recipient-identity"><strong>{[member.firstName, member.lastName].filter(Boolean).join(' ') || 'Member'}</strong><span>{member.email}</span></div>
                          <span>{member.department || 'Department unavailable'}</span>
                          <span className="mail-recipient-year">{member.yearOfJoining || 'Year unavailable'}</span>
                        </li>
                      ))}
                    </ul>}
              {totalPages > 1 && page <= totalPages && <nav aria-label="Recipient pages">
                <p>Page {page} of {totalPages}</p>
                <div>
                  <button type="button" className="op-icon" aria-label="Previous recipient page" disabled={page <= 1 || checkingAudience} onClick={() => setPage(page - 1)}><ChevronLeft size={15} aria-hidden="true" /></button>
                  <button type="button" className="op-icon" aria-label="Next recipient page" disabled={page >= totalPages || checkingAudience} onClick={() => setPage(page + 1)}><ChevronRight size={15} aria-hidden="true" /></button>
                </div>
              </nav>}
            </section>}
        </>}
        {send.data?.total === 0 && <FormAlert>The audience changed before sending. No emails were sent.</FormAlert>}
        {send.isError && <FormAlert>{message(send.error, 'Could not send this email. Check the audience and try again.')}</FormAlert>}
        {deliveryFailed && <FormAlert>
          <p><strong>{send.data.sent} sent, {send.data.failed} failed.</strong> Check email delivery settings before sending again.</p>
          {send.data.failures?.length > 0 && <ul aria-label="Undelivered addresses">
            {send.data.failures.map(({ email }, index) => <li key={`${email}-${index}`}>{email}</li>)}
          </ul>}
        </FormAlert>}
      </fieldset>
      <footer className="op-dialog-foot mail-bulk-footer"><button type="button" className="op-secondary" disabled={send.isPending} onClick={onClose}>{deliveryFailed ? 'Close' : 'Cancel'}</button>
        {!deliveryFailed && <button className="op-primary" disabled={!canSend}><Send size={15} />{send.isPending ? 'Sending…' : mode === 'all'
          ? canSend ? `Send to ${total.toLocaleString()} ${total === 1 ? 'member' : 'members'}` : 'Send to active members'
          : 'Send to recipients'}</button>}</footer>
    </form>
  </PortalDialog>;
}

function TestSend({ template, variables, data, setData, onClose }) {
  const [to, setTo] = useState(() => {
    try { return localStorage.getItem('iedc_test_email') || ''; } catch { return ''; }
  });
  const send = useMutation({
    mutationFn: sendTestEmailTemplate,
    onSuccess: result => {
      if (result.sent) { toast.success('Test email sent'); onClose(); }
    },
  });
  return <PortalDialog labelledBy="test-title" busy={send.isPending} onClose={onClose}>
    <header className="op-dialog-head"><div><h2 id="test-title">Send test email</h2><p className="op-caption">{template.name}</p></div></header>
    <form onSubmit={event => {
      event.preventDefault();
      if (send.isPending) return;
      try { localStorage.setItem('iedc_test_email', to.trim()); } catch { /* Email delivery also works without browser storage. */ }
      send.mutate({ id: template._id, to: to.trim(), data });
    }}>
      <fieldset className="mail-dialog-fields" disabled={send.isPending}>
        <legend className="sr-only">Test email details</legend>
        <label className="op-field">Send to<input type="email" required autoComplete="email" value={to} onChange={event => setTo(event.target.value)} placeholder="you@example.com" /></label>
        {variables.length > 0 && <fieldset className="mail-data"><legend>Template variables</legend>
          {variables.map(key => <label key={key} className="op-field">{key}
            <input value={Object.hasOwn(data, key) ? data[key] : ''} onChange={e => setData(previous => ({ ...previous, [key]: e.target.value }))} />
          </label>)}</fieldset>}
        {send.isError && <FormAlert>{message(send.error, 'Could not send the test email. Check the address and try again.')}</FormAlert>}
        {send.data && !send.data.sent && <FormAlert>Email delivery failed. Ask an administrator to check the mail settings, then try again.</FormAlert>}
      </fieldset>
      <footer className="op-dialog-foot"><button type="button" className="op-secondary" onClick={onClose} disabled={send.isPending}>Cancel</button>
        <button className="op-primary" disabled={send.isPending}><Send size={15} />{send.isPending ? 'Sending…' : 'Send test'}</button></footer>
    </form>
  </PortalDialog>;
}

export default function Mailer() {
  const client = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({ search: '', page: 1 });
  const [selectedId, setSelection] = useState(undefined);
  const [edits, setEdits] = useState({});
  const [section, setSection] = useState('editor');
  const [modal, setModal] = useState(null);
  const [sample, setSample] = useState({});
  useEffect(() => {
    const timer = setTimeout(() => setFilter(previous => previous.search === search.trim() ? previous : { search: search.trim(), page: 1 }), 220);
    return () => clearTimeout(timer);
  }, [search]);
  const list = useQuery({
    queryKey: ['email-templates', filter.search, filter.page],
    queryFn: () => fetchEmailTemplates({ ...filter, limit: 20 }),
  });
  const selection = selectedId === undefined ? list.data?.templates?.[0]?._id : selectedId;
  const isNew = selection === 'new';
  const detail = useQuery({
    queryKey: ['email-template', selection],
    queryFn: () => fetchEmailTemplate(selection),
    enabled: Boolean(selection && !isNew),
  });
  const original = detail.data?.template || blank;
  const draft = { ...original, ...edits };
  const dirty = Object.keys(edits).some(key => edits[key] !== (original[key] ?? ''));
  const variables = useMemo(() => Array.from(new Set(Array.from(draft.html.matchAll(placeholderPattern), match => match[1]))), [draft.html]);
  const preview = useMemo(() => draft.html.replace(placeholderPattern, (match, key) => Object.hasOwn(sample, key) ? sample[key] : match), [draft.html, sample]);

  function select(next) {
    setSelection(next); setEdits({}); setSection('editor'); setModal(null); setSample({});
  }
  function open(next) {
    if (next === selection && next !== 'new') return;
    if (dirty) setModal({ type: 'discard', next }); else select(next);
  }
  const save = useMutation({
    mutationFn: () => isNew ? createEmailTemplate(draft) : updateEmailTemplate({ id: selection, ...draft }),
    onSuccess: data => {
      client.setQueryData(['email-template', data.template._id], data);
      client.invalidateQueries({ queryKey: ['email-templates'] });
      setEdits({}); setSelection(data.template._id);
      if (isNew) { setSearch(''); setFilter({ search: '', page: 1 }); }
      toast.success(isNew ? 'Template created' : 'Template saved');
    },
    onError: error => toast.error(message(error, 'The template could not be saved.')),
  });
  const remove = useMutation({
    mutationFn: deleteEmailTemplate,
    onSuccess: (_, id) => {
      if (id === selection) select(null); else setModal(null);
      client.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template deleted');
    },
    onError: error => toast.error(message(error, 'The template could not be deleted.')),
  });
  const templates = list.data?.templates || [];
  const page = list.data?.page || 1;
  const pages = list.data?.totalPages || 1;
  const ready = isNew || Boolean(detail.data?.template);
  const canSend = Boolean(selection && !isNew && ready && !dirty && !save.isPending);
  const canSave = ready && dirty && draft.key.trim() && draft.name.trim() && draft.html.trim() && !save.isPending;

  function update(field, value) {
    setSelection(selection);
    setEdits(previous => ({ ...previous, [field]: value }));
  }

  return <div className="op-page">
    <header className="op-header"><div><h1>Email center</h1><p>Manage templates and send email to your members.</p></div>
      <button className="op-primary" onClick={() => open('new')} disabled={save.isPending}><Plus size={16} />New template</button></header>
    <div className="mail-workspace">
      <section className="op-card mail-library" aria-labelledby="library-title">
        <div className="op-card-head"><h2 id="library-title">Template library</h2>
          {list.data && <span className="op-count" aria-label={`${list.data.total} templates`}>{list.data.total}</span>}
          <label className="op-search mail-search"><Search size={15} /><input type="search" aria-label="Search templates" placeholder="Search templates" value={search} onChange={e => setSearch(e.target.value)} /></label>
        </div>
        {list.isLoading ? <RowsSkeleton rows={5} columns={2} compact label="Loading templates" />
          : list.isError ? <div className="op-empty" role="alert">Templates could not be loaded.<br /><button className="op-secondary" onClick={() => list.refetch()}>Try again</button></div>
          : !templates.length ? <div className="op-empty">{filter.search ? 'No matching templates.' : 'Your template library is empty.'}</div>
          : <ul className="mail-list">{templates.map(t => <li key={t._id} className={selection === t._id ? 'is-selected' : ''}>
            <button type="button" className="mail-select" aria-pressed={selection === t._id} disabled={save.isPending} onClick={() => open(t._id)}>
              <span className="mail-file"><FileText size={16} /></span><span><strong>{t.name}</strong><small>{t.key}{t.isBase && ' · Base'}</small></span>
            </button>
            {!t.isBase && <button className="op-icon danger" onClick={() => setModal({ type: 'remove', template: t })} disabled={save.isPending} aria-label={`Delete ${t.name}`}><Trash2 size={14} /></button>}
          </li>)}</ul>}
        {list.data && <footer className="op-footer"><span className="op-caption">Page {page} of {pages}</span><nav className="op-pager" aria-label="Template library pages">
          <button className="op-icon" disabled={page <= 1} onClick={() => setFilter({ ...filter, page: page - 1 })} aria-label="Previous page"><ChevronLeft size={15} /></button>
          <button className="op-icon" disabled={page >= pages} onClick={() => setFilter({ ...filter, page: page + 1 })} aria-label="Next page"><ChevronRight size={15} /></button></nav></footer>}
      </section>
      <section className="op-card mail-editor" aria-labelledby="editor-title">
        <div className="op-card-head"><h2 id="editor-title">{isNew ? 'New template' : 'Template editor'}</h2>
          {ready && <div className="op-tabs" role="group" aria-label="Template view">
            <button className="op-tab" aria-pressed={section === 'editor'} onClick={() => setSection('editor')}><Code2 size={14} />Editor</button>
            <button className="op-tab" aria-pressed={section === 'preview'} onClick={() => setSection('preview')}><Eye size={14} />Preview</button></div>}
        </div>
        {!selection ? <div className="mail-empty"><span className="mail-empty-icon"><Mail size={27} /></span><h3>Select a template</h3><p>Choose a template from the library to edit or preview it.</p>
          <button className="op-secondary" onClick={() => open('new')}><Plus size={14} />New template</button></div>
          : !isNew && detail.isLoading ? <RowsSkeleton rows={6} columns={2} label="Loading template" />
          : !ready ? <div className="op-empty" role="alert">This template could not be opened.<br /><button className="op-secondary" onClick={() => detail.refetch()}>Try again</button></div>
          : <>
            {section === 'editor' ? <fieldset className="op-form mail-editor-fields" disabled={save.isPending}>
              <legend className="sr-only">Template details</legend>
              <label className="op-field">Template name<input required value={draft.name} onChange={e => update('name', e.target.value)} placeholder="Member welcome" /></label>
              <label className="op-field">Template key<input required disabled={!isNew} value={draft.key} onChange={e => update('key', e.target.value)} placeholder="member_welcome" /></label>
              <label className="op-field mail-span">Subject<input value={draft.subject || ''} onChange={e => update('subject', e.target.value)} placeholder="Welcome to IEDC" /></label>
              <label className="op-field mail-span">HTML<textarea required spellCheck={false} rows={10} value={draft.html} onChange={e => update('html', e.target.value)} aria-describedby="template-help" /></label>
              <p className="op-caption mail-span" id="template-help">Insert a variable using <code>{'{{name}}'}</code>.</p>
            </fieldset> : <div className="mail-preview"><iframe sandbox="" title="Email preview" referrerPolicy="no-referrer" srcDoc={preview} /></div>}
            <footer className="op-footer mail-actions">
              <div className="op-actions"><button className="op-secondary" disabled={!canSend} onClick={() => setModal({ type: 'test' })}><MailPlus size={14} />Test send</button>
                <button className="op-secondary" disabled={!canSend} onClick={() => setModal({ type: 'bulk' })}><Send size={14} />Bulk send</button></div>
              <button className="op-primary" disabled={!canSave} onClick={() => save.mutate()}><Save size={14} />{save.isPending ? 'Saving…' : 'Save template'}</button>
              {(dirty || isNew) && <p className="op-caption w-full">Save your template before sending an email.</p>}
            </footer>
          </>}
      </section>
    </div>
    {modal?.type === 'bulk' && <BulkSend template={original} onClose={() => setModal(null)} />}
    {modal?.type === 'test' && <TestSend template={original} variables={variables} data={sample} setData={setSample} onClose={() => setModal(null)} />}
    {['remove', 'discard'].includes(modal?.type) && <PortalDialog labelledBy="change-title" busy={remove.isPending} onClose={() => setModal(null)}>
      <div className="op-dialog-head"><h2 id="change-title">{modal.type === 'remove' ? 'Delete template?' : 'Discard your edits?'}</h2></div>
      <p className="op-caption p-5">{modal.type === 'remove' ? `“${modal.template.name}” will be removed from your template library.` : 'You have unsaved changes in the editor.'}</p>
      <div className="op-dialog-foot"><button className="op-secondary" disabled={remove.isPending} onClick={() => setModal(null)}>Cancel</button>
        <button className="op-danger" disabled={remove.isPending} onClick={() => modal.type === 'remove' ? remove.mutate(modal.template._id) : select(modal.next)}>
          {modal.type === 'remove' ? (remove.isPending ? 'Deleting…' : 'Delete template') : 'Discard changes'}</button></div>
    </PortalDialog>}
  </div>;
}
