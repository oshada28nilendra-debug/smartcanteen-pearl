import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
});

// Automatically add token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes('/auth/refresh')
    ) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');
        const res = await axios.post(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/auth/refresh`,
          { refreshToken }
        );
        const { accessToken, refreshToken: newRefreshToken } = res.data.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return API(original);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ──
export const registerUser = (data)           => API.post('/auth/register', data);
export const loginUser    = (data)           => API.post('/auth/login', data);
export const logoutUser   = ()              => API.post('/auth/logout');
export const getMe        = ()              => API.get('/auth/me');

// ── Menu ──
export const getMenuByVendor    = (vendorId)       => API.get(`/menu/${vendorId}`);
export const createMenuItem     = (data)           => API.post('/menu', data);
export const updateMenuItem     = (id, data)       => API.put(`/menu/${id}`, data);
export const deleteMenuItem     = (id)             => API.delete(`/menu/${id}`);
export const toggleAvailability = (id)             => API.patch(`/menu/${id}/availability`);

// ── Orders ──
export const getAvailableSlots = (vendorId, date) => API.get(`/orders/slots/${vendorId}?date=${date}`);
export const createOrderIntent = (data)           => API.post('/orders/intent', data);
export const getMyOrders       = ()               => API.get('/orders/my');
export const getOrderById      = (id)             => API.get(`/orders/${id}`);
export const getVendorOrders   = (params)         => API.get('/orders/vendor/all', { params });
export const updateOrderStatus = (id, status)     => API.patch(`/orders/${id}/status`, { status });

// ── Payment ──
export const initiatePayment  = (orderId)  => API.post('/payment/initiate', { orderId });
export const getPaymentStatus = (orderId)  => API.get(`/payment/status/${orderId}`);

// ── Notifications ──
export const getNotifications = ()    => API.get('/notifications');
export const markAllRead      = ()    => API.patch('/notifications/read-all');
export const markOneRead      = (id)  => API.patch(`/notifications/${id}/read`);

// ── Admin ──
// params: { role, accountStatus, vendorStatus, page, limit }
export const getUsers           = (params)           => API.get('/admin/users', { params });
export const deactivateUser     = (id)               => API.patch(`/admin/users/${id}/deactivate`);
export const activateUser       = (id)               => API.patch(`/admin/users/${id}/activate`);
export const updateVendorStatus = (id, status)       => API.patch(`/admin/vendors/${id}/status`, { status });

// ── Vendor ──
export const getVendorProfile    = ()      => API.get('/vendor/profile');
export const updateVendorProfile = (data)  => API.patch('/vendor/profile', data);

export default API;