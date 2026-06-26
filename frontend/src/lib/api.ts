import axios from 'axios';
import type {
  Contact,
  ContactDetail,
  ContactFormData,
  Deal,
  DealFormData,
  DealStats,
  Interaction,
  InteractionWithMeta,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Contacts
export const fetchContacts = (search?: string) =>
  api.get<Contact[]>('/contacts', { params: search ? { search } : {} }).then(r => r.data);

export const fetchContact = (id: number) =>
  api.get<ContactDetail>(`/contacts/${id}`).then(r => r.data);

export const createContact = (data: Partial<ContactFormData>) =>
  api.post<Contact>('/contacts', {
    ...data,
    tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
  }).then(r => r.data);

export const updateContact = (id: number, data: Partial<ContactFormData>) =>
  api.put<Contact>(`/contacts/${id}`, {
    ...data,
    tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
  }).then(r => r.data);

export const deleteContact = (id: number) =>
  api.delete(`/contacts/${id}`).then(r => r.data);

// Deals
export const fetchDeals = (contactId?: number) =>
  api.get<Deal[]>('/deals', { params: contactId ? { contact_id: contactId } : {} }).then(r => r.data);

export const fetchDealStats = () =>
  api.get<DealStats>('/deals/stats').then(r => r.data);

export const createDeal = (data: Partial<DealFormData>) =>
  api.post<Deal>('/deals', {
    ...data,
    contact_id: data.contact_id ? parseInt(data.contact_id) : null,
    value: data.value ? parseFloat(data.value) : null,
  }).then(r => r.data);

export const updateDeal = (id: number, data: Partial<DealFormData>) =>
  api.put<Deal>(`/deals/${id}`, {
    ...data,
    contact_id: data.contact_id ? parseInt(data.contact_id) : null,
    value: data.value ? parseFloat(data.value) : null,
  }).then(r => r.data);

export const moveDealStage = (id: number, stage: string, position: number) =>
  api.patch<Deal>(`/deals/${id}/stage`, { stage, position }).then(r => r.data);

export const deleteDeal = (id: number) =>
  api.delete(`/deals/${id}`).then(r => r.data);

// Interactions
export const fetchInteractions = (contactId?: number, limit = 50) =>
  api.get<InteractionWithMeta[]>('/interactions', {
    params: { ...(contactId ? { contact_id: contactId } : {}), limit },
  }).then(r => r.data);

export const createInteraction = (data: {
  contact_id: number;
  deal_id?: number | null;
  type: string;
  summary: string;
  occurred_at?: string;
}) => api.post<Interaction>('/interactions', data).then(r => r.data);

export const deleteInteraction = (id: number) =>
  api.delete(`/interactions/${id}`).then(r => r.data);
