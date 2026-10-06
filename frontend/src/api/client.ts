import axios from "axios";

export const apiClient = axios.create({
  // In dev: VITE_API_URL = http://localhost:3000 (Gateway direct, no prefix)
  // In prod (built by Docker): VITE_API_URL = "" and baseURL becomes "/api",
  // which Nginx routes to the Gateway.
  baseURL: import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL : "/api",
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url;
    const isAuthRequest =
      requestUrl === "/auth/login" || requestUrl === "/auth/register";

    if (error.response?.status === 429) {
      window.location.href = "/too-many-requests";
    } else if (error.response?.status === 401 && !isAuthRequest) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);
