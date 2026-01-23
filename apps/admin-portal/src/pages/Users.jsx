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

const normalize = (v) => String(v ?? '').trim().toLowerCase();

const getYearLabel = (u) => String(u?.websiteProfile?.group ?? '').trim();

function YearSelect({ value, onChange, options, label }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      <span className="font-semibold text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700"
      >
        <option value="">All</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}

function ClubMemberManager({ meData, forcedClubId }) {
  const queryClient = useQueryClient();
  const [clubId, setClubId] = useState('');
  const [query, setQuery] = useState('');

  const { data: clubsData, isLoading, isError } = useQuery({
    queryKey: ['clubs'],
    queryFn: fetchClubs,
    retry: false,
  });

  const clubs = useMemo(() => {
    return Array.isArray(clubsData?.clubs) ? clubsData.clubs : [];
  }, [clubsData]);
  const myClubs = useMemo(() => {
    const myId = String(meData?.id ?? '');
    if (!myId) return [];
    return clubs.filter((c) =>
      (Array.isArray(c?.managerUsers) ? c.managerUsers : []).some(
        (u) => String(u?._id) === myId
      )
    );
  }, [clubs, meData?.id]);

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

  const { data: searchData, isFetching } = useQuery({
    queryKey: ['club-members-search', query],
    queryFn: () => searchStudents(query.trim()),
    enabled: query.trim().length >= 2,
    retry: false,
  });

  const students = Array.isArray(searchData?.students) ? searchData.students : [];

  const updateMembersMutation = useMutation({
    mutationFn: updateClub,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
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
    return (
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 text-slate-500">
        <Loader2 className="animate-spin" size={18} /> Loading your clubs...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm text-slate-500">
        Failed to load clubs.
      </div>
    );
  }

  if (myClubs.length === 0) {
    return (
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm text-slate-500">
        No clubs assigned to you.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">My Club Members</h2>
            <p className="text-sm text-slate-500">Add/remove members for your clubs only.</p>
          </div>
          {!forcedClubId ? (
            <label className="text-sm text-slate-600">
              <span className="font-semibold text-slate-700">Club</span>
              <select
                value={selectedClubId}
                onChange={(e) => setClubId(e.target.value)}
                className="ml-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700"
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
              placeholder="Search by name, email, or membership ID..."
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

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="font-bold text-slate-900">Selected Members</div>
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
  { id: 'registrations', label: 'Registrations' },
  { id: 'events', label: 'Events' },
  { id: 'users', label: 'Team' },
  { id: 'makerspace', label: 'Makerspace' },
  { id: 'mailer', label: 'Email Center' },
  { id: 'settings', label: 'Settings' },
];

const CLUB_PORTAL_PERMISSION_IDS = new Set(['dashboard', 'events', 'users']);

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

  const { data: clubsData, isLoading, isError } = useQuery({
    queryKey: ['clubs'],
    queryFn: fetchClubs,
    retry: false,
  });

  const clubs = Array.isArray(clubsData?.clubs) ? clubsData.clubs : [];
  const activeClub = clubs.find((c) => String(c?._id) === String(forcedClubId)) || null;

  const myId = String(meData?.id ?? '');
  const isLead = activeClub
    ? (Array.isArray(activeClub?.managerUsers) ? activeClub.managerUsers : []).some(
        (u) => String(u?._id) === myId
      )
    : false;

  const availablePermissionIds = useMemo(() => {
    const perms = Array.isArray(meData?.permissions)
      ? meData.permissions.map((p) => normalize(p)).filter(Boolean)
      : [];
    return new Set(perms);
  }, [meData?.permissions]);

  const availablePermissionOptions = useMemo(() => {
    return permissionOptions.filter(
      (opt) => CLUB_PORTAL_PERMISSION_IDS.has(normalize(opt.id)) && availablePermissionIds.has(normalize(opt.id))
    );
  }, [availablePermissionIds]);

  const searchEnabled = isAddOpen && searchQuery.trim().length >= 2;
  const { data: searchData, isFetching } = useQuery({
    queryKey: ['club-portal-member-search', searchQuery],
    queryFn: () => searchStudents(searchQuery.trim()),
    enabled: searchEnabled,
    retry: false,
  });

  const students = Array.isArray(searchData?.students) ? searchData.students : [];

  const portalMembers = useMemo(() => {
    return Array.isArray(activeClub?.memberUsers) ? activeClub.memberUsers : [];
  }, [activeClub]);

  const addMutation = useMutation({
    mutationFn: promoteClubPortalMember,
    onSuccess: (data) => {
      toast.success('Portal access saved');
      if (data?.passwordSetupEmailSent) toast.success('Password setup email sent');
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
      setIsAddOpen(false);
      setSearchQuery('');
      setSelectedStudent(null);
      setPortalAccessEnabled(true);
      setPermissions([]);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to give portal access');
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateClubPortalMember,
    onSuccess: (data) => {
      toast.success('Portal access updated');
      if (data?.passwordSetupEmailSent) toast.success('Password setup email sent');
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
      setEditingUser(null);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to update portal access');
    },
  });

  const openEdit = (u) => {
    setEditingUser(u);
    setEditPortalAccessEnabled(u?.portalAccessEnabled !== false);
    setEditPermissions(Array.isArray(u?.permissions) ? u.permissions : []);
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 text-slate-500">
        <Loader2 className="animate-spin" size={18} /> Loading portal members...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm text-slate-500">
        Failed to load club.
      </div>
    );
  }

  if (!activeClub) {
    return (
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm text-slate-500">
        Select a club to manage portal access.
      </div>
    );
  }

  if (!isLead) {
    return (
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="font-bold text-slate-900">Portal Access</div>
        <div className="text-sm text-slate-500 mt-1">Only club leads can manage portal access.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Portal Access</h2>
            <p className="text-sm text-slate-500">
              Give portal access to club members and set permissions (within your scope).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-200 transition-all"
          >
            <Plus size={18} />
            Add Member Access
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="font-bold text-slate-900">Portal Members</div>
          <div className="text-sm text-slate-500 font-semibold">{portalMembers.length} members</div>
        </div>

        {portalMembers.length === 0 ? (
          <div className="p-6 text-slate-500">No portal members yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-left text-slate-500">
                  <th className="px-6 py-3 font-semibold">Name</th>
                  <th className="px-6 py-3 font-semibold">Email</th>
                  <th className="px-6 py-3 font-semibold">Membership ID</th>
                  <th className="px-6 py-3 font-semibold">Portal Access</th>
                  <th className="px-6 py-3 font-semibold">Permissions</th>
                  <th className="px-6 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {portalMembers.map((u) => {
                          const perms = (Array.isArray(u?.permissions) ? u.permissions : []).filter((p) =>
                            CLUB_PORTAL_PERMISSION_IDS.has(normalize(p))
                          );
                  return (
                    <tr key={String(u?._id)} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900 whitespace-nowrap">{u?.name || '—'}</td>
                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{u?.email || '—'}</td>
                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{u?.membershipId || '—'}</td>
                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                        {u?.portalAccessEnabled === false ? (
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
                          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => {
              if (addMutation.isPending) return;
              setIsAddOpen(false);
            }}
          />

          <div className="relative w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900">Add Member Access</h3>
                <p className="text-sm text-slate-500">Search a student and enable portal login.</p>
              </div>
              <button
                onClick={() => {
                  if (addMutation.isPending) return;
                  setIsAddOpen(false);
                }}
                className="p-2 rounded-xl hover:bg-slate-50 text-slate-500"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
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
                    placeholder="Type name, email, or membership ID..."
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
                <label className="text-sm font-bold text-slate-700">Portal Access</label>
                <label className="flex items-center gap-2 text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(portalAccessEnabled)}
                    onChange={(e) => setPortalAccessEnabled(e.target.checked)}
                  />
                  <span className="font-medium text-slate-700">Allow login to admin portal</span>
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Page Permissions</label>
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

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  if (addMutation.isPending) return;
                  setIsAddOpen(false);
                }}
                className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold"
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
                    permissions: (Array.isArray(permissions) ? permissions : []).filter((p) =>
                      CLUB_PORTAL_PERMISSION_IDS.has(normalize(p))
                    ),
                  });
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold disabled:opacity-50"
              >
                {addMutation.isPending && <Loader2 className="animate-spin" size={16} />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => {
              if (updateMutation.isPending) return;
              setEditingUser(null);
            }}
          />

          <div className="relative w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900">Manage Portal Access</h3>
                <p className="text-sm text-slate-500">Update access and permissions for this member.</p>
              </div>
              <button
                onClick={() => {
                  if (updateMutation.isPending) return;
                  setEditingUser(null);
                }}
                className="p-2 rounded-xl hover:bg-slate-50 text-slate-500"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Member</p>
                <div className="mt-2">
                  <p className="font-bold text-slate-900">{editingUser?.name || '—'}</p>
                  <p className="text-sm text-slate-500">{editingUser?.email || '—'}</p>
                  <p className="text-sm text-slate-500">{editingUser?.membershipId || '—'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Portal Access</label>
                <label className="flex items-center gap-2 text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editPortalAccessEnabled)}
                    onChange={(e) => setEditPortalAccessEnabled(e.target.checked)}
                  />
                  <span className="font-medium text-slate-700">Allow login to admin portal</span>
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Page Permissions</label>
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

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  if (updateMutation.isPending) return;
                  setEditingUser(null);
                }}
                className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold"
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
                    permissions: (Array.isArray(editPermissions) ? editPermissions : []).filter((p) =>
                      CLUB_PORTAL_PERMISSION_IDS.has(normalize(p))
                    ),
                  });
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold disabled:opacity-50"
              >
                {updateMutation.isPending && <Loader2 className="animate-spin" size={16} />}
                Save
              </button>
            </div>
          </div>
        </div>
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

  const isAdmin = normalize(meData?.role) === 'admin';
  const mePerms = Array.isArray(meData?.permissions)
    ? meData.permissions.map((p) => normalize(p)).filter(Boolean)
    : [];
  const canManageUsers = isAdmin || mePerms.includes('users');
  const isClubLead = Boolean(meData?.isClubLead);

  const [activeCategory, setActiveCategory] = useState('execom');
  const [showWebsiteExecomOrder, setShowWebsiteExecomOrder] = useState(false);
  const [execomYear, setExecomYear] = useState('');
  const [staffYear, setStaffYear] = useState('');

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
    role: 'Execom',
    customRole: '',
    permissions: [],
    portalAccessEnabled: false,
  });

  const [editForm, setEditForm] = useState({
    role: 'Execom',
    customRole: '',
    permissions: [],
    portalAccessEnabled: true,
    websiteProfile: {
      visible: false,
      order: 0,
      roleTitle: '',
      group: '',
    },
  });

  const { data: usersData, isLoading: usersLoading, isError: usersError } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    enabled: canManageUsers,
    retry: false,
  });

  const users = useMemo(() => {
    return Array.isArray(usersData?.users) ? usersData.users : [];
  }, [usersData]);

  const { data: clubsData } = useQuery({
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

  const searchEnabled = isOpen && searchQuery.trim().length >= 2;
  const {
    data: searchData,
    isFetching: searching,
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
      setIsOpen(false);
      setSearchQuery('');
      setSelectedStudent(null);
      setForm({
        role: 'Execom',
        customRole: '',
        permissions: [],
        portalAccessEnabled: false,
      });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to add member');
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
        const normalized = roleText.toLowerCase();
        const standard = ['admin', 'execom', 'editor'];

        await updateUser({
          id: existingUser._id,
          role: standard.includes(normalized) ? roleText : 'Custom',
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
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
      setIsAddClubLeadOpen(false);
      setClubLeadSearchQuery('');
      setClubLeadSelectedStudent(null);
      setClubLeadSelectedClubIds([]);
      setClubLeadPortalAccessEnabled(true);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to add club lead');
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
      setIsEditOpen(false);
      setSelectedUser(null);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to update user');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      toast.success('User deleted');
      queryClient.invalidateQueries({ queryKey: ['users'] });
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
        : prev.permissions.filter((p) => p !== id),
    }));
  };

  const toggleEditPermission = (id, checked) => {
    setEditForm((prev) => ({
      ...prev,
      permissions: checked
        ? Array.from(new Set([...prev.permissions, id]))
        : prev.permissions.filter((p) => p !== id),
    }));
  };

  const openEdit = (user) => {
    if (!user) return;
    const roleText = String(user?.role ?? '').trim();
    const normalized = roleText.toLowerCase();
    const standard = ['admin', 'execom', 'editor'];
    const roleValue = standard.includes(normalized)
      ? roleText.charAt(0).toUpperCase() + roleText.slice(1)
      : 'Custom';

    setSelectedUser(user);
    setEditForm({
      role: roleValue,
      customRole: roleValue === 'Custom' ? roleText : '',
      permissions: Array.isArray(user?.permissions) ? user.permissions : [],
      portalAccessEnabled: user?.portalAccessEnabled !== false,
      websiteProfile: {
        visible: Boolean(user?.websiteProfile?.visible),
        order: Number.isFinite(Number(user?.websiteProfile?.order))
          ? Number(user.websiteProfile.order)
          : 0,
        roleTitle: String(user?.websiteProfile?.roleTitle ?? ''),
        group: String(user?.websiteProfile?.group ?? ''),
      },
    });
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
      websiteProfile: editForm.websiteProfile,
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
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  toast.dismiss(t.id);
                  deleteMutation.mutate(user._id);
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
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team Members</h1>
          <p className="text-slate-500 text-sm">Manage members for your selected club.</p>
        </div>
        <ClubMemberManager meData={meData} forcedClubId={activeClubId} />
        <ClubPortalMemberManager meData={meData} forcedClubId={activeClubId} />
      </div>
    );
  }

  if (!canManageUsers && isClubLead) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team Members</h1>
          <p className="text-slate-500 text-sm">Manage members for your clubs.</p>
        </div>
        <ClubMemberManager meData={meData} />
      </div>
    );
  }

  const execomUsers = users.filter((u) => normalize(u?.role) === 'execom');
  const staffUsers = users.filter((u) => {
    const r = normalize(u?.role);
    return r === 'admin' || r === 'editor' || r.includes('staff');
  });

  const execomYears = Array.from(
    new Set(execomUsers.map(getYearLabel).map((y) => y.trim()).filter(Boolean))
  ).sort((a, b) => b.localeCompare(a));
  const staffYears = Array.from(
    new Set(staffUsers.map(getYearLabel).map((y) => y.trim()).filter(Boolean))
  ).sort((a, b) => b.localeCompare(a));

  const filteredExecom = execomYear
    ? execomUsers.filter((u) => normalize(getYearLabel(u)) === normalize(execomYear))
    : execomUsers;
  const filteredStaff = staffYear
    ? staffUsers.filter((u) => normalize(getYearLabel(u)) === normalize(staffYear))
    : staffUsers;

  const tableUsers = activeCategory === 'staff' ? filteredStaff : filteredExecom;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team Members</h1>
          <p className="text-slate-500 text-sm">Manage dashboard access and permissions.</p>
        </div>
        {canManageUsers ? (
          activeCategory === 'clubLeads' ? (
            <button
              onClick={() => setIsAddClubLeadOpen(true)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-200 transition-all"
            >
              <Plus size={18} />
              Add Club Lead
            </button>
          ) : (
            <button
              onClick={() => setIsOpen(true)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-200 transition-all"
            >
              <Plus size={18} />
              Add Member
            </button>
          )
        ) : null}
      </div>

      {/* Categories */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setShowWebsiteExecomOrder(false);
              setActiveCategory('staff');
            }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
              activeCategory === 'staff'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Staff/Admin
          </button>
          <button
            type="button"
            onClick={() => {
              setShowWebsiteExecomOrder(false);
              setActiveCategory('execom');
            }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
              activeCategory === 'execom'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Execom
          </button>
          <button
            type="button"
            onClick={() => {
              setShowWebsiteExecomOrder(false);
              setActiveCategory('clubLeads');
            }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
              activeCategory === 'clubLeads'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Club Leads
          </button>
        </div>

        {activeCategory === 'execom' ? (
          <YearSelect
            label="Year"
            value={execomYear}
            onChange={setExecomYear}
            options={execomYears}
          />
        ) : activeCategory === 'staff' ? (
          <YearSelect
            label="Year"
            value={staffYear}
            onChange={setStaffYear}
            options={staffYears}
          />
        ) : null}
      </div>

      {/* Users list */}
      {activeCategory === 'clubLeads' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <UsersIcon size={18} className="text-slate-400" />
              <h2 className="font-bold">Club Leads</h2>
            </div>
            <div className="text-sm text-slate-500 font-semibold">{filteredClubLeadRows.length} members</div>
          </div>

          <div className="p-6 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-4 top-3 text-slate-400" size={18} />
              <input
                type="text"
                value={clubLeadsQuery}
                onChange={(e) => setClubLeadsQuery(e.target.value)}
                placeholder="Search by name, ID, email, or club..."
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm"
              />
            </div>
          </div>

          {clubs.length === 0 ? (
            <div className="p-6 text-slate-500">No clubs.</div>
          ) : filteredClubLeadRows.length === 0 ? (
            <div className="p-6 text-slate-500">No club leads found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-left text-slate-500">
                    <th className="px-6 py-3 font-semibold">Name</th>
                    <th className="px-6 py-3 font-semibold">Email</th>
                    <th className="px-6 py-3 font-semibold">Membership ID</th>
                    <th className="px-6 py-3 font-semibold">Clubs</th>
                    <th className="px-6 py-3 font-semibold">Portal Access</th>
                    <th className="px-6 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredClubLeadRows.map((row) => {
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
                        </td>
                        <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{u?.email || '—'}</td>
                        <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                          {u?.membershipId || '—'}
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
                              disabled={!fullUser}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-50"
                            >
                              Edit
                            </button>
                            <button
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
                                            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              toast.dismiss(t.id);
                                              removeClubLeadMutation.mutate({ userId });
                                            }}
                                            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold"
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
                              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-red-600 font-semibold hover:bg-slate-50 disabled:opacity-50"
                            >
                              Remove Lead
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
      ) : (
        <div className="space-y-6">
          {activeCategory === 'execom' && showWebsiteExecomOrder ? (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowWebsiteExecomOrder(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Back to Execom list
                </button>
              </div>
              <ExecomEntriesManager users={users} canManageUsers={canManageUsers} />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <UsersIcon size={18} className="text-slate-400" />
                  <h2 className="font-bold">{activeCategory === 'staff' ? 'Staff/Admin' : 'Execom'}</h2>
                </div>

                <div className="flex items-center gap-3">
                  {activeCategory === 'execom' ? (
                    <button
                      type="button"
                      onClick={() => setShowWebsiteExecomOrder(true)}
                      className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50"
                    >
                      Website order
                    </button>
                  ) : null}
                  <div className="text-sm text-slate-500 font-semibold">{tableUsers.length} members</div>
                </div>
              </div>

              {usersLoading ? (
                <div className="p-8 flex items-center gap-3 text-slate-500">
                  <Loader2 className="animate-spin" size={18} />
                  Loading members...
                </div>
              ) : usersError ? (
                <div className="p-8 text-slate-500">Failed to load members.</div>
              ) : tableUsers.length === 0 ? (
                <div className="p-8 text-slate-500">No team members yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr className="text-left text-slate-500">
                        <th className="px-6 py-3 font-semibold">Name</th>
                        <th className="px-6 py-3 font-semibold">Email</th>
                        <th className="px-6 py-3 font-semibold">Membership ID</th>
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
                          </td>
                          <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{u?.email || '—'}</td>
                          <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{u?.membershipId || '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-700">
                              <ShieldCheck size={14} />
                              {u?.role || '—'}
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
                                disabled={String(u?.membershipId ?? '').trim().toLowerCase() === 'admin'}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => confirmDelete(u)}
                                disabled={
                                  deleteMutation.isPending ||
                                  String(u?.membershipId ?? '').trim().toLowerCase() === 'admin'
                                }
                                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-red-600 font-semibold hover:bg-slate-50 disabled:opacity-50"
                              >
                                Delete
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
          )}
        </div>
      )}

      {/* Edit Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => {
              if (updateMutation.isPending) return;
              setIsEditOpen(false);
            }}
          />

          <div className="relative w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900">Edit Member</h3>
                <p className="text-sm text-slate-500">Update role and permissions.</p>
              </div>
              <button
                onClick={() => {
                  if (updateMutation.isPending) return;
                  setIsEditOpen(false);
                }}
                className="p-2 rounded-xl hover:bg-slate-50 text-slate-500"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Member</p>
                <div className="mt-2">
                  <p className="font-bold text-slate-900">{selectedUser?.name || '—'}</p>
                  <p className="text-sm text-slate-500">{selectedUser?.email || '—'}</p>
                  <p className="text-sm text-slate-500">{selectedUser?.membershipId || '—'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                  <option value="Admin">Admin</option>
                  <option value="Execom">Execom</option>
                  <option value="Editor">Editor</option>
                  <option value="Custom">Custom</option>
                </select>

                {editForm.role === 'Custom' && (
                  <input
                    value={editForm.customRole}
                    onChange={(e) => setEditForm((p) => ({ ...p, customRole: e.target.value }))}
                    placeholder="Enter custom role title"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Portal Access</label>
                  <label className="flex items-center gap-2 text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editForm.portalAccessEnabled)}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, portalAccessEnabled: e.target.checked }))
                      }
                    />
                    <span className="font-medium text-slate-700">Allow login to admin portal</span>
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Website Visibility</label>
                  <label className="flex items-center gap-2 text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editForm.websiteProfile?.visible)}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          websiteProfile: { ...p.websiteProfile, visible: e.target.checked },
                        }))
                      }
                    />
                    <span className="font-medium text-slate-700">Show on main site</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Website Order</label>
                  <input
                    type="number"
                    value={Number(editForm.websiteProfile?.order ?? 0)}
                    onChange={(e) =>
                      setEditForm((p) => ({
                        ...p,
                        websiteProfile: {
                          ...p.websiteProfile,
                          order: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Website Role Title</label>
                  <input
                    value={editForm.websiteProfile?.roleTitle ?? ''}
                    onChange={(e) =>
                      setEditForm((p) => ({
                        ...p,
                        websiteProfile: { ...p.websiteProfile, roleTitle: e.target.value },
                      }))
                    }
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="e.g. President"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Website Group</label>
                <input
                  value={editForm.websiteProfile?.group ?? ''}
                  onChange={(e) =>
                    setEditForm((p) => ({
                      ...p,
                      websiteProfile: { ...p.websiteProfile, group: e.target.value },
                    }))
                  }
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="e.g. Execom 2025-26"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Page Permissions</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {permissionOptions.map((opt) => (
                    <label
                      key={opt.id}
                      className="flex items-center gap-2 text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={editForm.permissions.includes(opt.id)}
                        onChange={(e) => toggleEditPermission(opt.id, e.target.checked)}
                      />
                      <span className="font-medium text-slate-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  if (updateMutation.isPending) return;
                  setIsEditOpen(false);
                }}
                className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  !selectedUser ||
                  updateMutation.isPending ||
                  (editForm.role === 'Custom' && !editForm.customRole.trim())
                }
                onClick={submitEdit}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold disabled:opacity-50"
              >
                {updateMutation.isPending && <Loader2 className="animate-spin" size={16} />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Club Lead Modal */}
      {isAddClubLeadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => {
              if (addClubLeadMutation.isPending) return;
              setIsAddClubLeadOpen(false);
            }}
          />

          <div className="relative w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900">Add Club Lead</h3>
                <p className="text-sm text-slate-500">Search a registration and assign lead clubs.</p>
              </div>
              <button
                onClick={() => {
                  if (addClubLeadMutation.isPending) return;
                  setIsAddClubLeadOpen(false);
                }}
                className="p-2 rounded-xl hover:bg-slate-50 text-slate-500"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
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
                    placeholder="Type name, email, or membership ID..."
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

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  if (addClubLeadMutation.isPending) return;
                  setIsAddClubLeadOpen(false);
                }}
                className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold"
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
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold disabled:opacity-50"
              >
                {addClubLeadMutation.isPending && <Loader2 className="animate-spin" size={16} />}
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => {
              if (promoteMutation.isPending) return;
              setIsOpen(false);
            }}
          />

          <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900">Add Team Member</h3>
                <p className="text-sm text-slate-500">Search a registration and assign permissions.</p>
              </div>
              <button
                onClick={() => {
                  if (promoteMutation.isPending) return;
                  setIsOpen(false);
                }}
                className="p-2 rounded-xl hover:bg-slate-50 text-slate-500"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Search Members</label>

                <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        searchMemberType === t.id
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
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
                    placeholder="Type name, email, or membership ID..."
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
                <label className="text-sm font-bold text-slate-700">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => {
                    const nextRole = e.target.value;
                    setForm((p) => ({
                      ...p,
                      role: nextRole,
                      portalAccessEnabled: nextRole === 'Execom' ? false : true,
                    }));
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                  <option value="Admin">Admin</option>
                  <option value="Execom">Execom</option>
                  <option value="Editor">Editor</option>
                  <option value="Custom">Custom</option>
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
                "Website Execom (year-wise)" section.
              </div>

              {/* Permissions */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Page Permissions</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {permissionOptions.map((opt) => (
                    <label
                      key={opt.id}
                      className="flex items-center gap-2 text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={form.permissions.includes(opt.id)}
                        onChange={(e) => togglePermission(opt.id, e.target.checked)}
                      />
                      <span className="font-medium text-slate-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  if (promoteMutation.isPending) return;
                  setIsOpen(false);
                }}
                className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canSubmit}
                onClick={submit}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold disabled:opacity-50"
              >
                {promoteMutation.isPending && <Loader2 className="animate-spin" size={16} />}
                Promote
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}