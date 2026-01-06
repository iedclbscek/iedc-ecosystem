import { useState } from 'react';
import { Search, Filter, MoreHorizontal, Mail, CheckCircle, XCircle, UserPlus } from 'lucide-react';

export default function Registrations() {
  const [searchTerm, setSearchTerm] = useState("");

  // Placeholder logic for your 451 documents
  // You will replace this with a fetch from: GET admin.iedclbscek.in/api/registrations
  const students = [
    { id: "689f76e33e599a05a7ef4e2d", name: "Umar Al Mukhtar", admissionNo: "2023B342", dept: "CSE", status: "pending", year: "2023" },
    { id: "2", name: "Fathima Sahla", admissionNo: "2023B102", dept: "ECE", status: "active", year: "2023" },
    // ... imagine 449 more rows
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Student Registrations</h1>
          <p className="text-sm text-slate-500">Manage {students.length} total student entries</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">
            <Filter size={16} />
            Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-lg shadow-blue-200">
            Export CSV
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text"
          placeholder="Search by name, admission number, or email..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student Info</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Admission No</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Department</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{student.name}</p>
                        <p className="text-xs text-slate-500 uppercase">{student.year} Batch</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm font-medium text-slate-600 font-mono">
                    {student.admissionNo}
                  </td>
                  <td className="p-4">
                    <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md">
                      {student.dept}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      student.status === 'active' 
                        ? 'bg-emerald-50 text-emerald-600' 
                        : 'bg-amber-50 text-amber-600'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${student.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {student.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Send Email">
                        <Mail size={18} />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Approve">
                        <CheckCircle size={18} />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <MoreHorizontal size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
          <p className="text-xs text-slate-500">Showing 1 to 10 of 451 entries</p>
          <div className="flex gap-2">
            <button className="px-3 py-1 text-sm border border-slate-200 rounded-md bg-white hover:bg-slate-50 disabled:opacity-50">Prev</button>
            <button className="px-3 py-1 text-sm border border-slate-200 rounded-md bg-white hover:bg-slate-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}