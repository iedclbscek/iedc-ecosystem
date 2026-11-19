// src/api/adminService.js
import api from "./axios";

// Fetch with Pagination and Search
export const fetchRegistrations = async (page = 1, search = "") => {
  const { data } = await api.get("/admin/registrations", {
    params: {
      page,
      limit: 10,
      search: search,
      memberType: "student",
    },
  });
  return data;
};

// The missing export causing your error
export const deleteStudent = async ({ id }) => {
  const { data } = await api.delete(`/admin/registrations/${id}`, {
    params: { memberType: "student" },
  });
  return data;
};

// Members (student/staff/guest)
export const fetchMembers = async ({
  page = 1,
  search = "",
  memberType = "student",
} = {}) => {
  const { data } = await api.get("/admin/registrations", {
    params: {
      page,
      limit: 10,
      search: String(search ?? ""),
      memberType,
    },
  });
  return data;
};

export const deleteMember = async ({ id, memberType = "student" } = {}) => {
  const { data } = await api.delete(`/admin/registrations/${id}`, {
    params: { memberType },
  });
  return data;
};

export const updateMember = async ({
  id,
  memberType = "student",
  updateData,
} = {}) => {
  const { data } = await api.patch(`/admin/registrations/${id}`, updateData, {
    params: { memberType },
  });
  return data;
};

// Deprecated - use updateMember instead
export const updateStudent = async (id, updateData) => {
  const { data } = await api.patch(`/admin/registrations/${id}`, updateData);
  return data;
};

// Team management
export const fetchUsers = async ({ page, limit, search = "", roleCategory } = {}) => {
  const { data } = await api.get("/admin/users", {
    params: {
      ...(page ? { page } : {}),
      ...(limit ? { limit } : {}),
      ...(search ? { search: String(search).trim() } : {}),
      ...(roleCategory ? { roleCategory } : {}),
    },
  });
  return data; // { users }
};

export const searchStudents = async (query, memberType = "student", { clubId } = {}) => {
  const { data } = await api.get("/admin/users/search", {
    params: { query, memberType, clubId },
  });
  return data; // { students }
};

export const promoteUser = async ({
  registrationId,
  memberType,
  role,
  customRole,
  permissions,
  portalAccessEnabled,
  websiteProfile,
}) => {
  const { data } = await api.post("/admin/users/promote", {
    registrationId,
    ...(memberType ? { memberType } : {}),
    role,
    customRole,
    permissions,
    portalAccessEnabled,
    websiteProfile,
  });
  return data; // { user }
};

export const updateUser = async ({
  id,
  role,
  customRole,
  permissions,
  portalAccessEnabled,
  websiteProfile,
}) => {
  const { data } = await api.patch(`/admin/users/${id}`, {
    role,
    customRole,
    permissions,
    portalAccessEnabled,
    websiteProfile,
  });
  return data; // { user }
};

// Club portal members (club leads)
export const promoteClubPortalMember = async ({
  clubId,
  registrationId,
  portalAccessEnabled,
  permissions,
  pagePermissions,
}) => {
  const { data } = await api.post(`/admin/clubs/${clubId}/portal-members`, {
    registrationId,
    portalAccessEnabled,
    permissions,
    pagePermissions,
  });
  return data; // { user, passwordSetupEmailSent }
};

export const updateClubPortalMember = async ({
  clubId,
  userId,
  portalAccessEnabled,
  permissions,
  pagePermissions,
}) => {
  const { data } = await api.patch(
    `/admin/clubs/${clubId}/portal-members/${userId}`,
    {
      portalAccessEnabled,
      permissions,
      pagePermissions,
    },
  );
  return data; // { user, passwordSetupEmailSent? }
};

export const deleteUser = async (id) => {
  const { data } = await api.delete(`/admin/users/${id}`);
  return data; // { message }
};

// Website team (Execom) entries
export const fetchWebsiteTeamYears = async ({ category = "execom" } = {}) => {
  const { data } = await api.get("/admin/team/years", { params: { category } });
  return data; // { years }
};

export const fetchWebsiteTeamEntries = async ({
  category = "execom",
  year = "",
} = {}) => {
  const { data } = await api.get("/admin/team/entries", {
    params: { category, year },
  });
  return data; // { entries }
};

