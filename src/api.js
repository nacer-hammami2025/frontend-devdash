import axios from "axios";

// Use VITE_API_URL if provided, otherwise fallback to local dev
let API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// Log pour debug (supprime si inutile)
console.log("✅ API URL configurée:", API_URL);

const API = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ----------------------
// AUTH
// ----------------------
export const login = async (email, password) => {
  const response = await API.post("/auth/login", { email, password });
  return response.data;
};

export const register = async (data) => {
  const response = await API.post("/auth/register", data);
  return response.data;
};

export const logout = async () => {
  const response = await API.post("/auth/logout");
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await API.get("/auth/me");
  return response.data;
};

// ----------------------
// PROJECTS
// ----------------------
export const getProjects = async () => {
  const response = await API.get("/projects");
  return response.data;
};

export const createProject = async (data) => {
  const response = await API.post("/projects", data);
  return response.data;
};

export const updateProject = async (id, data) => {
  const response = await API.put(`/projects/${id}`, data);
  return response.data;
};

export const deleteProject = async (id) => {
  const response = await API.delete(`/projects/${id}`);
  return response.data;
};

// ----------------------
// TASKS
// ----------------------
export const getTasks = async (projectId) => {
  const response = await API.get(`/tasks?projectId=${projectId}`);
  return response.data;
};

export const createTask = async (data) => {
  const response = await API.post("/tasks", data);
  return response.data;
};

export const updateTask = async (id, data) => {
  const response = await API.put(`/tasks/${id}`, data);
  return response.data;
};

export const deleteTask = async (id) => {
  const response = await API.delete(`/tasks/${id}`);
  return response.data;
};

// ----------------------
// USERS
// ----------------------
export const getUsers = async () => {
  const response = await API.get("/users");
  return response.data;
};

export const updateUser = async (id, data) => {
  const response = await API.put(`/users/${id}`, data);
  return response.data;
};

export const deleteUser = async (id) => {
  const response = await API.delete(`/users/${id}`);
  return response.data;
};
