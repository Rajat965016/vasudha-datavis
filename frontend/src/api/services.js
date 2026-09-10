import apiClient from './client.js';

const unwrap = (response) => response.data?.data ?? {};

/* -------------------------------------------------------------------------- */
/* Authentication                                                             */
/* -------------------------------------------------------------------------- */

export const authApi = {
  login: (credentials) => apiClient.post('/auth/login', credentials).then(unwrap),
  me: () => apiClient.get('/auth/me').then(unwrap),
  changePassword: (payload) =>
    apiClient.post('/auth/change-password', payload).then((r) => r.data),
  forgotPassword: (payload) =>
    apiClient.post('/auth/forgot-password', payload).then((r) => r.data),
  resetPassword: (payload) =>
    apiClient.post('/auth/reset-password', payload).then((r) => r.data),
};

/* -------------------------------------------------------------------------- */
/* Admin account management (Super Admin only)                                */
/* -------------------------------------------------------------------------- */

export const adminApi = {
  list: (params) => apiClient.get('/admins', { params }).then(unwrap),
  create: (payload) => apiClient.post('/admins', payload).then((r) => r.data),
  update: (id, payload) => apiClient.patch(`/admins/${id}`, payload).then((r) => r.data),
  resetPassword: (id, payload) =>
    apiClient.post(`/admins/${id}/reset-password`, payload).then((r) => r.data),
  remove: (id) => apiClient.delete(`/admins/${id}`).then((r) => r.data),
};

/* -------------------------------------------------------------------------- */
/* Datasets                                                                   */
/* -------------------------------------------------------------------------- */

/** Builds the multipart payload used by both create and update. */
const toFormData = ({ file, ...fields }) => {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    form.append(key, value);
  });
  if (file) form.append('file', file);
  return form;
};

export const datasetApi = {
  list: (params) => apiClient.get('/datasets', { params }).then(unwrap),
  stats: () => apiClient.get('/datasets/stats').then(unwrap),
  schemas: () => apiClient.get('/datasets/schemas').then(unwrap),
  get: (id) => apiClient.get(`/datasets/${id}`).then(unwrap),
  create: (payload) => apiClient.post('/datasets', toFormData(payload)).then((r) => r.data),
  update: (id, payload) =>
    apiClient.put(`/datasets/${id}`, toFormData(payload)).then((r) => r.data),
  remove: (id) => apiClient.delete(`/datasets/${id}`).then((r) => r.data),
  approve: (id) => apiClient.patch(`/datasets/${id}/approve`).then((r) => r.data),
  reject: (id, reason) =>
    apiClient.patch(`/datasets/${id}/reject`, { reason }).then((r) => r.data),
};

/* -------------------------------------------------------------------------- */
/* Public portal (no authentication)                                          */
/* -------------------------------------------------------------------------- */

export const publicApi = {
  visualisations: (domainSlug) =>
    apiClient
      .get('/public/visualisations', { params: domainSlug ? { domain: domainSlug } : {} })
      .then(unwrap),
  visualisation: (id) => apiClient.get(`/public/visualisations/${id}`).then(unwrap),
  stats: () => apiClient.get('/public/stats').then(unwrap),
};
