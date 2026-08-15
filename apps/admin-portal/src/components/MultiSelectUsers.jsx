import React, { useState } from 'react';
import { Search } from 'lucide-react';

export const normalize = (v) => String(v ?? '').trim();

const separator = ' · ';

export const userLabel = (user) => {
  const name = user?.name || user?.membershipId || 'Member';
  const meta = user?.meta || [user?.membershipId, user?.email].filter(Boolean).join(separator);
  return { name, meta };
};

export const matchesUserSearch = (user, query) => {
  const search = normalize(query).toLowerCase();
  if (!search) return true;

  return [user?.name, user?.email, user?.membershipId, user?.meta]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(search));
};

export function MultiSelectUsers({
  users,
  selectedIds,
  onToggle,
  disabled,
  searchEnabled = false,
  searchPlaceholder = 'Search users...',
  emptyMessage = 'No users found',
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const options = (Array.isArray(users) ? users : [])
    .map((u) => {
      const id = u?._id ?? u?.id;
      return { id, ...userLabel(u) };
    })
    .filter((u) => Boolean(u.id));

  const filteredOptions = options.filter((u) => matchesUserSearch(u, searchQuery));

  if (options.length === 0) {
    return <div className="text-sm text-slate-500">No users found.</div>;
  }

  return (
    <div className={`max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      {searchEnabled ? (
        <div className="border-b border-slate-200 p-2">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg bg-white text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
            />
          </div>
        </div>
      ) : null}

      {filteredOptions.length === 0 ? (
        <div className="p-3 text-sm text-slate-500">{emptyMessage}</div>
      ) : (
        filteredOptions.map((u) => (
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
        ))
      )}
    </div>
  );
}
