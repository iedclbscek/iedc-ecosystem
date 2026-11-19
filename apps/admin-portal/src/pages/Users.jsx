import './team-access.css';
import FormAlert from '../components/FormAlert';
import PortalDialog from '../components/PortalDialog';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  ShieldCheck,
  Users as UsersIcon,
  X,
  Loader2,
} from 'lucide-react';
import {
  deleteUser,
  fetchClubs,
  fetchUsers,
  promoteClubPortalMember,
  promoteUser,
  searchStudents,
  updateClubPortalMember,
  updateClub,
  updateUser,
} from '../api/adminService';
import { me } from '../api/authService';
import { useViewMode } from '../context/ViewModeContext';
import ExecomEntriesManager from '../components/ExecomEntriesManager';
import { getWorkspaceAccess, hasWorkspacePermission, normalizePortalRole } from '../utils/authorization';
import { RowsSkeleton, TableSkeleton } from '../components/InlineSkeleton';

const normalize = (v) => String(v ?? '').trim().toLowerCase();
const permissionMatches = (value, permission) => hasWorkspacePermission({ role: 'iedc_execom', permissions: [value] }, permission);

function ClubMemberManager({ meData, forcedClubId }) {
  const queryClient = useQueryClient();
  const [clubId, setClubId] = useState('');
  const [query, setQuery] = useState('');

  const { data: clubsData, isLoading, isError, refetch: retryClubs } = useQuery({
    queryKey: ['clubs'],
    queryFn: fetchClubs,
    retry: false,
  });

  const clubs = useMemo(() => {
    return Array.isArray(clubsData?.clubs) ? clubsData.clubs : [];
  }, [clubsData]);
  const myClubs = useMemo(() => {
    return clubs.filter(club => normalizePortalRole(meData?.role) === 'super_admin' ||
      getWorkspaceAccess(meData, club._id).managePermissions);
  }, [clubs, meData]);

  const selectedClub = useMemo(() => {
    const id = forcedClubId || clubId || myClubs[0]?._id;
    return myClubs.find((c) => String(c?._id) === String(id)) || null;
  }, [clubId, forcedClubId, myClubs]);

  const selectedClubId = selectedClub?._id ? String(selectedClub._id) : '';

  const memberIds = useMemo(() => {
    const list = Array.isArray(selectedClub?.memberRegistrations)
      ? selectedClub.memberRegistrations
      : [];
    return list.map((r) => String(r?._id)).filter(Boolean);
  }, [selectedClub]);

  const { data: searchData, isFetching, isError: searchFailed, refetch: retrySearch } = useQuery({
    queryKey: ['club-members-search', selectedClubId, query],
    queryFn: () => searchStudents(query.trim(), 'student', { clubId: selectedClubId }),
    enabled: Boolean(selectedClubId) && query.trim().length >= 2,
    retry: false,
  });

  const students = Array.isArray(searchData?.students) ? searchData.students : [];

  const updateMembersMutation = useMutation({
    mutationFn: updateClub,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Members updated');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to update members');
    },
  });

  const toggleMember = (registrationId) => {
    if (!selectedClubId || updateMembersMutation.isPending) return;
    const id = String(registrationId);
    const next = memberIds.includes(id)
      ? memberIds.filter((x) => x !== id)
      : [...memberIds, id];
    updateMembersMutation.mutate({ id: selectedClubId, memberRegistrationIds: next });
  };

  const removeMember = (registrationId) => toggleMember(registrationId);

  if (isLoading) {
    return <div className="rounded-2xl border border-slate-200 bg-white"><RowsSkeleton rows={5} columns={3} label="Loading clubs" /></div>;
  }

  if (isError) {
    return (
      <FormAlert className="m-4">Could not load clubs. <button type="button" onClick={() => retryClubs()}>Try again</button></FormAlert>
    );
  }

  if (myClubs.length === 0) {
    return (
      <div className="op-card p-5 text-slate-500">
        No clubs assigned to you.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="op-card p-5">
        <div className="op-header">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Club members</h2>
            <p className="text-sm text-slate-500">Search registrations to add or remove club members.</p>
          </div>
          {!forcedClubId ? (
            <label className="text-sm text-slate-600">
              <span className="font-semibold text-slate-700">Club</span>
              <select
                value={selectedClubId}
                onChange={(e) => setClubId(e.target.value)}
                className="ml-2"
              >
                {myClubs.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="text-sm text-slate-500 font-semibold">{selectedClub?.name || 'Club'}</div>
          )}
        </div>

        <div className="mt-6">
          <div className="relative">
            <Search className="absolute left-4 top-3 text-slate-400" size={18} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search registrations" placeholder="Name, email or membership ID"
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm"
            />
          </div>

          <div className="mt-4">
            {isFetching ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="animate-spin" size={16} /> Searching...
              </div>
            ) : query.trim().length < 2 ? (
              <div className="text-sm text-slate-500">Type at least 2 characters to search.</div>
            ) : searchFailed ? (
                        <FormAlert className="m-3">Could not search members. <button type="button" onClick={() => retrySearch()}>Try again</button></FormAlert>
                      ) : students.length === 0 ? (
              <div className="text-sm text-slate-500">No matches.</div>
            ) : (
              <div className="max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white">
                {students.map((s) => {
                  const sid = String(s?._id);
                  const checked = memberIds.includes(sid);
                  const name = `${s?.firstName ?? ''} ${s?.lastName ?? ''}`.trim() || 'Student';
                  const meta = [s?.membershipId, s?.email].filter(Boolean).join(' • ');
                  return (
                    <label
                      key={sid}
                      className="flex items-start gap-3 px-4 py-2 hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={checked}
                        onChange={() => toggleMember(sid)}
                      />
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{name}</div>
                        {meta ? <div className="text-xs text-slate-500">{meta}</div> : null}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="op-card p-5">
        <div className="font-bold text-slate-900">Selected members</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(Array.isArray(selectedClub?.memberRegistrations)
            ? selectedClub.memberRegistrations
            : []
          ).map((r) => {
            const rid = String(r?._id);
            const label = `${r?.firstName ?? ''} ${r?.lastName ?? ''}`.trim() || r?.membershipId || 'Member';
            return (
              <button
                key={rid}
                type="button"
                onClick={() => removeMember(rid)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
                title="Remove"
              >
                {label}
                <X size={14} />
              </button>
            );
          })}
          {memberIds.length === 0 ? (
            <div className="text-sm text-slate-500">No members selected.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const permissionOptions = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'registrations', label: 'Members' },
  { id: 'firstYearReps', label: 'First-year reps' },
  { id: 'events', label: 'Events' },
  { id: 'users', label: 'Team & access' },
  { id: 'makerspace', label: 'Makerspace' },
  { id: 'mailer', label: 'Email center' },
  { id: 'settings', label: 'Settings' },
  { id: 'firstYearReps', label: 'First-Year Reps' },
  { id: 'secondYearReps', label: 'Second-Year Reps' },
];

const CLUB_EVENT_PERMISSION_OPTIONS = [
  { id: 'club_events_edit', label: 'Edit event details' },
  { id: 'club_events_publish', label: 'Publish events' },
  { id: 'club_events_delete', label: 'Delete events' },
  { id: 'club_page_edit', label: 'Edit Nexus page drafts' },
  { id: 'club_page_publish', label: 'Publish and unpublish Nexus page' },
];
const CLUB_PORTAL_PERMISSION_IDS = new Set(CLUB_EVENT_PERMISSION_OPTIONS.map((option) => option.id));

function ClubPortalMemberManager({ meData, forcedClubId }) {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [portalAccessEnabled, setPortalAccessEnabled] = useState(true);
  const [permissions, setPermissions] = useState([]);

  const [editingUser, setEditingUser] = useState(null);
  const [editPortalAccessEnabled, setEditPortalAccessEnabled] = useState(true);
  const [editPermissions, setEditPermissions] = useState([]);

  const { data: clubsData, isLoading, isError, refetch: retryClubs } = useQuery({
    queryKey: ['clubs'],
    queryFn: fetchClubs,
    retry: false,
  });

  const clubs = Array.isArray(clubsData?.clubs) ? clubsData.clubs : [];
  const activeClub = clubs.find((c) => String(c?._id) === String(forcedClubId)) || null;

  const isLead = normalizePortalRole(meData?.role) === 'super_admin' ||
    getWorkspaceAccess(meData, forcedClubId).managePermissions;

  const availablePermissionOptions = CLUB_EVENT_PERMISSION_OPTIONS;

  const searchEnabled = isAddOpen && searchQuery.trim().length >= 2;
  const { data: searchData, isFetching, isError: searchFailed, refetch: retrySearch } = useQuery({
    queryKey: ['club-portal-member-search', forcedClubId, searchQuery],
    queryFn: () => searchStudents(searchQuery.trim(), 'student', { clubId: forcedClubId }),
    enabled: searchEnabled,
    retry: false,
  });

  const students = Array.isArray(searchData?.students) ? searchData.students : [];

  const portalMembers = useMemo(() => {
    return Array.isArray(activeClub?.memberUsers) ? activeClub.memberUsers : [];
  }, [activeClub]);

  const membershipsByUserId = useMemo(() => {
    return new Map(
      (Array.isArray(activeClub?.memberships) ? activeClub.memberships : []).map((membership) => [
        String(membership?.userId),
        membership,
      ]),
    );
  }, [activeClub]);

  const addMutation = useMutation({
    mutationFn: promoteClubPortalMember,
    onSuccess: (data) => {
      toast.success('Portal access saved');
      if (data?.passwordSetupEmailSent) toast.success('Password setup email sent');
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setIsAddOpen(false);
      setSearchQuery('');
      setSelectedStudent(null);
      setPortalAccessEnabled(true);
      setPermissions([]);
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateClubPortalMember,
    onSuccess: (data) => {
      toast.success('Portal access updated');
      if (data?.passwordSetupEmailSent) toast.success('Password setup email sent');
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setEditingUser(null);
    },
  });

  const openEdit = (u) => {
    const membership = membershipsByUserId.get(String(u?._id));
    updateMutation.reset();
    setEditingUser(u);
    setEditPortalAccessEnabled(membership?.status !== 'inactive');
    setEditPermissions(Array.isArray(membership?.permissions) ? membership.permissions : []);
  };

  if (isLoading) {
    return <div className="rounded-2xl border border-slate-200 bg-white"><RowsSkeleton rows={5} columns={4} label="Loading portal members" /></div>;
  }

  if (isError) {
    return (
      <FormAlert className="m-4">Could not load clubs. <button type="button" onClick={() => retryClubs()}>Try again</button></FormAlert>
    );
  }

  if (!activeClub) {
    return (
      <div className="op-card p-5 text-slate-500">
        Select a club to manage portal access.
      </div>
    );
  }

  if (!isLead) {
    return (
      <div className="op-card p-5">
        <div className="font-bold text-slate-900">Portal Access</div>
        <div className="text-sm text-slate-500 mt-1">Only club leads can manage portal access.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="op-card p-5">
        <div className="op-header">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Portal access</h2>
            <p className="text-sm text-slate-500">
              Choose which event actions each club member can use.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { addMutation.reset(); setIsAddOpen(true); }}
            className="op-primary"
          >
            <Plus size={18} />
            Grant member access
          </button>
        </div>
      </div>

      <div className="op-card overflow-hidden min-w-0">
        <div className="op-dialog-head">
          <div className="font-bold text-slate-900">Portal members</div>
          <div className="text-sm text-slate-500 font-semibold">{portalMembers.length} members</div>
        </div>

        {portalMembers.length === 0 ? (
          <div className="p-6 text-slate-500">No portal members yet.</div>
        ) : (
          <div className="op-scroll">
            <table className="op-table">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-left text-slate-500">
                  <th className="px-6 py-3 font-semibold">Member</th>
                  <th className="px-6 py-3 font-semibold">Portal Access</th>
                  <th className="px-6 py-3 font-semibold">Permissions</th>
                  <th className="px-6 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {portalMembers.map((u) => {
                  const membership = membershipsByUserId.get(String(u?._id));
                  const perms = (Array.isArray(membership?.permissions) ? membership.permissions : []).filter(
                    (p) => CLUB_PORTAL_PERMISSION_IDS.has(normalize(p)) && !p.startsWith('club_page_'),
                  );
                  return (
                    <tr key={String(u?._id)} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900 whitespace-nowrap">{u?.name || '—'}
                          <span className="block text-xs font-normal text-slate-500">{u?.email}</span>
                          <span className="block text-xs font-normal text-slate-500">{u?.membershipId}</span></td>
                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                        {membership?.status === 'inactive' ? (
                          <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-red-50 text-red-700">Disabled</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700">Enabled</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{perms.join(', ') || '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEdit(u)}
                          className="op-secondary"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isAddOpen && (
        <PortalDialog label="Add member access" onClose={() => setIsAddOpen(false)} busy={addMutation.isPending} className="team-access-dialog">
            <div className="op-dialog-head">
              <div>
                <h3 className="font-bold text-slate-900">Add member access</h3>
                <p className="text-sm text-slate-500">Search a student and enable portal login.</p>
              </div>
              <button
                onClick={() => {
                  if (addMutation.isPending) return;
                  setIsAddOpen(false);
                }}
                className="op-icon"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="team-access-body">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Search Registrations</label>
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSelectedStudent(null);
                    }}
                    aria-label="Search registrations" placeholder="Type name, email, or membership ID..."
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-400">Type at least 2 characters to search.</p>

                {searchEnabled && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                      {isFetching ? (
                        <div className="p-4 flex items-center gap-2 text-slate-500">
                          <Loader2 className="animate-spin" size={16} />
                          Searching...
                        </div>
                      ) : searchFailed ? (
                        <FormAlert className="m-3">Could not search members. <button type="button" onClick={() => retrySearch()}>Try again</button></FormAlert>
                      ) : students.length === 0 ? (
                        <div className="p-4 text-slate-500">No students found.</div>
                      ) : (
                        students.map((s) => (
                          <button
                            key={s?._id}
                            type="button"
                            onClick={() => setSelectedStudent(s)}
                            className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${
                              selectedStudent?._id === s?._id ? 'bg-blue-50' : 'bg-white'
                            }`}
                          >
                            <div className="font-semibold text-slate-900">
                              {`${s?.firstName ?? ''} ${s?.lastName ?? ''}`.trim() || '—'}
                            </div>
                            <div className="text-xs text-slate-500">
                              {s?.email || '—'} • {s?.membershipId || 'No membershipId'}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Selected</p>
                {selectedStudent ? (
                  <div className="mt-2">
                    <p className="font-bold text-slate-900">
                      {`${selectedStudent?.firstName ?? ''} ${selectedStudent?.lastName ?? ''}`.trim() || '—'}
                    </p>
                    <p className="text-sm text-slate-500">{selectedStudent?.email || '—'}</p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">No student selected yet.</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Club Access</label>
                <label className="flex items-center gap-2 text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(portalAccessEnabled)}
                    onChange={(e) => setPortalAccessEnabled(e.target.checked)}
                  />
                  <span className="font-medium text-slate-700">Active access to this club workspace</span>
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Event Permissions</label>
                {availablePermissionOptions.length === 0 ? (
                  <div className="text-sm text-slate-500">You do not have any assignable permissions.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {availablePermissionOptions.map((opt) => (
                      <label
                        key={opt.id}
                        className="flex items-center gap-2 text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={permissions.includes(opt.id)}
                          onChange={(e) => {
                            setPermissions((prev) =>
                              e.target.checked
                                ? Array.from(new Set([...prev, opt.id]))
                                : prev.filter((p) => p !== opt.id)
                            );
                          }}
                        />
                        <span className="font-medium text-slate-700">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {addMutation.isError && <FormAlert className="mx-5 my-2">{addMutation.error?.response?.data?.message || addMutation.error?.message || 'Could not grant member access. Try again.'}</FormAlert>}
            <div className="op-dialog-foot">
              <button
                type="button"
                onClick={() => {
                  if (addMutation.isPending) return;
                  setIsAddOpen(false);
                }}
                className="op-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedStudent || addMutation.isPending}
                onClick={() => {
                  if (!selectedStudent?._id) return;
                  addMutation.mutate({
                    clubId: String(activeClub?._id),
                    registrationId: selectedStudent._id,
                    portalAccessEnabled,
                    pagePermissions: permissions.filter(p => p.startsWith('club_page_')),
                    permissions: (Array.isArray(permissions) ? permissions : []).filter((p) =>
                      CLUB_PORTAL_PERMISSION_IDS.has(normalize(p)) && !p.startsWith('club_page_')
                    ),
                  });
                }}
                className="op-primary"
              >
                {addMutation.isPending && <Loader2 className="animate-spin" size={16} />}
                Save
              </button>
            </div>
        </PortalDialog>
      )}

      {editingUser && (
        <PortalDialog label="Manage portal access" onClose={() => setEditingUser(null)} busy={updateMutation.isPending} className="team-access-dialog">
            <div className="op-dialog-head">
              <div>
                <h3 className="font-bold text-slate-900">Manage portal access</h3>
                <p className="text-sm text-slate-500">Update access and permissions for this member.</p>
              </div>
              <button
                onClick={() => {
                  if (updateMutation.isPending) return;
                  setEditingUser(null);
                }}
                className="op-icon"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="team-access-body">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Member</p>
                <div className="mt-2">
                  <p className="font-bold text-slate-900">{editingUser?.name || '—'}</p>
                  <p className="text-sm text-slate-500">{editingUser?.email || '—'}</p>
                  <p className="text-sm text-slate-500">{editingUser?.membershipId || '—'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Club Access</label>
                <label className="flex items-center gap-2 text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editPortalAccessEnabled)}
                    onChange={(e) => setEditPortalAccessEnabled(e.target.checked)}
                  />
                  <span className="font-medium text-slate-700">Active access to this club workspace</span>
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Event Permissions</label>
                {availablePermissionOptions.length === 0 ? (
                  <div className="text-sm text-slate-500">You do not have any assignable permissions.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {availablePermissionOptions.map((opt) => (
                      <label
                        key={opt.id}
                        className="flex items-center gap-2 text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={editPermissions.includes(opt.id)}
                          onChange={(e) => {
                            setEditPermissions((prev) =>
                              e.target.checked
                                ? Array.from(new Set([...prev, opt.id]))
                                : prev.filter((p) => p !== opt.id)
                            );
                          }}
                        />
                        <span className="font-medium text-slate-700">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {updateMutation.isError && <FormAlert className="mx-5 my-2">{updateMutation.error?.response?.data?.message || updateMutation.error?.message || 'Could not update member access. Try again.'}</FormAlert>}
            <div className="op-dialog-foot">
              <button
                type="button"
                onClick={() => {
                  if (updateMutation.isPending) return;
                  setEditingUser(null);
                }}
                className="op-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updateMutation.isPending}
                onClick={() => {
                  updateMutation.mutate({
                    clubId: String(activeClub?._id),
                    userId: String(editingUser?._id),
                    portalAccessEnabled: editPortalAccessEnabled,
                    pagePermissions: editPermissions.filter(p => p.startsWith('club_page_')),
                    permissions: (Array.isArray(editPermissions) ? editPermissions : []).filter((p) =>
                      CLUB_PORTAL_PERMISSION_IDS.has(normalize(p)) && !p.startsWith('club_page_')
                    ),
                  });
                }}
                className="op-primary"
              >
                {updateMutation.isPending && <Loader2 className="animate-spin" size={16} />}
                Save
              </button>
            </div>
        </PortalDialog>
      )}
    </div>
  );
}

export default function Users() {
  const queryClient = useQueryClient();

  const { mode, clubId: activeClubId } = useViewMode();

  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: me,
    retry: false,
  });

  const isAdmin = normalizePortalRole(meData?.role) === 'super_admin';
  const canManageUsers = hasWorkspacePermission(meData, 'users');
  const isClubLead = Boolean(meData?.isClubLead);
  const canChangeAccount = user => Boolean(user) && normalize(user.membershipId) !== 'admin' &&
    (isAdmin || normalizePortalRole(user.role) !== 'super_admin');


  // Filter permissions that the current user can assign (only permissions they have)
  const availablePermissionOptions = isAdmin ? permissionOptions : permissionOptions.filter(opt => hasWorkspacePermission(meData, opt.id));

  const [activeCategory, setActiveCategory] = useState('execom');
  const [listPage, setListPage] = useState(1);
  const [listSearch, setListSearch] = useState('');
  const [showWebsiteExecomOrder, setShowWebsiteExecomOrder] = useState(false);
  const [clubLeadsQuery, setClubLeadsQuery] = useState('');

  const [isAddClubLeadOpen, setIsAddClubLeadOpen] = useState(false);
  const [clubLeadSearchQuery, setClubLeadSearchQuery] = useState('');
  const [clubLeadSelectedStudent, setClubLeadSelectedStudent] = useState(null);
  const [clubLeadSelectedClubIds, setClubLeadSelectedClubIds] = useState([]);
  const [clubLeadPortalAccessEnabled, setClubLeadPortalAccessEnabled] = useState(true);

  const [isOpen, setIsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMemberType, setSearchMemberType] = useState('student');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState({
    role: 'iedc_execom',
    customRole: '',
    permissions: [],
    portalAccessEnabled: false,
  });

  const [editForm, setEditForm] = useState({
    role: 'iedc_execom',
    customRole: '',
    permissions: [],
    portalAccessEnabled: true,
  });

  const { data: usersData, isLoading: usersLoading, isError: usersError, refetch: retryUsers } = useQuery({
    queryKey: ['users', activeCategory, listPage, listSearch],
    queryFn: () => fetchUsers({ page: listPage, limit: 20, search: listSearch, roleCategory: activeCategory }),
    enabled: mode !== 'club' && canManageUsers && activeCategory !== 'clubLeads',
    retry: false,
  });

  const { data: allUsersData, isLoading: directoryLoading, isError: directoryError, refetch: retryDirectory } = useQuery({
    queryKey: ['users', 'directory'],
    queryFn: () => fetchUsers(),
    enabled: mode !== 'club' && canManageUsers && (activeCategory === 'clubLeads' || showWebsiteExecomOrder),
    retry: false,
  });

  const users = useMemo(() => {
    const source = activeCategory === 'clubLeads' ? allUsersData : usersData;
    return Array.isArray(source?.users) ? source.users : [];
  }, [activeCategory, allUsersData, usersData]);


  const { data: clubsData, isLoading: clubsLoading, isError: clubsError, refetch: retryClubs } = useQuery({
    queryKey: ['clubs'],
    queryFn: fetchClubs,
    enabled: Boolean(meData?.id) && (canManageUsers || mode === 'club' || isClubLead),
    retry: false,
  });

  const clubs = useMemo(() => {
    return Array.isArray(clubsData?.clubs) ? clubsData.clubs : [];
  }, [clubsData]);

  const usersById = useMemo(() => {
    const m = new Map();
    (Array.isArray(users) ? users : []).forEach((u) => {
      const id = String(u?._id ?? u?.id ?? '');
      if (id) m.set(id, u);
    });
    return m;
  }, [users]);

  const clubLeadRows = useMemo(() => {
    const map = new Map();
    (Array.isArray(clubs) ? clubs : []).forEach((club) => {
      const clubId = String(club?._id ?? '');
      if (!clubId) return;
      const clubName = String(club?.name ?? 'Club');
      const leads = Array.isArray(club?.managerUsers) ? club.managerUsers : [];

      leads.forEach((lead) => {
        const leadId = String(lead?._id ?? lead ?? '');
        if (!leadId) return;
        const user = usersById.get(leadId) || lead;
        if (!map.has(leadId)) {
          map.set(leadId, { userId: leadId, user, clubs: [] });
        }
        map.get(leadId).clubs.push({ clubId, clubName });
      });
    });

    return Array.from(map.values()).sort((a, b) => {
      const an = String(a?.user?.name ?? '').toLowerCase();
      const bn = String(b?.user?.name ?? '').toLowerCase();
      return an.localeCompare(bn);
    });
  }, [clubs, usersById]);

  const filteredClubLeadRows = useMemo(() => {
    const q = normalize(clubLeadsQuery);
    if (!q) return clubLeadRows;
    return clubLeadRows.filter((row) => {
      const u = row?.user;
      const name = String(u?.name ?? '').toLowerCase();
      const mid = String(u?.membershipId ?? '').toLowerCase();
      const email = String(u?.email ?? '').toLowerCase();
      const clubsText = (Array.isArray(row?.clubs) ? row.clubs : [])
        .map((c) => String(c?.clubName ?? '').toLowerCase())
        .join(' ');
      return (
        name.includes(q) ||
        mid.includes(q) ||
        email.includes(q) ||
        clubsText.includes(q)
      );
    });
  }, [clubLeadRows, clubLeadsQuery]);
  const leadPages = Math.max(1, Math.ceil(filteredClubLeadRows.length / 20));
  const leadPage = Math.min(listPage, leadPages);
  const visibleLeads = filteredClubLeadRows.slice((leadPage - 1) * 20, leadPage * 20);


  const searchEnabled = isOpen && searchQuery.trim().length >= 2;
  const {
    data: searchData,
    isFetching: searching,
    isError: searchFailed,
    refetch: retrySearch,
  } = useQuery({
    queryKey: ['student-search', searchMemberType, searchQuery],
    queryFn: () => searchStudents(searchQuery.trim(), searchMemberType),
    enabled: searchEnabled,
    retry: false,
  });

  const students = useMemo(() => {
    const list = Array.isArray(searchData?.students) ? searchData.students : [];
    return list;
  }, [searchData]);

  const clubLeadSearchEnabled = isAddClubLeadOpen && clubLeadSearchQuery.trim().length >= 2;
  const {
    data: clubLeadSearchData,
    isFetching: clubLeadSearching,
    isError: clubLeadSearchFailed,
    refetch: retryClubLeadSearch,
  } = useQuery({
    queryKey: ['club-lead-student-search', clubLeadSearchQuery],
    queryFn: () => searchStudents(clubLeadSearchQuery.trim()),
    enabled: clubLeadSearchEnabled,
    retry: false,
  });

  const clubLeadStudents = useMemo(() => {
    return Array.isArray(clubLeadSearchData?.students) ? clubLeadSearchData.students : [];
  }, [clubLeadSearchData]);

  const promoteMutation = useMutation({
    mutationFn: promoteUser,
    onSuccess: (data) => {
      toast.success('Member added successfully');
      if (data?.passwordSetupEmailSent) {
        toast.success('Password setup email sent');
      }
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
      setIsOpen(false);
      setSearchQuery('');
      setSelectedStudent(null);
      setForm({
        role: 'iedc_execom',
        customRole: '',
        permissions: [],
        portalAccessEnabled: false,
      });
    },
  });

  const addClubLeadMutation = useMutation({
    mutationFn: async ({ student, clubIds, portalAccessEnabled }) => {
      const membershipId = String(student?.membershipId ?? '').trim();
      const email = String(student?.email ?? '').trim().toLowerCase();

      const existingUser = users.find((u) => {
        const mid = String(u?.membershipId ?? '').trim();
        const em = String(u?.email ?? '').trim().toLowerCase();
        return (membershipId && mid === membershipId) || (email && em === email);
      });

      let userId = existingUser?._id ? String(existingUser._id) : '';
      let emailSent = false;

      if (!userId) {
        const data = await promoteUser({
          registrationId: student._id,
          memberType: student?.userType,
          role: 'Custom',
          customRole: 'Club Lead',
          permissions: [],
          portalAccessEnabled: Boolean(portalAccessEnabled),
        });

        userId = String(data?.user?.id ?? '');
        emailSent = Boolean(data?.passwordSetupEmailSent);
      } else if (portalAccessEnabled && existingUser?.portalAccessEnabled === false) {
        const roleText = String(existingUser?.role ?? '').trim();
        const normalized = normalizePortalRole(roleText);
        const standard = ['super_admin', 'iedc_execom'];

        await updateUser({
          id: existingUser._id,
          role: standard.includes(normalized) ? normalized : 'Custom',
          customRole: standard.includes(normalized) ? '' : roleText,
          permissions: Array.isArray(existingUser?.permissions) ? existingUser.permissions : [],
          portalAccessEnabled: true,
        });
      }

      const uniqueClubIds = Array.from(new Set((Array.isArray(clubIds) ? clubIds : []).map(String)));
      await Promise.all(
        uniqueClubIds.map(async (cid) => {
          const club = clubs.find((c) => String(c?._id) === String(cid));
          if (!club) return;
          const current = Array.isArray(club?.managerUsers)
            ? club.managerUsers.map((u) => String(u?._id)).filter(Boolean)
            : [];
          const next = current.includes(userId) ? current : [...current, userId];
          await updateClub({ id: String(cid), managerUserIds: next });
        })
      );

      return { emailSent };
    },
    onSuccess: (data) => {
      toast.success('Club lead added');
      if (data?.emailSent) {
        toast.success('Password setup email sent');
      }
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setIsAddClubLeadOpen(false);
      setClubLeadSearchQuery('');
      setClubLeadSelectedStudent(null);
      setClubLeadSelectedClubIds([]);
      setClubLeadPortalAccessEnabled(true);
    },
  });

  const removeClubLeadMutation = useMutation({
    mutationFn: async ({ userId }) => {
      const id = String(userId);
      const targetClubs = (Array.isArray(clubs) ? clubs : []).filter((c) =>
        (Array.isArray(c?.managerUsers) ? c.managerUsers : []).some((u) => String(u?._id) === id)
      );

      await Promise.all(
        targetClubs.map(async (club) => {
          const clubId = String(club?._id);
          const current = Array.isArray(club?.managerUsers)
            ? club.managerUsers.map((u) => String(u?._id)).filter(Boolean)
            : [];
          const next = current.filter((x) => x !== id);
          await updateClub({ id: clubId, managerUserIds: next });
        })
      );
    },
    onSuccess: () => {
      toast.success('Removed club lead');
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to remove club lead');
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateUser,
    onSuccess: (data) => {
      toast.success('User updated');
      if (data?.passwordSetupEmailSent) {
        toast.success('Password setup email sent');
      }
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
      setIsEditOpen(false);
      setSelectedUser(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      toast.success('User deleted');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to delete user');
    },
  });

  const togglePermission = (id, checked) => {
    setForm((prev) => ({
      ...prev,
      permissions: checked
        ? Array.from(new Set([...prev.permissions, id]))
        : prev.permissions.filter(permission => !permissionMatches(permission, id)),
    }));
  };

  const toggleEditPermission = (id, checked) => {
    setEditForm((prev) => ({
      ...prev,
      permissions: checked
        ? Array.from(new Set([...prev.permissions, id]))
        : prev.permissions.filter(permission => !permissionMatches(permission, id)),
    }));
  };

  const openEdit = (user) => {
    if (!canChangeAccount(user)) return;
    const roleText = String(user?.role ?? '').trim();
    const normalized = normalizePortalRole(roleText);
    const roleValue = ['super_admin', 'iedc_execom', 'club_member'].includes(normalized)
      ? normalized
      : 'Custom';

    setSelectedUser(user);
    setEditForm({
      role: roleValue,
      customRole: roleValue === 'Custom' ? roleText : '',
      permissions: Array.isArray(user?.permissions) ? user.permissions : [],
      portalAccessEnabled: user?.portalAccessEnabled !== false,

    });
    updateMutation.reset();
    setIsEditOpen(true);
  };

  const submitEdit = () => {
    if (!selectedUser?._id) return;
    updateMutation.mutate({
      id: selectedUser._id,
      role: editForm.role,
      customRole: editForm.customRole,
      permissions: editForm.permissions,
      portalAccessEnabled: editForm.portalAccessEnabled,
    });
  };

  const confirmDelete = (user) => {
    if (!user?._id) return;
    const membershipId = String(user?.membershipId ?? '').trim().toLowerCase();
    if (membershipId === 'admin') {
      toast.error("Can't delete admin user");
      return;
    }

    const displayName = user?.name || 'this user';
    toast.custom(
      (t) => (
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="p-4">
            <div className="font-semibold text-slate-900">Delete user?</div>
            <div className="text-sm text-slate-600 mt-1">This will delete {displayName}.</div>
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
                  deleteMutation.mutate(user._id);
                }}
                className="op-danger"
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

  const canSubmit = Boolean(
    selectedStudent &&
      (form.role !== 'Custom' || form.customRole.trim()) &&
      !promoteMutation.isPending
  );

  const submit = () => {
    if (!selectedStudent?._id) return;
    promoteMutation.mutate({
      registrationId: selectedStudent._id,
      memberType: selectedStudent?.userType || searchMemberType,
      role: form.role,
      customRole: form.customRole,
      permissions: form.permissions,
      portalAccessEnabled: form.portalAccessEnabled,
    });
  };

  if (mode === 'club') {
    return (
      <div className="op-page">
        <div className="op-header"><div>
          <h1>Team &amp; access</h1>
          <p>Manage members for your selected club.</p>
        </div></div>
        <ClubMemberManager meData={meData} forcedClubId={activeClubId} />
        <ClubPortalMemberManager meData={meData} forcedClubId={activeClubId} />
      </div>
    );
  }

  if (!canManageUsers && isClubLead) {
    return (
      <div className="op-page">
        <div className="op-header"><div>
          <h1>Team &amp; access</h1>
          <p>Manage members for your clubs.</p>
        </div></div>
        <ClubMemberManager meData={meData} />
      </div>
    );
  }

  const tableUsers = users;

  return (
    <div className="op-page">
      {/* Header */}
      <div className="op-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team &amp; access</h1>
          <p className="text-slate-500 text-sm">Manage dashboard access and permissions.</p>
        </div>
        {canManageUsers && (activeCategory !== 'clubLeads' || isAdmin) ? (
          activeCategory === 'clubLeads' ? (
            <button
              onClick={() => { addClubLeadMutation.reset(); setIsAddClubLeadOpen(true); }}
              className="op-primary"
            >
              <Plus size={18} />
              Add Club Lead
            </button>
          ) : (
            <button
              onClick={() => { promoteMutation.reset(); setIsOpen(true); }}
              className="op-primary"
            >
              <Plus size={18} />
              Add Member
            </button>
          )
        ) : null}
      </div>

      <div className="op-tabs" role="group" aria-label="Team category">
        {[['staff', 'Staff & admins'], ['execom', 'Execom'], ['clubLeads', 'Club leads']].map(([value, title]) => (
          <button key={value} type="button" className="op-tab" aria-pressed={activeCategory === value}
            onClick={() => { setActiveCategory(value); setShowWebsiteExecomOrder(false); setListPage(1); setListSearch(''); }}>
            {title}
          </button>
        ))}
      </div>

      {/* Users list */}
      {activeCategory === 'clubLeads' ? (
        <div className="op-card overflow-hidden min-w-0">
          <div className="op-card-head">
            <div className="flex items-center gap-2">
              <UsersIcon size={18} className="text-slate-400" />
              <h2 className="font-bold">Club leads</h2>
            </div>
            <div className="op-count">{filteredClubLeadRows.length} members</div>
          </div>

          <div className="p-6 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-4 top-3 text-slate-400" size={18} />
              <input
                type="text"
                value={clubLeadsQuery}
                onChange={(e) => { setClubLeadsQuery(e.target.value); setListPage(1); }} aria-label="Search club leads"
                placeholder="Search by name, ID, email, or club..."
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm"
              />
            </div>
          </div>

          {clubsLoading || directoryLoading ? (
            <TableSkeleton rows={5} columns={4} label="Loading club leads" />
          ) : clubsError || directoryError ? (
            <FormAlert className="m-4">Could not load club leads. <button type="button" onClick={() => Promise.all([retryClubs(), retryDirectory()])}>Try again</button></FormAlert>
          ) : clubs.length === 0 ? (
            <div className="p-6 text-slate-500">No clubs.</div>
          ) : filteredClubLeadRows.length === 0 ? (
            <div className="p-6 text-slate-500">No club leads found.</div>
          ) : (
            <div className="op-scroll">
              <table className="op-table">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-left text-slate-500">
                    <th className="px-6 py-3 font-semibold">Member</th>
                    <th className="px-6 py-3 font-semibold">Clubs</th>
                    <th className="px-6 py-3 font-semibold">Portal Access</th>
                    <th className="px-6 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {visibleLeads.map((row) => {
                    const userId = String(row?.userId);
                    const fullUser = usersById.get(userId) || null;
                    const u = fullUser || row?.user;
                    const clubsLabel = (Array.isArray(row?.clubs) ? row.clubs : [])
                      .map((c) => String(c?.clubName ?? ''))
                      .filter(Boolean);

                    return (
                      <tr key={userId} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-900 whitespace-nowrap">
                          {u?.name || '—'}
                          <span className="block text-xs font-normal text-slate-500">{u?.email}</span>
                          <span className="block text-xs font-normal text-slate-500">{u?.membershipId}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          <div className="flex flex-wrap gap-2">
                            {clubsLabel.slice(0, 6).map((name) => (
                              <span
                                key={name}
                                className="inline-flex items-center px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold"
                              >
                                {name}
                              </span>
                            ))}
                            {clubsLabel.length > 6 ? (
                              <span className="text-xs text-slate-500 font-semibold">
                                +{clubsLabel.length - 6} more
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                          {fullUser?.portalAccessEnabled === false ? (
                            <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-red-50 text-red-700">
                              Disabled
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700">
                              Enabled
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => fullUser && openEdit(fullUser)}
                              disabled={!canChangeAccount(fullUser)}
                              className="op-secondary"
                            >
                              Edit
                            </button>
                            {isAdmin && <button
                              type="button"
                              disabled={removeClubLeadMutation.isPending}
                              onClick={() => {
                                const displayName = fullUser?.name || u?.name || 'this user';
                                toast.custom(
                                  (t) => (
                                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
                                      <div className="p-4">
                                        <div className="font-semibold text-slate-900">Remove club lead?</div>
                                        <div className="text-sm text-slate-600 mt-1">
                                          This will remove {displayName} as a lead from all clubs.
                                        </div>
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
                                              removeClubLeadMutation.mutate({ userId });
                                            }}
                                            className="op-danger"
                                          >
                                            Remove
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ),
                                  { duration: 8000 }
                                );
                              }}
                              className="op-secondary text-red-700"
                            >
                              Remove lead
                            </button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="op-footer flex items-center justify-between gap-3">
                <span>Page {leadPage} of {leadPages}</span>
                <div className="op-actions">
                  <button type="button" className="op-secondary" disabled={leadPage === 1} onClick={() => setListPage(leadPage - 1)}>Previous</button>
                  <button type="button" className="op-secondary" disabled={leadPage === leadPages} onClick={() => setListPage(leadPage + 1)}>Next</button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {activeCategory === 'execom' && showWebsiteExecomOrder ? (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowWebsiteExecomOrder(false)}
                  className="op-secondary"
                >
                  Back to Execom list
                </button>
              </div>
              <ExecomEntriesManager users={allUsersData?.users} canManageUsers={canManageUsers} />
            </div>
          ) : (
            <div className="op-card overflow-hidden min-w-0">
              <div className="op-card-head">
                <div className="flex items-center gap-2">
                  <UsersIcon size={18} className="text-slate-400" />
                  <h2 className="font-bold">{activeCategory === 'staff' ? 'Staff & admins' : 'Execom members'}</h2>
                </div>

                <div className="op-actions flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input value={listSearch} onChange={(event) => {
                      setListSearch(event.target.value);
                      setListPage(1);
                    }} aria-label="Search team members" placeholder="Search members" className="w-52 rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm" />
                  </div>
                  {activeCategory === 'execom' ? (
                    <button
                      type="button"
                      onClick={() => setShowWebsiteExecomOrder(true)}
                      className="op-secondary"
                    >
                      Website order
                    </button>
                  ) : null}
                  <div className="op-count">{usersData?.total ?? tableUsers.length} members</div>
                </div>
              </div>

              {usersLoading ? (
                <TableSkeleton rows={7} columns={5} label="Loading team members" />
              ) : usersError ? (
                <FormAlert className="m-4">Could not load members. <button type="button" onClick={() => retryUsers()}>Try again</button></FormAlert>
              ) : tableUsers.length === 0 ? (
                <div className="op-empty">{listSearch.trim() ? 'No members match your search.' : 'No team members yet.'}</div>
              ) : (
                <div className="op-scroll">
                  <table className="op-table">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr className="text-left text-slate-500">
                        <th className="px-6 py-3 font-semibold">Name</th>
                        <th className="px-6 py-3 font-semibold">Role</th>
                        <th className="px-6 py-3 font-semibold">Portal Access</th>
                        <th className="px-6 py-3 font-semibold">Permissions</th>
                        <th className="px-6 py-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {tableUsers.map((u) => (
                        <tr key={u?._id || u?.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-900 whitespace-nowrap">
                            {u?.name || '—'}
                            <span className="block text-xs font-normal text-slate-500">{u.email}</span>
                            <span className="block text-xs font-normal text-slate-500">{u.membershipId}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-700">
                              <ShieldCheck size={14} />
                              {({super_admin: 'Admin', iedc_execom: 'Execom', club_lead: 'Club lead', club_member: 'Club member'})[normalizePortalRole(u.role)] || u.role || '—'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                            {u?.portalAccessEnabled === false ? (
                              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-red-50 text-red-700">
                                Disabled
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700">
                                Enabled
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {(Array.isArray(u?.permissions) ? u.permissions : []).join(', ') || '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEdit(u)}
                                disabled={!canChangeAccount(u)}
                                className="op-secondary"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => confirmDelete(u)}
                                disabled={
                                  deleteMutation.isPending ||
                                  !canChangeAccount(u)
                                }
                                className="op-secondary text-red-700"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="op-footer flex items-center justify-between gap-3">
                    <span>Page {usersData?.page || 1} of {usersData?.totalPages || 1}</span>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setListPage(Math.max(1, (usersData?.page || 1) - 1))} disabled={(usersData?.page || 1) <= 1} className="op-secondary">Previous</button>
                      <button type="button" onClick={() => setListPage(Math.min(usersData?.totalPages || 1, (usersData?.page || 1) + 1))} disabled={(usersData?.page || 1) >= (usersData?.totalPages || 1)} className="op-secondary">Next</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {isEditOpen && (
        <PortalDialog label="Edit member" onClose={() => setIsEditOpen(false)} busy={updateMutation.isPending} className="team-access-dialog">
          <header className="op-dialog-head">
            <div><h2>Edit member</h2><p className="op-caption">Account access and workspace permissions.</p></div>
            <button type="button" className="op-icon" aria-label="Close member editor" disabled={updateMutation.isPending} onClick={() => setIsEditOpen(false)}><X size={16} /></button>
          </header>
          <form className="member-access-form" onSubmit={event => { event.preventDefault(); if (!updateMutation.isPending) submitEdit(); }}>
            <fieldset className="team-access-body" disabled={updateMutation.isPending}>
              <legend className="sr-only">Member account settings</legend>
              <div className="member-access-identity">
                <span className="member-access-avatar" aria-hidden="true">{selectedUser?.name?.slice(0, 1).toUpperCase() || 'M'}</span>
                <div><strong>{selectedUser?.name || 'Member'}</strong><p>{selectedUser?.email}</p><small>{selectedUser?.membershipId}</small></div>
              </div>
              <section className="member-access-section">
                <h3>Workspace access</h3>
                <div className="op-field">
                  <label htmlFor="edit-role">Account role</label>
                  <select id="edit-role" value={editForm.role} disabled={!isAdmin && editForm.role === 'Custom'}
                    onChange={event => { updateMutation.reset(); setEditForm(previous => ({ ...previous, role: event.target.value })); }}>
                    {isAdmin && <option value="super_admin">Super admin</option>}
                    <option value="iedc_execom">IEDC execom</option>
                    {editForm.role === 'club_member' && <option value="club_member">Club member</option>}
                    {(isAdmin || editForm.role === 'Custom') && <option value="Custom">{isAdmin ? 'Custom' : editForm.customRole}</option>}
                  </select>
                </div>
                {editForm.role === 'Custom' && <label className="op-field">Custom role
                  <input required readOnly={!isAdmin} value={editForm.customRole} onChange={event => setEditForm(previous => ({ ...previous, customRole: event.target.value }))} placeholder="e.g. Faculty advisor" />
                </label>}
                <label className="team-check-row">
                  <input type="checkbox" checked={Boolean(editForm.portalAccessEnabled)}
                    onChange={event => setEditForm(previous => ({ ...previous, portalAccessEnabled: event.target.checked }))} />
                  <span><strong>Allow portal sign-in</strong><small>This member can sign in and use their assigned tools.</small></span>
                </label>
              </section>
              <section className="member-access-section">
                <h3>Page permissions</h3>
                {editForm.role === 'super_admin'
                  ? <p className="op-caption">Super admins have access to every workspace tool.</p>
                  : ['club_lead', 'club_member'].includes(normalizePortalRole(editForm.role === 'Custom' ? editForm.customRole : editForm.role))
                    ? <p className="op-caption">Club permissions are managed within the club workspace.</p>
                    : <>
                    {!editForm.portalAccessEnabled && <p className="op-caption">These permissions take effect when portal sign-in is enabled.</p>}
                    <div className="team-permission-grid">
                      {availablePermissionOptions.map(option => <label className="team-check-row" key={option.id}>
                        <input type="checkbox" checked={editForm.permissions.some(value => permissionMatches(value, option.id))}
                          onChange={event => toggleEditPermission(option.id, event.target.checked)} />
                        <span>{option.label}</span>
                      </label>)}
                    </div>
                  </>}
              </section>
              <section className="member-access-website">
                <div><h3>Public website profile</h3><p className="op-caption">Edit the photo, role title and visibility in Website roster.</p></div>
                <button type="button" className="op-secondary" onClick={() => {
                  setIsEditOpen(false); setActiveCategory('execom'); setShowWebsiteExecomOrder(true);
                }}>Open roster</button>
              </section>
            </fieldset>
            {updateMutation.isError && <FormAlert className="mx-5 mb-3">{updateMutation.error?.response?.data?.message || 'Could not save this member. Your changes are still here. Try again.'}</FormAlert>}
            <footer className="op-dialog-foot">
              <button type="button" className="op-secondary" disabled={updateMutation.isPending} onClick={() => setIsEditOpen(false)}>Cancel</button>
              <button type="submit" className="op-primary" disabled={updateMutation.isPending || !selectedUser ||
                (editForm.role === 'Custom' && !editForm.customRole.trim())}>
                {updateMutation.isPending && <Loader2 size={15} className="animate-spin" />}
                {updateMutation.isPending ? 'Saving…' : 'Save changes'}
              </button>
            </footer>
          </form>
        </PortalDialog>
      )}

      {/* Add Club Lead Modal */}
      {isAddClubLeadOpen && (
        <PortalDialog label="Add club lead" onClose={() => setIsAddClubLeadOpen(false)} busy={addClubLeadMutation.isPending} className="team-access-dialog">
            <div className="op-dialog-head">
              <div>
                <h3 className="font-bold text-slate-900">Add club lead</h3>
                <p className="text-sm text-slate-500">Search a registration and assign lead clubs.</p>
              </div>
              <button
                onClick={() => {
                  if (addClubLeadMutation.isPending) return;
                  setIsAddClubLeadOpen(false);
                }}
                className="op-icon"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="team-access-body">
              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Search Registrations</label>
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={clubLeadSearchQuery}
                    onChange={(e) => {
                      setClubLeadSearchQuery(e.target.value);
                      setClubLeadSelectedStudent(null);
                    }}
                    aria-label="Search registrations" placeholder="Type name, email, or membership ID..."
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-400">Type at least 2 characters to search.</p>

                {clubLeadSearchEnabled && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                      {clubLeadSearching ? (
                        <div className="p-4 flex items-center gap-2 text-slate-500">
                          <Loader2 className="animate-spin" size={16} />
                          Searching...
                        </div>
                      ) : clubLeadSearchFailed ? (
                        <FormAlert className="m-3">Could not search registrations. <button type="button" onClick={() => retryClubLeadSearch()}>Try again</button></FormAlert>
                      ) : clubLeadStudents.length === 0 ? (
                        <div className="p-4 text-slate-500">No students found.</div>
                      ) : (
                        clubLeadStudents.map((s) => (
                          <button
                            key={s?._id}
                            type="button"
                            onClick={() => setClubLeadSelectedStudent(s)}
                            className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${
                              clubLeadSelectedStudent?._id === s?._id ? 'bg-blue-50' : 'bg-white'
                            }`}
                          >
                            <div className="font-semibold text-slate-900">
                              {`${s?.firstName ?? ''} ${s?.lastName ?? ''}`.trim() || '—'}
                            </div>
                            <div className="text-xs text-slate-500">
                              {s?.email || '—'} • {s?.membershipId || 'No membershipId'}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Selected */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Selected</p>
                {clubLeadSelectedStudent ? (
                  <div className="mt-2">
                    <p className="font-bold text-slate-900">
                      {`${clubLeadSelectedStudent?.firstName ?? ''} ${clubLeadSelectedStudent?.lastName ?? ''}`.trim() || '—'}
                    </p>
                    <p className="text-sm text-slate-500">{clubLeadSelectedStudent?.email || '—'}</p>
                    <p className="text-sm text-slate-500">{clubLeadSelectedStudent?.membershipId || '—'}</p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">No student selected yet.</p>
                )}
              </div>

              {/* Club selection */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Lead Clubs</label>
                {clubs.length === 0 ? (
                  <div className="text-sm text-slate-500">No clubs available.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {clubs.map((c) => {
                      const cid = String(c?._id);
                      const checked = clubLeadSelectedClubIds.includes(cid);
                      return (
                        <label
                          key={cid}
                          className="flex items-center gap-2 text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? Array.from(new Set([...clubLeadSelectedClubIds, cid]))
                                : clubLeadSelectedClubIds.filter((x) => x !== cid);
                              setClubLeadSelectedClubIds(next);
                            }}
                          />
                          <span className="font-medium text-slate-700">{c?.name || 'Club'}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Portal Access</label>
                <label className="flex items-center gap-2 text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(clubLeadPortalAccessEnabled)}
                    onChange={(e) => setClubLeadPortalAccessEnabled(e.target.checked)}
                  />
                  <span className="font-medium text-slate-700">Allow login to admin portal</span>
                </label>
              </div>
            </div>

            {addClubLeadMutation.isError && <FormAlert className="mx-5 my-2">{addClubLeadMutation.error?.response?.data?.message || addClubLeadMutation.error?.message || 'Could not assign this club lead. Try again.'}</FormAlert>}
            <div className="op-dialog-foot">
              <button
                type="button"
                onClick={() => {
                  if (addClubLeadMutation.isPending) return;
                  setIsAddClubLeadOpen(false);
                }}
                className="op-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  addClubLeadMutation.isPending ||
                  !clubLeadSelectedStudent ||
                  clubLeadSelectedClubIds.length === 0
                }
                onClick={() => {
                  if (!clubLeadSelectedStudent) return;
                  addClubLeadMutation.mutate({
                    student: clubLeadSelectedStudent,
                    clubIds: clubLeadSelectedClubIds,
                    portalAccessEnabled: clubLeadPortalAccessEnabled,
                  });
                }}
                className="op-primary"
              >
                {addClubLeadMutation.isPending && <Loader2 className="animate-spin" size={16} />}
                Add
              </button>
            </div>
        </PortalDialog>
      )}

      {/* Modal */}
      {isOpen && (
        <PortalDialog label="Add team member" onClose={() => setIsOpen(false)} busy={promoteMutation.isPending} className="team-access-dialog">
            <div className="op-dialog-head">
              <div>
                <h3 className="font-bold text-slate-900">Add team member</h3>
                <p className="text-sm text-slate-500">Search a registration and assign permissions.</p>
              </div>
              <button
                onClick={() => {
                  if (promoteMutation.isPending) return;
                  setIsOpen(false);
                }}
                className="op-icon"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="team-access-body">
              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Search Members</label>

                <div className="op-tabs" role="group" aria-label="Member category">
                  {[
                    { id: 'student', label: 'Students' },
                    { id: 'staff', label: 'Staff' },
                    { id: 'guest', label: 'Guests' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setSearchMemberType(t.id);
                        setSelectedStudent(null);
                      }}
                      className="op-tab" aria-pressed={searchMemberType === t.id}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSelectedStudent(null);
                    }}
                    aria-label="Search registrations" placeholder="Type name, email, or membership ID..."
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-400">Type at least 2 characters to search.</p>

                {searchEnabled && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                      {searching ? (
                        <div className="p-4 flex items-center gap-2 text-slate-500">
                          <Loader2 className="animate-spin" size={16} />
                          Searching...
                        </div>
                      ) : searchFailed ? (
                        <FormAlert className="m-3">Could not search members. <button type="button" onClick={() => retrySearch()}>Try again</button></FormAlert>
                      ) : students.length === 0 ? (
                        <div className="p-4 text-slate-500">No members found.</div>
                      ) : (
                        students.map((s) => (
                          <button
                            key={s?._id}
                            type="button"
                            onClick={() => setSelectedStudent(s)}
                            className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${
                              selectedStudent?._id === s?._id ? 'bg-blue-50' : 'bg-white'
                            }`}
                          >
                            <div className="font-semibold text-slate-900">
                              {`${s?.firstName ?? ''} ${s?.lastName ?? ''}`.trim() || '—'}
                            </div>
                            <div className="text-xs text-slate-500">
                              {s?.email || '—'} • {s?.membershipId || 'No membershipId'}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Selected student */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Selected</p>
                {selectedStudent ? (
                  <div className="mt-2">
                    <p className="font-bold text-slate-900">
                      {`${selectedStudent?.firstName ?? ''} ${selectedStudent?.lastName ?? ''}`.trim() || '—'}
                    </p>
                    <p className="text-sm text-slate-500">{selectedStudent?.email || '—'}</p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">No member selected yet.</p>
                )}
              </div>

              {/* Role */}
              <div className="space-y-2">
                <label htmlFor="new-role" className="text-sm font-bold text-slate-700">Role</label>
                <select id="new-role"
                  value={form.role}
                  onChange={(e) => {
                    const nextRole = e.target.value;
                    setForm((p) => ({
                      ...p,
                      role: nextRole,
                      portalAccessEnabled: nextRole === 'iedc_execom' ? false : true,
                    }));
                  }}
                  className="w-full"
                >
                  {isAdmin ? <option value="super_admin">Super admin</option> : null}
                  <option value="iedc_execom">IEDC execom</option>
                  {isAdmin ? <option value="Custom">Custom</option> : null}
                </select>

                {form.role === 'Custom' && (
                  <input
                    value={form.customRole}
                    onChange={(e) => setForm((p) => ({ ...p, customRole: e.target.value }))}
                    placeholder="Enter custom role title"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Portal Access</label>
                <label className="flex items-center gap-2 text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(form.portalAccessEnabled)}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, portalAccessEnabled: e.target.checked }))
                    }
                  />
                  <span className="font-medium text-slate-700">Allow login to admin portal</span>
                </label>
              </div>


              <div className="text-sm text-slate-500">
                Website team visibility, role title, and ordering are managed from the
                Website roster.
              </div>

              {/* Permissions */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Page Permissions</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availablePermissionOptions.map((opt) => (
                    <label
                      key={opt.id}
                      className="flex items-center gap-2 text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={form.permissions.some(value => permissionMatches(value, opt.id))}
                        onChange={(e) => togglePermission(opt.id, e.target.checked)}
                      />
                      <span className="font-medium text-slate-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {promoteMutation.isError && <FormAlert className="mx-5 my-2">{promoteMutation.error?.response?.data?.message || promoteMutation.error?.message || 'Could not add this member. Try again.'}</FormAlert>}
            <div className="op-dialog-foot">
              <button
                type="button"
                onClick={() => {
                  if (promoteMutation.isPending) return;
                  setIsOpen(false);
                }}
                className="op-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canSubmit}
                onClick={submit}
                className="op-primary"
              >
                {promoteMutation.isPending && <Loader2 className="animate-spin" size={16} />}
                Promote
              </button>
            </div>
        </PortalDialog>
      )}
    </div>
  );
}
