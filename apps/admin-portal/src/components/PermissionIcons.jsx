import { createElement } from 'react';
import { CalendarDays, KeyRound, PanelsTopLeft } from 'lucide-react';
import { workspacePages } from '../utils/workspacePages';
import { hasWorkspacePermission } from '../utils/authorization';

const permissionPages = [
  ...workspacePages,
  { id: 'club_events_edit', label: 'Edit club events', Icon: CalendarDays },
  { id: 'club_events_publish', label: 'Publish club events', Icon: CalendarDays },
  { id: 'club_events_delete', label: 'Delete club events', Icon: CalendarDays },
  { id: 'club_page_edit', label: 'Edit Nexus page', Icon: PanelsTopLeft },
  { id: 'club_page_publish', label: 'Publish Nexus page', Icon: PanelsTopLeft },
];

export default function PermissionIcons({ permissions }) {
  const values = Array.isArray(permissions) ? permissions.filter(value => typeof value === 'string') : [];
  const matches = (value, id) => hasWorkspacePermission({ role: 'iedc_execom', permissions: [value] }, id);
  const granted = permissionPages.filter(page => values.some(value => matches(value, page.id)));
  const other = [...new Set(values.filter(value => !permissionPages.some(page => matches(value, page.id))))];
  const icons = [...granted, ...other.map(value => ({ id: value, label: value, Icon: KeyRound }))];

  return icons.length ? <div className="team-permission-icons" role="list" aria-label="Assigned permissions">
    {icons.map(({ id, label, Icon }) => <span key={id} className="team-permission-icon" role="listitem" title={label} aria-label={label}>
      {createElement(Icon, { size: 14, 'aria-hidden': true })}
    </span>)}
  </div> : <span className="team-permission-icons" aria-label="No permissions assigned">—</span>;
}
