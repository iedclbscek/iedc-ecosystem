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
import { deleteUser, fetchUsers, promoteUser, searchStudents, updateUser } from '../api/adminService';

const permissionOptions = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'registrations', label: 'Registrations' },
  { id: 'users', label: 'Team' },
  { id: 'mailer', label: 'Email Center' },
  { id: 'settings', label: 'Settings' },
];

export default function Users() {
  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState({
    role: 'Execom',
    customRole: '',
    permissions: [],
  });

  const [editForm, setEditForm] = useState({
    role: 'Execom',
    customRole: '',
    permissions: [],
  });

  const { data: usersData, isLoading: usersLoading, isError: usersError } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    retry: false,
  });

  const users = Array.isArray(usersData?.users) ? usersData.users : [];

  const searchEnabled = isOpen && searchQuery.trim().length >= 2;
  const {
    data: searchData,
    isFetching: searching,
  } = useQuery({
    queryKey: ['student-search', searchQuery],
    queryFn: () => searchStudents(searchQuery.trim()),
    enabled: searchEnabled,
    retry: false,
  });

  const students = useMemo(() => {
    const list = Array.isArray(searchData?.students) ? searchData.students : [];
    return list;
  }, [searchData]);

  const promoteMutation = useMutation({
    mutationFn: promoteUser,
    onSuccess: () => {
      toast.success('Member added successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsOpen(false);
      setSearchQuery('');
      setSelectedStudent(null);
      setForm({ role: 'Execom', customRole: '', permissions: [] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to add member');
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      toast.success('User updated');
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
      role: form.role,
      customRole: form.customRole,
      permissions: form.permissions,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team Members</h1>
          <p className="text-slate-500 text-sm">Manage dashboard access and permissions.</p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-200 transition-all"
        >
          <Plus size={18} />
          Add Member
        </button>
      </div>

      {/* Users list */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-2">
          <UsersIcon size={18} className="text-slate-400" />
          <h2 className="font-bold">Current Members</h2>
        </div>

        {usersLoading ? (
          <div className="p-8 flex items-center gap-3 text-slate-500">
            <Loader2 className="animate-spin" size={18} />
            Loading members...
          </div>
        ) : usersError ? (
          <div className="p-8 text-slate-500">Failed to load members.</div>
        ) : users.length === 0 ? (
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
                  <th className="px-6 py-3 font-semibold">Permissions</th>
                  <th className="px-6 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map((u) => (
                  <tr key={u?._id || u?.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900 whitespace-nowrap">{u?.name || '—'}</td>
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{u?.email || '—'}</td>
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{u?.membershipId || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-700">
                        <ShieldCheck size={14} />
                        {u?.role || '—'}
                      </span>
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

          <div className="relative w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
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

            <div className="p-6 space-y-6">
              {/* Search */}
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
                      {searching ? (
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
                  <p className="mt-2 text-sm text-slate-500">No student selected yet.</p>
                )}
              </div>

              {/* Role */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
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