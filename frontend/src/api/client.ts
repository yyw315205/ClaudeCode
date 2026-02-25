import type {
  Company,
  Contact,
  Deal,
  Pipeline,
  PipelineStage,
  Property,
  User,
} from '../types';

const BASE = '/api';

export function getToken(): string | null {
  return localStorage.getItem('token');
}

export function setToken(token: string): void {
  localStorage.setItem('token', token);
}

export function clearToken(): void {
  localStorage.removeItem('token');
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}${path}`, {
    headers,
    ...options,
  });
  if (res.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  auth: {
    login: (username: string, password: string) =>
      request<{ access_token: string; token_type: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
    me: () => request<User>('/auth/me'),
  },

  users: {
    list: () => request<User[]>('/users'),
    create: (data: { username: string; password: string; role: string }) =>
      request<User>('/users', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { password?: string; role?: string; is_active?: boolean }) =>
      request<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/users/${id}`, { method: 'DELETE' }),
  },

  companies: {
    list: () => request<Company[]>('/companies'),
    create: (data: Omit<Company, 'id' | 'created_by'>) =>
      request<Company>('/companies', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Company>) =>
      request<Company>(`/companies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/companies/${id}`, { method: 'DELETE' }),
  },

  contacts: {
    list: () => request<Contact[]>('/contacts'),
    create: (data: Omit<Contact, 'id' | 'company' | 'created_by'>) =>
      request<Contact>('/contacts', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Omit<Contact, 'id' | 'company' | 'created_by'>>) =>
      request<Contact>(`/contacts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/contacts/${id}`, { method: 'DELETE' }),
  },

  properties: {
    list: (entity_type?: string) =>
      request<Property[]>(`/properties${entity_type ? `?entity_type=${entity_type}` : ''}`),
    create: (data: Omit<Property, 'id'>) =>
      request<Property>('/properties', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Property>) =>
      request<Property>(`/properties/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/properties/${id}`, { method: 'DELETE' }),
  },

  pipelines: {
    list: () => request<Pipeline[]>('/pipelines'),
    get: (id: string) => request<Pipeline>(`/pipelines/${id}`),
    create: (data: { name: string; stages?: { name: string; color?: string }[] }) =>
      request<Pipeline>('/pipelines', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Pipeline>) =>
      request<Pipeline>(`/pipelines/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/pipelines/${id}`, { method: 'DELETE' }),
  },

  stages: {
    create: (pipeline_id: string, data: { name: string; color?: string }) =>
      request<PipelineStage>(`/pipelines/${pipeline_id}/stages`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<PipelineStage>) =>
      request<PipelineStage>(`/stages/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/stages/${id}`, { method: 'DELETE' }),
    reorder: (orders: { id: string; order: number }[]) =>
      request<void>('/stages/reorder', { method: 'POST', body: JSON.stringify(orders) }),
  },

  deals: {
    list: (pipeline_id?: string) =>
      request<Deal[]>(`/deals${pipeline_id ? `?pipeline_id=${pipeline_id}` : ''}`),
    create: (data: Omit<Deal, 'id' | 'contact' | 'company' | 'created_by'>) =>
      request<Deal>('/deals', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Omit<Deal, 'id' | 'contact' | 'company' | 'created_by'>>) =>
      request<Deal>(`/deals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/deals/${id}`, { method: 'DELETE' }),
  },
};
