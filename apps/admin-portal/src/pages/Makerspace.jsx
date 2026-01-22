import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { LogIn, LogOut, RefreshCw, Search, ChevronLeft, ChevronRight, Ban, AlertCircle } from 'lucide-react';
import { checkInMember, getActiveMembers, getCheckInHistory, forceCheckOutMember, banMembershipId, unbanMembershipId } from '../api/adminService';

export default function Makerspace() {
  const queryClient = useQueryClient();
  const [membershipIdInput, setMembershipIdInput] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit, setHistoryLimit] = useState(20);
  const [filterMembershipId, setFilterMembershipId] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [bannedIds, setBannedIds] = useState(new Set());

  // Fetch active members
  const { data: activeData, isLoading: activeLoading, refetch: refetchActive } = useQuery({
    queryKey: ['activeMembers'],
    queryFn: getActiveMembers,
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  // Fetch check-in history
  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['checkInHistory', historyPage, historyLimit, filterMembershipId, filterAction],
    queryFn: () =>
      getCheckInHistory(historyPage, historyLimit, {
        ...(filterMembershipId && { membershipId: filterMembershipId }),
        ...(filterAction && { action: filterAction }),
      }),
  });

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: checkInMember,
    onSuccess: (response) => {
      toast.success(`${response.userName} checked IN`);
      setMembershipIdInput('');
      queryClient.invalidateQueries({ queryKey: ['activeMembers'] });
      queryClient.invalidateQueries({ queryKey: ['checkInHistory'] });
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Check-in failed';
      if (error.response?.status === 403) {
        toast.error('This membership ID is banned from makerspace');
      } else {
        toast.error(message);
      }
    },
  });

  // Force checkout mutation
  const checkOutMutation = useMutation({
    mutationFn: forceCheckOutMember,
    onSuccess: (response) => {
      toast.success(`${response.userName} checked OUT`);
      queryClient.invalidateQueries({ queryKey: ['activeMembers'] });
      queryClient.invalidateQueries({ queryKey: ['checkInHistory'] });
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Checkout failed';
      toast.error(message);
    },
  });

  // Ban mutation
  const banMutation = useMutation({
    mutationFn: banMembershipId,
    onSuccess: (response) => {
      toast.success(`${response.membershipId} has been banned`);
      setBannedIds((prev) => new Set([...prev, response.membershipId]));
      queryClient.invalidateQueries({ queryKey: ['activeMembers'] });
      queryClient.invalidateQueries({ queryKey: ['checkInHistory'] });
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Ban failed';
      toast.error(message);
    },
  });

  // Unban mutation
  const unbanMutation = useMutation({
    mutationFn: unbanMembershipId,
    onSuccess: (response) => {
      toast.success(`${response.membershipId} has been unbanned`);
      setBannedIds((prev) => {
        const updated = new Set(prev);
        updated.delete(response.membershipId);
        return updated;
      });
      queryClient.invalidateQueries({ queryKey: ['activeMembers'] });
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Unban failed';
      toast.error(message);
    },
  });

  const handleCheckIn = (e) => {
    e.preventDefault();
    if (!membershipIdInput.trim()) {
      toast.error('Please enter a membership ID');
      return;
    }
    checkInMutation.mutate({
      membershipId: membershipIdInput,
      action: 'IN',
    });
  };

  const activeMembers = activeData?.data || [];
  const historyRecords = historyData?.data || [];
  const totalPages = historyData?.totalPages || 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Makerspace Dashboard</h1>
            <p className="text-slate-600 mt-1">Check-in management system</p>
          </div>
          <button
            onClick={() => {
              refetchActive();
              refetchHistory();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>

        {/* Check-in Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Check Member IN</h2>
          <form onSubmit={handleCheckIn} className="flex gap-3">
            <input
              type="text"
              placeholder="Enter membership ID (e.g., IEDC24IT029)"
              value={membershipIdInput}
              onChange={(e) => setMembershipIdInput(e.target.value)}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={checkInMutation.isPending}
            />
            <button
              type="submit"
              disabled={checkInMutation.isPending}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-400"
            >
              <LogIn size={18} />
              {checkInMutation.isPending ? 'Processing...' : 'Check IN'}
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Members */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              Currently Checked In ({activeMembers.length})
            </h2>
            {activeLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : activeMembers.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>No members currently checked in</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Membership ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Last Updated</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {activeMembers.map((member) => (
                      <tr key={member._id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-900">{member.userName}</td>
                        <td className="px-4 py-3 text-slate-600 font-mono">{member.membershipId}</td>
                        <td className="px-4 py-3">
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                            {member.currentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {new Date(member.lastUpdated).toLocaleTimeString()}
                        </td>
                        <td className="px-4 py-3 flex gap-2">
                          <button
                            onClick={() => checkOutMutation.mutate(member.membershipId)}
                            disabled={checkOutMutation.isPending}
                            className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded transition disabled:opacity-50"
                            title="Force checkout"
                          >
                            <LogOut size={16} />
                            <span className="text-xs font-medium">Out</span>
                          </button>
                          <button
                            onClick={() => {
                              if (bannedIds.has(member.membershipId)) {
                                unbanMutation.mutate(member.membershipId);
                              } else {
                                if (window.confirm(`Ban ${member.membershipId} from makerspace?`)) {
                                  banMutation.mutate(member.membershipId);
                                }
                              }
                            }}
                            disabled={banMutation.isPending || unbanMutation.isPending}
                            className={`flex items-center gap-1 px-3 py-1 rounded transition disabled:opacity-50 text-xs font-medium ${
                              bannedIds.has(member.membershipId)
                                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                            title={bannedIds.has(member.membershipId) ? 'Unban' : 'Ban'}
                          >
                            <Ban size={16} />
                            <span>{bannedIds.has(member.membershipId) ? 'Unban' : 'Ban'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow-md p-6 h-fit">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-slate-600 text-sm">Currently Active</p>
                <p className="text-3xl font-bold text-green-600">{activeMembers.length}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-slate-600 text-sm">Total History Records</p>
                <p className="text-3xl font-bold text-blue-600">{historyData?.total || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Check-in History */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Check-In History</h2>

          {/* Filters */}
          <div className="mb-4 flex gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Filter by membership ID..."
                value={filterMembershipId}
                onChange={(e) => {
                  setFilterMembershipId(e.target.value);
                  setHistoryPage(1);
                }}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterAction}
              onChange={(e) => {
                setFilterAction(e.target.value);
                setHistoryPage(1);
              }}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Actions</option>
              <option value="IN">Check IN</option>
              <option value="OUT">Check OUT</option>
            </select>
            {(filterMembershipId || filterAction) && (
              <button
                onClick={() => {
                  setFilterMembershipId('');
                  setFilterAction('');
                  setHistoryPage(1);
                }}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* History Table */}
          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : historyRecords.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>No check-in history records found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto mb-4">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Membership ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Action</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {historyRecords.map((record) => (
                      <tr key={record._id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-900">{record.userName}</td>
                        <td className="px-4 py-3 text-slate-600 font-mono">{record.membershipId}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              record.action === 'IN'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {record.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {new Date(record.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Page {historyPage} of {totalPages} ({historyData?.total || 0} total records)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    disabled={historyPage === 1}
                    className="flex items-center gap-1 px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft size={18} />
                    Previous
                  </button>
                  <button
                    onClick={() => setHistoryPage((p) => (p < totalPages ? p + 1 : p))}
                    disabled={historyPage === totalPages}
                    className="flex items-center gap-1 px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    Next
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
