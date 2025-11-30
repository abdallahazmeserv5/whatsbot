import axios from "axios";

const API_BASE_URL = "http://localhost:3000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Bulk Messaging API
export const bulkMessageAPI = {
  sendBulk: async (data: {
    sessionId: string;
    numbers: string[];
    message: string;
  }) => {
    const response = await api.post("/whatsapp/bulk-send", data);
    return response.data;
  },
};

// Broadcast API
export const broadcastAPI = {
  create: async (data: {
    sessionId: string;
    name: string;
    numbers: string[];
  }) => {
    const response = await api.post("/whatsapp/broadcast/create", data);
    return response.data;
  },

  getAll: async () => {
    const response = await api.get("/whatsapp/broadcast");
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/whatsapp/broadcast/${id}`);
    return response.data;
  },

  send: async (id: string, message: string) => {
    const response = await api.post(`/whatsapp/broadcast/${id}/send`, {
      message,
    });
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/whatsapp/broadcast/${id}`);
    return response.data;
  },
};

// Sessions API
export const sessionsAPI = {
  getAll: async () => {
    const response = await api.get("/sessions");
    return response.data;
  },
};

export default api;