export const createWebsiteTeamEntry = async ({
  category = "execom",
  year,
  entryType = "user",
  userId,
  customName,
  customEmail,
  customMembershipId,
  imageUrl,
  linkedin,
  github,
  twitter,
  roleTitle,
  visible,
} = {}) => {
  const { data } = await api.post("/admin/team/entries", {
    category,
    year,
    entryType,
    userId,
    customName,
    customEmail,
    customMembershipId,
    imageUrl,
    linkedin,
    github,
    twitter,
    roleTitle,
    visible,
  });
  return data; // { entry }
};

export const updateWebsiteTeamEntry = async ({
  id,
  year,
  roleTitle,
  customName,
  customEmail,
  customMembershipId,
  imageUrl,
  linkedin,
  github,
  twitter,
  visible,
} = {}) => {
  const { data } = await api.patch(`/admin/team/entries/${id}`, {
    year,
    roleTitle,
    customName,
    customEmail,
    customMembershipId,
    imageUrl,
    linkedin,
    github,
    twitter,
    visible,
  });
  return data; // { entry }
};

export const uploadCloudinaryImage = async ({ source, purpose, clubId }) => {
  const { data } = await api.post("/admin/uploads/cloudinary", { source, purpose, clubId });
  return data; // { url, response }
};

export const deleteWebsiteTeamEntry = async (id) => {
  const { data } = await api.delete(`/admin/team/entries/${id}`);
  return data; // { message }
};

export const sendWebsiteTeamUpdateEmail = async (id) => {
  const { data } = await api.post(
    `/admin/team/entries/${id}/request-update-email`,
  );
  return data; // { sent, message }
};

export const fetchWebsiteTeamEntrySelf = async ({ token }) => {
  const { data } = await api.get("/public/team-entry/self", {
    params: { token },
  });
  return data; // { entry }
};

export const updateWebsiteTeamEntrySelf = async ({
  token,
  linkedin,
  github,
  twitter,
  imageUrl,
  imageBase64,
} = {}) => {
  const { data } = await api.post(
    "/public/team-entry/self",
    {
      linkedin,
      github,
      twitter,
      imageUrl,
      imageBase64,
    },
    { params: { token } },
  );
  return data; // { entry }
};

export const reorderWebsiteTeamEntries = async ({
  category = "execom",
  year,
  orderedIds,
} = {}) => {
  const { data } = await api.post("/admin/team/entries/reorder", {
    category,
    year,
    orderedIds,
  });
  return data; // { message }
};

// Email templates
export const fetchEmailTemplates = async ({ search = "", page, limit } = {}) => {
  const params = { ...(search ? { q: search } : {}), ...(page ? { page } : {}), ...(limit ? { limit } : {}) };
  const { data } = await api.get("/admin/email/templates", { params });
  return data; // { templates }
};

export const fetchEmailTemplate = async (id) => {
  const { data } = await api.get(`/admin/email/templates/${id}`);
  return data; // { template }
};

export const createEmailTemplate = async ({ key, name, subject, html }) => {
  const { data } = await api.post("/admin/email/templates", {
    key,
    name,
    subject,
    html,
  });
  return data; // { template }
};

export const deleteEmailTemplate = async (id) => {
  const { data } = await api.delete(`/admin/email/templates/${id}`);
  return data; // { message }
};

export const updateEmailTemplate = async ({ id, name, subject, html }) => {
  const { data } = await api.patch(`/admin/email/templates/${id}`, {
    name,
    subject,
    html,
  });
  return data; // { template }
};

export const requestWebsiteTeamUpdateEmail = async ({ registrationId, templateKey }) => {
  const { data } = await api.post("/admin/website-team/request-update", {
    registrationId,
    templateKey,
  });
  return data;
};

// First-Year Representatives
export const fetchFirstYearReps = async ({ page = 1, limit = 20, search = "", department = "", status = "", sort = "-submittedAt" } = {}) => {
  const { data } = await api.get("/admin/first-year-reps", {
    params: { page, limit, search, department, status, sort },
  });
  return data;
};

export const fetchFirstYearRep = async (id) => {
  const { data } = await api.get(`/admin/first-year-reps/${id}`);
  return data;
};

export const updateFirstYearRep = async (id, updateData) => {
  const { data } = await api.patch(`/admin/first-year-reps/${id}`, updateData);
  return data;
};

