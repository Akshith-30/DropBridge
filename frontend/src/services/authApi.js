import api from './api';

export const register = (payload) => api.post('/auth/register', payload);

export const login = (payload) => api.post('/auth/login', payload);

export const fetchMe = () => api.get('/auth/me');
