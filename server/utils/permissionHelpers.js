import {
  LEGACY_ADMIN_ROLE,
  PORTAL_ROLES,
  ROLE_SETS,
} from "../constants/roles.js";

const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const normalizePermission = (permission) =>
  String(permission ?? "")
    .trim()
    .toLowerCase();

export const getPortalRole = (user) => normalize(user?.role);

export const isSuperAdmin = (user) =>
  [PORTAL_ROLES.SUPER_ADMIN, LEGACY_ADMIN_ROLE].includes(getPortalRole(user));

export const isIedcExecom = (user) =>
  getPortalRole(user) === PORTAL_ROLES.IEDC_EXECOM;

export const isClubLead = (user) => getPortalRole(user) === PORTAL_ROLES.CLUB_LEAD;

export const isClubMember = (user) =>
  getPortalRole(user) === PORTAL_ROLES.CLUB_MEMBER;

export const isLegacyAdmin = (user) => getPortalRole(user) === LEGACY_ADMIN_ROLE;

export const hasPermission = (user, permission) => {
  if (isSuperAdmin(user) || isLegacyAdmin(user)) return true;
  const required = normalizePermission(permission);
  if (!required) return true;
  const perms = Array.isArray(user?.permissions)
    ? user.permissions.map(normalizePermission).filter(Boolean)
    : [];
  return perms.includes(required);
};

export const hasIedcScopePermission = (user, permission) => {
  const normalizedPermission = normalizePermission(permission);
  if (!normalizedPermission) return true;
  if (isSuperAdmin(user) || isLegacyAdmin(user)) return true;
  if (isIedcExecom(user)) return hasPermission(user, normalizedPermission);
  return false;
};

export const hasClubScopePermission = (user, permission) => {
  const normalizedPermission = normalizePermission(permission);
  if (!normalizedPermission) return true;
  if (isSuperAdmin(user) || isLegacyAdmin(user)) return true;

  const normalizedRole = getPortalRole(user);
  if (!ROLE_SETS.CLUB_SCOPE.includes(normalizedRole)) return false;
  return hasPermission(user, normalizedPermission);
};
