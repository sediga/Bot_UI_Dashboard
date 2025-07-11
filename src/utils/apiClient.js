import axios from "axios";
import config from "./config";

const apiClient = axios.create({
  baseURL: config.apiBaseUrl
});

apiClient.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export default apiClient;
