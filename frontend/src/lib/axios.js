import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: import.meta.env.MODE === "development" ? "http://localhost:5001/api" : "http://8.148.28.160:5001/api",
  withCredentials: true,
});
