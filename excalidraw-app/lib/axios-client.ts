import axios from "axios";
import { getAccessToken, signOut } from "./auth-client";

const axiosClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "",
  timeout: 10000,
});

// Request interceptor - add auth token
axiosClient.interceptors.request.use(
  async (config) => {
    const tokenData = await getAccessToken({ providerId: "google" });
    if (tokenData?.data?.accessToken) {
      config.headers.Authorization = `Bearer ${tokenData.data.accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor - handle errors
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error;

    if (response?.status === 401) {
      await signOut();
      window.location.href = "/";
      return Promise.reject(error);
    }

    if (response?.status === 403) {
      console.error("Access forbidden");
      return Promise.reject(error);
    }

    if (response?.status === 429) {
      console.error("Rate limited");
      return Promise.reject(error);
    }

    if (response?.status === 500) {
      console.error("Server error");
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);

export default axiosClient;
