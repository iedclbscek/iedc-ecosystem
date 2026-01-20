import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Create axios instance with default config
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Upload images to Cloudinary via server
 * @param {FormData} formData - FormData containing the images
 * @returns {Promise<Object>} - Response with image URLs
 */
export const uploadImages = async (formData) => {
  try {
    // Use axios directly with full URL to avoid base URL conflicts
    const response = await axios.post(
      `${API_BASE_URL}/api/upload/images`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.message || "Image upload failed");
    } else if (error.request) {
      throw new Error("No response from server. Please check your connection.");
    } else {
      throw new Error("Image upload failed. Please try again.");
    }
  }
};

/**
 * Send email OTP for membership registration
 * @param {string} email
 */
export const sendRegistrationOtp = async (email) => {
  try {
    const response = await api.post("/public/send-otp", {
      email,
      purpose: "registration",
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      const e = new Error(error.response.data.message || "Failed to send OTP");
      e.status = error.response.status;
      e.data = error.response.data;
      throw e;
    } else if (error.request) {
      throw new Error("No response from server. Please check your connection.");
    }
    throw new Error("Failed to send OTP. Please try again.");
  }
};

/**
 * Verify email OTP and receive a short-lived otpToken
 * @param {{email: string, otp: string}} payload
 */
export const verifyRegistrationOtp = async ({ email, otp }) => {
  try {
    const response = await api.post("/public/verify-otp", { email, otp });
    return response.data;
  } catch (error) {
    if (error.response) {
      const e = new Error(
        error.response.data.message || "Failed to verify OTP",
      );
      e.status = error.response.status;
      e.data = error.response.data;
      throw e;
    } else if (error.request) {
      throw new Error("No response from server. Please check your connection.");
    }
    throw new Error("Failed to verify OTP. Please try again.");
  }
};

/**
 * Submit a new IEDC member registration
 * @param {Object} registrationData - The registration data to submit
 * @returns {Promise<Object>} - Response from the server
 */
export const submitRegistration = async (registrationData) => {
  try {
    const response = await api.post("/registrations", registrationData);
    return response.data;
  } catch (error) {
    if (error.response) {
      // Server responded with error status
      const e = new Error(error.response.data.message || "Registration failed");
      e.status = error.response.status;
      e.data = error.response.data;
      throw e;
    } else if (error.request) {
      // Request was made but no response received
      throw new Error("No response from server. Please check your connection.");
    } else {
      // Something else happened
      throw new Error("Registration failed. Please try again.");
    }
  }
};
