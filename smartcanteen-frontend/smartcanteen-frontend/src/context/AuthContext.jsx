import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { getMe, loginUser, logoutUser, registerUser, getNotifications, markAllRead, markOneRead } from '../services/api';
import { io } from 'socket.io-client';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user,          setUser]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const socketRef = useRef(null);

  // ── Fetch user's notifications ──
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await getNotifications();
      setNotifications(res.data.data.notifications || []);
      setUnreadCount(res.data.data.unreadCount || 0);
    } catch {}
  }, []);

  // ── Connect Socket.io with auto-reconnect ──
  const connectSocket = useCallback((currentUser) => {
    if (!currentUser) return;
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    // Disconnect existing socket
    if (socketRef.current) socketRef.current.disconnect();

    const socket = io(
      process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000',
      {
        auth: { token },
        transports: ['websocket'],
        reconnection:       true,
        reconnectionDelay:  1000,
        reconnectionAttempts: 10,
      }
    );

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
    });

    // Student: receive order status change notification
    socket.on('order:statusChanged', (data) => {
      setNotifications(prev => [{
        _id:       Date.now().toString(),
        message:   data.message || `Order status updated to ${data.status}`,
        isRead:    false,
        createdAt: new Date().toISOString(),
        meta:      { orderId: data.orderId, status: data.status },
      }, ...prev]);
      setUnreadCount(c => c + 1);
    });

    // Vendor: receive new order notification
    socket.on('order:new', (data) => {
      setNotifications(prev => [{
        _id:       Date.now().toString(),
        message:   `🛒 New order received for ${data.pickupTime} — LKR ${data.totalAmount}`,
        isRead:    false,
        createdAt: new Date().toISOString(),
        meta:      { orderId: data.orderId },
      }, ...prev]);
      setUnreadCount(c => c + 1);
    });

    // Vendor: approval status changed
    socket.on('vendor:statusChanged', (data) => {
      setNotifications(prev => [{
        _id:       Date.now().toString(),
        message:   data.message,
        isRead:    false,
        createdAt: new Date().toISOString(),
      }, ...prev]);
      setUnreadCount(c => c + 1);
      // Refresh user to get updated vendorStatus
      getMe().then(res => setUser(res.data.data.user)).catch(() => {});
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket connect error:', err.message);
    });

    socketRef.current = socket;
  }, []);

  // ── Check if already logged in on app start ──
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      getMe()
        .then((res) => {
          const u = res.data.data.user;
          setUser(u);
          connectSocket(u);
          fetchNotifications();
        })
        .catch(() => {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await loginUser({ email, password });
    const { accessToken, refreshToken, user } = res.data.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(user);
    connectSocket(user);
    // Fetch notifications after login
    setTimeout(fetchNotifications, 500);
    return user;
  };

  const register = async (data) => {
    const res = await registerUser(data);
    return res.data;
  };

  const logout = async () => {
    try { await logoutUser(); } catch {}
    if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    setNotifications([]);
    setUnreadCount(0);
  };

  // ── Notification actions ──
  const markNotifRead = async (id) => {
    try {
      await markOneRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch {}
  };

  const markAllNotifsRead = async () => {
    try {
      await markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  const isAdmin   = () => user?.role === 'admin';
  const isVendor  = () => user?.role === 'vendor';
  const isStudent = () => user?.role === 'student';

  return (
    <AuthContext.Provider value={{
      user, loading,
      login, register, logout,
      isAdmin, isVendor, isStudent,
      notifications, unreadCount,
      fetchNotifications, markNotifRead, markAllNotifsRead,
      socket: socketRef,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};