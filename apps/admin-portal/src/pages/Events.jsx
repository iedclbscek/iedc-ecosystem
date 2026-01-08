import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CalendarDays, Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import {
  createEvent,
  deleteEvent,
  fetchEvents,
  fetchUsers,
  updateEvent,
} from '../api/adminService';

const toDatetimeLocalValue = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

const toIsoOrEmpty = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
};

const displayDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

export default function Events() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    location: '',
    startAt: '',
    endAt: '',
    coordinatorUserId: '',
  });

  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    location: '',
    startAt: '',
    endAt: '',
    coordinatorUserId: '',
  });

  const { data: eventsData, isLoading: eventsLoading, isError: eventsError } = useQuery({
    queryKey: ['events', search],
    queryFn: () => fetchEvents(search),
    retry: false,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    retry: false,
  });

  const events = Array.isArray(eventsData?.events) ? eventsData.events : [];

  const coordinatorOptions = (Array.isArray(usersData?.users) ? usersData.users : [])
    .map((u) => ({
      id: u?._id,
      name: u?.name || u?.membershipId || 'Member',
      meta: [u?.membershipId, u?.email].filter(Boolean).join(' • '),
    }))
    .filter((u) => Boolean(u.id));

  const createMutation = useMutation({
    mutationFn: createEvent,
    onSuccess: () => {
      toast.success('Event created');
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setIsCreateOpen(false);
      setCreateForm({
        title: '',
        description: '',
        location: '',
        startAt: '',
        endAt: '',
        coordinatorUserId: '',
      });
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to create event'),
  });

  const updateMutation = useMutation({
    mutationFn: updateEvent,
    onSuccess: () => {
      toast.success('Event updated');
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setIsEditOpen(false);
      setSelected(null);
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to update event'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => {
      toast.success('Event deleted');
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to delete event'),
  });

  const openEdit = (event) => {
    if (!event) return;
    setSelected(event);
    setEditForm({
      title: event?.title || '',
      description: event?.description || '',
      location: event?.location || '',
      startAt: toDatetimeLocalValue(event?.startAt),
      endAt: toDatetimeLocalValue(event?.endAt),
      coordinatorUserId: event?.coordinatorUser?._id || '',
    });
    setIsEditOpen(true);
  };

  const confirmDelete = (event) => {
    if (!event?._id) return;
    const title = event?.title || 'this event';
    toast.custom(
      (t) => (
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="p-4">
            <div className="font-semibold text-slate-900">Delete event?</div>
            <div className="text-sm text-slate-600 mt-1">This will delete {title}.</div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => toast.dismiss(t.id)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  toast.dismiss(t.id);
                  deleteMutation.mutate(event._id);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ),
      { duration: 8000 }
    );
  };

  const canCreate = Boolean(createForm.title.trim()) && !createMutation.isPending;
  const canUpdate = Boolean(editForm.title.trim()) && !updateMutation.isPending;

  const submitCreate = () => {
    if (!canCreate) return;
    createMutation.mutate({
      title: createForm.title.trim(),
      description: createForm.description,
      location: createForm.location,
      startAt: toIsoOrEmpty(createForm.startAt),
      endAt: toIsoOrEmpty(createForm.endAt),
      coordinatorUserId: createForm.coordinatorUserId || undefined,
    });
  };

  const submitUpdate = () => {
    if (!selected?._id || !canUpdate) return;
    updateMutation.mutate({
      id: selected._id,
      title: editForm.title.trim(),
      description: editForm.description,
      location: editForm.location,
      startAt: toIsoOrEmpty(editForm.startAt),
      endAt: toIsoOrEmpty(editForm.endAt),
      coordinatorUserId: editForm.coordinatorUserId || '',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Events</h1>
          <p className="text-slate-500 text-sm">Create, update, and assign coordinators.</p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-200 transition-all"
        >
          <Plus size={18} />
          New Event
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-slate-400" />
            <h2 className="font-bold">All Events</h2>
          </div>

          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-3 text-slate-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or location..."
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        {eventsLoading ? (
          <div className="p-8 flex items-center gap-3 text-slate-500">
            <Loader2 className="animate-spin" size={18} />
            Loading events...
          </div>
        ) : eventsError ? (
          <div className="p-8 text-slate-500">Failed to load events.</div>
        ) : events.length === 0 ? (
          <div className="p-8 text-slate-500">No events yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-left text-slate-500">
                  <th className="px-6 py-3 font-semibold">Title</th>
                  <th className="px-6 py-3 font-semibold">Location</th>
                  <th className="px-6 py-3 font-semibold">Start</th>
                  <th className="px-6 py-3 font-semibold">End</th>
                  <th className="px-6 py-3 font-semibold">Coordinator</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {events.map((e) => (
                  <tr key={e?._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900 whitespace-nowrap">
                      {e?.title || '—'}
                    </td>
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{e?.location || '—'}</td>
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{displayDate(e?.startAt)}</td>
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{displayDate(e?.endAt)}</td>
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                      {e?.coordinatorUser?.name || e?.coordinatorUser?.membershipId || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(e)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => confirmDelete(e)}
                          disabled={deleteMutation.isPending}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-30"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="font-bold">Create Event</div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-50 text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Title *</label>
                  <input
                    type="text"
                    value={createForm.title}
                    onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                    placeholder="Event title"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Coordinator</label>
                  <select
                    value={createForm.coordinatorUserId}
                    onChange={(e) =>
                      setCreateForm((p) => ({ ...p, coordinatorUserId: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                  >
                    <option value="">—</option>
                    {coordinatorOptions.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}{u.meta ? ` (${u.meta})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Location</label>
                  <input
                    type="text"
                    value={createForm.location}
                    onChange={(e) => setCreateForm((p) => ({ ...p, location: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                    placeholder="Venue"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Start</label>
                  <input
                    type="datetime-local"
                    value={createForm.startAt}
                    onChange={(e) => setCreateForm((p) => ({ ...p, startAt: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">End</label>
                  <input
                    type="datetime-local"
                    value={createForm.endAt}
                    onChange={(e) => setCreateForm((p) => ({ ...p, endAt: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-500">Description</label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 min-h-28"
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitCreate}
                  disabled={!canCreate}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold disabled:opacity-50"
                >
                  {createMutation.isPending && <Loader2 className="animate-spin" size={16} />}
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="font-bold">Edit Event</div>
              <button
                type="button"
                onClick={() => {
                  setIsEditOpen(false);
                  setSelected(null);
                }}
                className="p-2 rounded-xl hover:bg-slate-50 text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Title *</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Coordinator</label>
                  <select
                    value={editForm.coordinatorUserId}
                    onChange={(e) => setEditForm((p) => ({ ...p, coordinatorUserId: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                  >
                    <option value="">—</option>
                    {coordinatorOptions.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}{u.meta ? ` (${u.meta})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Location</label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm((p) => ({ ...p, location: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Start</label>
                  <input
                    type="datetime-local"
                    value={editForm.startAt}
                    onChange={(e) => setEditForm((p) => ({ ...p, startAt: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">End</label>
                  <input
                    type="datetime-local"
                    value={editForm.endAt}
                    onChange={(e) => setEditForm((p) => ({ ...p, endAt: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-500">Description</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 min-h-28"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditOpen(false);
                    setSelected(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitUpdate}
                  disabled={!canUpdate}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold disabled:opacity-50"
                >
                  {updateMutation.isPending && <Loader2 className="animate-spin" size={16} />}
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
