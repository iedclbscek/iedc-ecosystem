import api from "./axios";

export const login = async ({ membershipId, password }) => {
  const { data } = await api.post("/admin/auth/login", {
    membershipId,
    password,
  });
  return data;
};

export const logout = async () => {
  const { data } = await api.post("/admin/auth/logout");
  return data;
};

export const me = async () => {
  const { data } = await api.get("/admin/auth/me");
  return data;
};

export const setPassword = async ({ userId, token, password }) => {
  const { data } = await api.post("/admin/auth/set-password", {
    userId,
    token,
    password,
  });
  return data;
};
