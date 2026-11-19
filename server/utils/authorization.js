import { LEGACY_ADMIN_ROLE, PORTAL_ROLES } from "../constants/roles.js";
import { PERMISSIONS } from "../constants/permissions.js";

const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const ROLE_ALIASES = Object.freeze({
  admin: PORTAL_ROLES.SUPER_ADMIN,
  super_admin: PORTAL_ROLES.SUPER_ADMIN,
  execom: PORTAL_ROLES.IEDC_EXECOM,
  iedc_execom: PORTAL_ROLES.IEDC_EXECOM,
  club_lead: PORTAL_ROLES.CLUB_LEAD,
  club_member: PORTAL_ROLES.CLUB_MEMBER,
  editor: PORTAL_ROLES.CLUB_MEMBER,
});

export const CLUB_EVENT_PERMISSIONS = Object.freeze({
  EDIT: "club_events_edit",
  PUBLISH: "club_events_publish",
  DELETE: "club_events_delete",
});

export const CLUB_PAGE_PERMISSIONS = Object.freeze({ EDIT: "club_page_edit", PUBLISH: "club_page_publish" });

export const CLUB_SCOPED_PERMISSIONS = Object.freeze([
  CLUB_EVENT_PERMISSIONS.EDIT,
  CLUB_EVENT_PERMISSIONS.PUBLISH,
  CLUB_EVENT_PERMISSIONS.DELETE,
  ...Object.values(CLUB_PAGE_PERMISSIONS),
]);

export const WORKSPACE_PERMISSIONS = Object.freeze([
  ...Object.values(PERMISSIONS).filter((permission) => !permission.startsWith("club_")),
]);

const normalizePermission = (permission) => normalize(permission).replaceAll("_", "");

const normalizedWorkspacePermissions = new Map(
  WORKSPACE_PERMISSIONS.map((permission) => [normalizePermission(permission), permission]),
);

export const normalizePortalRole = (role) => ROLE_ALIASES[normalize(role)] || normalize(role);

export const isSuperAdmin = (user) =>
  normalizePortalRole(user?.role) === PORTAL_ROLES.SUPER_ADMIN ||
  normalize(user?.role) === normalize(LEGACY_ADMIN_ROLE);

export const hasWorkspacePermission = (user, permission) => {
  if (isSuperAdmin(user)) return true;
  const role = normalizePortalRole(user?.role);
  if (role === PORTAL_ROLES.CLUB_LEAD || role === PORTAL_ROLES.CLUB_MEMBER) return false;
  const required = normalizePermission(permission);
  if (!required) return true;
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  return permissions.some((value) => normalizePermission(value) === required);
};

export const canUseIedcWorkspace = (user) =>
  isSuperAdmin(user) ||
  normalizePortalRole(user?.role) === PORTAL_ROLES.IEDC_EXECOM ||
  WORKSPACE_PERMISSIONS.some((permission) => hasWorkspacePermission(user, permission));

export const canApplyClubEventPatch = ({ access, currentStatus, currentVisibility, patch }) => {
  const keys = Object.keys(patch || {}).filter((key) => patch[key] !== undefined);
  if (normalize(patch?.scope) && normalize(patch.scope) !== "club") return false;

  const current = normalize(currentStatus);
  const nextStatus = normalize(patch?.status);
  const changesPublicationState =
    Boolean(nextStatus) && nextStatus !== current &&
    (nextStatus === "published" || current === "published");
  const changesVisibility =
    patch?.visibility !== undefined &&
    normalize(patch.visibility) !== normalize(currentVisibility);

  if (!access?.edit) {
    return Boolean(access?.publish) && keys.length === 1 && keys[0] === "status" && changesPublicationState;
  }
  if (changesPublicationState && !access?.publish) return false;
  if (current === "published" && changesVisibility && !access?.publish) return false;
  return true;
};

const clubUserIds = (club) =>
  new Set(
    [club?.managerUsers, club?.editorUsers, club?.memberUsers]
      .flatMap((values) => (Array.isArray(values) ? values : []))
      .map((value) => String(value?._id || value)),
  );

