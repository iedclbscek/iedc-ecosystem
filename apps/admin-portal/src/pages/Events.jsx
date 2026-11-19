import FormAlert from '../components/FormAlert';
import PortalDialog from '../components/PortalDialog';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { MultiSelectUsers } from '../components/MultiSelectUsers';
import EventForm from '../components/EventForm';
import PreviewEventModal from '../components/PreviewEventModal';
import { RowsSkeleton, TableSkeleton } from '../components/InlineSkeleton';
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
import { getWorkspaceAccess, hasWorkspacePermission, normalizePortalRole } from '../utils/authorization';

const toDatetimeLocalValue = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

const displayDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

const normalize = (v) => String(v ?? '').trim();
const pluralizeCount = (count, singular, plural) => {
  const n = Number(count || 0);
  const suffix = n === 1 ? singular : (plural || `${singular}s`);
  return `${n} ${suffix}`;
};

const separator = ' · ';

const toggleFromArray = (arr, value) => {
  const list = Array.isArray(arr) ? arr : [];
  const id = String(value);
  return list.includes(id) ? list.filter((v) => v !== id) : [...list, id];
};

function RegistrationSearch({ clubId, query, onQueryChange, selectedIds, onToggleId, disabled }) {
  const normalizedQuery = normalize(query);
  const enabled = !disabled && normalizedQuery.length >= 2;

  const { data, isFetching } = useQuery({
    queryKey: ['club-member-search', clubId, normalizedQuery],
    queryFn: () => searchStudents(normalizedQuery, 'student', { clubId }),
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
                const meta = [s?.membershipId, s?.email].filter(Boolean).join(separator);
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

function ClubsEvents({ tabs }) {
  const queryClient = useQueryClient();

  const { mode, clubId: activeClubId } = useViewMode();

  const [clubSearch, setClubSearch] = useState('');
  const [selectedClubChoice, setSelectedClubId] = useState('');
  const selectedClubId = mode === 'club' ? activeClubId : selectedClubChoice;
  const [eventSearch, setEventSearch] = useState('');
  const [eventPage, setEventPage] = useState(1);

  const [isCreateClubOpen, setIsCreateClubOpen] = useState(false);
  const [isEditClubOpen, setIsEditClubOpen] = useState(false);
  const [clubEditing, setClubEditing] = useState(null);

  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);
  const [eventEditing, setEventEditing] = useState(null);
  const [previewData, setPreviewData] = useState(null);

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
    shortDescription: '',
    registrationLink: '',
    externalLink: '',
    scope: 'club',
    status: 'draft',
    visibility: 'public',
    location: '',
    venue: '',
    mode: '',
    startAt: '',
    endAt: '',
    coordinatorUserIds: [],
  });

  const [editEventForm, setEditEventForm] = useState({
    title: '',
    description: '',
    shortDescription: '',
    registrationLink: '',
    externalLink: '',
    scope: 'club',
    status: 'draft',
    visibility: 'public',
    location: '',
    venue: '',
    mode: '',
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
    queryFn: () => fetchUsers(),
    enabled: hasWorkspacePermission(meData, 'users') && (isCreateClubOpen || isEditClubOpen || isCreateEventOpen || isEditEventOpen),
    retry: false,
  });

  const { data: clubsData, isLoading: clubsLoading, isError: clubsError, refetch: retryClubs } = useQuery({
    queryKey: ['clubs'],
    queryFn: fetchClubs,
    retry: false,
  });

  const clubs = Array.isArray(clubsData?.clubs) ? clubsData.clubs : [];

  const scopedClubs = mode === 'club' ? clubs.filter((club) => String(club._id) === String(activeClubId)) : clubs;

  const filteredClubs = scopedClubs.filter((c) => {
    const text = normalize(clubSearch).toLowerCase();
    if (!text) return true;
    return normalize(c?.name).toLowerCase().includes(text);
  });

  const selectedClub = scopedClubs.find((c) => String(c?._id) === String(selectedClubId)) || null;
  const clubUsers = [...(selectedClub?.managerUsers || []), ...(selectedClub?.editorUsers || []), ...(selectedClub?.memberUsers || []), ...(eventEditing?.coordinatorUsers || [])];
  const users = hasWorkspacePermission(meData, 'users') ? (usersData?.users || []) :
    [...new Map(clubUsers.filter(user => user?._id).map(user => [String(user._id), user])).values()];
  const isAdmin = normalizePortalRole(meData?.role) === 'super_admin';
  const selectedAccess = getWorkspaceAccess(meData, selectedClubId);
  const canEditEvents = isAdmin || selectedAccess.edit;
  const canPublishEvents = isAdmin || selectedAccess.publish;
  const canDeleteEvents = isAdmin || selectedAccess.delete;

  const canManageMembers = Boolean(selectedClub) && (isAdmin || selectedAccess.managePermissions);

  const {
    data: eventsData,
    isLoading: eventsLoading,
    isError: eventsError, refetch: retryEvents,
  } = useQuery({
    queryKey: ['clubEvents', selectedClubId, eventSearch, eventPage],
    queryFn: () => fetchClubEvents({ clubId: selectedClubId, search: eventSearch, page: eventPage, limit: 20 }),
    enabled: Boolean(selectedClubId),
    retry: false,
  });

  const events = Array.isArray(eventsData?.events) ? eventsData.events : [];

  const createClubMutation = useMutation({
    mutationFn: createClub,
    onSuccess: () => {
      toast.success('Club created');
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
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
      queryClient.invalidateQueries({ queryKey: ['me'] });
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
      queryClient.invalidateQueries({ queryKey: ['me'] });
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
      queryClient.invalidateQueries({ queryKey: ['overview'] });
      setIsCreateEventOpen(false);
      setCreateEventForm({
        title: '',
        description: '',
        shortDescription: '',
        registrationLink: '',
        externalLink: '',
        scope: 'club',
        status: 'draft',
        visibility: 'public',
        location: '',
        venue: '',
        mode: '',
        startAt: '',
        endAt: '',
        coordinatorUserIds: [],
      });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: updateClubEvent,
    onSuccess: () => {
      toast.success('Event updated');
      queryClient.invalidateQueries({ queryKey: ['clubEvents', selectedClubId] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
      setIsEditEventOpen(false);
      setEventEditing(null);
    },
    onError: err => { if (!isEditEventOpen) toast.error(err?.response?.data?.message || 'Could not update this event.'); },
  });

  const deleteEventMutation = useMutation({
    mutationFn: deleteClubEvent,
    onSuccess: () => {
      toast.success('Event deleted');
      queryClient.invalidateQueries({ queryKey: ['clubEvents', selectedClubId] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
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
                className="op-secondary"
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
      shortDescription: event?.shortDescription || '',
      posterUrl: event?.posterUrl || '',
      posterPublicId: event?.posterPublicId || '',
      registrationLink: event?.registrationLink || event?.registrationUrl || '',
      externalLink: event?.externalLink || '',
      scope: event?.scope || 'club',
      status: event?.status || 'draft',
      visibility: event?.visibility || 'public',
      location: event?.location || '',
      venue: event?.venue || '',
      mode: event?.mode || '',
      startAt: toDatetimeLocalValue(event?.startAt),
      endAt: toDatetimeLocalValue(event?.endAt),
      coordinatorUserIds: (event.coordinatorUsers?.length ? event.coordinatorUsers : [event.coordinatorUser].filter(Boolean))
        .map((u) => String(u?._id || u))
        .filter(Boolean),
    });
    updateEventMutation.reset();
    setIsEditEventOpen(true);
  };

  const confirmDeleteEvent = (event) => {
    if (!canDeleteEvents || !event?._id || !selectedClubId) return;
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
                className="op-secondary"
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

  return (
    <div className="op-page">
      <div className="op-header op-event-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Events</h1>
          <p className="text-slate-500 text-sm">
            {mode === 'club'
              ? 'Manage your club events and coordinators.'
              : 'Select a club to manage its events and coordinators.'}
            {!isAdmin && mode !== 'club' && <span id="club-create-help" className="block text-xs mt-1">Club creation is available to superadmins.</span>}
          </p>
        </div>

        {mode === 'club' && canEditEvents && (
          <button type="button" className="op-primary" onClick={() => { createEventMutation.reset(); setIsCreateEventOpen(true); }}><Plus size={17} /> New event</button>
        )}
        {mode !== 'club' ? (
          <button
            type="button" disabled={!isAdmin}
            aria-describedby={!isAdmin ? 'club-create-help' : undefined}
            onClick={() => setIsCreateClubOpen(true)}
            className="op-primary"
          >
            <Plus size={18} />
            Create club
          </button>
        ) : null}
      </div>

      {tabs}
      <div
        className={`grid grid-cols-1 gap-6 ${mode === 'club' ? '' : 'xl:grid-cols-[minmax(13rem,1fr)_minmax(0,3fr)]'}`}
      >
        {mode !== 'club' ? (
          <div className="op-card overflow-hidden min-w-0">
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-4 top-3 text-slate-400" size={18} />
                <input
                  type="text"
                  value={clubSearch}
                  onChange={(e) => setClubSearch(e.target.value)}
                  aria-label="Search clubs" placeholder="Search clubs"
                  className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            {clubsLoading ? (
              <RowsSkeleton rows={6} columns={2} compact label="Loading clubs" />
            ) : clubsError ? (
              <FormAlert className="m-4">Could not load clubs. <button type="button" onClick={() => retryClubs()}>Try again</button></FormAlert>
            ) : filteredClubs.length === 0 ? (
              <div className="p-6 text-slate-500">{clubSearch.trim() ? 'No clubs match your search.' : isAdmin ? 'No clubs yet. Create a club to get started.' : 'No clubs are assigned to your account.'}</div>
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
                    <div key={club._id} className={`flex items-center gap-1 px-3 py-1.5 ${active ? 'bg-blue-50' : ''}`}>
                      <button type="button" aria-pressed={active} className="min-w-0 flex-1 rounded-lg px-2 py-2 text-left hover:bg-slate-50"
                        onClick={() => { setSelectedClubId(String(club._id)); setEventPage(1); setEventSearch(''); }}>
                        <span className="block font-semibold text-slate-900">{club.name}</span>
                        <span className="text-xs text-slate-500">{pluralizeCount(managerCount, 'lead')} · {pluralizeCount(editorCount, 'editor')} · {pluralizeCount(memberCount, 'member')}</span>
                      </button>
                        {active && canManageMembers ? (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              aria-label={`Edit ${club.name}`} onClick={(e) => {
                                e.stopPropagation();
                                openEditClub(club);
                              }}
                              className="op-icon"
                            >
                              <Pencil size={18} />
                            </button>
                            {isAdmin ? (
                              <button
                                type="button"
                                aria-label={`Delete ${club.name}`} onClick={(e) => {
                                  e.stopPropagation();
                                  confirmDeleteClub(club);
                                }}
                                disabled={deleteClubMutation.isPending}
                                className="op-icon danger"
                              >
                                <Trash2 size={18} />
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        <div className="min-w-0 space-y-4">
          <div className="op-card overflow-hidden min-w-0">
            <div className="op-card-head">
              <div className="flex items-center gap-2">
                <CalendarDays size={18} className="text-slate-400" />
                <h2 className="font-bold">{selectedClub?.name ? `${selectedClub.name} Events` : 'Events'}</h2>
              </div>

              <div className="op-actions">
                <div className="relative w-full md:w-60">
                  <Search className="absolute left-4 top-3 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={eventSearch}
                    onChange={(e) => {
                      setEventSearch(e.target.value);
                      setEventPage(1);
                    }}
                    aria-label="Search events" placeholder="Search title or location"
                    disabled={!selectedClubId}
                    className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm disabled:opacity-50"
                  />
                </div>

                {mode !== 'club' && canEditEvents && <button
                  onClick={() => { createEventMutation.reset(); setIsCreateEventOpen(true); }}
                  disabled={!selectedClubId || !canEditEvents}
                  className="op-primary"
                >
                  <Plus size={18} />
                  New event
                </button>}
              </div>
            </div>

            {!selectedClubId ? (
              <div className="op-empty">
                {mode === 'club' ? 'Loading club...' : 'Select a club to view its events.'}
              </div>
            ) : eventsLoading ? (
              <TableSkeleton rows={7} columns={6} label="Loading club events" />
            ) : eventsError ? (
              <FormAlert className="m-4">Could not load events. <button type="button" onClick={() => retryEvents()}>Try again</button></FormAlert>
            ) : events.length === 0 ? (
              <div className="op-empty">{eventSearch.trim() ? 'No events match your search.' : 'No events scheduled yet.'}</div>
            ) : (
              <div className="op-scroll">
                <table className="op-table">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr className="text-left text-slate-500">
                      <th className="px-6 py-3 font-semibold">Event</th>
                      <th className="px-6 py-3 font-semibold">Status</th>
                      <th className="px-6 py-3 font-semibold">Visibility</th>
                      <th className="px-6 py-3 font-semibold">Schedule</th>
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
                      {e.location && <span className="block mt-1 text-xs font-normal text-slate-500">{e.location}</span>}</td>
                          <td className="px-6 py-4 text-slate-600 whitespace-nowrap"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${e.status === 'published' ? 'bg-emerald-50 text-emerald-700' : e.status === 'cancelled' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'}`}>{e.status || 'draft'}</span></td>
                          <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{e?.visibility || 'public'}</td>
                          <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{displayDate(e.startAt)}
                      {e.endAt && <span className="block text-xs text-slate-500">Until {displayDate(e.endAt)}</span>}</td>
                          <td className="px-6 py-4 text-slate-600">{displayCoordinators}</td>
                          <td className="px-6 py-4">
                            <div className="flex justify-end gap-1">
                              {canPublishEvents ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateEventMutation.mutate({
                                      clubId: selectedClubId,
                                      eventId: e._id,
                                      status: e?.status === 'published' ? 'draft' : 'published',
                                    })
                                  }
                                  disabled={updateEventMutation.isPending}
                                  className="px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all disabled:opacity-30"
                                >
                                  {e?.status === 'published' ? 'Unpublish' : 'Publish'}
                                </button>
                              ) : null}
                              {canEditEvents ? <button
                                type="button"
                                aria-label={`Edit event ${e.title}`} onClick={() => openEditEvent(e)}
                                className="op-icon"
                              >
                                <Pencil size={18} />
                              </button> : null}
                              {canDeleteEvents ? <button
                                type="button"
                                aria-label={`Delete event ${e.title}`} onClick={() => confirmDeleteEvent(e)}
                                disabled={deleteEventMutation.isPending}
                                className="op-icon danger"
                              >
                                <Trash2 size={18} />
                              </button> : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="op-footer">
                  <span>Page {eventsData?.page || 1} of {eventsData?.totalPages || 1} ({eventsData?.total || 0} events)</span>
                  <div className="flex gap-2">
                    <button type="button" aria-label="Previous events page" onClick={() => setEventPage(Math.max(1, (eventsData?.page || 1) - 1))} disabled={(eventsData?.page || 1) <= 1} className="op-icon"><ChevronLeft size={16} /></button>
                    <button type="button" aria-label="Next events page" onClick={() => setEventPage(Math.min(eventsData?.totalPages || 1, (eventsData?.page || 1) + 1))} disabled={(eventsData?.page || 1) >= (eventsData?.totalPages || 1)} className="op-icon"><ChevronRight size={16} /></button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Club modal */}
      {isCreateClubOpen && (
        <PortalDialog label="Create club" onClose={() => setIsCreateClubOpen(false)} busy={createClubMutation.isPending} className="[--dialog-width:42rem]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-lg">Create club</h2>
              <button
                type="button"
                aria-label="Close club editor" onClick={() => setIsCreateClubOpen(false)}
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
                    searchEnabled
                    searchPlaceholder="Search leads..."
                    emptyMessage="No users found"
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
                  className="op-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitCreateClub}
                  disabled={!canCreateClub || createClubMutation.isPending}
                  className="op-primary"
                >
                  {createClubMutation.isPending && <Loader2 className="animate-spin" size={16} />}
                  Create
                </button>
              </div>
            </div>
        </PortalDialog>
      )}

      {/* Edit Club modal */}
      {isEditClubOpen && (
        <PortalDialog label="Edit club" onClose={() => setIsEditClubOpen(false)} busy={updateClubMutation.isPending} className="[--dialog-width:42rem]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-lg">Edit club</h2>
              <button
                type="button" aria-label="Close club editor"
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
                    searchEnabled
                    searchPlaceholder="Search leads..."
                    emptyMessage="No users found"
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
                    clubId={selectedClubId}
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
                  className="op-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitUpdateClub}
                  disabled={!canUpdateClub || updateClubMutation.isPending}
                  className="op-primary"
                >
                  {updateClubMutation.isPending && <Loader2 className="animate-spin" size={16} />}
                  Save
                </button>
              </div>
            </div>
        </PortalDialog>
      )}

      {/* Create Event modal */}
      {isCreateEventOpen && (
        <EventForm
          mode="create"
          eventType="club"
          workspaceName={selectedClub?.name}
          clubId={selectedClubId}
          initialData={createEventForm}
          coordinators={users}
          isSubmitting={createEventMutation.isPending}
          saveError={createEventMutation.error}
          canPublish={canPublishEvents}
          onSubmit={(data) => {
            if (!canEditEvents || (data.status === 'published' && !canPublishEvents)) {
              toast.error('You do not have permission to save this event status');
              return;
            }

            createEventMutation.mutate({
              clubId: selectedClubId,
              title: data.title.trim(),
              description: data.description,
              shortDescription: data.shortDescription,
              registrationLink: data.registrationLink,
              externalLink: data.externalLink,
              scope: 'club',
              status: data.status || 'draft',
              visibility: data.visibility || 'public',
              location: data.location,
              venue: data.venue,
              mode: data.mode,
              startAt: data.startAt ? new Date(data.startAt).toISOString() : '',
              endAt: data.endAt ? new Date(data.endAt).toISOString() : '',
              coordinatorUserIds: data.coordinatorUserIds,
              posterUrl: data.posterUrl,
              posterPublicId: data.posterPublicId,
            });
          }}
          onCancel={() => setIsCreateEventOpen(false)}
          onPreview={(data) => setPreviewData(data)}
        />
      )}

      {/* Edit Event modal */}
      {isEditEventOpen && (
        <EventForm
          mode="edit"
          eventType="club"
          workspaceName={selectedClub?.name}
          clubId={selectedClubId}
          initialData={editEventForm}
          coordinators={users}
          isSubmitting={updateEventMutation.isPending}
          saveError={updateEventMutation.error}
          canPublish={canPublishEvents}
          onSubmit={(data) => {
            if (
              !canEditEvents ||
              (data.status === 'published' && eventEditing?.status !== 'published' && !canPublishEvents)
            ) {
              toast.error('You do not have permission to save this event status');
              return;
            }

            updateEventMutation.mutate({
              clubId: selectedClubId,
              eventId: eventEditing._id,
              title: data.title.trim(),
              description: data.description,
              shortDescription: data.shortDescription,
              registrationLink: data.registrationLink,
              externalLink: data.externalLink,
              scope: 'club',
              status: data.status || 'draft',
              visibility: data.visibility || 'public',
              location: data.location,
              venue: data.venue,
              mode: data.mode,
              startAt: data.startAt ? new Date(data.startAt).toISOString() : '',
              endAt: data.endAt ? new Date(data.endAt).toISOString() : '',
              coordinatorUserIds: data.coordinatorUserIds,
              posterUrl: data.posterUrl,
              posterPublicId: data.posterPublicId,
            });
          }}
          onCancel={() => {
            setIsEditEventOpen(false);
            setEventEditing(null);
          }}
          onPreview={(data) => setPreviewData(data)}
        />
      )}
      {previewData && <PreviewEventModal event={previewData} onClose={() => setPreviewData(null)} />}
    </div>
  );
}

function LegacyEvents({ tabs }) {
  const queryClient = useQueryClient();

  const { data: meData } = useQuery({ queryKey: ['me'], queryFn: me });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [previewData, setPreviewData] = useState(null);

  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    shortDescription: '',
    registrationLink: '',
    externalLink: '',
    location: '',
    status: 'draft',
    visibility: 'public',
    startAt: '',
    endAt: '',
    coordinatorUserIds: [],
  });

  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    shortDescription: '',
    registrationLink: '',
    externalLink: '',
    location: '',
    status: 'draft',
    visibility: 'public',
    startAt: '',
    endAt: '',
    coordinatorUserIds: [],
  });

  const { data: eventsData, isLoading: eventsLoading, isError: eventsError, refetch: retryEvents } = useQuery({
    queryKey: ['events', search, page],
    queryFn: () => fetchEvents(search, { page, limit: 20, scope: 'iedc' }),
    retry: false,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetchUsers(),
    enabled: hasWorkspacePermission(meData, 'users') && (isCreateOpen || isEditOpen),
    retry: false,
  });

  const events = Array.isArray(eventsData?.events) ? eventsData.events : [];


  const coordinatorOptions = hasWorkspacePermission(meData, 'users')
    ? usersData?.users || []
    : selected?.coordinatorUsers?.length ? selected.coordinatorUsers : [selected?.coordinatorUser].filter(Boolean);

  const createMutation = useMutation({
    mutationFn: createEvent,
    onSuccess: () => {
      toast.success('Event created');
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
      setIsCreateOpen(false);
      setCreateForm({
        title: '',
        description: '',
        shortDescription: '',
        registrationLink: '',
        externalLink: '',
        location: '',
        status: 'draft',
        visibility: 'public',
        startAt: '',
        endAt: '',
        coordinatorUserIds: [],
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateEvent,
    onSuccess: () => {
      toast.success('Event updated');
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
      setIsEditOpen(false);
      setSelected(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => {
      toast.success('Event deleted');
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to delete event'),
  });

  const openEdit = (event) => {
    if (!event) return;
    setSelected(event);
    setEditForm({
      title: event?.title || '',
      description: event?.description || '',
      shortDescription: event?.shortDescription || '',
      posterUrl: event?.posterUrl || '',
      posterPublicId: event?.posterPublicId || '',
      registrationLink: event?.registrationLink || event?.registrationUrl || '',
      externalLink: event?.externalLink || '',
      location: event?.location || '',
      status: event?.status || 'draft',
      visibility: event?.visibility || 'public',
      startAt: toDatetimeLocalValue(event?.startAt),
      endAt: toDatetimeLocalValue(event?.endAt),
      coordinatorUserIds: (event.coordinatorUsers?.length ? event.coordinatorUsers : [event.coordinatorUser].filter(Boolean))
        .map(user => String(user._id || user)),
    });
    updateMutation.reset();
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
                className="op-secondary"
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

  return (
    <div className="op-page">
      <div className="op-header op-event-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Events</h1>
          <p className="text-slate-500 text-sm">Create, update, and assign coordinators.</p>
        </div>

        <button
          onClick={() => { createMutation.reset(); setIsCreateOpen(true); }}
          className="op-primary"
        >
          <Plus size={18} />
          New event
        </button>
      </div>

      {tabs}
      <div className="op-card overflow-hidden min-w-0">
        <div className="op-card-head">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-slate-400" />
            <h2 className="font-bold">Organization events</h2>
          </div>

          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-3 text-slate-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              aria-label="Search events" placeholder="Search title or location"
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        {eventsLoading ? (
          <TableSkeleton rows={7} columns={6} label="Loading organization events" />
        ) : eventsError ? (
          <FormAlert className="m-4">Could not load events. <button type="button" onClick={() => retryEvents()}>Try again</button></FormAlert>
        ) : events.length === 0 ? (
          <div className="op-empty">{search.trim() ? 'No events match your search.' : 'No events scheduled yet.'}</div>
        ) : (
          <div className="op-scroll">
            <table className="op-table">
              <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-left text-slate-500">
                    <th className="px-6 py-3 font-semibold">Event</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 font-semibold">Visibility</th>
                    <th className="px-6 py-3 font-semibold">Schedule</th>
                    <th className="px-6 py-3 font-semibold">Coordinator</th>
                    <th className="px-6 py-3 font-semibold text-right">Actions</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {events.map((e) => (
                  <tr key={e?._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900 whitespace-nowrap">
                      {e?.title || '—'}
                      {e.location && <span className="block mt-1 text-xs font-normal text-slate-500">{e.location}</span>}</td>
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${e.status === 'published' ? 'bg-emerald-50 text-emerald-700' : e.status === 'cancelled' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'}`}>{e.status || 'draft'}</span></td>
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{e?.visibility || 'public'}</td>
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{displayDate(e.startAt)}
                      {e.endAt && <span className="block text-xs text-slate-500">Until {displayDate(e.endAt)}</span>}</td>
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                      {(e.coordinatorUsers || []).map(u => u.name || u.membershipId).filter(Boolean).join(', ') || e.coordinatorUser?.name || e.coordinatorUser?.membershipId || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          aria-label={`Edit event ${e.title}`} onClick={() => openEdit(e)}
                          className="op-icon"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete event ${e.title}`} onClick={() => confirmDelete(e)}
                          disabled={deleteMutation.isPending}
                          className="op-icon danger"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="op-footer">
              <span>Page {eventsData?.page || 1} of {eventsData?.totalPages || 1} ({eventsData?.total || 0} events)</span>
              <div className="flex gap-2">
                <button type="button" aria-label="Previous organization events page" onClick={() => setPage(Math.max(1, (eventsData?.page || 1) - 1))} disabled={(eventsData?.page || 1) <= 1} className="op-icon"><ChevronLeft size={16} /></button>
                <button type="button" aria-label="Next organization events page" onClick={() => setPage(Math.min(eventsData?.totalPages || 1, (eventsData?.page || 1) + 1))} disabled={(eventsData?.page || 1) >= (eventsData?.totalPages || 1)} className="op-icon"><ChevronRight size={16} /></button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create modal */}
      {isCreateOpen && (
        <EventForm
          mode="create"
          eventType="iedc"
          initialData={createForm}
          coordinators={coordinatorOptions}
          isSubmitting={createMutation.isPending}
          saveError={createMutation.error}
          onSubmit={(data) => {
            createMutation.mutate({
              title: data.title.trim(),
              description: data.description,
              shortDescription: data.shortDescription,
              registrationLink: data.registrationLink,
              externalLink: data.externalLink,
              location: data.location,
              status: data.status,
              visibility: data.visibility,
              startAt: data.startAt ? new Date(data.startAt).toISOString() : '',
              endAt: data.endAt ? new Date(data.endAt).toISOString() : '',
              coordinatorUserIds: data.coordinatorUserIds,
              coordinatorUserId: data.coordinatorUserIds[0] || '',
              posterUrl: data.posterUrl,
              posterPublicId: data.posterPublicId,
            });
          }}
          onCancel={() => setIsCreateOpen(false)}
          onPreview={(data) => setPreviewData(data)}
        />
      )}

      {/* Edit modal */}
      {isEditOpen && (
        <EventForm
          mode="edit"
          eventType="iedc"
          initialData={editForm}
          coordinators={coordinatorOptions}
          isSubmitting={updateMutation.isPending}
          saveError={updateMutation.error}
          onSubmit={(data) => {
            updateMutation.mutate({
              id: selected._id,
              title: data.title.trim(),
              description: data.description,
              shortDescription: data.shortDescription,
              registrationLink: data.registrationLink,
              externalLink: data.externalLink,
              location: data.location,
              status: data.status || 'draft',
              visibility: data.visibility || 'public',
              startAt: data.startAt ? new Date(data.startAt).toISOString() : '',
              endAt: data.endAt ? new Date(data.endAt).toISOString() : '',
              coordinatorUserIds: data.coordinatorUserIds,
              coordinatorUserId: data.coordinatorUserIds[0] || '',
              posterUrl: data.posterUrl,
              posterPublicId: data.posterPublicId,
            });
          }}
          onCancel={() => {
            setIsEditOpen(false);
            setSelected(null);
          }}
          onPreview={(data) => setPreviewData(data)}
        />
      )}
      {previewData && <PreviewEventModal event={previewData} onClose={() => setPreviewData(null)} />}
    </div>
  );
}

export default function Events() {
  const { mode, clubId } = useViewMode();
  const [params, setParams] = useSearchParams();
  const scope = params.get('scope') === 'club' ? 'club' : 'iedc';
  if (mode === 'club') return <ClubsEvents key={clubId} />;

  const tabs = (
    <div className="op-tabs" role="group" aria-label="Event scope">
      {[['iedc', 'Organization'], ['club', 'Clubs']].map(([value, label]) => (
        <button type="button" key={value} className="op-tab" aria-pressed={scope === value}
          onClick={() => setParams(previous => { const next = new URLSearchParams(previous); next.set('scope', value); return next; })}>
          {label}
        </button>
      ))}
    </div>
  );
  return scope === 'iedc' ? <LegacyEvents tabs={tabs} /> : <ClubsEvents tabs={tabs} />;
}
