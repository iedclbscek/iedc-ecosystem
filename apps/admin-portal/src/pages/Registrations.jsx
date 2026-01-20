import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchMembers, deleteMember } from '../api/adminService';
import { 
  Search, Loader2, Pencil, Trash2, AlertCircle, 
  RefreshCcw, ChevronLeft, ChevronRight, User 
} from 'lucide-react';
import toast from 'react-hot-toast';

const MEMBER_TYPES = [
  { id: 'student', label: 'Students' },
  { id: 'staff', label: 'Staff' },
  { id: 'guest', label: 'Guests' },
];

const getSearchPlaceholder = (memberType) => {
  if (memberType === 'student') return 'Search name, admission, or dept...';
  if (memberType === 'staff') return 'Search name, membership ID, or dept...';
  return 'Search name, membership ID, or organization...';
};

export default function Registrations() {
  const queryClient = useQueryClient();
  
  // States
  const [memberType, setMemberType] = useState('student');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  // 1. Debounce Search Logic (Wait 500ms after typing stops)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to page 1 on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [memberType]);

  // 2. Fetch Data from MongoDB
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['registrations', memberType, page, debouncedSearch],
    queryFn: () => fetchMembers({ page, search: debouncedSearch, memberType }),
    retry: 1,
  });

  // 3. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: deleteMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
      toast.success('Member record deleted');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  });

  const handleDelete = (id, name) => {
  toast((t) => (
    <div className="flex flex-col gap-3 p-1">
      <div className="flex items-center gap-2 text-slate-800">
        <AlertCircle size={20} className="text-rose-500" />
        <span className="font-medium">Delete registration for <b>{name}</b>?</span>
      </div>
      <p className="text-xs text-slate-500">This action cannot be undone.</p>
      <div className="flex justify-end gap-2 mt-1">
        <button
          onClick={() => toast.dismiss(t.id)}
          className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            toast.dismiss(t.id);
            deleteMutation.mutate({ id, memberType });
          }}
          className="px-3 py-1.5 text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 rounded-lg shadow-sm transition-colors"
        >
          Yes, Delete
        </button>
      </div>
    </div>
  ), {
    duration: 6000, // Stays visible longer to allow for decision
    style: {
      minWidth: '350px',
      borderRadius: '16px',
      border: '1px solid #fee2e2',
    },
  });
};

  // --- LOADING STATE ---
  if (isLoading) return (
    <div className="flex flex-col h-96 items-center justify-center gap-4">
      <Loader2 className="animate-spin text-blue-600" size={40} />
      <p className="text-slate-500 font-medium animate-pulse">Fetching members...</p>
    </div>
  );

  // --- ERROR STATE ---
  if (isError) return (
    <div className="flex flex-col h-96 items-center justify-center text-center p-8 bg-white rounded-3xl border border-red-100 shadow-xl">
      <div className="bg-red-50 p-4 rounded-full mb-4">
        <AlertCircle size={40} className="text-red-500" />
      </div>
      <h3 className="text-xl font-bold text-slate-900">Connection Refused</h3>
      <p className="text-slate-500 max-w-sm mb-6 text-sm">
        Could not connect to the backend server at <code className="bg-slate-100 px-1 rounded">localhost:5000</code>.
        Make sure your terminal shows <span className="text-emerald-600 font-mono">🚀 MongoDB Connected</span>.
      </p>
      <button 
        onClick={() => refetch()}
        className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
      >
        <RefreshCcw size={18} />
        Retry Connection
      </button>
    </div>
  );

  const members = Array.isArray(data?.members) ? data.members : (Array.isArray(data?.students) ? data.students : []);
  const total = data?.totalMembers ?? data?.totalStudents ?? 0;
  const titleLabel = memberType === 'student' ? 'Students' : (memberType === 'staff' ? 'Staff' : 'Guests');

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            Members
            <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full">
              {total} {titleLabel}
            </span>
          </h1>
          <p className="text-slate-500 text-sm">Manage student, staff, and guest membership data.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto md:items-center">
          <div className="inline-flex w-full sm:w-auto rounded-2xl bg-slate-100 p-1 border border-slate-200">
            {MEMBER_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setMemberType(t.id)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  memberType === t.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-96">
          <Search className="absolute left-4 top-3 text-slate-400" size={20} />
          <input 
            type="text"
            placeholder={getSearchPlaceholder(memberType)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {isFetching && <Loader2 className="absolute right-4 top-3.5 animate-spin text-blue-500" size={16} />}
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="p-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sl No.</th>
                <th className="p-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">{titleLabel} Details</th>
                {memberType === 'student' ? (
                  <th className="p-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Admission No</th>
                ) : (
                  <th className="p-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Membership ID</th>
                )}
                <th className="p-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {memberType === 'guest' ? 'Organization' : 'Department'}
                </th>
                <th className="p-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {members?.map((member, index) => (
                <tr key={member._id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="p-5 text-sm font-medium text-slate-400">
                    {(page - 1) * 10 + (index + 1)}
                  </td>
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                        <User size={18} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {member.firstName} {member.lastName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {member.email}
                          {member.membershipId ? (
                            <span className="text-slate-400"> • {String(member.membershipId).toUpperCase()}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </td>
                  {memberType === 'student' ? (
                    <td className="p-5 text-sm font-mono font-medium text-slate-600">
                      {member.admissionNo || '—'}
                    </td>
                  ) : (
                    <td className="p-5 text-sm font-mono font-medium text-slate-600">
                      {member.membershipId ? String(member.membershipId).toUpperCase() : '—'}
                    </td>
                  )}
                  <td className="p-5">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold">
                      {memberType === 'guest' ? (member.organization || '—') : (member.department || '—')}
                    </span>
                  </td>
                  <td className="p-5 text-right">
                    <div className="flex justify-end gap-1">
                      <button 
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        onClick={() => toast('Edit feature coming soon')}
                      >
                        <Pencil size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(member._id, member.firstName)}
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

        {/* Empty State */}
        {members?.length === 0 && (
          <div className="p-20 text-center">
            <p className="text-slate-400 italic">No members found matching "{searchTerm}"</p>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-5 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-slate-500">
            Showing Page <span className="font-bold text-slate-900">{data?.currentPage}</span> of <span className="font-bold text-slate-900">{data?.totalPages}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 border border-slate-200 rounded-xl hover:bg-white disabled:opacity-30 transition-all shadow-sm"
            >
              <ChevronLeft size={20} />
            </button>
            
            <div className="flex gap-1">
              {[...Array(data?.totalPages || 0)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setPage(i + 1)}
                  className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${
                    page === i + 1 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300'
                  }`}
                >
                  {i + 1}
                </button>
              )).slice(Math.max(0, page - 3), page + 2)} {/* Simple windowing for many pages */}
            </div>

            <button 
              onClick={() => setPage(p => Math.min(data?.totalPages, p + 1))}
              disabled={page === data?.totalPages}
              className="p-2 border border-slate-200 rounded-xl hover:bg-white disabled:opacity-30 transition-all shadow-sm"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}