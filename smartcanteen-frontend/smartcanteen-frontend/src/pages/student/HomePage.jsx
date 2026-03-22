import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';

const BG_COLORS = [
  'from-green-400 to-emerald-600','from-orange-400 to-red-500',
  'from-yellow-400 to-orange-500','from-lime-400 to-green-500',
  'from-blue-400 to-cyan-500','from-pink-400 to-rose-500',
  'from-purple-400 to-violet-500','from-teal-400 to-cyan-600',
];
const FOOD_EMOJIS = ['🍛','🍔','🍜','🥗','🥤','🍢','🍕','🍣','🍝','☕'];

const CATEGORY_FILTERS = [
  { label:'All',        emoji:'🍽️' },
  { label:'Rice',       emoji:'🍚' },
  { label:'Noodles',    emoji:'🍜' },
  { label:'Snacks',     emoji:'🍿' },
  { label:'Beverages',  emoji:'🥤' },
  { label:'Desserts',   emoji:'🍰' },
  { label:'Burgers',    emoji:'🍔' },
  { label:'Sandwiches', emoji:'🥪' },
  { label:'Salads',     emoji:'🥗' },
  { label:'Soups',      emoji:'🍲' },
  { label:'Specials',   emoji:'⭐' },
];

const Stars = ({ rating=4.5 }) => (
  <div className="flex items-center gap-0.5">
    {[1,2,3,4,5].map(s => (
      <svg key={s} width="11" height="11" viewBox="0 0 24 24"
        fill={s <= Math.round(rating) ? '#f59e0b' : 'none'}
        stroke={s <= Math.round(rating) ? '#f59e0b' : '#d1d5db'} strokeWidth="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ))}
  </div>
);

export default function HomePage() {
  const { user, logout, notifications, unreadCount, markAllNotifsRead, markNotifRead } = useAuth();
  const navigate = useNavigate();

  const [allVendors,   setAllVendors]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [search,       setSearch]       = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [showProfile,  setShowProfile]  = useState(false);
  const [showNotifs,   setShowNotifs]   = useState(false);
  const [profile,      setProfile]      = useState({ name: user?.name || '', avatar: null });
  const avatarRef = useRef();
  const notifRef  = useRef();

  const initials = (name='') => name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);

  useEffect(() => {
    const h = e => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    const fetchVendors = async () => {
      setLoading(true);
      try {
        const res = await API.get('/student/vendors');
        const raw = res.data.data.vendors || [];
        const mapped = raw.map((v, i) => ({
          id:          v._id,
          name:        v.vendorProfile?.businessName || v.name,
          description: v.vendorProfile?.description  || 'Fresh meals made daily',
          bannerImage: v.vendorProfile?.bannerImage   || null,
          category:    v.vendorProfile?.category || 'All',
          rating:      4.5,
          minOrder:    200,
          emoji:       FOOD_EMOJIS[i % FOOD_EMOJIS.length],
          bgColor:     BG_COLORS[i % BG_COLORS.length],
        }));
        setAllVendors(mapped);
      } catch {
        setError('Could not load canteens. Please refresh.');
      } finally {
        setLoading(false);
      }
    };
    fetchVendors();
  }, []);

  const filtered = allVendors.filter(v =>
    !search ||
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleAvatarChange = e => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = ev => setProfile(p => ({ ...p, avatar: ev.target.result }));
    r.readAsDataURL(file);
  };

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif"}} className="min-h-screen bg-gray-50">
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>

      {/* NAVBAR */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center"><span>🦪</span></div>
            <span style={{fontFamily:"'Syne',sans-serif"}} className="text-lg font-black text-gray-900">PEARL<span className="text-green-500">.</span></span>
          </div>

          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search canteens..."
              className="w-full bg-gray-100 rounded-xl pl-9 pr-4 py-2 text-sm placeholder-gray-400 outline-none focus:bg-white focus:ring-2 focus:ring-green-200 transition-all"/>
            {search && <button onClick={()=>setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">✕</button>}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={()=>navigate('/student/orders')}
              className="hidden md:flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-green-600 px-3 py-2 rounded-xl hover:bg-green-50 transition-all">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
              Orders
            </button>

            <div className="relative" ref={notifRef}>
              <button onClick={()=>setShowNotifs(!showNotifs)}
                className="relative w-9 h-9 flex items-center justify-center bg-gray-100 hover:bg-green-50 rounded-xl transition-all">
                <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">{unreadCount}</span>}
              </button>
              {showNotifs && (
                <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <span style={{fontFamily:"'Syne',sans-serif"}} className="font-black text-gray-800 text-sm">Notifications</span>
                    {unreadCount > 0 && <button onClick={markAllNotifsRead} className="text-xs text-green-600 font-semibold hover:underline">Mark all read</button>}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 text-sm"><div className="text-3xl mb-2">🔔</div>No notifications yet</div>
                    ) : notifications.slice(0,10).map(n => (
                      <div key={n._id} onClick={()=>{ if(!n.isRead)markNotifRead(n._id); if(n.meta?.orderId){navigate(`/student/track/${n.meta.orderId}`);setShowNotifs(false);} }}
                        className={`flex items-start gap-3 p-3.5 border-b border-gray-50 last:border-none cursor-pointer hover:bg-gray-50 transition-all ${!n.isRead?'bg-green-50':''}`}>
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 ${!n.isRead?'bg-green-500 text-white':'bg-gray-100 text-gray-500'}`}>{!n.isRead?'🔔':'✓'}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-800 leading-snug">{n.message}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{new Date(n.createdAt).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</div>
                        </div>
                        {!n.isRead && <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0"/>}
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t border-gray-100">
                    <button onClick={()=>{navigate('/student/notifications');setShowNotifs(false);}} className="w-full text-center text-xs text-green-600 font-semibold hover:underline">View all notifications →</button>
                  </div>
                </div>
              )}
            </div>

            <button onClick={()=>setShowProfile(true)}
              className="flex items-center gap-2 bg-gray-100 hover:bg-green-50 rounded-xl px-3 py-2 transition-all">
              {profile.avatar
                ? <img src={profile.avatar} alt="" className="w-6 h-6 rounded-full object-cover"/>
                : <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold">{initials(profile.name||user?.name)}</div>}
              <span className="hidden md:block text-sm font-medium text-gray-700 max-w-20 truncate">{profile.name||user?.name}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600">
        <div className="max-w-5xl mx-auto px-5 py-7">
          <p className="text-green-200 text-xs mb-1">👋 Hello, {profile.name||user?.name}!</p>
          <h1 style={{fontFamily:"'Syne',sans-serif"}} className="text-2xl font-black text-white mb-1">Campus Food, On Your Terms</h1>
          <p className="text-green-100 text-sm">Pre-order from your favourite canteens. Skip the queue.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-5">

        {/* CATEGORY FILTER BAR */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5" style={{scrollbarWidth:'none'}}>
          {CATEGORY_FILTERS.map(cat => (
            <button key={cat.label} onClick={()=>setActiveFilter(cat.label)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-semibold whitespace-nowrap border transition-all flex-shrink-0 ${
                activeFilter===cat.label
                  ? 'bg-green-500 text-white border-green-500 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-green-300 hover:text-green-600'
              }`}>
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 style={{fontFamily:"'Syne',sans-serif"}} className="text-lg font-black text-gray-800">
            {search ? `Results for "${search}"` : activeFilter === 'All' ? 'Campus Canteens' : `${activeFilter} Canteens`}
          </h2>
          <span className="text-xs text-gray-400">{filtered.length} canteen{filtered.length!==1?'s':''}</span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-4 mb-4 text-sm flex items-center gap-2">
            ⚠️ {error}
            <button onClick={()=>window.location.reload()} className="ml-auto font-semibold hover:underline">Retry</button>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_,i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse border border-gray-100">
                <div className="h-28 bg-gray-200"/>
                <div className="p-3.5 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"/>
                  <div className="h-3 bg-gray-200 rounded"/>
                  <div className="h-3 bg-gray-200 rounded w-1/2"/>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">{search?'🔍':'🏪'}</div>
            <p className="text-gray-500 text-sm font-medium">{search?'No canteens match your search':'No canteens available right now'}</p>
            <p className="text-gray-400 text-xs mt-1">{!search&&'Vendors appear here once approved by admin'}</p>
            {search && <button onClick={()=>setSearch('')} className="text-green-500 text-sm font-semibold mt-2 hover:underline">Clear search</button>}
          </div>
        )}

        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(vendor => (
              <div key={vendor.id} onClick={()=>navigate(`/student/menu/${vendor.id}`)}
                className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm transition-all duration-200 group hover:shadow-lg hover:-translate-y-0.5 cursor-pointer">
                {vendor.bannerImage ? (
                  <div className="h-28 relative overflow-hidden">
                    <img src={vendor.bannerImage} alt={vendor.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"/>
                  </div>
                ) : (
                  <div className={`h-28 bg-gradient-to-r ${vendor.bgColor} relative flex items-center justify-center`}>
                    <span className="text-5xl group-hover:scale-110 transition-transform duration-200 filter drop-shadow">{vendor.emoji}</span>
                  </div>
                )}
                <div className="p-3.5">
                  <div className="flex items-start justify-between mb-1">
                    <h3 style={{fontFamily:"'Syne',sans-serif"}} className="font-black text-gray-800 text-sm">{vendor.name}</h3>
                    <Stars rating={vendor.rating}/>
                  </div>
                  <p className="text-gray-400 text-xs mb-2 line-clamp-1">{vendor.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"/>
                      <span className="text-green-600 font-medium">Open</span>
                      <span className="text-gray-300 mx-1">·</span>
                      <span>Min. LKR {vendor.minOrder}</span>
                    </div>
                    <span className="text-green-500 font-bold">Order →</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PROFILE MODAL */}
      {showProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={()=>setShowProfile(false)}>
          <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"/>
          <div className="relative bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-5 text-white text-center relative">
              <button onClick={()=>setShowProfile(false)} className="absolute top-3 right-3 w-7 h-7 bg-white bg-opacity-20 rounded-xl flex items-center justify-center text-sm">✕</button>
              <div className="relative inline-block mb-2">
                {profile.avatar
                  ? <img src={profile.avatar} alt="" className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg"/>
                  : <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-green-600 text-xl font-black border-4 border-white shadow-lg">{initials(profile.name)}</div>}
                <button onClick={()=>avatarRef.current.click()} className="absolute bottom-0 right-0 w-6 h-6 bg-white rounded-full flex items-center justify-center text-green-600 shadow-md text-xs">📷</button>
                <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange}/>
              </div>
              <h2 style={{fontFamily:"'Syne',sans-serif"}} className="text-lg font-black">{profile.name||'Your Name'}</h2>
              <p className="text-green-100 text-xs capitalize">{user?.role} · {user?.email}</p>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Display Name</label>
                <input value={profile.name} onChange={e=>setProfile(p=>({...p,name:e.target.value}))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"/>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={()=>navigate('/student/orders')} className="border border-green-200 text-green-600 py-2.5 rounded-xl font-semibold text-sm hover:bg-green-50 flex items-center justify-center gap-1">📦 Orders</button>
                <button onClick={()=>navigate('/student/notifications')} className="border border-blue-200 text-blue-600 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-50 flex items-center justify-center gap-1">
                  🔔 Notifs {unreadCount>0&&<span className="bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">{unreadCount}</span>}
                </button>
              </div>
              <button onClick={async()=>{await logout();navigate('/login');}}
                className="w-full border border-red-200 text-red-500 py-2.5 rounded-xl font-semibold hover:bg-red-50 text-sm flex items-center justify-center gap-2">
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