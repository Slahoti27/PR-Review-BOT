import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  withCredentials: true, // send httpOnly cookie
});

// Auth
export const getMe = () => api.get('/api/auth/me');
export const logout = () => api.post('/api/auth/logout');

// Reviews
export const createReview = (prUrl) => api.post('/api/reviews', { prUrl });
export const getReviews = () => api.get('/api/reviews');
export const getReview = (id) => api.get(`/api/reviews/${id}`);
export const getSharedReview = (token) => api.get(`/api/reviews/share/${token}`);
export const postToGithub = (id) => api.post(`/api/reviews/${id}/post-to-github`);

export default api;
