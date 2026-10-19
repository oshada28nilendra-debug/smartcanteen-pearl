import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Landing
import LandingPage from './pages/LandingPage';

// Auth
import Login    from './pages/auth/Login';
import Register from './pages/auth/Register';

// Student
import Shell from './pearl/Shell';
import Catalog from './pearl/Catalog';
import Orders from './pearl/Orders';
import NewCheckout from './pearl/Checkout';
import {Profile,Notifications} from './pearl/Account';
import VendorOperations from './pearl/VendorOperations';
// Vendor
import {VendorDashboard,VendorMenu,VendorReports,VendorProfile} from './pearl/VendorPages';

// Admin


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
      <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:800,marginBottom:8}}>Payment submitted</h2>
      <p style={{color:'#6b7280',marginBottom:24}}>Your bank redirect does not confirm payment. Check your order for the verified payment status.</p>
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
      <Route path="/" element={<LandingPage />}/>

      {/* Auth */}
      <Route path="/login"    element={!user ? <Login />    : <Navigate to={user.role === 'vendor' ? '/vendor/dashboard' : user.role === 'student' ? '/student/home' : '/'} />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to={user.role === 'vendor' ? '/vendor/dashboard' : user.role === 'student' ? '/student/home' : '/'} />} />

      <Route element={<ProtectedRoute allowedRoles={['student']}><Shell/></ProtectedRoute>}>
        <Route path="/student/home" element={<Catalog/>}/>
        <Route path="/student/browse" element={<Catalog/>}/>
        <Route path="/student/favourites" element={<Catalog/>}/>
        <Route path="/student/menu/:vendorId" element={<Catalog/>}/>
        <Route path="/student/checkout" element={<NewCheckout/>}/>
        <Route path="/student/orders" element={<Orders/>}/>
        <Route path="/student/track/:id" element={<Orders/>}/>
        <Route path="/student/order-success/:id" element={<Orders/>}/>
        <Route path="/student/receipt/:id" element={<Orders/>}/>
        <Route path="/student/payments" element={<Orders/>}/>
        <Route path="/student/notifications" element={<Notifications/>}/>
        <Route path="/student/profile" element={<Profile/>}/>
      </Route>
      {/* PayHere */}
      <Route path="/payment/success" element={<PaymentSuccessPage/>}/>
      <Route path="/payment/cancel"  element={<PaymentCancelPage/>}/>

      <Route element={<ProtectedRoute allowedRoles={['vendor']}><Shell/></ProtectedRoute>}>
        <Route path="/vendor/dashboard" element={<VendorDashboard/>}/>
        <Route path="/vendor/menu" element={<VendorMenu/>}/>
        <Route path="/vendor/reports" element={<VendorReports/>}/>
        <Route path="/vendor/operations" element={<VendorOperations/>}/>
        <Route path="/vendor/profile" element={<VendorProfile/>}/>
        <Route path="/vendor/notifications" element={<Notifications/>}/>
      </Route>

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