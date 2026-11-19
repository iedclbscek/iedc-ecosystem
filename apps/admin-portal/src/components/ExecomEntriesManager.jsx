import { teamSection, teamSections } from '../../../../shared/teamSections';
import FormAlert from './FormAlert';
import './execom-roster.css';
import './execom-profile-editor.css';
import { RowsSkeleton } from './InlineSkeleton';
import { normalizePortalRole } from '../utils/authorization';
import PortalDialog from './PortalDialog';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowUp, ArrowDown, GripVertical, Loader2, Plus, Trash2, Send, Upload, UserRound, X } from 'lucide-react';
import toast from 'react-hot-toast';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import {
  createWebsiteTeamEntry,
  deleteWebsiteTeamEntry,
  fetchWebsiteTeamEntries,
  fetchWebsiteTeamYears,
  reorderWebsiteTeamEntries,
  updateWebsiteTeamEntry,
  uploadCloudinaryImage,
  sendWebsiteTeamUpdateEmail,
} from '../api/adminService';

const normalize = (v) => String(v ?? '').trim().toLowerCase();

function RosterDialog({ title, subtitle, busy, onClose, onSubmit, onInput, submitLabel, error, children }) {
  return (
    <PortalDialog label={title} onClose={onClose} busy={busy} className="roster-dialog">
      <form className="roster-dialog-form" noValidate onInput={onInput} onSubmit={event => {
        event.preventDefault();
        if (!busy) onSubmit(event.currentTarget);
      }}>
        <header className="op-dialog-head roster-dialog-head">
          <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
          <button type="button" className="op-icon" aria-label={'Close ' + title} disabled={busy} onClick={onClose}><X size={16} /></button>
        </header>
        <div className="roster-dialog-scroll"><fieldset disabled={busy} className="roster-dialog-fields">{children}</fieldset></div>
        <footer className="roster-dialog-foot">
          {error && <FormAlert>{error}</FormAlert>}
          <div className="op-actions"><button type="button" className="op-secondary" disabled={busy} onClick={onClose}>Cancel</button>
            <button className="op-primary" type="submit" disabled={busy}>{busy && <Loader2 size={15} className="animate-spin" />}{submitLabel}</button>
          </div>
        </footer>
      </form>
    </PortalDialog>
  );
}

function ProfileField({ label, value, onChange, ...props }) {
  return <label className="op-field">{label}<input {...props} value={value} onChange={event => onChange(event.target.value)} /></label>;
}

function VisibilityField({ value, onChange }) {
  return <label className="roster-visibility"><span><strong>Visible on website</strong><small>Show this profile on the public Execom roster.</small></span>
    <input type="checkbox" checked={value} onChange={event => onChange(event.target.checked)} />
  </label>;
}

function requiredMessage(form) {
  for (const input of form.querySelectorAll('input:not(:disabled)')) {
    if (input.required && !input.value.trim()) {
      input.focus();
      return 'Enter ' + input.dataset.requiredLabel + '.';
    }
    if (input.validity.typeMismatch) {
      input.focus();
      return 'Enter a valid email address.';
    }
  }
  return '';
}

