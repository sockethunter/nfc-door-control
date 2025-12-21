/*
 * Copyright (c) 2025 sockethunter
 *
 * This file is part of nfc-door-control 
 * (see https://github.com/sockethunter/nfc-door-control).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */
import axios from 'axios';
import { AuthResponse, User, Door, NfcTag, AccessHistoryResponse, AccessStats } from '../types';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect on 401 if it's NOT a login attempt
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (username: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },

  getProfile: async (): Promise<User> => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  register: async (username: string, password: string, role = 'admin'): Promise<User> => {
    const response = await api.post('/auth/register', { username, password, role });
    return response.data;
  },
};

export const doorsApi = {
  getAll: async (): Promise<Door[]> => {
    const response = await api.get('/doors');
    return response.data;
  },

  getById: async (id: number): Promise<Door> => {
    const response = await api.get(`/doors/${id}`);
    return response.data;
  },

  create: async (data: { name: string; location?: string; clientId: string }): Promise<Door> => {
    const response = await api.post('/doors', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Door>): Promise<Door> => {
    const response = await api.patch(`/doors/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/doors/${id}`);
  },
};

export const tagsApi = {
  getAll: async (): Promise<NfcTag[]> => {
    const response = await api.get('/tags');
    return response.data;
  },

  getById: async (id: number): Promise<NfcTag> => {
    const response = await api.get(`/tags/${id}`);
    return response.data;
  },

  create: async (data: { tagId: string; name?: string; ownerName?: string }): Promise<NfcTag> => {
    const response = await api.post('/tags', data);
    return response.data;
  },

  update: async (id: number, data: Partial<NfcTag>): Promise<NfcTag> => {
    const response = await api.patch(`/tags/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/tags/${id}`);
  },

  assignToDoor: async (tagId: number, doorId: number): Promise<void> => {
    await api.post(`/tags/${tagId}/doors/${doorId}`);
  },

  removeFromDoor: async (tagId: number, doorId: number): Promise<void> => {
    await api.delete(`/tags/${tagId}/doors/${doorId}`);
  },
};

export const accessHistoryApi = {
  getAll: async (page = 1, limit = 50): Promise<AccessHistoryResponse> => {
    const response = await api.get(`/access-history?page=${page}&limit=${limit}`);
    return response.data;
  },

  getStats: async (): Promise<AccessStats> => {
    const response = await api.get('/access-history/stats');
    return response.data;
  },

  getByDoor: async (doorId: number, page = 1, limit = 50): Promise<AccessHistoryResponse> => {
    const response = await api.get(`/access-history/door/${doorId}?page=${page}&limit=${limit}`);
    return response.data;
  },

  getByTag: async (tagId: string, page = 1, limit = 50): Promise<AccessHistoryResponse> => {
    const response = await api.get(`/access-history/tag/${tagId}?page=${page}&limit=${limit}`);
    return response.data;
  },
};

export const alarmApi = {
  getAll: async (unresolved?: boolean): Promise<any[]> => {
    const url = unresolved ? '/alarm/tamper?unresolved=true' : '/alarm/tamper';
    const response = await api.get(url);
    return response.data;
  },

  getStats: async (): Promise<{ total: number; unresolved: number; resolved: number }> => {
    const response = await api.get('/alarm/tamper/statistics');
    return response.data;
  },

  getById: async (id: number): Promise<any> => {
    const response = await api.get(`/alarm/tamper/${id}`);
    return response.data;
  },

  getByClientId: async (clientId: string): Promise<any[]> => {
    const response = await api.get(`/alarm/tamper/client/${clientId}`);
    return response.data;
  },

  update: async (id: number, data: { resolved?: boolean; notes?: string }): Promise<any> => {
    const response = await api.patch(`/alarm/tamper/${id}`, data);
    return response.data;
  },

  markAsResolved: async (id: number, notes?: string): Promise<any> => {
    const response = await api.patch(`/alarm/tamper/${id}/resolve`, { notes });
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/alarm/tamper/${id}`);
  },
};

export default api;