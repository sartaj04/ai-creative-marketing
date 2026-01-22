import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('token');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authApi = {
    register: (data: { email: string; password: string; full_name?: string; segment?: string }) =>
        api.post('/auth/register', data),
    login: (data: { email: string; password: string }) =>
        api.post('/auth/login', data),
    me: () => api.get('/auth/me/'),
    refresh: () => api.post('/auth/refresh'),
};

// Users API
export const usersApi = {
    getProfile: () => api.get('/users/me/'),
    updateProfile: (data: { full_name?: string; segment?: string }) =>
        api.patch('/users/me', data),
    getUsage: () => api.get('/users/usage/'),
};

// Brands API
export const brandsApi = {
    list: () => api.get('/brands/'),
    create: (data: Record<string, unknown>) => api.post('/brands', data),
    get: (id: string) => api.get(`/brands/${id}`),
    update: (id: string, data: Record<string, unknown>) => api.patch(`/brands/${id}`, data),
    delete: (id: string) => api.delete(`/brands/${id}`),
};

// Generation API
export const generationApi = {
    generateCopy: (data: Record<string, unknown>) => api.post('/generation/copy', data),
    generateAsset: (data: Record<string, unknown>) => api.post('/generation/asset', data),
    generateBatch: (data: Record<string, unknown>) => api.post('/generation/batch', data),
    getJobStatus: (jobId: string) => api.get(`/generation/job/${jobId}`),
};

// Assets API
export const assetsApi = {
    list: (params?: { profile_id?: string; platform?: string; is_favorite?: boolean }) =>
        api.get('/assets/', { params }),
    get: (id: string) => api.get(`/assets/${id}`),
    toggleFavorite: (id: string) => api.patch(`/assets/${id}/favorite`),
    delete: (id: string) => api.delete(`/assets/${id}`),
    getDownloadUrl: (id: string) => api.get(`/assets/download/${id}`),
};

// Templates API
export const templatesApi = {
    list: (params?: { segment?: string; category?: string }) =>
        api.get('/templates/', { params }),
    get: (id: string) => api.get(`/templates/${id}`),
};

// Payments API
export const paymentsApi = {
    getPlans: () => api.get('/payments/plans'),
    createOrder: (plan: string) => api.post('/payments/create-order', { plan }),
    verifyPayment: (data: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
    }) => api.post('/payments/verify', data),
};

export default api;
