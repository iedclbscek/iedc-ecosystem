import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Loader2, Plus, Save, Send, Eye } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  createEmailTemplate,
  fetchEmailTemplate,
  fetchEmailTemplates,
  sendBulkEmailTemplate,
  sendTestEmailTemplate,
  updateEmailTemplate,
} from '../api/adminService';

const extractVariables = (html) => {
  const text = String(html ?? '');
  const matches = text.match(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g) || [];
  const vars = matches
    .map((m) => m.replace(/{{|}}/g, '').trim())
    .filter(Boolean);
  return Array.from(new Set(vars));
};

const renderWithPlaceholders = (html, data) => {
  let out = String(html ?? '');
  for (const [k, v] of Object.entries(data || {})) {
    out = out.replace(new RegExp(`{{\\s*${k.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\s*}}`, 'g'), String(v ?? ''));
  }
  // show missing vars as-is
  return out;
};

export default function Mailer() {
  const queryClient = useQueryClient();

  const latestSelectedIdRef = useRef(null);

  const [selectedId, setSelectedId] = useState(null);

  // editor state
  const [mode, setMode] = useState('view'); // view | new
  const [draft, setDraft] = useState({ key: '', name: '', subject: '', html: '' });

  // test modal
  const [isTestOpen, setIsTestOpen] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [testData, setTestData] = useState({});

  // bulk modal
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState('upload'); // upload | all
  const [bulkRecipients, setBulkRecipients] = useState([]);
  const [bulkParseSummary, setBulkParseSummary] = useState(null);

  const { data: listData, isLoading: listLoading, isError: listError } = useQuery({
    queryKey: ['email-templates'],
    queryFn: fetchEmailTemplates,
    retry: false,
  });

  const templates = Array.isArray(listData?.templates) ? listData.templates : [];

  const { isFetching: selectedLoading } = useQuery({
    queryKey: ['email-template', selectedId],
    queryFn: () => fetchEmailTemplate(selectedId),
    enabled: Boolean(selectedId) && mode === 'view',
    retry: false,
  });

  const variables = useMemo(() => extractVariables(draft.html), [draft.html]);

  const previewHtml = useMemo(() => {
    const placeholderData = Object.fromEntries(
      variables.map((v) => [v, testData?.[v] ?? `{{${v}}}`])
    );
    return renderWithPlaceholders(draft.html, placeholderData);
  }, [draft.html, testData, variables]);

  const createMutation = useMutation({
    mutationFn: createEmailTemplate,
    onSuccess: (res) => {
      toast.success('Template created');
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      setMode('view');
      setSelectedId(res?.template?._id || null);
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to create template'),
  });

  const updateMutation = useMutation({
    mutationFn: updateEmailTemplate,
    onSuccess: () => {
      toast.success('Template saved');
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      if (selectedId) queryClient.invalidateQueries({ queryKey: ['email-template', selectedId] });
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to save template'),
  });

  const testMutation = useMutation({
    mutationFn: sendTestEmailTemplate,
    onSuccess: (res) => {
      if (res?.sent) toast.success('Test email sent');
      else toast.error(res?.reason || 'Email not sent');
      setIsTestOpen(false);
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to send test email'),
  });

  const bulkMutation = useMutation({
    mutationFn: sendBulkEmailTemplate,
    onSuccess: (res) => {
      toast.success(`Bulk send done: ${res?.sent ?? 0} sent, ${res?.failed ?? 0} failed`);
      setIsBulkOpen(false);
      setBulkRecipients([]);
      setBulkParseSummary(null);
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to bulk send email'),
  });

  const startNew = () => {
    setMode('new');
    setSelectedId(null);
    setDraft({ key: '', name: '', subject: '', html: '' });
    setTestData({});
  };

  const selectTemplate = async (id) => {
    setMode('view');
    setSelectedId(id);
    setTestData({});

    latestSelectedIdRef.current = id;
    try {
      const data = await queryClient.fetchQuery({
        queryKey: ['email-template', id],
        queryFn: () => fetchEmailTemplate(id),
      });
      if (latestSelectedIdRef.current !== id) return;
      const t = data?.template;
      if (!t) return;
      setDraft({
        key: t.key || '',
        name: t.name || '',
        subject: t.subject || '',
        html: t.html || '',
      });
    } catch (err) {
      if (latestSelectedIdRef.current !== id) return;
      toast.error(err?.response?.data?.message || 'Failed to load template');
    }
  };

  const canSave = Boolean(draft.name.trim() && draft.html.trim()) && !updateMutation.isPending;
  const canCreate =
    Boolean(draft.key.trim() && draft.name.trim() && draft.html.trim()) && !createMutation.isPending;

  const save = () => {
    if (mode === 'new') {
      createMutation.mutate(draft);
      return;
    }
    if (!selectedId) return;
    updateMutation.mutate({ id: selectedId, ...draft });
  };

  const openTest = () => {
    if (!selectedId && mode !== 'new') return;
    const saved = window.localStorage.getItem('iedc_test_email') || '';
    setTestTo(saved);
    setIsTestOpen(true);
  };

  const openBulk = () => {
    if (!selectedId) {
      toast.error('Save/select a template first');
      return;
    }
    setBulkMode('upload');
    setBulkRecipients([]);
    setBulkParseSummary(null);
    setIsBulkOpen(true);
  };

  const parseRowsToRecipients = (rows) => {
    const safeRows = Array.isArray(rows) ? rows : [];

    // find email column (case-insensitive)
    const keys = safeRows.length > 0 ? Object.keys(safeRows[0] || {}) : [];
    const emailKey = keys.find((k) => String(k).trim().toLowerCase() === 'email');
    if (!emailKey) {
      toast.error('File must contain an "email" column');
      return { recipients: [], summary: { parsed: 0, valid: 0, invalid: 0 } };
    }

    let valid = 0;
    let invalid = 0;
    const recipients = [];

    for (const row of safeRows) {
      const email = String(row?.[emailKey] ?? '').trim();
      if (!email) {
        invalid++;
        continue;
      }

      const data = {};
      for (const [k, v] of Object.entries(row || {})) {
        if (String(k) === String(emailKey)) continue;
        const value = String(v ?? '').trim();
        if (value === '') continue;
        data[String(k).trim()] = value;
      }

      recipients.push({ email, data });
      valid++;
    }

    return {
      recipients,
      summary: { parsed: safeRows.length, valid, invalid },
    };
  };

  const onUploadFile = async (file) => {
    if (!file) return;

    const name = String(file.name || '').toLowerCase();
    setBulkParseSummary(null);
    setBulkRecipients([]);

    try {
      if (name.endsWith('.csv')) {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const rows = Array.isArray(results?.data) ? results.data : [];
            const { recipients, summary } = parseRowsToRecipients(rows);
            setBulkRecipients(recipients);
            setBulkParseSummary(summary);
            if (recipients.length === 0) toast.error('No valid recipients found');
            else toast.success(`Parsed ${recipients.length} recipients`);
          },
          error: () => toast.error('Failed to parse CSV'),
        });
        return;
      }

      if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = wb.SheetNames?.[0];
        if (!firstSheetName) {
          toast.error('No sheet found in file');
          return;
        }
        const ws = wb.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        const { recipients, summary } = parseRowsToRecipients(rows);
        setBulkRecipients(recipients);
        setBulkParseSummary(summary);
        if (recipients.length === 0) toast.error('No valid recipients found');
        else toast.success(`Parsed ${recipients.length} recipients`);
        return;
      }

      toast.error('Upload a .csv or .xlsx file');
    } catch {
      toast.error('Failed to read file');
    }
  };

  const sendBulkNow = () => {
    if (!selectedId) {
      toast.error('Save/select a template first');
      return;
    }

    if (bulkMode === 'all') {
      bulkMutation.mutate({ id: selectedId, sendTo: 'all' });
      return;
    }

    if (!Array.isArray(bulkRecipients) || bulkRecipients.length === 0) {
      toast.error('Upload a file with recipients first');
      return;
    }

    bulkMutation.mutate({ id: selectedId, sendTo: 'list', recipients: bulkRecipients });
  };

  const sendTest = () => {
    if (!selectedId) {
      toast.error('Save the template first');
      return;
    }
    if (!testTo.trim()) {
      toast.error('Enter your email');
      return;
    }
    window.localStorage.setItem('iedc_test_email', testTo.trim());
    testMutation.mutate({ id: selectedId, to: testTo.trim(), data: testData });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Email Center</h1>
          <p className="text-slate-500 text-sm">Manage email templates, preview, and send test emails.</p>
        </div>
        <button
          onClick={startNew}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-200 transition-all"
        >
          <Plus size={18} />
          New Template
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: templates list */}
        <div className="xl:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 font-bold">Templates</div>

          {listLoading ? (
            <div className="p-6 flex items-center gap-2 text-slate-500">
              <Loader2 className="animate-spin" size={16} />
              Loading...
            </div>
          ) : listError ? (
            <div className="p-6 text-slate-500">Failed to load templates.</div>
          ) : templates.length === 0 ? (
            <div className="p-6 text-slate-500">No templates yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {templates.map((t) => (
                <button
                  key={t._id}
                  type="button"
                  onClick={() => selectTemplate(t._id)}
                  className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${
                    selectedId === t._id && mode === 'view' ? 'bg-blue-50' : 'bg-white'
                  }`}
                >
                  <div className="font-semibold text-slate-900">{t.name}</div>
                  <div className="text-xs text-slate-500">
                    {t.key}{t.isBase ? ' • Base' : ''}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: editor + preview */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="font-bold">{mode === 'new' ? 'Create Template' : 'Edit Template'}</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openBulk}
                  disabled={mode === 'new' || !selectedId}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-50"
                >
                  <Send size={16} />
                  Bulk Send
                </button>
                <button
                  type="button"
                  onClick={openTest}
                  disabled={mode === 'new' || !selectedId}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-50"
                >
                  <Send size={16} />
                  Test Send
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={mode === 'new' ? !canCreate : !canSave}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold disabled:opacity-50"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="animate-spin" size={16} />
                  )}
                  <Save size={16} />
                  Save
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {mode === 'view' && selectedLoading ? (
                <div className="flex items-center gap-2 text-slate-500">
                  <Loader2 className="animate-spin" size={16} />
                  Loading template...
                </div>
              ) : mode === 'view' && !selectedId ? (
                <div className="text-slate-500">Select a template to edit.</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-bold text-slate-700">Key</label>
                      <input
                        value={draft.key}
                        onChange={(e) => setDraft((p) => ({ ...p, key: e.target.value }))}
                        disabled={mode !== 'new'}
                        placeholder="password_reset"
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:bg-slate-50"
                      />
                      <p className="text-[11px] text-slate-400">Used by backend to pick a template.</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-bold text-slate-700">Subject</label>
                      <input
                        value={draft.subject}
                        onChange={(e) => setDraft((p) => ({ ...p, subject: e.target.value }))}
                        placeholder="Reset Your Password"
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-700">Name</label>
                    <input
                      value={draft.name}
                      onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Password Reset"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-700">HTML</label>
                    <textarea
                      value={draft.html}
                      onChange={(e) => setDraft((p) => ({ ...p, html: e.target.value }))}
                      rows={12}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                    <p className="text-[11px] text-slate-400">
                      Use variables like <span className="font-mono">{'{{link}}'}</span>.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center gap-2 font-bold">
              <Eye size={16} className="text-slate-400" />
              Preview
            </div>
            <div className="p-4">
              <iframe
                title="email-preview"
                className="w-full h-96 sm:h-130 rounded-xl border border-slate-200 bg-white"
                sandbox="allow-same-origin"
                referrerPolicy="no-referrer"
                srcDoc={previewHtml}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Test modal */}
      {isTestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => {
              if (testMutation.isPending) return;
              setIsTestOpen(false);
            }}
          />

          <div className="relative w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900">Send Test Email</h3>
                <p className="text-sm text-slate-500">We’ll ask for required template data.</p>
              </div>
              <button
                onClick={() => {
                  if (testMutation.isPending) return;
                  setIsTestOpen(false);
                }}
                className="p-2 rounded-xl hover:bg-slate-50 text-slate-500"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">Send to</label>
                <input
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              {variables.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-bold text-slate-700">Template data</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {variables.map((v) => (
                      <div key={v} className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                          {v}
                        </label>
                        <input
                          value={testData?.[v] || ''}
                          onChange={(e) => setTestData((p) => ({ ...p, [v]: e.target.value }))}
                          placeholder={`Value for ${v}`}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  if (testMutation.isPending) return;
                  setIsTestOpen(false);
                }}
                className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={sendTest}
                disabled={testMutation.isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold disabled:opacity-50"
              >
                {testMutation.isPending && <Loader2 className="animate-spin" size={16} />}
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk modal */}
      {isBulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => {
              if (bulkMutation.isPending) return;
              setIsBulkOpen(false);
            }}
          />

          <div className="relative w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900">Bulk Send</h3>
                <p className="text-sm text-slate-500">Upload a CSV/XLSX or send to all members.</p>
              </div>
              <button
                onClick={() => {
                  if (bulkMutation.isPending) return;
                  setIsBulkOpen(false);
                }}
                className="p-2 rounded-xl hover:bg-slate-50 text-slate-500"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <div className="text-sm font-bold text-slate-700">Send mode</div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      name="bulkMode"
                      checked={bulkMode === 'upload'}
                      onChange={() => setBulkMode('upload')}
                    />
                    Upload CSV/XLSX
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      name="bulkMode"
                      checked={bulkMode === 'all'}
                      onChange={() => setBulkMode('all')}
                    />
                    All active members
                  </label>
                </div>
              </div>

              {bulkMode === 'upload' ? (
                <div className="space-y-2">
                  <div className="text-sm font-bold text-slate-700">Upload file</div>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => onUploadFile(e.target.files?.[0])}
                    className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-slate-900 file:text-white file:font-semibold hover:file:bg-slate-800"
                  />
                  <div className="text-xs text-slate-500">
                    Required column: <span className="font-mono">email</span>. Other columns become template variables.
                  </div>
                  {bulkParseSummary ? (
                    <div className="text-sm text-slate-600">
                      Parsed {bulkParseSummary.parsed} rows • {bulkParseSummary.valid} valid • {bulkParseSummary.invalid} skipped
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="text-sm text-slate-600">
                  This will send to all <span className="font-semibold">active</span> registrations in the database.
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  if (bulkMutation.isPending) return;
                  setIsBulkOpen(false);
                }}
                className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={sendBulkNow}
                disabled={bulkMutation.isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold disabled:opacity-50"
              >
                {bulkMutation.isPending && <Loader2 className="animate-spin" size={16} />}
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
