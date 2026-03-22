import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Landing
import LandingPage from './pages/LandingPage';

// Auth
import Login    from './pages/auth/Login';
import Register from './pages/auth/Register';

// Student
import HomePage       from './pages/student/HomePage';
import VendorMenuPage from './pages/student/VendorMenuPage';
import CheckoutPage   from './pages/student/CheckoutPage';
import {
  OrderSuccessPage,
  OrderTrackingPage,
  MyOrdersPage,
  OrderReceiptPage,
  NotificationsPage,
} from './pages/student/OrderPages';

// Vendor
import VendorDashboard      from './pages/vendor/VendorDashboard';
import VendorMenuManagement from './pages/vendor/VendorMenuManagement';
import VendorReports        from './pages/vendor/VendorReports';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProfile   from './pages/admin/AdminProfile';


const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" />;
  return children;
};

const PaymentSuccessPage = () => (
  <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f0fdf4',fontFamily:'DM Sans,sans-serif'}}>
    <div style={{background:'white',borderRadius:24,padding:40,textAlign:'center',boxShadow:'0 8px 32px rgba(0,0,0,0.1)',maxWidth:400}}>
      <div style={{fontSize:56,marginBottom:16}}>✅</div>
      <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:800,marginBottom:8}}>Payment Received!</h2>
      <p style={{color:'#6b7280',marginBottom:24}}>Confirming your order, please wait...</p>
      <a href="/student/orders" style={{background:'#22c55e',color:'white',padding:'12px 28px',borderRadius:12,textDecoration:'none',fontWeight:700}}>View Orders</a>
    </div>
  </div>
);

const PaymentCancelPage = () => (
  <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f9fafb',fontFamily:'DM Sans,sans-serif'}}>
    <div style={{background:'white',borderRadius:24,padding:40,textAlign:'center',boxShadow:'0 8px 32px rgba(0,0,0,0.1)',maxWidth:400}}>
      <div style={{fontSize:56,marginBottom:16}}>🚫</div>
      <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:800,marginBottom:8}}>Payment Cancelled</h2>
      <p style={{color:'#6b7280',marginBottom:24}}>Your cart is still saved. You can try again.</p>
      <a href="/student/checkout" style={{background:'#22c55e',color:'white',padding:'12px 28px',borderRadius:12,textDecoration:'none',fontWeight:700}}>Try Again</a>
    </div>
  </div>
);

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      {/* Landing — public */}
      <Route path="/" element={
        !user                 ? <LandingPage />                      :
        user.role==='vendor'  ? <Navigate to="/vendor/dashboard"/>   :
        user.role==='admin'   ? <Navigate to="/admin/dashboard"/>    :
        user.role==='student' ? <Navigate to="/student/home"/>       :
                                <LandingPage />
      }/>

      {/* Auth */}
      <Route path="/login"    element={!user ? <Login />    : <Navigate to="/" />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />

      {/* Student */}
      <Route path="/student/home"
        element={<ProtectedRoute allowedRoles={['student']}><HomePage/></ProtectedRoute>}/>
      <Route path="/student/menu/:vendorId"
        element={<ProtectedRoute allowedRoles={['student']}><VendorMenuPage/></ProtectedRoute>}/>
      <Route path="/student/checkout"
        element={<ProtectedRoute allowedRoles={['student']}><CheckoutPage/></ProtectedRoute>}/>
      <Route path="/student/order-success/:id"
        element={<ProtectedRoute allowedRoles={['student']}><OrderSuccessPage/></ProtectedRoute>}/>
      <Route path="/student/track/:id"
        element={<ProtectedRoute allowedRoles={['student']}><OrderTrackingPage/></ProtectedRoute>}/>
      <Route path="/student/orders"
        element={<ProtectedRoute allowedRoles={['student']}><MyOrdersPage/></ProtectedRoute>}/>
      <Route path="/student/receipt/:id"
        element={<ProtectedRoute allowedRoles={['student']}><OrderReceiptPage/></ProtectedRoute>}/>
      <Route path="/student/notifications"
        element={<ProtectedRoute allowedRoles={['student']}><NotificationsPage/></ProtectedRoute>}/>

      {/* PayHere */}
      <Route path="/payment/success" element={<PaymentSuccessPage/>}/>
      <Route path="/payment/cancel"  element={<PaymentCancelPage/>}/>

      {/* Vendor */}
      <Route path="/vendor/dashboard"
        element={<ProtectedRoute allowedRoles={['vendor']}><VendorDashboard/></ProtectedRoute>}/>
      <Route path="/vendor/menu"
        element={<ProtectedRoute allowedRoles={['vendor']}><VendorMenuManagement/></ProtectedRoute>}/>
      <Route path="/vendor/reports"
        element={<ProtectedRoute allowedRoles={['vendor']}><VendorReports/></ProtectedRoute>}/>

      {/* Admin */}
      <Route path="/admin/dashboard"
        element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard/></ProtectedRoute>}/>
      <Route path="/admin/profile"
        element={<ProtectedRoute allowedRoles={['admin']}><AdminProfile/></ProtectedRoute>}/>

      <Route path="*" element={<Navigate to="/"/>}/>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes/>
      </AuthProvider>
    </BrowserRouter>
  );
}