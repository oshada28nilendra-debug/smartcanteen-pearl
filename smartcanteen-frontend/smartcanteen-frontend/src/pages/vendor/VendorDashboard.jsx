import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getVendorOrders, updateOrderStatus, getNotifications, markAllRead, updateVendorProfile, getVendorProfile } from '../../services/api';
import { io } from 'socket.io-client';

const statusColors = {
  'Confirmed':        'bg-blue-100 text-blue-700 border-blue-200',
  'Preparing':        'bg-amber-100 text-amber-700 border-amber-200',
  'Ready for Pickup': 'bg-green-100 text-green-700 border-green-200',
  'Completed':        'bg-gray-100 text-gray-500 border-gray-200',
  'Cancelled':        'bg-red-100 text-red-600 border-red-200',
};
const statusNext  = { 'Confirmed':'Preparing', 'Preparing':'Ready for Pickup', 'Ready for Pickup':'Completed' };
const statusIcons = { 'Confirmed':'📋', 'Preparing':'👨‍🍳', 'Ready for Pickup':'🔔', 'Completed':'✅', 'Cancelled':'❌' };

export default function VendorDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [orders,        setOrders]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [filter,        setFilter]        = useState('All');
  const [updating,      setUpdating]      = useState(null);
  const [toast,         setToast]         = useState('');
  const [showProfile,   setShowProfile]   = useState(false);
  const [showNotifs,    setShowNotifs]    = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileLoading,setProfileLoading]= useState(false);

  // Profile state — loaded from DB on mount
  const [profile, setProfile] = useState({
    businessName:  '',
    email:         user?.email || '',
    phone:         '',
    description:   '',
    avatar:        null,
    bankName:      '',
    bankBranch:    '',
    accountNumber: '',
    accountName:   '',
  });

  const avatarRef = useRef();
  const socketRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(''),3000); };

  // ── Load real vendor profile from DB on mount ──
  useEffect(() => {
    const loadProfile = async () => {
      setProfileLoading(true);
      try {
        const res = await getVendorProfile();
        const u = res.data.data.user;
        setProfile(p => ({
          ...p,
          businessName:  u.vendorProfile?.businessName  || u.name || '',
          email:         u.email || '',
          phone:         u.vendorProfile?.contactPhone  || '',
          description:   u.vendorProfile?.description   || '',
          bankName:      u.vendorProfile?.paymentDetails?.bankName      || '',
          bankBranch:    u.vendorProfile?.paymentDetails?.bankBranch    || '',
          accountNumber: u.vendorProfile?.paymentDetails?.accountNumber || '',
          accountName:   u.vendorProfile?.paymentDetails?.accountName   || '',
        }));
      } catch (err) {
        console.error('Failed to load vendor profile:', err);
        // Fallback to user object from auth
        setProfile(p => ({
          ...p,
          businessName: user?.vendorProfile?.businessName || user?.name || '',
          email:        user?.email || '',
          phone:        user?.vendorProfile?.contactPhone || '',
          description:  user?.vendorProfile?.description  || '',
        }));
      } finally {
        setProfileLoading(false);
      }
    };
    loadProfile();
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await getVendorOrders();
      setOrders(res.data.data.orders || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await getNotifications();
      setNotifications(res.data.data.notifications || []);
    } catch {}
  }, []);

  useEffect(() => { fetchOrders(); fetchNotifications(); }, []);
  useEffect(() => { const t = setInterval(fetchOrders, 30000); return () => clearInterval(t); }, [fetchOrders]);

  // Socket.io
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    const socket = io(
      process.env.REACT_APP_API_URL?.replace('/api','') || 'http://localhost:5000',
      { auth:{token}, transports:['websocket'], reconnection:true, reconnectionDelay:1000 }
    );
    socketRef.current = socket;
    socket.on('order:new', () => { fetchOrders(); fetchNotifications(); showToast('🛒 New order received!'); });
    socket.on('connect_error', err => console.warn('Socket:', err.message));
    return () => socket.disconnect();
  }, [fetchOrders]);

  const handleUpdateStatus = async (orderId, newStatus) => {
    setUpdating(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
      setOrders(prev => prev.map(o => (o._id||o.id)===orderId ? {...o,status:newStatus} : o));
      showToast(`✓ Order marked as "${newStatus}"`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update.', 'error');
    } finally { setUpdating(null); }
  };

  const handleMarkAllRead = async () => {
    try { await markAllRead(); setNotifications(prev=>prev.map(n=>({...n,isRead:true}))); } catch {}
  };

  // ── Save profile to DB — saves ALL fields including businessName ──
  const saveProfile = async () => {
    if (!profile.businessName.trim()) { showToast('Business name is required.', 'error'); return; }
    setProfileSaving(true);
    try {
      await updateVendorProfile({
        businessName:  profile.businessName.trim(),
        description:   profile.description.trim(),
        contactPhone:  profile.phone.trim(),
        bankName:      profile.bankName,
        bankBranch:    profile.bankBranch,
        accountNumber: profile.accountNumber,
        accountName:   profile.accountName,
      });
      showToast('✓ Profile saved — visible to students!');
      setShowProfile(false);
    } catch (err) {
      showToast(err.response?.data?.message || 'Save failed.', 'error');
    } finally { setProfileSaving(false); }
  };

  const handleAvatarChange = e => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = ev => setProfile(p=>({...p,avatar:ev.target.result}));
    r.readAsDataURL(file);
  };

  const initials = (name='') => name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);

  const filteredOrders = filter==='All' ? orders : orders.filter(o=>o.status===filter);
  const counts = {
    All: orders.length,
    Confirmed: orders.filter(o=>o.status==='Confirmed').length,
    Preparing: orders.filter(o=>o.status==='Preparing').length,
    'Ready for Pickup': orders.filter(o=>o.status==='Ready for Pickup').length,
    Completed: orders.filter(o=>o.status==='Completed').length,
  };
  const todayRevenue = orders.filter(o=>o.status==='Completed').reduce((s,o)=>s+(o.totalAmount||0),0);

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif"}} className="min-h-screen bg-gray-50">
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>

      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-2xl shadow-2xl text-sm font-medium text-white ${toast.type==='error'?'bg-red-500':'bg-green-500'}`}>
          {toast.msg}
        </div>
      )}

      {/* NAVBAR */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center"><span>🦪</span></div>
            <span style={{fontFamily:"'Syne',sans-serif"}} className="text-lg font-black text-gray-900">PEARL<span className="text-green-500">.</span></span>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-lg font-semibold">Vendor</span>
          </div>
          <div className="flex items-center gap-1">
            {[{label:'Orders',icon:'📋',path:null},{label:'Menu',icon:'🍽️',path:'/vendor/menu'},{label:'Reports',icon:'📊',path:'/vendor/reports'}].map(tab=>(
              <button key={tab.label} onClick={()=>tab.path?navigate(tab.path):null}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${!tab.path?'bg-green-500 text-white':'text-gray-600 hover:bg-gray-100'}`}>
                <span>{tab.icon}</span><span className="hidden md:block">{tab.label}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative">
              <button onClick={()=>{setShowNotifs(!showNotifs);setShowProfile(false);}}
                className="relative w-9 h-9 flex items-center justify-center bg-gray-100 hover:bg-green-50 rounded-xl transition-all">
                <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {unreadCount>0&&<span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">{unreadCount}</span>}
              </button>
              {showNotifs && (
                <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <span style={{fontFamily:"'Syne',sans-serif"}} className="font-black text-gray-800 text-sm">Notifications</span>
                    <button onClick={handleMarkAllRead} className="text-xs text-green-600 font-semibold hover:underline">Mark all read</button>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length===0
                      ? <div className="p-6 text-center text-gray-400 text-sm">No notifications</div>
                      : notifications.slice(0,8).map(n=>(
                        <div key={n._id} className={`flex items-start gap-3 p-3.5 border-b border-gray-50 last:border-none ${!n.isRead?'bg-green-50':''}`}>
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${!n.isRead?'bg-green-500':'bg-gray-100'}`}>{!n.isRead?'🛒':'✓'}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-800">{n.message}</div>
                            <div className="text-xs text-gray-400 mt-0.5">{new Date(n.createdAt).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</div>
                          </div>
                          {!n.isRead&&<div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0"/>}
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
            {/* Profile button */}
            <button onClick={()=>{setShowProfile(!showProfile);setShowNotifs(false);}}
              className="flex items-center gap-2 bg-gray-100 hover:bg-green-50 rounded-xl px-3 py-2 transition-all">
              {profile.avatar
                ? <img src={profile.avatar} alt="" className="w-6 h-6 rounded-full object-cover"/>
                : <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold">{initials(profile.businessName)}</div>}
              <span className="hidden md:block text-sm font-medium text-gray-700 max-w-24 truncate">{profile.businessName}</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-5 py-6">
        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            {label:'Total Orders',     value:orders.length,                          icon:'📦',color:'text-blue-600',   bg:'bg-blue-50'},
            {label:'Preparing',        value:counts['Preparing'],                    icon:'👨‍🍳',color:'text-amber-600',  bg:'bg-amber-50'},
            {label:'Ready for Pickup', value:counts['Ready for Pickup'],             icon:'🔔',color:'text-green-600',  bg:'bg-green-50'},
            {label:"Today's Revenue",  value:`LKR ${todayRevenue.toLocaleString()}`, icon:'💰',color:'text-emerald-600',bg:'bg-emerald-50'},
          ].map(s=>(
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center text-lg mb-2`}>{s.icon}</div>
              <div style={{fontFamily:"'Syne',sans-serif"}} className={`text-2xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* FILTER TABS */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
          {['All','Confirmed','Preparing','Ready for Pickup','Completed'].map(f=>(
            <button key={f} onClick={()=>setFilter(f)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap border transition-all ${filter===f?'bg-green-500 text-white border-green-500':'bg-white text-gray-600 border-gray-200 hover:border-green-300'}`}>
              {statusIcons[f]||'📋'} {f}
              {counts[f]>0&&<span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${filter===f?'bg-white text-green-600':'bg-gray-100 text-gray-600'}`}>{counts[f]}</span>}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 style={{fontFamily:"'Syne',sans-serif"}} className="text-lg font-black text-gray-800">{filter==='All'?'All Orders':`${filter} Orders`}</h2>
          <button onClick={()=>{setLoading(true);fetchOrders();}} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-600 bg-white border border-gray-200 px-3 py-1.5 rounded-xl hover:border-green-300 transition-all">
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Refresh
          </button>
        </div>

        {loading && [...Array(3)].map((_,i)=>(
          <div key={i} className="bg-white rounded-2xl p-5 animate-pulse border border-gray-100 mb-3">
            <div className="flex justify-between mb-3"><div className="h-4 bg-gray-200 rounded w-32"/><div className="h-6 bg-gray-200 rounded w-20"/></div>
            <div className="h-3 bg-gray-200 rounded w-48 mb-2"/><div className="h-3 bg-gray-200 rounded w-32"/>
          </div>
        ))}

        {!loading && filteredOrders.length===0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="text-4xl mb-3">📭</div>
            <h3 className="font-bold text-gray-700 mb-1">No orders found</h3>
            <p className="text-gray-400 text-sm">{filter==='All'?'Orders appear here when students place them.':(`No "${filter}" orders right now.`)}</p>
          </div>
        )}

        <div className="space-y-3">
          {filteredOrders.map(order=>{
            const oid=order._id||order.id;
            return (
              <div key={oid} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {order.paidAt&&<div className="bg-green-50 border-b border-green-100 px-4 py-2"><span className="text-green-600 text-xs font-semibold">💳 Payment verified</span></div>}
                <div className="flex items-center justify-between p-4 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center text-xl">{statusIcons[order.status]||'📋'}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800 text-sm">Order #{oid.slice(-6)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${statusColors[order.status]}`}>{order.status}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{order.studentId?.name||'Student'} · {order.pickupTime||'N/A'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-green-600 text-lg">LKR {order.totalAmount?.toFixed(0)||0}</div>
                    <div className="text-xs text-gray-400">{order.items?.length||0} items</div>
                  </div>
                </div>
                <div className="px-4 pb-3">
                  <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                    {(order.items||[]).slice(0,3).map((item,i)=>(
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{item.nameSnapshot||item.name} <span className="text-gray-400">× {item.quantity}</span></span>
                        <span className="text-gray-600 font-medium">LKR {((item.priceSnapshot||item.price||0)*item.quantity).toFixed(0)}</span>
                      </div>
                    ))}
                    {(order.items||[]).length>3&&<div className="text-xs text-gray-400">+{order.items.length-3} more items</div>}
                  </div>
                  {order.specialInstructions&&<div className="mt-2 text-xs text-amber-700 bg-amber-50 rounded-xl p-2.5 border border-amber-100">📝 {order.specialInstructions}</div>}
                </div>
                {statusNext[order.status]&&(
                  <div className="px-4 pb-4">
                    <button onClick={()=>handleUpdateStatus(oid,statusNext[order.status])} disabled={updating===oid}
                      className="w-full bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl font-bold text-sm shadow-sm shadow-green-200 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                      {updating===oid?<><span className="animate-spin">⏳</span> Updating...</>:<>{statusIcons[statusNext[order.status]]} Mark as "{statusNext[order.status]}"</>}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── PROFILE MODAL ── */}
      {showProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={()=>setShowProfile(false)}>
          <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"/>
          <div className="relative bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e=>e.stopPropagation()}>

            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white text-center relative flex-shrink-0">
              <button onClick={()=>setShowProfile(false)} className="absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">✕</button>
              <div className="relative inline-block mb-3">
                {profile.avatar
                  ? <img src={profile.avatar} alt="" className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg"/>
                  : <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-green-600 text-xl font-black border-4 border-white shadow-lg">{initials(profile.businessName)}</div>}
                <button onClick={()=>avatarRef.current.click()} className="absolute bottom-0 right-0 w-6 h-6 bg-white rounded-full flex items-center justify-center text-green-600 shadow-md text-xs">📷</button>
                <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange}/>
              </div>
              <h2 style={{fontFamily:"'Syne',sans-serif"}} className="text-xl font-black">{profile.businessName||'Vendor'}</h2>
              <p className="text-green-100 text-xs">{profile.email}</p>
            </div>

            {profileLoading ? (
              <div className="p-8 text-center text-gray-400 text-sm animate-pulse">Loading profile...</div>
            ) : (
              <div className="overflow-y-auto flex-1 p-6 space-y-5">

                {/* Business Info */}
                <div>
                  <h3 className="text-sm font-black text-gray-800 mb-3 flex items-center gap-2">🏪 Business Information
                    <span className="text-xs font-normal text-gray-400">— shown to students</span>
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Business Name <span className="text-red-400">*</span></label>
                      <input value={profile.businessName}
                        onChange={e=>setProfile(p=>({...p,businessName:e.target.value}))}
                        placeholder="e.g. Perera Sons Canteen"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"/>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Description</label>
                      <textarea value={profile.description}
                        onChange={e=>setProfile(p=>({...p,description:e.target.value}))}
                        placeholder="Fresh meals made daily..."
                        rows={2}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 resize-none"/>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
                        <input type="email" value={profile.email}
                          onChange={e=>setProfile(p=>({...p,email:e.target.value}))}
                          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"/>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Phone</label>
                        <input value={profile.phone}
                          onChange={e=>setProfile(p=>({...p,phone:e.target.value}))}
                          placeholder="077XXXXXXX"
                          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"/>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Details */}
                <div>
                  <h3 className="text-sm font-black text-gray-800 mb-1 flex items-center gap-2">🏦 Payment Details</h3>
                  <p className="text-xs text-gray-400 mb-3">Your bank details for receiving payouts</p>
                  <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                    {[
                      {label:'Bank Name',      key:'bankName',      placeholder:'e.g. Bank of Ceylon'},
                      {label:'Branch',         key:'bankBranch',    placeholder:'e.g. Colombo 03'},
                      {label:'Account Number', key:'accountNumber', placeholder:'e.g. 1234567890'},
                      {label:'Account Holder', key:'accountName',   placeholder:'Name on bank account'},
                    ].map(f=>(
                      <div key={f.key}>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">{f.label}</label>
                        <input value={profile[f.key]}
                          onChange={e=>setProfile(p=>({...p,[f.key]:e.target.value}))}
                          placeholder={f.placeholder}
                          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 bg-white"/>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Banner tip */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                  💡 To update your <strong>shop banner image</strong>, go to <strong>Menu → Shop Profile</strong>
                </div>

              </div>
            )}

            <div className="flex gap-3 p-5 border-t border-gray-100 flex-shrink-0">
              <button onClick={()=>setShowProfile(false)} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={saveProfile} disabled={profileSaving||profileLoading}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold text-sm shadow-md shadow-green-200 disabled:opacity-60 flex items-center justify-center gap-2">
                {profileSaving?<><span className="animate-spin">⏳</span> Saving...</>:'✓ Save Profile'}
              </button>
            </div>

            <div className="px-5 pb-5">
              <button onClick={async()=>{await logout();navigate('/login');}}
                className="w-full border border-red-200 text-red-500 py-3 rounded-xl font-semibold hover:bg-red-50 text-sm flex items-center justify-center gap-2">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}