import axios from 'axios';
import { storage } from '@/lib/storage';

// Change this to your machine's LAN IP when testing on a physical device,
// e.g. 'http://192.168.1.100:3000'
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

// Attach JWT on every request
api.interceptors.request.use(async (config) => {
  const token = await storage.getItem('jwt');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// AuthContext registers a handler so a rejected token (expired, invalid) signs the user out
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

api.interceptors.response.use(undefined, (error) => {
  if (error?.response?.status === 401 && !error.config?.url?.startsWith('/auth/')) {
    onUnauthorized?.();
  }
  return Promise.reject(error);
});
