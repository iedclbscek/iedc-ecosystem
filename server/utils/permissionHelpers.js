import {
  LEGACY_ADMIN_ROLE,
  PORTAL_ROLES,
  ROLE_SETS,
} from "../constants/roles.js";
import {
  canUseIedcWorkspace,
  hasWorkspacePermission,
  isSuperAdmin as isCanonicalSuperAdmin,
  normalizePortalRole,
} from "./authorization.js";

const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const normalizePermission = (permission) =>
  String(permission ?? "")
    .trim()
    .toLowerCase();

export const getPortalRole = (user) => normalizePortalRole(user?.role);

export const isSuperAdmin = (user) => isCanonicalSuperAdmin(user);

export const isIedcExecom = (user) =>
  getPortalRole(user) === PORTAL_ROLES.IEDC_EXECOM;

export const isClubLead = (user) => getPortalRole(user) === PORTAL_ROLES.CLUB_LEAD;

export const isClubMember = (user) =>
  getPortalRole(user) === PORTAL_ROLES.CLUB_MEMBER;

export const isLegacyAdmin = (user) => getPortalRole(user) === LEGACY_ADMIN_ROLE;

export const hasPermission = (user, permission) => {
  return hasWorkspacePermission(user, permission);
};

export const hasIedcScopePermission = (user, permission) => {
  const normalizedPermission = normalizePermission(permission);
  if (!normalizedPermission) return true;
  if (!canUseIedcWorkspace(user)) return false;
  return hasPermission(user, normalizedPermission);
};

export const hasClubScopePermission = (user, permission) => {
  const normalizedPermission = normalizePermission(permission);
  if (!normalizedPermission) return true;
  if (isSuperAdmin(user) || isLegacyAdmin(user)) return true;

  const normalizedRole = getPortalRole(user);
  if (!ROLE_SETS.CLUB_SCOPE.includes(normalizedRole)) return false;
  return hasPermission(user, normalizedPermission);
};