function ProfilePhoto({ value, onChange, onBusyChange, uploading }) {
  const fileInput = useRef(null);
  const image = useRef(null);
  const started = useRef(false);
  const [file, setFile] = useState(null);
  const [crop, setCrop] = useState(null);
  const [error, setError] = useState('');
  const [unavailable, setUnavailable] = useState('');
  useEffect(() => () => { if (file) URL.revokeObjectURL(file.url); }, [file]);

  function choose(candidate) {
    if (!candidate) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(candidate.type)) { setError('Choose a JPEG, PNG or WebP photo.'); return; }
    if (candidate.size > 3 * 1024 * 1024) { setError('Choose a photo of 3 MB or less.'); return; }
    setError('');
    setCrop(null);
    setFile({ url: URL.createObjectURL(candidate), name: candidate.name });
  }

  function closeCrop() {
    setFile(null);
    setCrop(null);
    setError('');
  }

  async function upload() {
    if (started.current || !crop?.width || !crop.height || !image.current) return;
    started.current = true;
    onBusyChange(true);
    setError('');
    try {
      const img = image.current;
      const sourceWidth = img.naturalWidth * crop.width / 100;
      const sourceHeight = img.naturalHeight * crop.height / 100;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = Math.max(1, Math.round(Math.min(1600, sourceWidth, sourceHeight)));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Your browser could not prepare this crop.');
      context.imageSmoothingQuality = 'high';
      context.drawImage(img, img.naturalWidth * crop.x / 100, img.naturalHeight * crop.y / 100, sourceWidth, sourceHeight,
        0, 0, canvas.width, canvas.height);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', .9));
      if (!blob) throw new Error('Could not prepare the crop. Choose another photo.');
      const source = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read the cropped photo.'));
        reader.readAsDataURL(blob);
      });
      const result = await uploadCloudinaryImage({ source, purpose: 'profile' });
      if (!result?.url) throw new Error('No photo URL was returned. Try the upload again.');
      onChange(result.url);
      setUnavailable('');
      closeCrop();
    } catch (failure) {
      setError(failure.response?.data?.message || (failure.isAxiosError ? 'Could not upload this photo. Try again.' : failure.message));
    } finally {
      started.current = false;
      onBusyChange(false);
    }
  }

  return <>
    <div className="roster-photo">
      {value && unavailable !== value ? <img alt="Profile photo preview" src={value} onError={() => setUnavailable(value)} />
        : <span className="roster-photo-placeholder"><UserRound size={22} /></span>}
      <div><strong>Profile photo</strong><span>JPEG, PNG or WebP · Up to 3 MB</span></div>
      <input ref={fileInput} hidden type="file" aria-label="Profile photo file" accept="image/jpeg,image/png,image/webp"
        onChange={event => { const imageFile = event.target.files?.[0]; event.target.value = ''; choose(imageFile); }} />
      <button type="button" className="op-secondary" onClick={() => fileInput.current?.click()}><Upload size={14} />Choose photo</button>
    </div>
    <ProfileField label="Photo URL" inputMode="url" value={value} onChange={onChange} placeholder="https://" />
    {!file && error && <FormAlert>{error}</FormAlert>}
    {file && <PortalDialog label="Crop image" className="roster-dialog roster-photo-dialog" onClose={closeCrop} busy={uploading}>
      <header className="op-dialog-head roster-dialog-head"><div><h2>Crop image</h2><p>{file.name}</p></div>
        <button type="button" className="op-icon" aria-label="Close crop editor" disabled={uploading} onClick={closeCrop}><X size={16} /></button>
      </header>
      <div className="roster-dialog-scroll roster-crop-body">
        <div className="roster-crop-stage"><ReactCrop crop={crop || undefined} aspect={1} keepSelection ruleOfThirds
          disabled={uploading || !crop} onChange={(_, next) => setCrop(next)}>
          <img src={file.url} ref={image} alt="Profile photo to crop" onLoad={event => {
            const { naturalWidth, naturalHeight } = event.currentTarget;
            setCrop(centerCrop(makeAspectCrop({ unit: '%', width: 100 }, 1, naturalWidth, naturalHeight), naturalWidth, naturalHeight));
          }} onError={() => { setCrop(null); setError('Could not open this image. Cancel and choose another photo.'); }} />
        </ReactCrop></div>
        <p className="op-caption">Move or resize the square frame to choose the profile photo.</p>
      </div>
      <footer className="roster-dialog-foot">
        {error && <FormAlert>{error}</FormAlert>}
        <div className="op-actions"><button type="button" className="op-secondary" onClick={closeCrop} disabled={uploading}>Cancel</button>
          <button type="button" className="op-primary" onClick={upload} disabled={uploading || !crop?.width || !crop.height}>
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}{uploading ? 'Uploading…' : 'Upload photo'}
          </button>
        </div>
      </footer>
    </PortalDialog>}
  </>;
}

