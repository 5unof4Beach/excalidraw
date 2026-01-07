import axios from "axios";

import { getAccessToken, logOut } from "./auth-client";

const axiosClient = axios.create({
  timeout: 30000,
});

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

// Function to subscribe to token refresh
const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

// Function to notify subscribers with new token
const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

// Helper to get token from localStorage or fetch if not present
const getStoredToken = async (): Promise<string | undefined> => {
  let token = localStorage.getItem("accessToken") || undefined;
  if (!token) {
    const tokenData = await getAccessToken({ providerId: "google" });
    token = tokenData?.data?.accessToken;
    if (token) {
      localStorage.setItem("accessToken", token);
    }
  }
  return token;
};

// Request interceptor - add auth token
axiosClient.interceptors.request.use(
  async (config) => {
    const token = await getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
      const originalRequest = config;

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const tokenData = await getAccessToken({ providerId: "google" });
          const newToken = tokenData?.data?.accessToken;
          if (newToken) {
            localStorage.setItem("accessToken", newToken);
            onRefreshed(newToken);
            isRefreshing = false;
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return axiosClient(originalRequest);
          }
        } catch (refreshError) {
          isRefreshing = false;
          refreshSubscribers = []; // Clear any pending subscribers
          await logOut();
          window.location.href = "/";
          return Promise.reject(refreshError);
        }
      }

      // If refreshing is in progress, wait for it to complete
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((token: string) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(axiosClient(originalRequest));
        });
      });
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
