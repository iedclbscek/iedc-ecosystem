import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Loader2, Plus, Trash2, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import {
  createWebsiteTeamEntry,
  deleteWebsiteTeamEntry,
  fetchWebsiteTeamEntries,
  fetchWebsiteTeamYears,
  reorderWebsiteTeamEntries,
  updateWebsiteTeamEntry,
  uploadFreeImage,
  sendWebsiteTeamUpdateEmail,
} from '../api/adminService';

const normalize = (v) => String(v ?? '').trim().toLowerCase();

function SortableRow({ entry, onUpdate, onDelete, onEdit, onSendEmail, sendingEmailId }) {
  const id = String(entry?._id ?? entry?.id ?? '');
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
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
      className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl border border-slate-200 bg-white shadow-sm ${
        isDragging ? 'opacity-80' : ''
      }`}
    >
      <button
        type="button"
        className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
        title="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={18} />
      </button>

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

      <div className="w-full sm:w-56">
        <input
          type="text"
          defaultValue={entry?.roleTitle || ''}
          placeholder="Website role title (e.g. CEO)"
          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none"
          onBlur={(e) => {
            const next = String(e.target.value ?? '').trim();
            if (next === String(entry?.roleTitle || '').trim()) return;
            onUpdate({ id, roleTitle: next });
          }}
        />
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={Boolean(entry?.visible)}
          onChange={(e) => onUpdate({ id, visible: e.target.checked })}
        />
        Visible
      </label>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-blue-700 text-sm font-semibold hover:bg-slate-50"
          onClick={() => onSendEmail?.(entry)}
          disabled={sendingEmailId === id}
        >
          {sendingEmailId === id ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          Send email
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50"
          onClick={() => onEdit?.(entry)}
        >
          Edit
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-red-600 text-sm font-semibold hover:bg-slate-50"
          onClick={() => onDelete(id)}
        >
          <Trash2 size={16} />
          Remove
        </button>
      </div>
    </div>
  );
}

export default function ExecomEntriesManager({ users, canManageUsers }) {
  const queryClient = useQueryClient();

  const execomUsers = useMemo(
    () => (Array.isArray(users) ? users : []).filter((u) => normalize(u?.role) === 'execom'),
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
  const effectiveYear = year || (years.length > 0 ? String(years[0]) : '');

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

  const createMutation = useMutation({
    mutationFn: createWebsiteTeamEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websiteTeamYears', 'execom'] });
      queryClient.invalidateQueries({ queryKey: ['websiteTeamEntries', 'execom'] });
      toast.success('Added to execom year');
    },
    onError: (e) => {
      toast.error(e?.response?.data?.message || 'Failed to add');
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateWebsiteTeamEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websiteTeamEntries', 'execom', effectiveYear] });
      toast.success('Updated entry');
    },
    onError: (e) => {
      toast.error(e?.response?.data?.message || 'Failed to update');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWebsiteTeamEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websiteTeamYears', 'execom'] });
      queryClient.invalidateQueries({ queryKey: ['websiteTeamEntries', 'execom'] });
      toast.success('Removed');
    },
    onError: (e) => {
      toast.error(e?.response?.data?.message || 'Failed to remove');
    },
  });

  const reorderMutation = useMutation({
    mutationFn: reorderWebsiteTeamEntries,
    onMutate: async (vars) => {
      const yr = String(vars?.year ?? '').trim();
      if (!yr) return {};

      const key = ['websiteTeamEntries', 'execom', yr];
      await queryClient.cancelQueries({ queryKey: key });

      const previous = queryClient.getQueryData(key);
      const nextOrderedIds = Array.isArray(vars?.orderedIds)
        ? vars.orderedIds.map((v) => String(v)).filter(Boolean)
        : [];

      queryClient.setQueryData(key, (old) => {
        const currentEntries = Array.isArray(old?.entries) ? old.entries : [];
        if (currentEntries.length === 0 || nextOrderedIds.length === 0) return old;

        const byId = new Map(currentEntries.map((e) => [String(e?._id), e]));
        const reordered = nextOrderedIds
          .map((id, index) => {
            const entry = byId.get(String(id));
            if (!entry) return null;
            return { ...entry, order: index };
          })
          .filter(Boolean);

        // If ids mismatch, fall back to old.
        if (reordered.length !== nextOrderedIds.length) return old;

        return { ...(old || {}), entries: reordered };
      });

      return { previous, key };
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.previous && ctx?.key) {
        queryClient.setQueryData(ctx.key, ctx.previous);
      }
      toast.error(e?.response?.data?.message || 'Failed to reorder');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websiteTeamEntries', 'execom', effectiveYear] });
    },
  });

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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

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
  const [cropper, setCropper] = useState(null);
  const [cropSrc, setCropSrc] = useState(null);
  const [cropState, setCropState] = useState({ unit: 'px', x: 0, y: 0, width: 200, height: 200, aspect: 1 });
  const [cropImageEl, setCropImageEl] = useState(null);

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

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        const base64 = typeof result === 'string' ? result.split(',')[1] : '';
        if (!base64) {
          reject(new Error('Could not read file'));
        } else {
          resolve(base64);
        }
      };
      reader.onerror = () => reject(new Error('Could not read file'));
      reader.readAsDataURL(file);
    });

  const blobToBase64 = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        const base64 = typeof result === 'string' ? result.split(',')[1] : '';
        if (!base64) {
          reject(new Error('Could not read file'));
        } else {
          resolve(base64);
        }
      };
      reader.onerror = () => reject(new Error('Could not read file'));
      reader.readAsDataURL(blob);
    });

  const openCropper = (file) => {
    const maxBytes = 3 * 1024 * 1024; // ~3MB limit
    if (file.size > maxBytes) {
      toast.error('File too large. Max 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setCropSrc(dataUrl);
      setCropper({ file });
    };
    reader.onerror = () => toast.error('Could not read file');
    reader.readAsDataURL(file);
  };

  const applyCropAndUpload = async () => {
    if (!cropper || !cropImageEl) return;
    try {
      setIsUploading(true);
      const image = cropImageEl;
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
      const { x = 0, y = 0, width = 0, height = 0 } = cropState;

      // Render a higher-resolution square to preserve clarity.
      const targetSize = Math.min(Math.max(Math.round(Math.min(width, height)), 800), 1600); // clamp between 800-1600px

      const canvas = document.createElement('canvas');
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(
        image,
        x * scaleX,
        y * scaleY,
        width * scaleX,
        height * scaleY,
        0,
        0,
        targetSize,
        targetSize,
      );

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (!b) return reject(new Error('Failed to crop image'));
            resolve(b);
          },
          cropper.file?.type || 'image/jpeg',
          0.96,
        );
      });

      const base64 = await blobToBase64(blob);
      const { url } = await uploadFreeImage({ source: base64 });
      setEditForm((prev) => ({ ...prev, imageUrl: url }));
      toast.success('Image uploaded');
      setCropper(null);
      setCropSrc(null);
      setCropImageEl(null);
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageFile = (file) => {
    if (!file) return;
    openCropper(file);
  };

  const onCropImageLoaded = (img) => {
    if (!img) return;
    setCropImageEl(img);
    const size = Math.min(img.naturalWidth, img.naturalHeight, 320);
    const x = (img.naturalWidth - size) / 2;
    const y = (img.naturalHeight - size) / 2;
    setCropState({ unit: 'px', x, y, width: size, height: size, aspect: 1 });
  };

  const handleSaveEdit = () => {
    if (!editEntry) return;
    const trimmedYear = String(editForm.year || '').trim();
    if (!trimmedYear) {
      toast.error('Year is required');
      return;
    }

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
      if (!payload.customName) {
        toast.error('Name is required for custom entries');
        return;
      }
    }

    updateMutation.mutate(payload, {
      onSuccess: () => {
        setEditEntry(null);
      },
    });
  };

  if (!canManageUsers) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="font-bold text-slate-900">Website Execom (year-wise)</div>
          <div className="text-sm text-slate-500">
            Same person can be added to multiple years with different role titles and ordering.
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setNewYear(effectiveYear);
            setIsAddOpen(true);
          }}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold"
        >
          <Plus size={18} />
          Add to year
        </button>
      </div>

      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="text-sm font-semibold text-slate-700">Year</div>
        <select
          value={effectiveYear}
          onChange={(e) => setYear(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
        >
          <option value="">Select year...</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        {yearsLoading ? (
          <div className="inline-flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="animate-spin" size={16} />
            Loading years...
          </div>
        ) : null}
        {years.length === 0 ? (
          <div className="text-sm text-slate-500">
            No years yet. Use “Add to year” to create the first year.
          </div>
        ) : null}
      </div>

      <div className="p-6">
        {entriesQuery.isLoading ? (
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 className="animate-spin" size={18} />
            Loading entries...
          </div>
        ) : entriesQuery.isError ? (
          <div className="text-slate-500">Failed to load entries.</div>
        ) : !effectiveYear ? (
          <div className="text-slate-500">Select a year to manage entries.</div>
        ) : sortedEntries.length === 0 ? (
          <div className="text-slate-500">No execom entries for this year.</div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => {
              const { active, over } = event;
              if (!over || active.id === over.id) return;
              const oldIndex = sortedEntries.findIndex((e) => String(e?._id) === String(active.id));
              const newIndex = sortedEntries.findIndex((e) => String(e?._id) === String(over.id));
              if (oldIndex < 0 || newIndex < 0) return;

              const next = arrayMove(sortedEntries, oldIndex, newIndex);
              reorderMutation.mutate({
                category: 'execom',
                year: effectiveYear,
                orderedIds: next.map((e) => String(e?._id)),
              });
            }}
          >
            <SortableContext
              items={sortedEntries.map((e) => String(e?._id))}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {sortedEntries.map((entry) => (
                  <SortableRow
                    key={String(entry?._id)}
                    entry={entry}
                    onUpdate={(patch) => updateMutation.mutate({ ...patch })}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    onEdit={startEdit}
                    onSendEmail={handleSendEmail}
                    sendingEmailId={sendingEmailId}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {editEntry ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-xl">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">Edit Execom Entry</div>
                <div className="text-sm text-slate-500">Update image, socials, and displayed details.</div>
              </div>
              <button
                type="button"
                className="text-slate-500 hover:text-slate-800"
                onClick={() => setEditEntry(null)}
              >
                Close
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-700 mb-1">Year</div>
                  <input
                    value={editForm.year}
                    onChange={(e) => handleEditChange('year', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-700 mb-1">Role title</div>
                  <input
                    value={editForm.roleTitle}
                    onChange={(e) => handleEditChange('roleTitle', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    placeholder="e.g. CEO"
                  />
                </div>
              </div>

              {editEntry.entryType === 'custom' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-700 mb-1">Name</div>
                    <input
                      value={editForm.customName}
                      onChange={(e) => handleEditChange('customName', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-700 mb-1">Membership ID</div>
                    <input
                      value={editForm.customMembershipId}
                      onChange={(e) => handleEditChange('customMembershipId', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-700 mb-1">Email</div>
                    <input
                      value={editForm.customEmail}
                      onChange={(e) => handleEditChange('customEmail', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                      placeholder="Optional"
                      type="email"
                    />
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <div className="text-sm font-semibold text-slate-700 mb-1">Image</div>
                <div className="flex flex-col md:flex-row gap-2">
                  <input
                    value={editForm.imageUrl}
                    onChange={(e) => handleEditChange('imageUrl', e.target.value)}
                    placeholder="Image URL"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                  <label className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold cursor-pointer hover:bg-slate-50">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageFile(file);
                        e.target.value = '';
                      }}
                    />
                    {isUploading ? 'Uploading...' : 'Upload'}
                  </label>
                </div>
                <div className="text-xs text-slate-500">
                  Upload is proxied through the server (freeimage.host). No browser CORS issues.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-700 mb-1">LinkedIn</div>
                  <input
                    value={editForm.linkedin}
                    onChange={(e) => handleEditChange('linkedin', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-700 mb-1">GitHub</div>
                  <input
                    value={editForm.github}
                    onChange={(e) => handleEditChange('github', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-700 mb-1">Twitter</div>
                  <input
                    value={editForm.twitter}
                    onChange={(e) => handleEditChange('twitter', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    placeholder="https://..."
                  />
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(editForm.visible)}
                    onChange={(e) => handleEditChange('visible', e.target.checked)}
                  />
                  Visible on website
                </label>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold"
                onClick={() => setEditEntry(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updateMutation.isPending || isUploading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50"
                onClick={handleSaveEdit}
              >
                {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : null}
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {cropper && cropSrc ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-xl">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">Crop Image</div>
                <div className="text-sm text-slate-500">Adjust the square crop before uploading.</div>
              </div>
              <button
                type="button"
                className="text-slate-500 hover:text-slate-800"
                onClick={() => {
                  setCropper(null);
                  setCropSrc(null);
                  setCropImageEl(null);
                }}
              >
                Close
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-slate-700">Crop (square)</div>
                  <div className="w-full max-w-md">
                    <ReactCrop
                      crop={cropState}
                      onChange={(c) => setCropState(c)}
                      aspect={1}
                      keepSelection
                      locked={false}
                    >
                      <img
                        src={cropSrc}
                        alt="Crop"
                        onLoad={(e) => onCropImageLoaded(e.currentTarget)}
                        style={{ maxWidth: '100%', maxHeight: '70vh' }}
                      />
                    </ReactCrop>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-slate-600">
                  <div className="font-semibold text-slate-700">Tips</div>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Drag the handles to set the square area.</li>
                    <li>File size limit is ~3MB.</li>
                    <li>Aspect ratio is fixed to 1:1.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold"
                onClick={() => {
                  setCropper(null);
                  setCropSrc(null);
                  setCropImageEl(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUploading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50"
                onClick={applyCropAndUpload}
              >
                {isUploading ? <Loader2 className="animate-spin" size={16} /> : null}
                Crop & Upload
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isAddOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-xl">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="font-bold text-slate-900">Add Execom Entry</div>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <div className="text-sm font-semibold text-slate-700 mb-1">Year</div>
                <input
                  value={newYear}
                  onChange={(e) => setNewYear(e.target.value)}
                  placeholder="e.g. 2025-26"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <div className="text-sm font-semibold text-slate-700 mb-2">Entry type</div>
                <div className="flex flex-col gap-2">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      name="entryType"
                      value="user"
                      checked={newEntryType === 'user'}
                      onChange={() => setNewEntryType('user')}
                    />
                    Existing portal user (Execom role)
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      name="entryType"
                      value="custom"
                      checked={newEntryType === 'custom'}
                      onChange={() => setNewEntryType('custom')}
                    />
                    Custom (not registered)
                  </label>
                </div>
              </div>

              {newEntryType === 'user' ? (
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-slate-700 mb-1">User</div>
                  <div className="space-y-2">
                    <input
                      value={newUserSearch}
                      onChange={(e) => setNewUserSearch(e.target.value)}
                      placeholder="Search by name or membershipId"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    />
                    <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                      {filteredExecomUsers.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-500">No matches</div>
                      ) : (
                        filteredExecomUsers.map((u) => (
                          <button
                            type="button"
                            key={String(u?._id)}
                            onClick={() => {
                              setNewUserId(String(u?._id));
                              setNewUserSearch(`${u?.name || '—'} (${String(u?.membershipId || '').toUpperCase()})`);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${
                              String(newUserId) === String(u?._id)
                                ? 'bg-blue-50 text-blue-700'
                                : 'text-slate-800'
                            }`}
                          >
                            <div className="font-semibold">{u?.name || '—'}</div>
                            <div className="text-xs text-slate-600 flex items-center gap-2">
                              <span>{String(u?.membershipId || '').toUpperCase()}</span>
                              {u?.email ? <span className="text-slate-400">{u.email}</span> : null}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    Users shown are those with portal role “Execom”.
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-slate-700">Custom member</div>
                  <input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Full name"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                  <input
                    value={customMembershipId}
                    onChange={(e) => setCustomMembershipId(e.target.value)}
                    placeholder="Membership ID (optional)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                  <input
                    type="email"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder="Email (optional)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                  <div className="text-xs text-slate-500">
                    Use this when the person isn’t in the portal yet.
                  </div>
                </div>
              )}

              <div>
                <div className="text-sm font-semibold text-slate-700 mb-1">Role title (website)</div>
                <input
                  value={newRoleTitle}
                  onChange={(e) => setNewRoleTitle(e.target.value)}
                  placeholder="e.g. CEO, CTO"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={newVisible}
                  onChange={(e) => setNewVisible(e.target.checked)}
                />
                Visible on website
              </label>
            </div>

            <div className="p-5 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold"
                onClick={() => setIsAddOpen(false)}
              >
                Cancel
              </button>
                        <button
                type="button"
                disabled={createMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50"
                onClick={() => {
                  const trimmedYear = newYear.trim();
                  if (!trimmedYear) {
                    toast.error('Year is required');
                    return;
                  }
                  if (newEntryType === 'user' && !newUserId) {
                    toast.error('Select a user');
                    return;
                  }
                  if (newEntryType === 'custom' && !customName.trim()) {
                    toast.error('Name is required');
                    return;
                  }
                  createMutation.mutate(
                    {
                      category: 'execom',
                      year: trimmedYear,
                      entryType: newEntryType,
                      userId: newEntryType === 'user' ? newUserId : undefined,
                      customName: newEntryType === 'custom' ? customName.trim() : undefined,
                      customEmail: newEntryType === 'custom' ? customEmail.trim() : undefined,
                      customMembershipId:
                        newEntryType === 'custom' ? customMembershipId.trim() : undefined,
                      roleTitle: newRoleTitle.trim(),
                      visible: newVisible,
                    },
                    {
                      onSuccess: () => {
                        setIsAddOpen(false);
                        setNewRoleTitle('');
                        setNewUserId('');
                        setNewUserSearch('');
                        setCustomName('');
                        setCustomEmail('');
                        setCustomMembershipId('');
                        setNewVisible(true);
                        setYear(trimmedYear);
                        setNewEntryType('user');
                      },
                    }
                  );
                }}
              >
                {createMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : null}
                Add
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