export const deleteFirstYearRep = async (id) => {
  const { data } = await api.delete(`/admin/first-year-reps/${id}`);
  return data;
};

export const fetchFirstYearRepsSettings = async () => {
  const { data } = await api.get("/admin/first-year-reps/settings");
  return data;
};

export const updateFirstYearRepsSettings = async ({ isOpen }) => {
  const { data } = await api.patch("/admin/first-year-reps/settings", { isOpen });
  return data;
};

export const sendTestEmailTemplate = async ({ id, to, data: templateData }) => {
  const { data } = await api.post(`/admin/email/templates/${id}/test`, {
    to,
    data: templateData,
  });
  return data; // { sent, reason }
};

export const fetchActiveMemberAudience = async (filters = {}) => {
  const { data } = await api.get("/admin/email/active-member-audience", {
    params: filters,
  });
  return data;
};

export const sendBulkEmailTemplate = async ({
  id,
  sendTo,
  recipients,
  filters,
  data: templateData,
}) => {
  const { data } = await api.post(`/admin/email/templates/${id}/bulk`, {
    sendTo,
    recipients,
    filters,
    data: templateData,
  });
  return data; // { mode, total, sent, failed, failures[] }
};

// Events
export const fetchEvents = async (search = "", { page, limit, scope } = {}) => {
  const { data } = await api.get("/admin/events", {
    params: { search: String(search ?? "").trim(), ...(page ? { page } : {}), ...(limit ? { limit } : {}), ...(scope ? { scope } : {}) },
  });
  return data; // { events }
};

export const createEvent = async ({
  clubId,
  title,
  description,
  shortDescription,
  scope,
  status,
  visibility,
  venue,
  mode,
  posterUrl,
  posterPublicId,
  registrationUrl,
  registrationLink,
  externalLink,
  location,
  startAt,
  endAt,
  coordinatorUserId,
  coordinatorUserIds,
  assignedTo,
}) => {
  const { data } = await api.post("/admin/events", {
    clubId,
    title,
    description,
    shortDescription,
    scope,
    status,
    visibility,
    venue,
    mode,
    posterUrl,
    posterPublicId,
    registrationUrl: registrationUrl ?? registrationLink,
    registrationLink,
    externalLink,
    assignedTo,
    location,
    startAt,
    endAt,
    coordinatorUserId,
    coordinatorUserIds,
  });
  return data; // { event }
};

export const updateEvent = async ({
  id,
  title,
  description,
  shortDescription,
  scope,
  status,
  visibility,
  venue,
  mode,
  posterUrl,
  posterPublicId,
  registrationUrl,
  registrationLink,
  externalLink,
  location,
  startAt,
  endAt,
  coordinatorUserId,
  coordinatorUserIds,
  assignedTo,
}) => {
  const { data } = await api.patch(`/admin/events/${id}`, {
    title,
    description,
    shortDescription,
    scope,
    status,
    visibility,
    venue,
    mode,
    posterUrl,
    posterPublicId,
    registrationUrl: registrationUrl ?? registrationLink,
    registrationLink,
    externalLink,
    assignedTo,
    location,
    startAt,
    endAt,
    coordinatorUserId,
    coordinatorUserIds,
  });
  return data; // { event }
};

export const deleteEvent = async (id) => {
  const { data } = await api.delete(`/admin/events/${id}`);
  return data; // { message }
};

// Clubs
export const fetchClubs = async () => {
  const { data } = await api.get("/admin/clubs");
  return data; // { clubs }
};

export const createClub = async ({
  name,
  description,
  managerUserIds,
  editorUserIds,
  memberRegistrationIds,
}) => {
  const { data } = await api.post("/admin/clubs", {
    name,
    description,
    managerUserIds,
    editorUserIds,
    memberRegistrationIds,
  });
  return data; // { club }
};

