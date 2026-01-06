import axios from "axios";

const api = axios.create({
  // This is your base backend URL
  baseURL: "https://api.iedclbscek.in",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
