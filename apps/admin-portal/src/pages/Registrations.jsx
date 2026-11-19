import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Pencil, RefreshCw, Search, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { deleteMember, fetchMembers, updateMember } from '../api/adminService';
import { RowsSkeleton } from '../components/InlineSkeleton';
import PortalDialog from '../components/PortalDialog';
import FormAlert from '../components/FormAlert';

const categories = { student: 'Students', staff: 'Staff', guest: 'Guests' };
const fieldLabels = {
  firstName: 'First name', lastName: 'Last name', email: 'Email', department: 'Department',
  semester: 'Semester', admissionNo: 'Admission number', membershipId: 'Membership ID',
  organization: 'Organization', phone: 'Phone number', whatsappNumber: 'WhatsApp number',
};
const pageSize = 10;

function MemberDialog({ member, memberType, action, onClose }) {
  const queryClient = useQueryClient();
  const editing = action === 'edit';
  const fields = ['firstName', 'lastName', 'email', 'department',
    ...(memberType === 'student' ? ['admissionNo', 'semester'] : ['membershipId']),
    ...(memberType === 'guest' ? ['organization'] : []), 'phone', 'whatsappNumber'];
  const original = field => String((field === 'phone' ? member.phone ?? member.phoneNumber : member[field]) ?? '');
  const mutation = useMutation({
    mutationFn: editing ? updateMember : deleteMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
      toast.success(editing ? 'Member updated' : 'Member deleted');
      onClose();
    },
  });
  function submit(event) {
    event.preventDefault();
    if (mutation.isPending) return;
    const data = { id: member._id, memberType };
    if (editing) {
      const entries = new FormData(event.currentTarget);
      data.updateData = Object.fromEntries([...entries].filter(([field, value]) => original(field) !== value.trim()));
      if (!Object.keys(data.updateData).length) return onClose();
    }
    mutation.mutate(data);
  }
  return (
    <PortalDialog onClose={onClose} busy={mutation.isPending} labelledBy="member-dialog-title">
      <form onSubmit={submit}>
        <header className="op-dialog-head">
          <h2 id="member-dialog-title">{editing ? 'Edit member' : 'Delete member?'}</h2>
          <button type="button" className="op-icon" aria-label="Close dialog" disabled={mutation.isPending} onClick={onClose}><X size={16} /></button>
        </header>
        {editing ? <div className="op-form">
          {fields.map(field => <label key={field} className="op-field">{fieldLabels[field]}
            <input name={field} type={field === 'email' ? 'email' : ['phone', 'whatsappNumber'].includes(field) ? 'tel' : 'text'}
              defaultValue={original(field)} required={['firstName', 'lastName', 'email', 'membershipId'].includes(field)} />
          </label>)}
        </div> : <p className="p-5 text-sm">Permanently delete the registration for <strong>{member.firstName} {member.lastName}</strong>?</p>}
        {mutation.isError && <FormAlert className="mx-5 mb-4">{mutation.error.response?.data?.message || 'Could not save this change. Check your connection and try again.'}</FormAlert>}
        <footer className="op-dialog-foot">
          <button type="button" className="op-secondary" disabled={mutation.isPending} onClick={onClose}>Cancel</button>
          <button className={editing ? 'op-primary' : 'op-danger'} disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : editing ? 'Save changes' : 'Delete member'}
          </button>
        </footer>
      </form>
    </PortalDialog>
  );
}