export const updateClub = async ({
  id,
  name,
  description,
  managerUserIds,
  editorUserIds,
  memberRegistrationIds,
}) => {
  const { data } = await api.patch(`/admin/clubs/${id}`, {
    ...(name !== undefined ? { name } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(managerUserIds !== undefined ? { managerUserIds } : {}),
    ...(editorUserIds !== undefined ? { editorUserIds } : {}),
    ...(memberRegistrationIds !== undefined ? { memberRegistrationIds } : {}),
  });
  return data; // { club }
};

export const deleteClub = async (id) => {
  const { data } = await api.delete(`/admin/clubs/${id}`);
  return data; // { message }
};

export const fetchClubAccess = async (id) => {
  const { data } = await api.get(`/admin/clubs/${id}`);
  return data; // { club }
};

// Club Events
export const fetchClubEvents = async ({ clubId, search = "", page, limit }) => {
  const { data } = await api.get(`/admin/clubs/${clubId}/events`, {
    params: { search: String(search ?? "").trim(), ...(page ? { page } : {}), ...(limit ? { limit } : {}) },
  });
  return data; // { events }
};

export const createClubEvent = async ({
  clubId,
  title,
  description,
  shortDescription,
  status,
  visibility,
  location,
  venue,
  mode,
  posterUrl,
  posterPublicId,
  registrationUrl,
  registrationLink,
  externalLink,
  startAt,
  endAt,
  coordinatorUserIds,
  assignedTo,
}) => {
  const { data } = await api.post(`/admin/clubs/${clubId}/events`, {
    title,
    description,
    shortDescription,
    status,
    visibility,
    location,
    venue,
    mode,
    posterUrl,
    posterPublicId,
    registrationUrl: registrationUrl ?? registrationLink,
    registrationLink,
    externalLink,
    startAt,
    endAt,
    coordinatorUserIds,
    assignedTo,
  });
  return data; // { event }
};

export const updateClubEvent = async ({
  clubId,
  eventId,
  title,
  description,
  shortDescription,
  status,
  visibility,
  location,
  venue,
  mode,
  posterUrl,
  posterPublicId,
  registrationUrl,
  registrationLink,
  externalLink,
  startAt,
  endAt,
  coordinatorUserIds,
  assignedTo,
}) => {
  const { data } = await api.patch(`/admin/clubs/${clubId}/events/${eventId}`, {
    title,
    description,
    shortDescription,
    status,
    visibility,
    location,
    venue,
    mode,
    posterUrl,
    posterPublicId,
    registrationUrl: registrationUrl ?? registrationLink,
    registrationLink,
    externalLink,
    startAt,
    endAt,
    coordinatorUserIds,
    assignedTo,
  });
  return data; // { event }
};

export const deleteClubEvent = async ({ clubId, eventId }) => {
  const { data } = await api.delete(`/admin/clubs/${clubId}/events/${eventId}`);
  return data; // { message }
};

// Makerspace Check-In API
export const checkInMember = async ({ membershipId, action }) => {
  const { data } = await api.post("/makerspace/checkin", {
    membershipId,
    action,
  });
  return data;
};

export const getActiveMembers = async () => {
  const { data } = await api.get("/makerspace/active");
  return data;
};

export const getCheckInHistory = async (page = 1, limit = 20, filters = {}) => {
  const { data } = await api.get("/makerspace/history", {
    params: {
      page,
      limit,
      ...filters,
    },
  });
  return data;
};

export const forceCheckOutMember = async (membershipId) => {
  const { data } = await api.post("/makerspace/checkout", {
    membershipId,
  });
  return data;
};

export const banMembershipId = async (membershipId) => {
  const { data } = await api.post("/makerspace/ban", {
    membershipId,
  });
  return data;
};

export const unbanMembershipId = async (membershipId) => {
  const { data } = await api.post("/makerspace/unban", {
    membershipId,
  });
  return data;
};

// Club Nexus drafts and publication
export const fetchClubPage = async (clubId) => (await api.get(`/admin/clubs/${clubId}/page`)).data;
export const saveClubPage = async (clubId, body) => (await api.put(`/admin/clubs/${clubId}/page/draft`, body)).data;
export const publishClubPage = async (clubId, expectedRevision) => (await api.post(`/admin/clubs/${clubId}/page/publish`, { expectedRevision })).data;
export const unpublishClubPage = async (clubId, expectedRevision) => (await api.post(`/admin/clubs/${clubId}/page/unpublish`, { expectedRevision })).data;
export const bindClubPage = async (clubId, body) => (await api.patch(`/admin/clubs/${clubId}/public-binding`, body)).data;
export const fetchNexusOrder = async () => (await api.get('/admin/nexus/order')).data;
export const saveNexusOrder = async (order) => (await api.put('/admin/nexus/order', { order })).data;