function SortableRow({ entry, onDelete, onEdit, onSendEmail, sendingEmailId, arranging, busy, index, count, onMove }) {
  const id = String(entry?._id ?? entry?.id ?? '');
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !arranging || busy });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const user = entry?.userRef || entry?.user || null;
  const displayName = user?.name || entry?.customName || '—';
  const displayMembership = user?.membershipId || entry?.customMembershipId;
  const displayEmail = user?.email || entry?.customEmail;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`roster-row ${isDragging ? 'roster-row-dragging' : ''}`}
    >
      {arranging && <div className="roster-order-controls">
        <button type="button" className="op-icon roster-drag" aria-label={'Drag ' + displayName} disabled={busy} {...attributes} {...listeners}>
          <GripVertical size={16} />
        </button>
        <span className="roster-position">{index + 1}</span>
        <button type="button" className="op-icon" aria-label={'Move ' + displayName + ' up'} disabled={busy || index === 0} onClick={() => onMove(-1)}><ArrowUp size={14} /></button>
        <button type="button" className="op-icon" aria-label={'Move ' + displayName + ' down'} disabled={busy || index === count - 1} onClick={() => onMove(1)}><ArrowDown size={14} /></button>
      </div>}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="font-semibold text-slate-900 truncate">{displayName}</div>
          {displayMembership ? (
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-700">
              {String(displayMembership).toUpperCase()}
            </span>
          ) : null}
        </div>
        <div className="text-xs text-slate-500 truncate">{displayEmail || ''}</div>
      </div>

      <span className="roster-role">{entry.roleTitle || 'Member'}</span>
      <span className={entry.visible ? 'op-status active' : 'op-status'}>{entry.visible ? 'Visible' : 'Hidden'}</span>
      {!arranging && <div className="roster-actions">
        <button type="button" className="op-icon" aria-label={'Send update email to ' + displayName} title="Send profile update email" onClick={() => onSendEmail?.(entry)} disabled={busy || sendingEmailId === id}>
          {sendingEmailId === id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
        <button type="button" className="op-secondary" disabled={busy} onClick={() => onEdit?.(entry)}>Edit</button>
        <button type="button" className="op-icon danger" aria-label={'Remove ' + displayName} disabled={busy} onClick={() => onDelete(id)}><Trash2 size={14} /></button>
      </div>}

    </div>
  );
}

