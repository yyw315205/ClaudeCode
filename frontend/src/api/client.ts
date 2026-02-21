import type {
  Company,
  Contact,
  Deal,
  Pipeline,
  PipelineStage,
  Property,
} from '../types';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Companies ────────────────────────────────────────────────────────────────
export const api = {
  companies: {
    list: () => request<Company[]>('/companies'),
    create: (data: Omit<Company, 'id'>) =>
      request<Company>('/companies', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Company>) =>
      request<Company>(`/companies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/companies/${id}`, { method: 'DELETE' }),
  },

  contacts: {
    list: () => request<Contact[]>('/contacts'),
    create: (data: Omit<Contact, 'id' | 'company'>) =>
      request<Contact>('/contacts', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Omit<Contact, 'id' | 'company'>>) =>
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
    create: (data: Omit<Deal, 'id' | 'contact' | 'company'>) =>
      request<Deal>('/deals', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Omit<Deal, 'id' | 'contact' | 'company'>>) =>
      request<Deal>(`/deals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/deals/${id}`, { method: 'DELETE' }),
  },
};