export const findRemovedClubUserIds = (before, after) => {
  const beforeIds = clubUserIds(before);
  const afterIds = clubUserIds(after);
  return [...beforeIds].filter((id) => !afterIds.has(id));
};

export const canAssignWorkspaceRole = (actor, requestedRole) => {
  const requested = normalizePortalRole(requestedRole);
  if (requested === PORTAL_ROLES.SUPER_ADMIN) return isSuperAdmin(actor);
  return Object.values(PORTAL_ROLES).includes(requested);
};

export const sanitizeAssignablePermissions = (requestedPermissions, actor) => {
  const requested = Array.isArray(requestedPermissions) ? requestedPermissions : [];
  const result = [];
  for (const rawPermission of requested) {
    const canonical = normalizedWorkspacePermissions.get(normalizePermission(rawPermission));
    if (!canonical) continue;
    if (!isSuperAdmin(actor) && !hasWorkspacePermission(actor, canonical)) continue;
    if (!result.includes(canonical)) result.push(canonical);
  }
  return result;
};

export const sanitizeClubEventPermissions = (requestedPermissions) => {
  const allowed = new Set(Object.values(CLUB_EVENT_PERMISSIONS));
  const result = [];
  for (const permission of Array.isArray(requestedPermissions) ? requestedPermissions : []) {
    const normalized = normalize(permission);
    if (allowed.has(normalized) && !result.includes(normalized)) result.push(normalized);
  }
  return result;
};

const idListIncludes = (values, userId) =>
  Array.isArray(values) && values.some((value) => String(value?._id || value) === String(userId));

const emptyClubAccess = () => ({
  view: false,
  edit: false,
  publish: false,
  delete: false,
  managePermissions: false,
  pageEdit: false,
  pagePublish: false,
});

export const getClubEventAccess = ({ user, club, membership }) => {
  if (!user?.id || !club) return emptyClubAccess();
  if (isSuperAdmin(user)) {
    return { view: true, edit: true, publish: true, delete: true, managePermissions: true, pageEdit: true, pagePublish: true };
  }

  if (membership && normalize(membership.status) !== "active") return emptyClubAccess();

  const isManager = idListIncludes(club.managerUsers, user.id);
  const isEditor = idListIncludes(club.editorUsers, user.id);
  const isMember = idListIncludes(club.memberUsers, user.id);
  const hasRelationship = Boolean(membership) || isManager || isEditor || isMember;
  if (!hasRelationship) return emptyClubAccess();

  if (isManager) {
    return { view: true, edit: true, publish: true, delete: true, managePermissions: true, pageEdit: true, pagePublish: true };
  }

  const scopedPermissions = new Set(
    Array.isArray(membership?.permissions)
      ? membership.permissions.map((permission) => normalize(permission))
      : [],
  );
  return {
    view: true,
    edit: (!membership && isEditor) || scopedPermissions.has(CLUB_EVENT_PERMISSIONS.EDIT),
    publish: scopedPermissions.has(CLUB_EVENT_PERMISSIONS.PUBLISH),
    delete: scopedPermissions.has(CLUB_EVENT_PERMISSIONS.DELETE),
    managePermissions: false,
    pageEdit: scopedPermissions.has(CLUB_PAGE_PERMISSIONS.EDIT),
    pagePublish: scopedPermissions.has(CLUB_PAGE_PERMISSIONS.PUBLISH),
  };
};

export const mergeClubPermissions = (existing, { permissions, pagePermissions }) => {
  for (const value of [permissions, pagePermissions]) {
    if (value !== undefined && (!Array.isArray(value) || value.some(item => typeof item !== "string"))) {
      const error = new Error("Club permissions must be arrays of permission names"); error.status = 400; throw error;
    }
  }
  const pageAllowed = new Set(Object.values(CLUB_PAGE_PERMISSIONS));
  const retained = (existing || []).filter(value =>
    !(permissions !== undefined && Object.values(CLUB_EVENT_PERMISSIONS).includes(value)) &&
    !(pagePermissions !== undefined && pageAllowed.has(value)));
  return [...new Set([...retained, ...sanitizeClubEventPermissions(permissions),
    ...(pagePermissions || []).filter(value => pageAllowed.has(value))])];
};