export default function ExecomEntriesManager({ users, canManageUsers }) {
  const queryClient = useQueryClient();

  const execomUsers = useMemo(
    () => (Array.isArray(users) ? users : []).filter((u) => normalizePortalRole(u?.role) === 'iedc_execom'),
    [users]
  );

  const { data: yearsData, isLoading: yearsLoading } = useQuery({
    queryKey: ['websiteTeamYears', 'execom'],
    queryFn: () => fetchWebsiteTeamYears({ category: 'execom' }),
    enabled: canManageUsers,
    retry: false,
  });

  const years = useMemo(
    () => (Array.isArray(yearsData?.years) ? yearsData.years : []),
    [yearsData]
  );
  const [year, setYear] = useState('');
  const [orderDraft, setOrderDraft] = useState(null);
  const effectiveYear = years.includes(year) ? year : years[0] || '';

  const entriesQuery = useQuery({
    queryKey: ['websiteTeamEntries', 'execom', effectiveYear],
    queryFn: () => fetchWebsiteTeamEntries({ category: 'execom', year: effectiveYear }),
    enabled: canManageUsers && Boolean(effectiveYear),
    retry: false,
  });

  const sortedEntries = useMemo(() => {
    const entries = Array.isArray(entriesQuery.data?.entries) ? entriesQuery.data.entries : [];
    return [...entries].sort((a, b) => {
      const oa = Number(a?.order ?? 0);
      const ob = Number(b?.order ?? 0);
      if (oa !== ob) return oa - ob;
      return String(a?._id ?? '').localeCompare(String(b?._id ?? ''));
    });
  }, [entriesQuery.data]);

  const refreshRoster = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['websiteTeamYears', 'execom'] }),
    queryClient.invalidateQueries({ queryKey: ['websiteTeamEntries', 'execom'] }),
  ]);

  const createMutation = useMutation({
    mutationFn: createWebsiteTeamEntry,
    onSuccess: async () => {
      await refreshRoster();
      toast.success('Added to execom year');
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateWebsiteTeamEntry,
    onSuccess: async () => {
      await refreshRoster();
      toast.success('Updated entry');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWebsiteTeamEntry,
    onSuccess: async () => {
      await refreshRoster();
      toast.success('Removed');
    },
    onError: (e) => {
      toast.error(e?.response?.data?.message || 'Failed to remove');
    },
  });

  const reorderMutation = useMutation({
    mutationFn: reorderWebsiteTeamEntries,
    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['websiteTeamEntries', 'execom', variables.year] });
      setOrderDraft(null);
      toast.success('Website order saved');
    },
  });
  const arranging = orderDraft !== null;
  const displayEntries = orderDraft ?? sortedEntries;
  const busy = reorderMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const sectionFor = entry => teamSection(entry.roleTitle, entry.userRef?.membershipId || entry.customMembershipId);
  function moveEntry(fromId, toId) {
    if (!orderDraft || busy || fromId === toId) return;
    const from = orderDraft.findIndex(entry => String(entry._id) === fromId);
    const to = orderDraft.findIndex(entry => String(entry._id) === toId);
    if (from < 0 || to < 0 || sectionFor(orderDraft[from]) !== sectionFor(orderDraft[to])) return;
    setOrderDraft(arrayMove(orderDraft, from, to));
  }

  const sendUpdateEmailMutation = useMutation({
    mutationFn: ({ id }) => sendWebsiteTeamUpdateEmail(id),
    onMutate: ({ id }) => {
      setSendingEmailId(id);
    },
    onSuccess: () => {
      toast.success('Update email sent');
    },
    onError: (e) => {
      toast.error(e?.response?.data?.message || 'Failed to send email');
    },
    onSettled: () => {
      setSendingEmailId('');
    },
  });

  const handleSendEmail = (entry) => {
    const id = String(entry?._id ?? entry?.id ?? '');
    if (!id) return;
    sendUpdateEmailMutation.mutate({ id });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [isUploading, setIsUploading] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [sendingEmailId, setSendingEmailId] = useState('');
  const [editForm, setEditForm] = useState({
    year: '',
    roleTitle: '',
    visible: true,
    customName: '',
    customEmail: '',
    customMembershipId: '',
    imageUrl: '',
    linkedin: '',
    github: '',
    twitter: '',
  });
  const [formError, setFormError] = useState('');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [newEntryType, setNewEntryType] = useState('user');
  const [newUserSearch, setNewUserSearch] = useState('');
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [customMembershipId, setCustomMembershipId] = useState('');
  const [newRoleTitle, setNewRoleTitle] = useState('');
  const [newVisible, setNewVisible] = useState(true);
  const [newYear, setNewYear] = useState('');

  const filteredExecomUsers = useMemo(() => {
    const q = normalize(newUserSearch);
    if (!q) return execomUsers;
    return execomUsers.filter((u) => {
      const name = normalize(u?.name);
      const mid = normalize(u?.membershipId);
      const email = normalize(u?.email);
      return name.includes(q) || mid.includes(q) || email.includes(q);
    });
  }, [execomUsers, newUserSearch]);

  const startEdit = (entry) => {
    if (!entry) return;
    updateMutation.reset();
    setFormError('');
    setEditEntry(entry);
    setEditForm({
      year: String(entry.year || effectiveYear || ''),
      roleTitle: entry.roleTitle || '',
      visible: Boolean(entry.visible),
      customName: entry.customName || entry.userRef?.name || '',
      customEmail: entry.customEmail || entry.userRef?.email || '',
      customMembershipId: entry.customMembershipId || entry.userRef?.membershipId || '',
      imageUrl: entry.imageUrl || '',
      linkedin: entry.linkedin || '',
      github: entry.github || '',
      twitter: entry.twitter || '',
    });
  };

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  function startAdd() {
    createMutation.reset();
    setFormError('');
    setNewYear(effectiveYear);
    setNewEntryType('user');
    setNewUserId('');
    setNewUserSearch('');
    setNewRoleTitle('');
    setCustomName('');
    setCustomEmail('');
    setCustomMembershipId('');
    setNewVisible(true);
    setIsAddOpen(true);
  }

  function handleAdd(form) {
    const error = requiredMessage(form);
    if (error) { setFormError(error); return; }
    if (newEntryType === 'user' && !newUserId) {
      setFormError('Select the Execom member to add.');
      form.elements.namedItem('memberSearch')?.focus();
      return;
    }
    setFormError('');
    const nextYear = newYear.trim();
    createMutation.mutate({
      category: 'execom', year: nextYear, entryType: newEntryType,
      userId: newEntryType === 'user' ? newUserId : undefined,
      customName: newEntryType === 'custom' ? customName.trim() : undefined,
      customEmail: newEntryType === 'custom' ? customEmail.trim() : undefined,
      customMembershipId: newEntryType === 'custom' ? customMembershipId.trim() : undefined,
      roleTitle: newRoleTitle.trim(), visible: newVisible,
    }, { onSuccess: () => { setYear(nextYear); setIsAddOpen(false); } });
  }

  const handleSaveEdit = (form) => {
    if (!editEntry) return;
    const error = requiredMessage(form);
    if (error) { setFormError(error); return; }
    setFormError('');
    const trimmedYear = editForm.year.trim();

    const payload = {
      id: editEntry._id,
      year: trimmedYear,
      roleTitle: editForm.roleTitle.trim(),
      visible: Boolean(editForm.visible),
      imageUrl: editForm.imageUrl.trim(),
      linkedin: editForm.linkedin.trim(),
      github: editForm.github.trim(),
      twitter: editForm.twitter.trim(),
    };

    if (editEntry.entryType === 'custom') {
      payload.customName = editForm.customName.trim();
      payload.customEmail = editForm.customEmail.trim();
      payload.customMembershipId = editForm.customMembershipId.trim();
    }

    updateMutation.mutate(payload, {
      onSuccess: () => {
        setYear(trimmedYear);
        setEditEntry(null);
      },
    });
  };

  if (!canManageUsers) {
    return null;
  }

  return (
    <div className="op-card overflow-hidden min-w-0">
      <div className="op-card-head">
        <div>
          <div className="font-bold text-slate-900">Website roster</div>
          <div className="text-sm text-slate-500">
            Arrange members within the same sections shown on the main site.
          </div>
        </div>
        <button
          type="button"
          disabled={arranging || busy}
          onClick={startAdd}
          className="op-primary"
        >
          <Plus size={18} />
          Add to year
        </button>
      </div>

      <div className="roster-toolbar">
        <div className="text-sm font-semibold text-slate-700">Year</div>
        <select
          aria-label="Roster year" value={effectiveYear} disabled={arranging || busy}
          onChange={(e) => setYear(e.target.value)}
        >
          <option value="">Select year...</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        {effectiveYear && sortedEntries.length > 0 && <div className="roster-toolbar-actions">
          {arranging ? <>
            <button className="op-secondary" type="button" disabled={busy} onClick={() => { setOrderDraft(null); reorderMutation.reset(); }}>Cancel</button>
            <button className="op-primary" type="button" disabled={busy} onClick={() => reorderMutation.mutate({
              category: 'execom', year: effectiveYear, orderedIds: orderDraft.map(entry => String(entry._id)),
            })}>{busy ? 'Saving…' : 'Save order'}</button>
          </> : <button className="op-secondary" type="button" disabled={busy} onClick={() => { reorderMutation.reset(); setOrderDraft(sortedEntries); }}>Arrange members</button>}
        </div>}
        {yearsLoading ? (
          <div className="inline-flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="animate-spin" size={16} />
            Loading years...
          </div>
        ) : null}
        {!yearsLoading && years.length === 0 ? (
          <div className="text-sm text-slate-500">
            No years yet. Use "Add to year" to create the first year.
          </div>
        ) : null}
      </div>

      <div className="roster-content">
        {reorderMutation.isError && <FormAlert>{reorderMutation.error?.response?.data?.message || 'Could not save the order. Your arrangement is still here. Try again.'}</FormAlert>}
        {arranging && <p className="op-caption" role="status">Drag using the handle or use the arrows. Select Save order to update the main site.</p>}
        {entriesQuery.isLoading ? <RowsSkeleton rows={4} columns={3} label="Loading website roster" />
          : entriesQuery.isError ? <FormAlert>Could not load this roster. <button type="button" onClick={() => entriesQuery.refetch()}>Try again</button></FormAlert>
          : !displayEntries.length ? <p className="op-empty">No members for this year. Add a member to start the roster.</p>
          : <DndContext key={effectiveYear + String(arranging)} sensors={sensors} collisionDetection={closestCenter} onDragEnd={({ active, over }) => {
            if (over) moveEntry(String(active.id), String(over.id));
          }}>
            {teamSections.map(([key, title]) => {
              const members = displayEntries.filter(entry => sectionFor(entry) === key);
              if (!members.length) return null;
              return <section key={key} className="roster-section" aria-label={title}>
                <header><h3>{title}</h3><span className="op-count">{members.length}</span></header>
                <SortableContext items={members.map(entry => String(entry._id))} strategy={verticalListSortingStrategy}>
                  <div className="roster-list">{members.map((entry, index) => <SortableRow key={String(entry._id)} entry={entry}
                    arranging={arranging} busy={busy} index={index} count={members.length}
                    onMove={offset => moveEntry(String(entry._id), String(members[index + offset]._id))}
                    onDelete={id => deleteMutation.mutate(id)} onEdit={startEdit} onSendEmail={handleSendEmail} sendingEmailId={sendingEmailId}
                  />)}</div>
                </SortableContext>
              </section>;
            })}
          </DndContext>}
      </div>

      {editEntry && <RosterDialog title="Edit Execom entry" subtitle={editEntry.userRef?.name || editEntry.customName}
        busy={updateMutation.isPending || isUploading} onClose={() => setEditEntry(null)} onSubmit={handleSaveEdit}
        onInput={() => { if (formError) setFormError(''); if (updateMutation.isError) updateMutation.reset(); }}
        submitLabel={updateMutation.isPending ? 'Saving…' : 'Save changes'}
        error={formError || (updateMutation.isError && (updateMutation.error?.response?.data?.message || 'Could not save this entry. Try again.'))}>
        <section><h3>Roster details</h3><div className="roster-field-grid">
          <ProfileField label="Year" required data-required-label="the roster year" value={editForm.year} onChange={value => handleEditChange('year', value)} />
          <ProfileField label="Role title" value={editForm.roleTitle} onChange={value => handleEditChange('roleTitle', value)} placeholder="e.g. Chief executive officer" />
        </div></section>
        {editEntry.entryType === 'custom' && <section><h3>Member details</h3>
          <ProfileField label="Full name" required data-required-label="the member’s name" value={editForm.customName} onChange={value => handleEditChange('customName', value)} />
          <div className="roster-field-grid">
            <ProfileField label="Membership ID" value={editForm.customMembershipId} onChange={value => handleEditChange('customMembershipId', value)} />
            <ProfileField label="Email" type="email" value={editForm.customEmail} onChange={value => handleEditChange('customEmail', value)} />
          </div>
        </section>}
        <section><h3>Public profile</h3>
          <ProfilePhoto value={editForm.imageUrl} onChange={value => handleEditChange('imageUrl', value)} uploading={isUploading} onBusyChange={setIsUploading} />
          <div className="roster-field-grid">{[['linkedin', 'LinkedIn'], ['github', 'GitHub'], ['twitter', 'X / Twitter']].map(([key, label]) =>
            <ProfileField key={key} label={label} inputMode="url" placeholder="Profile URL" value={editForm[key]} onChange={value => handleEditChange(key, value)} />
          )}</div>
          <VisibilityField value={editForm.visible} onChange={value => handleEditChange('visible', value)} />
        </section>
      </RosterDialog>}

      {isAddOpen && <RosterDialog title="Add Execom entry" subtitle="Website roster" busy={createMutation.isPending}
        onClose={() => setIsAddOpen(false)} onSubmit={handleAdd}
        onInput={() => { if (formError) setFormError(''); if (createMutation.isError) createMutation.reset(); }} submitLabel={createMutation.isPending ? 'Adding…' : 'Add entry'}
        error={formError || (createMutation.isError && (createMutation.error?.response?.data?.message || 'Could not add this entry. Try again.'))}>
        <section><h3>Member</h3>
          <div className="op-tabs" role="group" aria-label="Entry type">
            {[['user', 'Portal member'], ['custom', 'Custom member']].map(([value, label]) =>
              <button type="button" key={value} className="op-tab" aria-pressed={newEntryType === value}
                onClick={() => { setNewEntryType(value); setFormError(''); createMutation.reset(); }}>{label}</button>)}
          </div>
          {newEntryType === 'user' ? <>
            <ProfileField name="memberSearch" label="Find an Execom member" type="search" value={newUserSearch} onChange={setNewUserSearch} placeholder="Name, email or membership ID" />
            <div className="roster-choices" role="radiogroup" aria-label="Execom members">
              {filteredExecomUsers.map(user => <label key={user._id} className="roster-choice">
                <input type="radio" name="roster-user" value={user._id} checked={newUserId === user._id} onChange={() => { setNewUserId(user._id); setFormError(''); }} />
                <span><strong>{user.name || user.membershipId}</strong><small>{[user.membershipId, user.email].filter(Boolean).join(' · ')}</small></span>
              </label>)}
              {!filteredExecomUsers.length && <p>No matching Execom members.</p>}
            </div>
            {newUserId && !filteredExecomUsers.some(user => user._id === newUserId) && <p className="op-caption">Selected member · {execomUsers.find(user => user._id === newUserId)?.name}</p>}
          </> : <>
            <ProfileField label="Full name" required data-required-label="the member’s name" value={customName} onChange={setCustomName} />
            <div className="roster-field-grid">
              <ProfileField label="Membership ID" value={customMembershipId} onChange={setCustomMembershipId} />
              <ProfileField label="Email" type="email" value={customEmail} onChange={setCustomEmail} />
            </div>
          </>}
        </section>
        <section><h3>Roster details</h3><div className="roster-field-grid">
          <ProfileField label="Year" required data-required-label="the roster year" value={newYear} onChange={setNewYear} placeholder="2026–27" />
          <ProfileField label="Role title" value={newRoleTitle} onChange={setNewRoleTitle} placeholder="e.g. Chief executive officer" />
        </div><VisibilityField value={newVisible} onChange={setNewVisible} /></section>
      </RosterDialog>}
    </div>
  );
}
