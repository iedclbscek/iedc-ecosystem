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

// (Optional) Add this for the Edit feature later
export const updateStudent = async (id, updateData) => {
  const { data } = await api.patch(`/admin/registrations/${id}`, updateData);
  return data;
};

// Team management
export const fetchUsers = async () => {
  const { data } = await api.get("/admin/users");
  return data; // { users }
};

export const searchStudents = async (query, memberType = "student") => {
  const { data } = await api.get("/admin/users/search", {
    params: { query, memberType },
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
}) => {
  const { data } = await api.post(`/admin/clubs/${clubId}/portal-members`, {
    registrationId,
    portalAccessEnabled,
    permissions,
  });
  return data; // { user, passwordSetupEmailSent }
};

export const updateClubPortalMember = async ({
  clubId,
  userId,
  portalAccessEnabled,
  permissions,
}) => {
  const { data } = await api.patch(
    `/admin/clubs/${clubId}/portal-members/${userId}`,
    {
      portalAccessEnabled,
      permissions,
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
    roleTitle,
    visible,
  });
  return data; // { entry }
};

export const updateWebsiteTeamEntry = async ({
  id,
  year,
  roleTitle,
  visible,
} = {}) => {
  const { data } = await api.patch(`/admin/team/entries/${id}`, {
    year,
    roleTitle,
    visible,
  });
  return data; // { entry }
};

export const deleteWebsiteTeamEntry = async (id) => {
  const { data } = await api.delete(`/admin/team/entries/${id}`);
  return data; // { message }
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
export const fetchEmailTemplates = async () => {
  const { data } = await api.get("/admin/email/templates");
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

export const updateEmailTemplate = async ({ id, name, subject, html }) => {
  const { data } = await api.patch(`/admin/email/templates/${id}`, {
    name,
    subject,
    html,
  });
  return data; // { template }
};

export const sendTestEmailTemplate = async ({ id, to, data: templateData }) => {
  const { data } = await api.post(`/admin/email/templates/${id}/test`, {
    to,
    data: templateData,
  });
  return data; // { sent, reason }
};

export const sendBulkEmailTemplate = async ({
  id,
  sendTo,
  recipients,
  data: templateData,
}) => {
  const { data } = await api.post(`/admin/email/templates/${id}/bulk`, {
    sendTo,
    recipients,
    data: templateData,
  });
  return data; // { mode, total, sent, failed, failures[] }
};

// Events
export const fetchEvents = async (search = "") => {
  const { data } = await api.get("/admin/events", {
    params: { search: String(search ?? "").trim() },
  });
  return data; // { events }
};

export const createEvent = async ({
  clubId,
  title,
  description,
  location,
  startAt,
  endAt,
  coordinatorUserId,
  coordinatorUserIds,
}) => {
  const { data } = await api.post("/admin/events", {
    clubId,
    title,
    description,
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
  location,
  startAt,
  endAt,
  coordinatorUserId,
  coordinatorUserIds,
}) => {
  const { data } = await api.patch(`/admin/events/${id}`, {
    title,
    description,
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
export const fetchClubEvents = async ({ clubId, search = "" }) => {
  const { data } = await api.get(`/admin/clubs/${clubId}/events`, {
    params: { search: String(search ?? "").trim() },
  });
  return data; // { events }
};

export const createClubEvent = async ({
  clubId,
  title,
  description,
  location,
  startAt,
  endAt,
  coordinatorUserIds,
}) => {
  const { data } = await api.post(`/admin/clubs/${clubId}/events`, {
    title,
    description,
    location,
    startAt,
    endAt,
    coordinatorUserIds,
  });
  return data; // { event }
};

export const updateClubEvent = async ({
  clubId,
  eventId,
  title,
  description,
  location,
  startAt,
  endAt,
  coordinatorUserIds,
}) => {
  const { data } = await api.patch(`/admin/clubs/${clubId}/events/${eventId}`, {
    title,
    description,
    location,
    startAt,
    endAt,
    coordinatorUserIds,
  });
  return data; // { event }
};

export const deleteClubEvent = async ({ clubId, eventId }) => {
  const { data } = await api.delete(`/admin/clubs/${clubId}/events/${eventId}`);
  return data; // { message }
};
