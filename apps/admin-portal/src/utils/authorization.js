const normalize = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

const ROLE_ALIASES = {
  admin: 'super_admin',
  super_admin: 'super_admin',
  execom: 'iedc_execom',
  iedc_execom: 'iedc_execom',
  club_lead: 'club_lead',
  club_member: 'club_member',
  editor: 'club_member',
};

export const normalizePortalRole = (role) => ROLE_ALIASES[normalize(role)] || normalize(role);

export const hasWorkspacePermission = (user, permission) => {
  const role = normalizePortalRole(user?.role);
  if (role === 'super_admin') return true;
  if (role === 'club_lead' || role === 'club_member') return false;
  const required = normalize(permission).replaceAll('_', '');
  if (!required) return true;
  return (Array.isArray(user?.permissions) ? user.permissions : []).some(
    (value) => normalize(value).replaceAll('_', '') === required,
  );
};

const EMPTY_ACCESS = Object.freeze({
  view: false,
  edit: false,
  publish: false,
  delete: false,
  managePermissions: false,
  pageEdit: false,
  pagePublish: false,
});

export const getWorkspaceAccess = (user, workspaceId) => {
  const workspace = (Array.isArray(user?.workspaces) ? user.workspaces : []).find(
    (item) => String(item?.id) === String(workspaceId),
  );
  if (!workspace?.access) return { ...EMPTY_ACCESS };
  return {
    view: Boolean(workspace.access.view),
    edit: Boolean(workspace.access.edit),
    publish: Boolean(workspace.access.publish),
    delete: Boolean(workspace.access.delete),
    managePermissions: Boolean(workspace.access.managePermissions),
    pageEdit: Boolean(workspace.access.pageEdit),
    pagePublish: Boolean(workspace.access.pagePublish),
  };
};
