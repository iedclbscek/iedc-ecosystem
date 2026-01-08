import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CalendarDays, Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import {
  createClub,
  createClubEvent,
  createEvent,
  deleteClub,
  deleteClubEvent,
  deleteEvent,
  fetchClubs,
  fetchClubEvents,
  fetchEvents,
  fetchUsers,
  searchStudents,
  updateClub,
  updateClubEvent,
  updateEvent,
} from '../api/adminService';
import { me } from '../api/authService';
import { useViewMode } from '../context/ViewModeContext';

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

const normalize = (v) => String(v ?? '').trim();

const userLabel = (user) => {
  const name = user?.name || user?.membershipId || 'Member';
  const meta = [user?.membershipId, user?.email].filter(Boolean).join(' • ');
  return { name, meta };
};

const toggleFromArray = (arr, value) => {
  const list = Array.isArray(arr) ? arr : [];
  const id = String(value);
  return list.includes(id) ? list.filter((v) => v !== id) : [...list, id];
};

function MultiSelectUsers({ users, selectedIds, onToggle, disabled }) {
  const options = (Array.isArray(users) ? users : [])
    .map((u) => ({
      id: u?._id,
      ...userLabel(u),
    }))
    .filter((u) => Boolean(u.id));

  if (options.length === 0) {
    return <div className="text-sm text-slate-500">No users found.</div>;
  }

  return (
    <div className={`max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      {options.map((u) => (
        <label
          key={u.id}
          className="flex items-start gap-3 px-4 py-2 hover:bg-slate-50 cursor-pointer"
        >
          <input
            type="checkbox"
            className="mt-1"
            checked={Array.isArray(selectedIds) && selectedIds.includes(u.id)}
            disabled={Boolean(disabled)}
            onChange={() => onToggle(u.id)}
          />
          <div>
            <div className="text-sm font-semibold text-slate-900">{u.name}</div>
            {u.meta ? <div className="text-xs text-slate-500">{u.meta}</div> : null}
          </div>
        </label>
      ))}
    </div>
  );
}

function RegistrationSearch({ query, onQueryChange, selectedIds, onToggleId, disabled }) {
  const normalizedQuery = normalize(query);
  const enabled = !disabled && normalizedQuery.length >= 2;

  const { data, isFetching } = useQuery({
    queryKey: ['club-member-search', normalizedQuery],
    queryFn: () => searchStudents(normalizedQuery),
    enabled,
    retry: false,
  });

  const students = Array.isArray(data?.students) ? data.students : [];

  return (
    <div className={disabled ? 'opacity-60 pointer-events-none' : ''}>
      <div className="relative">
        <Search className="absolute left-4 top-3 text-slate-400" size={18} />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search by name, email, or membership ID..."
          className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm"
        />
      </div>
      <div className="mt-2 text-[11px] text-slate-400">Type at least 2 characters to search.</div>

      {enabled ? (
        <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden bg-white">
          <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
            {isFetching ? (
              <div className="p-3 flex items-center gap-2 text-slate-500">
                <Loader2 className="animate-spin" size={16} />
                Searching...
              </div>
            ) : students.length === 0 ? (
              <div className="p-3 text-slate-500">No students found.</div>
            ) : (
              students.map((s) => {
                const id = String(s?._id || '');
                if (!id) return null;
                const checked = Array.isArray(selectedIds) && selectedIds.includes(id);
                const name = `${s?.firstName ?? ''} ${s?.lastName ?? ''}`.trim() || '—';
                const meta = [s?.membershipId, s?.email].filter(Boolean).join(' • ');
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onToggleId(id)}
                    className={`w-full text-left p-3 hover:bg-slate-50 transition-colors ${
                      checked ? 'bg-blue-50/60' : ''
                    }`}
                  >
                    <div className="font-semibold text-slate-900">{name}</div>
                    {meta ? <div className="text-xs text-slate-500 mt-0.5">{meta}</div> : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ClubsEvents() {
  const queryClient = useQueryClient();

  const { mode, clubId: activeClubId } = useViewMode();

  const [clubSearch, setClubSearch] = useState('');
  const [selectedClubId, setSelectedClubId] = useState('');
  const [eventSearch, setEventSearch] = useState('');

  const [isCreateClubOpen, setIsCreateClubOpen] = useState(false);
  const [isEditClubOpen, setIsEditClubOpen] = useState(false);
  const [clubEditing, setClubEditing] = useState(null);

  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);
  const [eventEditing, setEventEditing] = useState(null);

  const [createClubForm, setCreateClubForm] = useState({
    name: '',
    description: '',
    managerUserIds: [],
  });

  const [editClubForm, setEditClubForm] = useState({
    name: '',
    description: '',
    managerUserIds: [],
    editorUserIds: [],
    memberRegistrationIds: [],
  });

  const [memberSearch, setMemberSearch] = useState('');

  const [createEventForm, setCreateEventForm] = useState({
    title: '',
    description: '',
    location: '',
    startAt: '',
    endAt: '',
    coordinatorUserIds: [],
  });

  const [editEventForm, setEditEventForm] = useState({
    title: '',
    description: '',
    location: '',
    startAt: '',
    endAt: '',
    coordinatorUserIds: [],
  });

  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: me,
    retry: false,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    retry: false,
  });

  const { data: clubsData, isLoading: clubsLoading, isError: clubsError } = useQuery({
    queryKey: ['clubs'],
    queryFn: fetchClubs,
    retry: false,
  });

  const clubs = Array.isArray(clubsData?.clubs) ? clubsData.clubs : [];
  const users = Array.isArray(usersData?.users) ? usersData.users : [];

  const scopedClubs = useMemo(() => {
    if (mode !== 'club' || !activeClubId) return clubs;
    return clubs.filter((c) => String(c?._id) === String(activeClubId));
  }, [activeClubId, clubs, mode]);

  const filteredClubs = scopedClubs.filter((c) => {
    const text = normalize(clubSearch).toLowerCase();
    if (!text) return true;
    return normalize(c?.name).toLowerCase().includes(text);
  });

  const selectedClub = scopedClubs.find((c) => String(c?._id) === String(selectedClubId)) || null;
  const isAdmin = normalize(meData?.role).toLowerCase() === 'admin';

  useEffect(() => {
    if (mode !== 'club' || !activeClubId) return;
    setSelectedClubId(String(activeClubId));
  }, [activeClubId, mode]);
  const isClubLead = selectedClub
    ? (Array.isArray(selectedClub?.managerUsers) ? selectedClub.managerUsers : []).some(
        (u) => String(u?._id || u) === String(meData?.id)
      )
    : false;
  const isClubEditor = selectedClub
    ? (Array.isArray(selectedClub?.editorUsers) ? selectedClub.editorUsers : []).some(
        (u) => String(u?._id || u) === String(meData?.id)
      )
    : false;

  const canEditClub = Boolean(selectedClub) && (isAdmin || isClubLead || isClubEditor);
  const canManageMembers = Boolean(selectedClub) && (isAdmin || isClubLead);

  const {
    data: eventsData,
    isLoading: eventsLoading,
    isError: eventsError,
  } = useQuery({
    queryKey: ['clubEvents', selectedClubId, eventSearch],
    queryFn: () => fetchClubEvents({ clubId: selectedClubId, search: eventSearch }),
    enabled: Boolean(selectedClubId),
    retry: false,
  });

  const events = Array.isArray(eventsData?.events) ? eventsData.events : [];

  const createClubMutation = useMutation({
    mutationFn: createClub,
    onSuccess: () => {
      toast.success('Club created');
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
      setIsCreateClubOpen(false);
      setCreateClubForm({ name: '', description: '', managerUserIds: [] });
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to create club'),
  });

  const updateClubMutation = useMutation({
    mutationFn: updateClub,
    onSuccess: () => {
      toast.success('Club updated');
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
      setIsEditClubOpen(false);
      setClubEditing(null);
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to update club'),
  });

  const deleteClubMutation = useMutation({
    mutationFn: deleteClub,
    onSuccess: () => {
      toast.success('Club deleted');
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
      if (selectedClubId && String(selectedClubId) === String(clubEditing?._id)) {
        setSelectedClubId('');
      }
      setClubEditing(null);
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to delete club'),
  });

  const createEventMutation = useMutation({
    mutationFn: createClubEvent,
    onSuccess: () => {
      toast.success('Event created');
      queryClient.invalidateQueries({ queryKey: ['clubEvents', selectedClubId] });
      setIsCreateEventOpen(false);
      setCreateEventForm({
        title: '',
        description: '',
        location: '',
        startAt: '',
        endAt: '',
        coordinatorUserIds: [],
      });
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to create event'),
  });

  const updateEventMutation = useMutation({
    mutationFn: updateClubEvent,
    onSuccess: () => {
      toast.success('Event updated');
      queryClient.invalidateQueries({ queryKey: ['clubEvents', selectedClubId] });
      setIsEditEventOpen(false);
      setEventEditing(null);
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to update event'),
  });

  const deleteEventMutation = useMutation({
    mutationFn: deleteClubEvent,
    onSuccess: () => {
      toast.success('Event deleted');
      queryClient.invalidateQueries({ queryKey: ['clubEvents', selectedClubId] });
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to delete event'),
  });

  const openEditClub = (club) => {
    if (!club?._id) return;
    setClubEditing(club);
    setEditClubForm({
      name: club?.name || '',
      description: club?.description || '',
      managerUserIds: (Array.isArray(club?.managerUsers) ? club.managerUsers : [])
        .map((u) => String(u?._id || u))
        .filter(Boolean),
      editorUserIds: (Array.isArray(club?.editorUsers) ? club.editorUsers : [])
        .map((u) => String(u?._id || u))
        .filter(Boolean),
      memberRegistrationIds: (Array.isArray(club?.memberRegistrations) ? club.memberRegistrations : [])
        .map((r) => String(r?._id || r))
        .filter(Boolean),
    });
    setIsEditClubOpen(true);
    setMemberSearch('');
  };

  const confirmDeleteClub = (club) => {
    if (!club?._id) return;
    const name = club?.name || 'this club';
    toast.custom(
      (t) => (
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="p-4">
            <div className="font-semibold text-slate-900">Delete club?</div>
            <div className="text-sm text-slate-600 mt-1">This will delete {name}.</div>
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
                  if (String(selectedClubId) === String(club._id)) {
                    setSelectedClubId('');
                  }
                  deleteClubMutation.mutate(club._id);
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

  const openEditEvent = (event) => {
    if (!event?._id) return;
    setEventEditing(event);
    setEditEventForm({
      title: event?.title || '',
      description: event?.description || '',
      location: event?.location || '',
      startAt: toDatetimeLocalValue(event?.startAt),
      endAt: toDatetimeLocalValue(event?.endAt),
      coordinatorUserIds: (Array.isArray(event?.coordinatorUsers) ? event.coordinatorUsers : [])
        .map((u) => String(u?._id || u))
        .filter(Boolean),
    });
    setIsEditEventOpen(true);
  };

  const confirmDeleteEvent = (event) => {
    if (!event?._id || !selectedClubId) return;
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
                  deleteEventMutation.mutate({ clubId: selectedClubId, eventId: event._id });
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

  const canCreateClub = isAdmin && normalize(createClubForm.name);
  const canUpdateClub = normalize(editClubForm.name);
  const canCreateEvent = Boolean(selectedClubId) && normalize(createEventForm.title);
  const canUpdateEvent = Boolean(selectedClubId) && normalize(editEventForm.title);

  const submitCreateClub = () => {
    if (!canCreateClub || createClubMutation.isPending) return;
    createClubMutation.mutate({
      name: createClubForm.name.trim(),
      description: createClubForm.description,
      managerUserIds: createClubForm.managerUserIds,
    });
  };

  const submitUpdateClub = () => {
    if (!clubEditing?._id || !canUpdateClub || updateClubMutation.isPending) return;
    updateClubMutation.mutate({
      id: clubEditing._id,
      ...(isAdmin ? { name: editClubForm.name.trim() } : {}),
      description: editClubForm.description,
      ...(isAdmin ? { managerUserIds: editClubForm.managerUserIds } : {}),
      ...(canManageMembers ? { editorUserIds: editClubForm.editorUserIds } : {}),
      ...(canManageMembers
        ? { memberRegistrationIds: editClubForm.memberRegistrationIds }
        : {}),
    });
  };

  const submitCreateEvent = () => {
    if (!canCreateEvent || createEventMutation.isPending) return;
    createEventMutation.mutate({
      clubId: selectedClubId,
      title: createEventForm.title.trim(),
      description: createEventForm.description,
      location: createEventForm.location,
      startAt: toIsoOrEmpty(createEventForm.startAt),
      endAt: toIsoOrEmpty(createEventForm.endAt),
      coordinatorUserIds: createEventForm.coordinatorUserIds,
    });
  };

  const submitUpdateEvent = () => {
    if (!eventEditing?._id || !canUpdateEvent || updateEventMutation.isPending) return;
    updateEventMutation.mutate({
      clubId: selectedClubId,
      eventId: eventEditing._id,
      title: editEventForm.title.trim(),
      description: editEventForm.description,
      location: editEventForm.location,
      startAt: toIsoOrEmpty(editEventForm.startAt),
      endAt: toIsoOrEmpty(editEventForm.endAt),
      coordinatorUserIds: editEventForm.coordinatorUserIds,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{mode === 'club' ? 'Events' : 'Clubs'}</h1>
          <p className="text-slate-500 text-sm">
            {mode === 'club'
              ? 'Manage your club events and coordinators.'
              : 'Select a club to manage its events and coordinators.'}
          </p>
        </div>

        {isAdmin && mode !== 'club' ? (
          <button
            onClick={() => setIsCreateClubOpen(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-200 transition-all"
          >
            <Plus size={18} />
            New Club
          </button>
        ) : null}
      </div>

      <div
        className={`grid grid-cols-1 gap-6 ${mode === 'club' ? '' : 'lg:grid-cols-3'}`}
      >
        {mode !== 'club' ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-4 top-3 text-slate-400" size={18} />
                <input
                  type="text"
                  value={clubSearch}
                  onChange={(e) => setClubSearch(e.target.value)}
                  placeholder="Search clubs..."
                  className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            {clubsLoading ? (
              <div className="p-6 flex items-center gap-3 text-slate-500">
                <Loader2 className="animate-spin" size={18} />
                Loading clubs...
              </div>
            ) : clubsError ? (
              <div className="p-6 text-slate-500">Failed to load clubs.</div>
            ) : filteredClubs.length === 0 ? (
              <div className="p-6 text-slate-500">No clubs.</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {filteredClubs.map((club) => {
                  const active = String(club?._id) === String(selectedClubId);
                  const memberCount =
                    (Array.isArray(club?.memberRegistrations)
                      ? club.memberRegistrations.length
                      : 0) +
                    (Array.isArray(club?.memberUsers) ? club.memberUsers.length : 0);
                  const managerCount = Array.isArray(club?.managerUsers)
                    ? club.managerUsers.length
                    : 0;
                  const editorCount = Array.isArray(club?.editorUsers) ? club.editorUsers.length : 0;
                  return (
                    <button
                      key={club?._id}
                      type="button"
                      onClick={() => setSelectedClubId(String(club?._id))}
                      className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${
                        active ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-bold text-slate-900">{club?.name || '—'}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            {managerCount} leads • {editorCount} editors • {memberCount} members
                          </div>
                        </div>

                        {active && canEditClub ? (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditClub(club);
                              }}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            >
                              <Pencil size={18} />
                            </button>
                            {isAdmin ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirmDeleteClub(club);
                                }}
                                disabled={deleteClubMutation.isPending}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-30"
                              >
                                <Trash2 size={18} />
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        <div className={`${mode === 'club' ? '' : 'lg:col-span-2'} space-y-4`}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CalendarDays size={18} className="text-slate-400" />
                <h2 className="font-bold">{selectedClub?.name ? `${selectedClub.name} Events` : 'Events'}</h2>
              </div>

              <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-end w-full md:w-auto">
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-4 top-3 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={eventSearch}
                    onChange={(e) => setEventSearch(e.target.value)}
                    placeholder="Search title or location..."
                    disabled={!selectedClubId}
                    className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm disabled:opacity-50"
                  />
                </div>

                <button
                  onClick={() => setIsCreateEventOpen(true)}
                  disabled={!selectedClubId}
                  className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-200 transition-all disabled:opacity-50"
                >
                  <Plus size={18} />
                  New Event
                </button>
              </div>
            </div>

            {!selectedClubId ? (
              <div className="p-8 text-slate-500">
                {mode === 'club' ? 'Loading club…' : 'Select a club to view its events.'}
              </div>
            ) : eventsLoading ? (
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
                      <th className="px-6 py-3 font-semibold">Coordinators</th>
                      <th className="px-6 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {events.map((e) => {
                      const coords = Array.isArray(e?.coordinatorUsers) ? e.coordinatorUsers : [];
                      const coordinatorNames = coords
                        .map((u) => u?.name || u?.membershipId)
                        .filter(Boolean);
                      const fallback = e?.coordinatorUser?.name || e?.coordinatorUser?.membershipId;
                      const displayCoordinators =
                        coordinatorNames.length > 0
                          ? coordinatorNames.join(', ')
                          : fallback || '—';

                      return (
                        <tr key={e?._id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-900 whitespace-nowrap">
                            {e?.title || '—'}
                          </td>
                          <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{e?.location || '—'}</td>
                          <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{displayDate(e?.startAt)}</td>
                          <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{displayDate(e?.endAt)}</td>
                          <td className="px-6 py-4 text-slate-600">{displayCoordinators}</td>
                          <td className="px-6 py-4">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => openEditEvent(e)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                              >
                                <Pencil size={18} />
                              </button>
                              <button
                                type="button"
                                onClick={() => confirmDeleteEvent(e)}
                                disabled={deleteEventMutation.isPending}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-30"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Club modal */}
      {isCreateClubOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="font-bold">Create Club</div>
              <button
                type="button"
                onClick={() => setIsCreateClubOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-50 text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Name *</label>
                  <input
                    type="text"
                    value={createClubForm.name}
                    onChange={(e) => setCreateClubForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                    placeholder="Club name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Description</label>
                  <input
                    type="text"
                    value={createClubForm.description}
                    onChange={(e) =>
                      setCreateClubForm((p) => ({ ...p, description: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">Club Leads</label>
                  <MultiSelectUsers
                    users={users}
                    selectedIds={createClubForm.managerUserIds}
                    onToggle={(id) =>
                      setCreateClubForm((p) => ({
                        ...p,
                        managerUserIds: toggleFromArray(p.managerUserIds, id),
                      }))
                    }
                  />
                  <div className="text-[11px] text-slate-400">
                    Leads can later add editors and members.
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateClubOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitCreateClub}
                  disabled={!canCreateClub || createClubMutation.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold disabled:opacity-50"
                >
                  {createClubMutation.isPending && <Loader2 className="animate-spin" size={16} />}
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Club modal */}
      {isEditClubOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="font-bold">Edit Club</div>
              <button
                type="button"
                onClick={() => {
                  setIsEditClubOpen(false);
                  setClubEditing(null);
                }}
                className="p-2 rounded-xl hover:bg-slate-50 text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Name *</label>
                  <input
                    type="text"
                    value={editClubForm.name}
                    onChange={(e) => setEditClubForm((p) => ({ ...p, name: e.target.value }))}
                    disabled={!isAdmin}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                  />
                  {!isAdmin ? (
                    <div className="text-[11px] text-slate-400">Only admins can rename a club.</div>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Description</label>
                  <input
                    type="text"
                    value={editClubForm.description}
                    onChange={(e) => setEditClubForm((p) => ({ ...p, description: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">Club Leads</label>
                  {isAdmin ? (
                    <MultiSelectUsers
                      users={users}
                      selectedIds={editClubForm.managerUserIds}
                      onToggle={(id) =>
                        setEditClubForm((p) => ({
                          ...p,
                          managerUserIds: toggleFromArray(p.managerUserIds, id),
                        }))
                      }
                    />
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                      {(Array.isArray(clubEditing?.managerUsers) ? clubEditing.managerUsers : [])
                        .map((u) => u?.name || u?.membershipId)
                        .filter(Boolean)
                        .join(', ') || '—'}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">Editors</label>
                  <MultiSelectUsers
                    users={users}
                    selectedIds={editClubForm.editorUserIds}
                    onToggle={(id) =>
                      setEditClubForm((p) => ({
                        ...p,
                        editorUserIds: toggleFromArray(p.editorUserIds, id),
                      }))
                    }
                    disabled={!canManageMembers}
                  />
                  {!canManageMembers ? (
                    <div className="text-[11px] text-slate-400">
                      Only club leads can manage editors.
                    </div>
                  ) : null}
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-500">Members</label>
                  <RegistrationSearch
                    query={memberSearch}
                    onQueryChange={setMemberSearch}
                    selectedIds={editClubForm.memberRegistrationIds}
                    onToggleId={(id) =>
                      setEditClubForm((p) => ({
                        ...p,
                        memberRegistrationIds: toggleFromArray(p.memberRegistrationIds, id),
                      }))
                    }
                    disabled={!canManageMembers}
                  />

                  <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-xs font-bold text-slate-500">Selected Members</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(Array.isArray(editClubForm.memberRegistrationIds)
                        ? editClubForm.memberRegistrationIds
                        : [])
                        .map((id) => {
                          const list = Array.isArray(clubEditing?.memberRegistrations)
                            ? clubEditing.memberRegistrations
                            : [];
                          const found = list.find((r) => String(r?._id) === String(id));
                          const label = found
                            ? `${`${found?.firstName ?? ''} ${found?.lastName ?? ''}`.trim() || 'Member'}${
                                found?.membershipId ? ` (${found.membershipId})` : ''
                              }`
                            : id;
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => {
                                if (!canManageMembers) return;
                                setEditClubForm((p) => ({
                                  ...p,
                                  memberRegistrationIds: p.memberRegistrationIds.filter(
                                    (x) => String(x) !== String(id)
                                  ),
                                }));
                              }}
                              className={`px-3 py-1.5 rounded-full border border-slate-200 text-sm ${
                                canManageMembers
                                  ? 'hover:bg-slate-50 text-slate-700'
                                  : 'text-slate-500'
                              }`}
                              title={canManageMembers ? 'Click to remove' : undefined}
                            >
                              {label}
                            </button>
                          );
                        })}

                      {(Array.isArray(editClubForm.memberRegistrationIds)
                        ? editClubForm.memberRegistrationIds
                        : []).length === 0 ? (
                        <div className="text-sm text-slate-500">No members selected.</div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditClubOpen(false);
                    setClubEditing(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitUpdateClub}
                  disabled={!canUpdateClub || updateClubMutation.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold disabled:opacity-50"
                >
                  {updateClubMutation.isPending && <Loader2 className="animate-spin" size={16} />}
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Event modal */}
      {isCreateEventOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="font-bold">Create Event</div>
              <button
                type="button"
                onClick={() => setIsCreateEventOpen(false)}
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
                    value={createEventForm.title}
                    onChange={(e) => setCreateEventForm((p) => ({ ...p, title: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                    placeholder="Event title"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Location</label>
                  <input
                    type="text"
                    value={createEventForm.location}
                    onChange={(e) => setCreateEventForm((p) => ({ ...p, location: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                    placeholder="Venue"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Start</label>
                  <input
                    type="datetime-local"
                    value={createEventForm.startAt}
                    onChange={(e) => setCreateEventForm((p) => ({ ...p, startAt: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">End</label>
                  <input
                    type="datetime-local"
                    value={createEventForm.endAt}
                    onChange={(e) => setCreateEventForm((p) => ({ ...p, endAt: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-slate-500">Coordinators</label>
                  <MultiSelectUsers
                    users={users}
                    selectedIds={createEventForm.coordinatorUserIds}
                    onToggle={(id) =>
                      setCreateEventForm((p) => ({
                        ...p,
                        coordinatorUserIds: toggleFromArray(p.coordinatorUserIds, id),
                      }))
                    }
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-500">Description</label>
                  <textarea
                    value={createEventForm.description}
                    onChange={(e) =>
                      setCreateEventForm((p) => ({ ...p, description: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 min-h-28"
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateEventOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitCreateEvent}
                  disabled={!canCreateEvent || createEventMutation.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold disabled:opacity-50"
                >
                  {createEventMutation.isPending && <Loader2 className="animate-spin" size={16} />}
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Event modal */}
      {isEditEventOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="font-bold">Edit Event</div>
              <button
                type="button"
                onClick={() => {
                  setIsEditEventOpen(false);
                  setEventEditing(null);
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
                    value={editEventForm.title}
                    onChange={(e) => setEditEventForm((p) => ({ ...p, title: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Location</label>
                  <input
                    type="text"
                    value={editEventForm.location}
                    onChange={(e) => setEditEventForm((p) => ({ ...p, location: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Start</label>
                  <input
                    type="datetime-local"
                    value={editEventForm.startAt}
                    onChange={(e) => setEditEventForm((p) => ({ ...p, startAt: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">End</label>
                  <input
                    type="datetime-local"
                    value={editEventForm.endAt}
                    onChange={(e) => setEditEventForm((p) => ({ ...p, endAt: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-slate-500">Coordinators</label>
                  <MultiSelectUsers
                    users={users}
                    selectedIds={editEventForm.coordinatorUserIds}
                    onToggle={(id) =>
                      setEditEventForm((p) => ({
                        ...p,
                        coordinatorUserIds: toggleFromArray(p.coordinatorUserIds, id),
                      }))
                    }
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-500">Description</label>
                  <textarea
                    value={editEventForm.description}
                    onChange={(e) => setEditEventForm((p) => ({ ...p, description: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 min-h-28"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditEventOpen(false);
                    setEventEditing(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitUpdateEvent}
                  disabled={!canUpdateEvent || updateEventMutation.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold disabled:opacity-50"
                >
                  {updateEventMutation.isPending && <Loader2 className="animate-spin" size={16} />}
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

function LegacyEvents() {
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

export default function Events() {
  return <ClubsEvents />;
}
