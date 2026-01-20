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
import { GripVertical, Loader2, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createWebsiteTeamEntry,
  deleteWebsiteTeamEntry,
  fetchWebsiteTeamEntries,
  fetchWebsiteTeamYears,
  reorderWebsiteTeamEntries,
  updateWebsiteTeamEntry,
} from '../api/adminService';

const normalize = (v) => String(v ?? '').trim().toLowerCase();

function SortableRow({ entry, onUpdate, onDelete }) {
  const id = String(entry?._id ?? entry?.id ?? '');
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const user = entry?.userRef || entry?.user || null;

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
          <div className="font-semibold text-slate-900 truncate">{user?.name || '—'}</div>
          {user?.membershipId ? (
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-700">
              {String(user.membershipId).toUpperCase()}
            </span>
          ) : null}
        </div>
        <div className="text-xs text-slate-500 truncate">{user?.email || ''}</div>
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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [newRoleTitle, setNewRoleTitle] = useState('');
  const [newVisible, setNewVisible] = useState(true);
  const [newYear, setNewYear] = useState('');

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
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {isAddOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-xl">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="font-bold text-slate-900">Add Execom Entry</div>
              <button
                type="button"
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold"
                onClick={() => setIsAddOpen(false)}
              >
                Close
              </button>
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
                <div className="text-sm font-semibold text-slate-700 mb-1">User</div>
                <select
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="">Select user...</option>
                  {execomUsers.map((u) => (
                    <option key={String(u?._id)} value={String(u?._id)}>
                      {u?.name || '—'} ({String(u?.membershipId || '').toUpperCase()})
                    </option>
                  ))}
                </select>
                <div className="text-xs text-slate-500 mt-1">
                  Users shown are those with portal role “Execom”.
                </div>
              </div>

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
                  if (!newYear.trim() || !newUserId) {
                    toast.error('Year and user are required');
                    return;
                  }
                  createMutation.mutate(
                    {
                      category: 'execom',
                      year: newYear.trim(),
                      userId: newUserId,
                      roleTitle: newRoleTitle.trim(),
                      visible: newVisible,
                    },
                    {
                      onSuccess: () => {
                        setIsAddOpen(false);
                        setNewRoleTitle('');
                        setNewUserId('');
                        setNewVisible(true);
                                  setYear(newYear.trim());
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
