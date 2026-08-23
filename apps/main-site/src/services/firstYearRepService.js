import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "";
const BASE = `${API_URL}/api/first-year-representatives`;

export const requestVerification = async (membershipId, email) => {
  const res = await axios.post(`${BASE}/request-verification`, { membershipId, email });
  return res.data;
};

export const verifyOtp = async (membershipId, email, otp) => {
  const res = await axios.post(`${BASE}/verify-otp`, { membershipId, email, otp });
  return res.data;
};

export const getProfile = async (token) => {
  const res = await axios.get(`${BASE}/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const submitApplication = async (token, profile, answers) => {
  const res = await axios.post(
    `${BASE}/apply`,
    { profile, answers },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
};
