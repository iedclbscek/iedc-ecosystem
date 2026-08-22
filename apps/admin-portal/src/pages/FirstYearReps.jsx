import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchFirstYearReps,
  fetchFirstYearRep,
  updateFirstYearRep,
  deleteFirstYearRep,
} from "../api/adminService";
import toast from "react-hot-toast";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  ArrowLeft,
  Check,
  X as XIcon,
  Trash2,
} from "lucide-react";
const STATUS_OPTIONS = [
  "Applied",
  "Reviewed",
  "Shortlisted",
  "Interview",
  "Selected",
  "Rejected",
];

const STATUS_COLORS = {
  Applied: "bg-gray-100 text-gray-800",
  Reviewed: "bg-blue-100 text-blue-800",
  Shortlisted: "bg-purple-100 text-purple-800",
  Interview: "bg-yellow-100 text-yellow-800",
  Selected: "bg-green-100 text-green-800",
  Rejected: "bg-red-100 text-red-800",
};

function ApplicationDetail({ applicationId, onBack }) {
  const queryClient = useQueryClient();
  const [remarks, setRemarks] = useState("");

  const { data: app, isLoading } = useQuery({
    queryKey: ["firstYearRep", applicationId],
    queryFn: () => fetchFirstYearRep(applicationId),
  });

  const updateMutation = useMutation({
    mutationFn: ({ status, remarks }) =>
      updateFirstYearRep(applicationId, { status, remarks }),
    onSuccess: () => {
      queryClient.invalidateQueries(["firstYearRep", applicationId]);
      queryClient.invalidateQueries(["firstYearReps"]);
      toast.success("Application updated");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to update");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteFirstYearRep(applicationId),
    onSuccess: () => {
      queryClient.invalidateQueries(["firstYearReps"]);
      toast.success("Application deleted");
      onBack();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to delete");
    },
  });

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this application? This action cannot be undone.")) {
      deleteMutation.mutate();
    }
  };

  useEffect(() => {
    if (app?.review?.remarks) {
      setRemarks(app.review.remarks);
    }
  }, [app]);

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading...</div>;
  }

  if (!app) {
    return <div className="p-8 text-center text-red-500">Not found</div>;
  }

  const handleStatusChange = (newStatus) => {
    if (["Selected", "Rejected"].includes(newStatus)) {
      if (!window.confirm(`Are you sure you want to mark this applicant as ${newStatus}?`)) {
        return;
      }
    }
    updateMutation.mutate({ status: newStatus, remarks });
  };

  const handleSaveReview = () => {
    updateMutation.mutate({ status: app.status, remarks });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="border-b border-slate-200 p-4 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">
              APPLICATION #{app.membershipId.slice(-4)}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isLoading}
            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium mr-2"
            title="Delete Application"
          >
            <Trash2 size={18} />
            <span className="hidden sm:inline">Delete</span>
          </button>
          <span className="text-sm font-medium text-slate-500">STATUS:</span>
          <select
            value={app.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={updateMutation.isLoading}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold border-0 cursor-pointer outline-none ring-2 ring-transparent focus:ring-blue-500 ${
              STATUS_COLORS[app.status]
            }`}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s} className="bg-white text-slate-800">
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 lg:p-10 flex flex-col lg:flex-row gap-10">
        {/* Left Column: Details & Review */}
        <div className="w-full lg:w-1/3 space-y-8">
          <div>
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl">
              <h3 className="text-xl font-bold text-slate-800 mb-1">
                {app.memberSnapshot.name}
              </h3>
              <p className="text-sm text-slate-500 font-mono mb-4">
                {app.membershipId}
              </p>
              
              <div className="space-y-3">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Department</span>
                  <span className="text-sm text-slate-700">{app.memberSnapshot.department} · {app.memberSnapshot.semester}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Class</span>
                  <span className="text-sm text-slate-700">{app.memberSnapshot.class || 'N/A'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Admission Number</span>
                  <span className="text-sm text-slate-700">{app.memberSnapshot.admissionNumber}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Email</span>
                  <span className="text-sm text-slate-700">{app.memberSnapshot.email}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Phone</span>
                  <span className="text-sm text-slate-700">{app.memberSnapshot.phone}</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 pb-2">
              Reviewer Notes
            </h4>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add your evaluation remarks here..."
              rows="5"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none resize-none mb-3"
            />
            <button
              onClick={handleSaveReview}
              disabled={updateMutation.isLoading || remarks === app.review?.remarks}
              className="w-full py-2.5 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              Save Notes
            </button>
            {app.review?.reviewedBy && (
              <p className="text-xs text-slate-400 mt-3 text-center">
                Last updated by {app.review.reviewedBy.name} on {new Date(app.review.reviewedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Answers */}
        <div className="w-full lg:w-2/3 space-y-8">
          <div>
            <div className="mb-2">
              <h4 className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-1">
                01 // Why IEDC?
              </h4>
              <p className="text-sm font-medium text-slate-800">
                Why do you want to join the IEDC Executive Committee as a First-Year Representative?
              </p>
            </div>
            <div className="p-5 bg-white border border-slate-200 rounded-xl text-slate-700 text-sm leading-relaxed whitespace-pre-wrap shadow-sm">
              {app.motivation}
            </div>
          </div>

          <div>
            <div className="mb-2">
              <h4 className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-1">
                02 // Teamwork & Initiative
              </h4>
              <p className="text-sm font-medium text-slate-800">
                Describe a time you took the initiative to organize an event, lead a project, or solve a problem.
              </p>
            </div>
            <div className="p-5 bg-white border border-slate-200 rounded-xl text-slate-700 text-sm leading-relaxed whitespace-pre-wrap shadow-sm">
              {app.teamworkInitiative}
            </div>
          </div>

          <div>
            <div className="mb-2">
              <h4 className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-1">
                03 // Representative Mindset
              </h4>
              <p className="text-sm font-medium text-slate-800">
                What is one new idea or initiative you would want to introduce for first-year students if selected?
              </p>
            </div>
            <div className="p-5 bg-white border border-slate-200 rounded-xl text-slate-700 text-sm leading-relaxed whitespace-pre-wrap shadow-sm">
              {app.representativeIdea}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FirstYearReps() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [selectedAppId, setSelectedAppId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["firstYearReps", page, search, statusFilter, departmentFilter],
    queryFn: () =>
      fetchFirstYearReps({
        page,
        search,
        status: statusFilter,
        department: departmentFilter,
      }),
    keepPreviousData: true,
  });

  if (selectedAppId) {
    return (
      <div className="p-6">
        <ApplicationDetail
          applicationId={selectedAppId}
          onBack={() => setSelectedAppId(null)}
        />
      </div>
    );
  }

  const stats = data?.stats || {
    total: 0,
    applied: 0,
    reviewed: 0,
    shortlisted: 0,
    interview: 0,
    selected: 0,
    rejected: 0,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">
          First-Year Representatives 2026
        </h1>
        <p className="text-slate-500 mt-1">
          Review applications, shortlist candidates, and finalize selections.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        {[
          { label: "Total", value: stats.total, color: "text-slate-900" },
          { label: "Applied", value: stats.applied, color: "text-gray-600" },
          { label: "Reviewed", value: stats.reviewed, color: "text-blue-600" },
          { label: "Shortlisted", value: stats.shortlisted, color: "text-purple-600" },
          { label: "Interview", value: stats.interview, color: "text-yellow-600" },
          { label: "Selected", value: stats.selected, color: "text-green-600" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center"
          >
            <span className={`text-2xl font-black ${stat.color}`}>
              {stat.value}
            </span>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-22rem)]">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50">
          <div className="flex gap-4 w-full md:w-auto flex-1">
            <div className="relative w-full md:w-96">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search by name, ID, admission no..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow"
              />
            </div>
            <button 
              onClick={() => window.open(`${import.meta.env.VITE_API_URL}/admin/first-year-reps/export/csv`, "_blank")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              Export CSV
            </button>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <select
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:border-blue-500 outline-none"
            >
              <option value="">All Departments</option>
              <option value="CSE">CSE</option>
              <option value="CSBS">CSBS</option>
              <option value="CSE (AI & DS)">CSE (AI & DS)</option>
              <option value="IT">IT</option>
              <option value="ECE">ECE</option>
              <option value="EEE">EEE</option>
              <option value="ME">ME</option>
              <option value="CE">CE</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:border-blue-500 outline-none"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 shadow-sm z-10">
              <tr>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">
                  Applicant
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">
                  Admission
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">
                  Dept & Class
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">
                  Date
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">
                  Status
                </th>
                <th className="p-4 border-b border-slate-200"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">
                    Loading applications...
                  </td>
                </tr>
              ) : data?.applications?.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">
                    No applications found.
                  </td>
                </tr>
              ) : (
                data?.applications?.map((app) => (
                  <tr
                    key={app._id}
                    className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedAppId(app._id)}
                  >
                    <td className="p-4">
                      <p className="font-bold text-slate-800">{app.name}</p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        {app.membershipId}
                      </p>
                    </td>
                    <td className="p-4 text-sm text-slate-600 font-mono">
                      {app.admissionNumber}
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {app.department} {app.class ? `· ${app.class}` : ""}
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {new Date(app.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                          STATUS_COLORS[app.status]
                        }`}
                      >
                        {app.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <p className="text-sm text-slate-500 font-medium">
            Showing Page <span className="font-bold text-slate-700">{data?.page || 1}</span> of{" "}
            <span className="font-bold text-slate-700">{data?.pages || 1}</span>
            <span className="ml-2 hidden sm:inline">
              ({data?.total || 0} total applications)
            </span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!data || data.page <= 1}
              className="p-2 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
              disabled={!data || data.page >= data.pages}
              className="p-2 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