export default function Registrations() {
  const [memberType, setMemberType] = useState('student');
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState(null);
  useEffect(() => {
    if (input.trim() === search) return;
    const timer = setTimeout(() => { setSearch(input.trim()); setPage(1); }, 250);
    return () => clearTimeout(timer);
  }, [input, search]);
  const query = useQuery({
    queryKey: ['registrations', memberType, page, search],
    queryFn: () => fetchMembers({ memberType, page, search }),
    placeholderData: (previous, previousQuery) => previousQuery?.queryKey[1] === memberType && previousQuery.queryKey[3] === search ? previous : undefined,
  });
  const members = query.data?.members ?? query.data?.students ?? [];
  const total = query.data?.totalMembers ?? query.data?.totalStudents ?? 0;
  const currentPage = query.data?.currentPage ?? page;
  const pageCount = query.data?.totalPages ?? 1;
  const firstButton = Math.max(1, Math.min(currentPage - 2, pageCount - 4));
  const pageNumbers = Array.from({ length: Math.min(pageCount, 5) }, (_, i) => firstButton + i);
  const idLabel = memberType === 'student' ? 'Admission number' : 'Membership ID';
  const unitLabel = memberType === 'guest' ? 'Organization' : 'Department';

  return <section className="op-page">
    <header className="op-header">
      <h1>Members</h1>
      <button className="op-secondary" disabled={query.isFetching} onClick={() => query.refetch()}>
        <RefreshCw size={14} className={query.isFetching ? 'animate-spin' : ''} /> Refresh
      </button>
    </header>
    <div className="op-tabs" role="group" aria-label="Member category">
      {Object.entries(categories).map(([key, label]) => <button key={key} className="op-tab" aria-pressed={memberType === key}
        onClick={() => { setMemberType(key); setPage(1); }}>{label}</button>)}
    </div>
    <section className="op-card">
      <header className="op-card-head">
        <div className="op-actions"><h2 className="first-letter:uppercase">{memberType} directory</h2>{query.data && <span className="op-count">{total.toLocaleString()}</span>}</div>
        <label className="op-search"><Search size={16} /><input type="search" aria-label="Search members" placeholder="Search members…" value={input} onChange={event => setInput(event.target.value)} /></label>
      </header>
      <div className="op-scroll" aria-busy={query.isFetching}>
        <table className="op-table op-member-table">
          <thead><tr>{['No.', 'Member', idLabel, unitLabel, 'Status', 'Actions'].map(title => <th scope="col" key={title} className={title === 'Actions' ? 'text-right' : ''}>{title}</th>)}</tr></thead>
          <tbody>
            {query.isPending ? <tr><td colSpan={6}><RowsSkeleton rows={7} columns={5} compact label="Loading members" /></td></tr>
              : query.isError ? <tr><td colSpan={6}><FormAlert>Could not load members. <button type="button" onClick={() => query.refetch()}>Try again</button></FormAlert></td></tr>
              : !members.length ? <tr><td colSpan={6}><div className="op-empty">{search ? 'No members match your search.' : 'No registrations in this category yet.'}</div></td></tr>
              : members.map((member, index) => {
                const name = [member.firstName, member.lastName].filter(Boolean).join(' ');
                return <tr key={member._id}>
                  <td className="member-ordinal text-slate-500">{(currentPage - 1) * pageSize + index + 1}</td>
                  <td className="member-identity"><div className="op-member-name">
                    <span className="op-initials" aria-hidden="true">{member.firstName?.[0]}{member.lastName?.[0]}</span>
                    <div><strong>{name}</strong><span className="op-member-sub">{member.email}</span>
                      {memberType === 'student' && member.membershipId && <span className="op-member-sub">{member.membershipId}</span>}
                    </div></div></td>
                  <td className="member-attribute" data-label={idLabel}>{(memberType === 'student' ? member.admissionNo : member.membershipId) || '—'}</td>
                  <td className="member-attribute" data-label={unitLabel}>{(memberType === 'guest' ? member.organization : member.department) || '—'}</td>
                  <td className="member-state"><span className={`op-status capitalize ${member.status || ''}`}>{member.status || 'Unknown'}</span></td>
                  <td className="member-actions"><div className="flex justify-end gap-1">
                    <button className="op-icon" title="Edit member" aria-label={`Edit member ${name}`} onClick={() => setDialog({ member, action: 'edit' })}><Pencil size={14} /></button>
                    <button className="op-icon danger" title="Delete member" aria-label={`Delete member ${name}`} onClick={() => setDialog({ member, action: 'delete' })}><Trash2 size={14} /></button>
                  </div></td>
                </tr>;
              })}
          </tbody>
        </table>
      </div>
      {query.data && total > 0 && <footer className="op-footer">
        <span>Page {currentPage} of {pageCount}</span>
        <nav className="op-pager" aria-label="Member pages">
          <button className="op-icon" aria-label="Previous page" disabled={currentPage <= 1 || query.isPlaceholderData} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={15} /></button>
          {pageNumbers.map(number => <button key={number} className="op-icon" aria-label={`Page ${number}`} aria-current={number === currentPage ? 'page' : undefined} disabled={query.isPlaceholderData} onClick={() => setPage(number)}>{number}</button>)}
          <button className="op-icon" aria-label="Next page" disabled={currentPage >= pageCount || query.isPlaceholderData} onClick={() => setPage(currentPage + 1)}><ChevronRight size={15} /></button>
        </nav>
      </footer>}
    </section>
    {dialog && <MemberDialog {...dialog} memberType={memberType} onClose={() => setDialog(null)} />}
  </section>;
}
