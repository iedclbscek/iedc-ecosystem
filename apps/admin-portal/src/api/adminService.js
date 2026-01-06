// src/api/adminService.js
import api from "./axios";

// Fetch with Pagination and Search
export const fetchRegistrations = async (page = 1, search = "") => {
  const { data } = await api.get("/admin/registrations", {
    params: {
      page,
      limit: 10,
      search: search,
    },
  });
  return data;
};

// The missing export causing your error
export const deleteStudent = async (id) => {
  const { data } = await api.delete(`/admin/registrations/${id}`);
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

export const searchStudents = async (query) => {
  const { data } = await api.get("/admin/users/search", {
    params: { query },
  });
  return data; // { students }
};

export const promoteUser = async ({
  registrationId,
  role,
  customRole,
  permissions,
}) => {
  const { data } = await api.post("/admin/users/promote", {
    registrationId,
    role,
    customRole,
    permissions,
  });
  return data; // { user }
};

export const updateUser = async ({ id, role, customRole, permissions }) => {
  const { data } = await api.patch(`/admin/users/${id}`, {
    role,
    customRole,
    permissions,
  });
  return data; // { user }
};

export const deleteUser = async (id) => {
  const { data } = await api.delete(`/admin/users/${id}`);
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
