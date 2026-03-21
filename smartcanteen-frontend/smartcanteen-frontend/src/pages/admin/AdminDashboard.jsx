import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getUsers, updateVendorStatus, deactivateUser, activateUser,
} from '../../services/api';
import API from '../../services/api';

/* ── CSS ── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{--bg:#f3f4f8;--sidebar-bg:#ffffff;--card:#ffffff;--border:#e8eaf0;--text-primary:#1a1d2e;--text-secondary:#7b7f96;--text-muted:#b0b3c6;--accent:#3b82f6;--accent-light:#eff6ff;--green:#22c55e;--green-light:#f0fdf4;--red:#ef4444;--red-light:#fef2f2;--orange:#f97316;--orange-light:#fff7ed;--purple:#8b5cf6;--purple-light:#f5f3ff;--shadow-sm:0 1px 3px rgba(0,0,0,.06);--shadow:0 4px 16px rgba(0,0,0,.08);--shadow-lg:0 12px 40px rgba(0,0,0,.12);--radius:14px;--sidebar-w:220px;--topbar-h:64px;}
body.pearl-dark{--bg:#0f1117;--sidebar-bg:#16191f;--card:#1e2128;--border:#2a2d38;--text-primary:#e8eaf4;--text-secondary:#9095ae;--text-muted:#5a5f78;--accent-light:#1e2d4a;--green-light:#0d2218;--red-light:#2a1010;--orange-light:#261a0e;--purple-light:#1e1533;--shadow-sm:0 1px 3px rgba(0,0,0,.3);--shadow:0 4px 20px rgba(0,0,0,.35);--shadow-lg:0 12px 40px rgba(0,0,0,.45);}
.pearl-shell{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text-primary);min-height:100vh;display:flex;transition:background .3s,color .3s;}
.pearl-sidebar{width:var(--sidebar-w);background:var(--sidebar-bg);border-right:1px solid var(--border);display:flex;flex-direction:column;padding:24px 0;position:fixed;top:0;left:0;bottom:0;z-index:100;}
.pearl-logo{font-family:'Syne',sans-serif;font-weight:800;font-size:22px;color:var(--text-primary);padding:0 24px 30px;}.pearl-logo span{color:var(--accent);}
.pearl-nav{flex:1;padding:0 12px;}
.pearl-nav-item{display:flex;align-items:center;gap:12px;padding:11px 14px;border-radius:10px;cursor:pointer;font-size:14px;font-weight:500;color:var(--text-secondary);transition:background .15s,color .15s;margin-bottom:2px;user-select:none;}
.pearl-nav-item:hover{background:var(--accent-light);color:var(--accent);}
.pearl-nav-item.active{background:var(--accent-light);color:var(--accent);font-weight:600;}
.pearl-sidebar-footer{padding:16px 20px;border-top:1px solid var(--border);display:flex;align-items:center;gap:10px;cursor:pointer;}
.pearl-sidebar-footer:hover{background:var(--bg);}
.pearl-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-weight:700;font-size:13px;color:#fff;flex-shrink:0;}
.pearl-main{margin-left:var(--sidebar-w);flex:1;display:flex;flex-direction:column;min-height:100vh;}
.pearl-topbar{background:var(--card);border-bottom:1px solid var(--border);padding:0 32px;height:var(--topbar-h);display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:90;}
.pearl-topbar-title{font-family:'Syne',sans-serif;font-weight:700;font-size:19px;color:var(--text-primary);flex:1;}
.pearl-search-wrap{position:relative;}
.pearl-search-wrap input{background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:8px 14px 8px 36px;font-size:13px;font-family:'DM Sans',sans-serif;color:var(--text-primary);width:220px;outline:none;transition:border-color .2s;}
.pearl-search-wrap input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(59,130,246,.12);}
.pearl-search-icon{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--text-muted);pointer-events:none;}
.pearl-search-results{position:absolute;top:calc(100% + 6px);left:0;right:0;background:var(--card);border:1px solid var(--border);border-radius:12px;box-shadow:var(--shadow);z-index:300;overflow:hidden;}
.pearl-search-result-item{padding:10px 14px;font-size:13px;color:var(--text-primary);cursor:pointer;display:flex;align-items:center;gap:8px;transition:background .15s;}
.pearl-search-result-item:hover{background:var(--bg);}
.pearl-icon-btn{width:38px;height:38px;border-radius:10px;border:1px solid var(--border);background:var(--card);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-secondary);transition:all .15s;position:relative;}
.pearl-icon-btn:hover{background:var(--accent-light);border-color:var(--accent);color:var(--accent);}
.pearl-notif-badge{position:absolute;top:6px;right:6px;width:8px;height:8px;background:var(--red);border-radius:50%;border:2px solid var(--card);}
.pearl-notif-dropdown{position:absolute;top:calc(100% + 10px);right:0;width:300px;background:var(--card);border:1px solid var(--border);border-radius:14px;box-shadow:var(--shadow);z-index:300;overflow:hidden;}
.pearl-notif-header{padding:14px 16px 10px;font-family:'Syne',sans-serif;font-weight:700;font-size:14px;border-bottom:1px solid var(--border);color:var(--text-primary);display:flex;align-items:center;justify-content:space-between;}
.pearl-notif-item{padding:12px 16px;border-bottom:1px solid var(--border);font-size:13px;color:var(--text-primary);display:flex;gap:10px;align-items:flex-start;cursor:pointer;transition:background .15s;}
.pearl-notif-item:last-child{border-bottom:none;}
.pearl-notif-item:hover{background:var(--bg);}
.pearl-dot{width:8px;height:8px;border-radius:50%;background:var(--accent);flex-shrink:0;margin-top:5px;}
.pearl-dot.read{background:var(--border);}
.pearl-notif-sub{font-size:11.5px;color:var(--text-muted);margin-top:3px;}
.pearl-content{padding:28px 32px;flex:1;}
.pearl-page{animation:pearlPageIn .25s ease;}
@keyframes pearlPageIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
.pearl-stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;}
.pearl-stat-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;box-shadow:var(--shadow-sm);transition:transform .2s,box-shadow .2s;}
.pearl-stat-card:hover{transform:translateY(-2px);box-shadow:var(--shadow);}
.pearl-stat-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px;}
.pearl-stat-label{font-size:12.5px;color:var(--text-secondary);font-weight:500;}
.pearl-stat-icon{width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:16px;}
.pearl-stat-value{font-family:'Syne',sans-serif;font-size:28px;font-weight:800;color:var(--text-primary);line-height:1;margin-bottom:8px;}
.pearl-stat-change{font-size:12px;font-weight:500;}
.pearl-stat-change.up{color:var(--green);}.pearl-stat-change.down{color:var(--red);}.pearl-stat-change.warn{color:var(--orange);}
.pearl-bottom-grid{display:grid;grid-template-columns:1fr 340px;gap:20px;}
.pearl-panel{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow-sm);overflow:hidden;}
.pearl-panel-header{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid var(--border);}
.pearl-panel-title{font-family:'Syne',sans-serif;font-weight:700;font-size:15px;color:var(--text-primary);}
.pearl-view-all{font-size:13px;font-weight:600;color:var(--accent);cursor:pointer;background:none;border:none;font-family:'DM Sans',sans-serif;}
.pearl-view-all:hover{text-decoration:underline;}
.pearl-table{width:100%;border-collapse:collapse;}
.pearl-table thead tr{background:var(--bg);}
.pearl-table th{text-align:left;font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--text-muted);padding:10px 20px;border-bottom:1px solid var(--border);}
.pearl-table td{padding:13px 20px;font-size:13.5px;color:var(--text-primary);border-bottom:1px solid var(--border);vertical-align:middle;}
.pearl-table tr:last-child td{border-bottom:none;}
.pearl-table tbody tr{transition:background .15s;}
.pearl-table tbody tr:hover{background:var(--bg);}
.pearl-vendor-name-cell{display:flex;align-items:center;gap:12px;}
.pearl-vendor-avatar{width:38px;height:38px;border-radius:10px;background:var(--bg);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;}
.pearl-vendor-name{font-weight:600;font-size:13.5px;}
.pearl-vendor-email,.pearl-vendor-date{font-size:13px;color:var(--text-secondary);}
.pearl-actions-cell{display:flex;gap:6px;align-items:center;}
.pearl-btn-approve,.pearl-btn-reject,.pearl-btn-deactivate,.pearl-btn-activate{border:none;border-radius:7px;font-size:12px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;padding:5px 14px;transition:opacity .2s;}
.pearl-btn-approve{background:var(--green);color:#fff;}
.pearl-btn-reject{background:var(--red);color:#fff;}
.pearl-btn-deactivate{background:var(--orange-light);color:var(--orange);border:1px solid var(--orange);}
.pearl-btn-activate{background:var(--green-light);color:var(--green);border:1px solid var(--green);}
.pearl-btn-approve:hover,.pearl-btn-reject:hover{opacity:.85;}
.pearl-btn-approve:disabled,.pearl-btn-reject:disabled{opacity:.5;cursor:not-allowed;}
.pearl-btn-primary{background:var(--accent);color:#fff;border:none;border-radius:10px;padding:9px 20px;font-size:13.5px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;transition:opacity .2s;}
.pearl-btn-primary:hover{opacity:.9;}
.pearl-btn-ghost{background:var(--bg);color:var(--text-secondary);border:1px solid var(--border);border-radius:10px;padding:9px 20px;font-size:13.5px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;}
.pearl-btn-ghost-red{background:none;color:var(--red);border:1px solid var(--red);border-radius:10px;padding:9px 20px;font-size:13.5px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;display:flex;align-items:center;gap:6px;}
.pearl-tag{display:inline-flex;align-items:center;padding:3px 10px;border-radius:6px;font-size:12px;font-weight:600;}
.pearl-tag.green{background:var(--green-light);color:var(--green);}
.pearl-tag.red{background:var(--red-light);color:var(--red);}
.pearl-tag.blue{background:var(--accent-light);color:var(--accent);}
.pearl-tag.orange{background:var(--orange-light);color:var(--orange);}
.pearl-tag.gray{background:var(--bg);color:var(--text-muted);}
.pearl-tab-bar{display:flex;gap:4px;border-bottom:1px solid var(--border);}
.pearl-tab{background:none;border:none;padding:10px 18px;font-size:13.5px;font-weight:500;color:var(--text-muted);cursor:pointer;font-family:'DM Sans',sans-serif;border-bottom:2px solid transparent;margin-bottom:-1px;display:flex;align-items:center;gap:7px;transition:color .15s;}
.pearl-tab.active{color:var(--accent);border-bottom-color:var(--accent);font-weight:600;}
.pearl-tab-badge{font-size:11px;font-weight:700;padding:2px 7px;border-radius:99px;background:var(--orange-light);color:var(--orange);}
.pearl-tab-badge.green{background:var(--green-light);color:var(--green);}
.pearl-tab-badge.red{background:var(--red-light);color:var(--red);}
.pearl-activity-item{display:flex;align-items:flex-start;gap:12px;padding:13px 20px;border-bottom:1px solid var(--border);transition:background .15s;}
.pearl-activity-item:last-child{border-bottom:none;}
.pearl-activity-item:hover{background:var(--bg);}
.pearl-activity-dot{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:14px;}
.pearl-activity-text{font-size:13px;color:var(--text-primary);line-height:1.45;margin-bottom:3px;}
.pearl-activity-time{font-size:11.5px;color:var(--text-muted);}
.pearl-chart-wrap{padding:16px 20px 20px;position:relative;height:260px;}
.pearl-chart-filter{display:flex;gap:4px;}
.pearl-chart-btn{background:none;border:1px solid var(--border);border-radius:7px;padding:5px 12px;font-size:12px;font-weight:600;color:var(--text-muted);cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s;}
.pearl-chart-btn.active{background:var(--accent);border-color:var(--accent);color:#fff;}
.pearl-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);z-index:500;display:flex;align-items:center;justify-content:center;}
.pearl-modal{background:var(--card);border:1px solid var(--border);border-radius:18px;padding:32px;width:420px;max-width:92vw;box-shadow:var(--shadow-lg);}
.pearl-modal-title{font-family:'Syne',sans-serif;font-weight:700;font-size:18px;margin-bottom:10px;color:var(--text-primary);}
.pearl-modal-body{font-size:14px;color:var(--text-secondary);margin-bottom:24px;line-height:1.6;}
.pearl-modal-actions{display:flex;gap:10px;justify-content:flex-end;}
.pearl-modal-btn{padding:9px 22px;border-radius:9px;border:none;font-size:13.5px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;transition:opacity .2s;}
.pearl-modal-btn:hover{opacity:.85;}
.pearl-modal-btn.cancel{background:var(--bg);color:var(--text-secondary);border:1px solid var(--border);}
.pearl-modal-btn.approve{background:var(--green);color:#fff;}
.pearl-modal-btn.reject{background:var(--red);color:#fff;}
.pearl-toast-container{position:fixed;bottom:24px;right:24px;z-index:9000;display:flex;flex-direction:column;gap:10px;pointer-events:none;}
.pearl-toast{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:13px 18px;font-size:13.5px;font-weight:500;color:var(--text-primary);box-shadow:var(--shadow);display:flex;align-items:center;gap:10px;pointer-events:all;animation:pearlSlideIn .3s ease;max-width:320px;}
.pearl-toast.success{border-left:3px solid var(--green);}
.pearl-toast.error{border-left:3px solid var(--red);}
.pearl-toast.info{border-left:3px solid var(--accent);}
@keyframes pearlSlideIn{from{opacity:0;transform:translateX(30px);}to{opacity:1;transform:translateX(0);}}
.pearl-page-toolbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;}
.pearl-section-title{font-family:'Syne',sans-serif;font-weight:800;font-size:22px;color:var(--text-primary);}
.pearl-reports-charts-grid{display:grid;grid-template-columns:1fr 300px;gap:20px;margin-bottom:20px;}
.pearl-settings-section{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:20px;overflow:hidden;box-shadow:var(--shadow-sm);}
.pearl-settings-section-header{display:flex;align-items:center;gap:10px;padding:18px 24px;border-bottom:1px solid var(--border);}
.pearl-settings-section-title{font-family:'Syne',sans-serif;font-weight:700;font-size:16px;color:var(--text-primary);}
.pearl-settings-body{padding:24px;display:flex;flex-direction:column;gap:20px;}
.pearl-settings-2col{display:grid;grid-template-columns:1fr 1fr;gap:20px;}
.pearl-field-group{display:flex;flex-direction:column;gap:6px;}
.pearl-field-group label{font-size:13px;font-weight:600;color:var(--text-secondary);}
.pearl-field-group input,.pearl-field-group select{background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:10px 14px;font-size:14px;font-family:'DM Sans',sans-serif;color:var(--text-primary);outline:none;transition:border-color .2s;}
.pearl-field-group input:focus,.pearl-field-group select:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(59,130,246,.12);}
.pearl-select{width:100%;background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:10px 14px;font-size:14px;font-family:'DM Sans',sans-serif;color:var(--text-primary);outline:none;cursor:pointer;}
.pearl-toggle-row{display:flex;align-items:center;justify-content:space-between;padding:4px 0;}
.pearl-toggle-label{font-size:14px;font-weight:600;color:var(--text-primary);}
.pearl-toggle-desc{font-size:12.5px;color:var(--text-secondary);margin-top:2px;}
.pearl-toggle{width:44px;height:24px;border-radius:99px;background:var(--border);cursor:pointer;position:relative;transition:background .2s;flex-shrink:0;}
.pearl-toggle.on{background:var(--accent);}
.pearl-toggle-knob{position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.2);transition:transform .2s;}
.pearl-toggle.on .pearl-toggle-knob{transform:translateX(20px);}
.pearl-checkbox-row{display:flex;align-items:flex-start;gap:14px;padding:4px 0;}
.pearl-checkbox{width:18px;height:18px;border-radius:5px;accent-color:var(--accent);cursor:pointer;flex-shrink:0;margin-top:1px;}
.pearl-loading-row td{text-align:center;color:var(--text-muted);padding:32px!important;font-size:13px;}
@media(max-width:1200px){.pearl-stats-grid{grid-template-columns:repeat(2,1fr);}.pearl-bottom-grid{grid-template-columns:1fr;}.pearl-reports-charts-grid{grid-template-columns:1fr;}.pearl-settings-2col{grid-template-columns:1fr;}}
@media(max-width:768px){.pearl-sidebar{display:none;}.pearl-main{margin-left:0;}.pearl-content{padding:16px;}.pearl-topbar{padding:0 16px;}.pearl-stats-grid{grid-template-columns:1fr 1fr;}}
`;

const initials = n => (n||'').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!document.getElementById('pearl-css')) {
      const s = document.createElement('style'); s.id='pearl-css'; s.textContent=CSS;
      document.head.appendChild(s);
    }
  }, []);

  const [page,          setPage]          = useState('dashboard');
  const [dark,          setDark]          = useState(false);
  const [vendorTab,     setVendorTab]     = useState('pending');
  const [toasts,        setToasts]        = useState([]);
  const [modal,         setModal]         = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [revenueMode,   setRevenueMode]   = useState('weekly');
  const [search,        setSearch]        = useState('');
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [notifOpen,     setNotifOpen]     = useState(false);

  // Real data state
  const [stats,    setStats]    = useState(null);
  const [activity, setActivity] = useState([]);
  const [vendors,  setVendors]  = useState([]);
  const [users,    setUsers]    = useState([]);
  const [reports,  setReports]  = useState(null);
  const [notifs,   setNotifs]   = useState([]);
  const [loading,  setLoading]  = useState({ stats:true, vendors:true, users:true, activity:true, reports:true });

  // Settings — saved to localStorage (no backend needed for this)
  const [settings, setSettings] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pearl_admin_settings')) || defaultSettings(); } catch { return defaultSettings(); }
  });

  function defaultSettings() {
    return { maxOrders:'5', slotDuration:'30', openTime:'08:00', closeTime:'18:00', twoFA:true, strongPass:true, sessionTimeout:'15', notifCancel:true, notifVendor:true, notifHealth:false };
  }

  const notifRef  = useRef();
  const searchRef = useRef();
  const chartRefs = useRef({});
  const chartInst = useRef({});
  const toastId   = useRef(0);

  useEffect(() => { document.body.classList.toggle('pearl-dark', dark); }, [dark]);

  // Close notif on outside click
  useEffect(() => {
    const h = e => { if(notifRef.current&&!notifRef.current.contains(e.target)) setNotifOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── Fetch all real data ──
  const fetchStats = useCallback(async () => {
    try { const r = await API.get('/admin/stats'); setStats(r.data.data); } catch {}
    finally { setLoading(p=>({...p,stats:false})); }
  }, []);

  const fetchActivity = useCallback(async () => {
    try { const r = await API.get('/admin/activity'); setActivity(r.data.data.activity||[]); } catch {}
    finally { setLoading(p=>({...p,activity:false})); }
  }, []);

  const fetchVendors = useCallback(async () => {
    setLoading(p=>({...p,vendors:true}));
    try { const r = await getUsers({ role:'vendor' }); setVendors(r.data.data.users||[]); } catch {}
    finally { setLoading(p=>({...p,vendors:false})); }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(p=>({...p,users:true}));
    try { const r = await getUsers({}); setUsers(r.data.data.users||[]); } catch {}
    finally { setLoading(p=>({...p,users:false})); }
  }, []);

  const fetchReports = useCallback(async () => {
    setLoading(p=>({...p,reports:true}));
    try { const r = await API.get(`/admin/reports?period=${revenueMode}`); setReports(r.data.data); } catch {}
    finally { setLoading(p=>({...p,reports:false})); }
  }, [revenueMode]);

  const fetchNotifs = useCallback(async () => {
    try { const r = await API.get('/admin/notifications'); setNotifs(r.data.data.notifications||[]); } catch {}
  }, []);

  useEffect(() => {
    fetchStats(); fetchActivity(); fetchNotifs();
    // Auto-refresh stats every 30s
    const t = setInterval(() => { fetchStats(); fetchActivity(); fetchNotifs(); }, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { if(page==='vendors') fetchVendors(); }, [page]);
  useEffect(() => { if(page==='users')   fetchUsers(); }, [page]);
  useEffect(() => { if(page==='dashboard') { fetchVendors(); fetchUsers(); } }, [page]);
  useEffect(() => { if(page==='reports')  fetchReports(); }, [page, revenueMode]);

  // Charts
  useEffect(() => {
    if(page==='reports' && reports) setTimeout(()=>initCharts(), 100);
    else destroyCharts();
  }, [page, reports, dark]);

  function initCharts() {
    if(typeof window.Chart==='undefined'||chartInst.current.revenue) return;
    if(!reports) return;
    const clr  = dark?'#9095ae':'#b0b3c6';
    const grid = dark?'#2a2d38':'#e8eaf0';
    const revEl = chartRefs.current.revenue;
    if(revEl) {
      chartInst.current.revenue = new window.Chart(revEl, {
        type:'line',
        data:{ labels:reports.chart.labels, datasets:[{ label:'Revenue (LKR)', data:reports.chart.revenueData, borderColor:'#3b82f6', backgroundColor:'rgba(59,130,246,0.08)', fill:true, tension:0.4, pointBackgroundColor:'#3b82f6', pointRadius:4, pointHoverRadius:7, borderWidth:2.5 }] },
        options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ x:{ticks:{color:clr,font:{family:'DM Sans',size:12}},grid:{color:grid}}, y:{ticks:{color:clr,font:{family:'DM Sans',size:12},callback:v=>'LKR '+v.toLocaleString()},grid:{color:grid}} } }
      });
    }
    const catEl = chartRefs.current.category;
    if(catEl && reports.topItems?.length > 0) {
      const colors = ['#3b82f6','#22c55e','#f97316','#8b5cf6','#ef4444'];
      chartInst.current.category = new window.Chart(catEl, {
        type:'doughnut',
        data:{ labels:reports.topItems.map(i=>i.name), datasets:[{ data:reports.topItems.map(i=>i.orders), backgroundColor:colors, borderWidth:2, borderColor:dark?'#1e2128':'#ffffff' }] },
        options:{ responsive:true, maintainAspectRatio:false, cutout:'65%', plugins:{ legend:{ position:'bottom', labels:{ color:clr, font:{family:'DM Sans',size:12}, padding:12, boxWidth:12 } } } }
      });
    }
  }
  function destroyCharts() { Object.values(chartInst.current).forEach(c=>c&&c.destroy()); chartInst.current={}; }

  useEffect(() => {
    if(window.Chart) return;
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    s.onload = () => { if(page==='reports') initCharts(); };
    document.head.appendChild(s);
  }, []);

  // Search
  useEffect(() => {
    if(!search.trim()) { setSearchResults([]); setSearchOpen(false); return; }
    const t = setTimeout(async () => {
      try {
        const r = await API.get(`/admin/search?q=${encodeURIComponent(search)}`);
        setSearchResults(r.data.data.results||[]);
        setSearchOpen(true);
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const showToast = useCallback((msg, type='info') => {
    const id = ++toastId.current;
    setToasts(p=>[...p,{id,msg,type}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3500);
  }, []);

  // Vendor actions
  const approveVendor = v => setModal({
    title:`Approve ${v.vendorProfile?.businessName||v.name}?`,
    body:'This will approve this vendor and allow them to receive orders.',
    btnClass:'approve', btnText:'Approve',
    onConfirm: async () => {
      setActionLoading(v._id);
      try { await updateVendorStatus(v._id,'approved'); showToast(`✅ ${v.vendorProfile?.businessName||v.name} approved!`,'success'); fetchVendors(); fetchStats(); }
      catch(e){ showToast(e.response?.data?.message||'Action failed.','error'); }
      finally { setActionLoading(null); }
    }
  });

  const rejectVendor = v => setModal({
    title:`Reject ${v.vendorProfile?.businessName||v.name}?`,
    body:'This will reject this vendor application.',
    btnClass:'reject', btnText:'Reject',
    onConfirm: async () => {
      setActionLoading(v._id);
      try { await updateVendorStatus(v._id,'rejected'); showToast(`${v.vendorProfile?.businessName||v.name} rejected.`,'error'); fetchVendors(); fetchStats(); }
      catch(e){ showToast(e.response?.data?.message||'Action failed.','error'); }
      finally { setActionLoading(null); }
    }
  });

  const toggleUser = u => {
    const isActive = u.accountStatus==='active';
    setModal({
      title:`${isActive?'Deactivate':'Activate'} ${u.name}?`,
      body:`This will ${isActive?'deactivate':'activate'} "${u.name}".`,
      btnClass:isActive?'reject':'approve', btnText:isActive?'Deactivate':'Activate',
      onConfirm: async () => {
        setActionLoading(u._id);
        try {
          if(isActive) await deactivateUser(u._id); else await activateUser(u._id);
          showToast(`${u.name} ${isActive?'deactivated':'activated'}.`,isActive?'info':'success');
          fetchUsers();
        } catch(e){ showToast(e.response?.data?.message||'Action failed.','error'); }
        finally { setActionLoading(null); }
      }
    });
  };

  // Settings save
  const saveSettings = () => {
    if(settings.openTime>=settings.closeTime){showToast('Closing time must be after opening time.','error');return;}
    localStorage.setItem('pearl_admin_settings', JSON.stringify(settings));
    showToast('✅ Settings saved!','success');
  };
  const resetSettings = () => setModal({
    title:'Reset to Defaults?', body:'Reset all settings to factory defaults.',
    btnClass:'reject', btnText:'Reset',
    onConfirm:()=>{ const d=defaultSettings(); setSettings(d); localStorage.setItem('pearl_admin_settings',JSON.stringify(d)); showToast('Settings reset.','info'); }
  });

  const pendingVendors  = vendors.filter(v=>v.vendorStatus==='pending');
  const filteredVendors = vendors.filter(v=>v.vendorStatus===vendorTab);
  const unreadNotifs    = notifs.filter(n=>!n.isRead).length;
  const formatDate = d => d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';

  const PAGE_TITLES = {dashboard:'Overview',vendors:'Vendors',users:'Users',reports:'Reports & Analytics',settings:'Settings'};
  const NAV = [
    {id:'dashboard',label:'Dashboard',icon:<svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>},
    {id:'vendors',  label:'Vendors',  icon:<svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a4 4 0 0 0-8 0v2"/></svg>},
    {id:'users',    label:'Users',    icon:<svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>},
    {id:'reports',  label:'Reports',  icon:<svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>},
    {id:'settings', label:'Settings', icon:<svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>},
  ];

  return (
    <div className="pearl-shell">
      {/* TOASTS */}
      <div className="pearl-toast-container">
        {toasts.map(t=><div key={t.id} className={`pearl-toast ${t.type}`}>{t.msg}</div>)}
      </div>

      {/* MODAL */}
      {modal&&(
        <div className="pearl-modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setModal(null);}}>
          <div className="pearl-modal">
            <div className="pearl-modal-title">{modal.title}</div>
            <div className="pearl-modal-body">{modal.body}</div>
            <div className="pearl-modal-actions">
              <button className="pearl-modal-btn cancel" onClick={()=>setModal(null)}>Cancel</button>
              <button className={`pearl-modal-btn ${modal.btnClass}`} onClick={()=>{modal.onConfirm();setModal(null);}}>{modal.btnText}</button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className="pearl-sidebar">
        <div className="pearl-logo">PEARL<span>.</span></div>
        <nav className="pearl-nav">
          {NAV.map(n=>(
            <div key={n.id} className={`pearl-nav-item${page===n.id?' active':''}`} onClick={()=>setPage(n.id)}>
              {n.icon}{n.label}
            </div>
          ))}
        </nav>
        <div className="pearl-sidebar-footer" onClick={()=>navigate('/admin/profile')}>
          <div className="pearl-avatar">{initials(user?.name)}</div>
          <div style={{minWidth:0}}>
            <div style={{fontSize:13,fontWeight:600,color:'var(--text-primary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user?.name}</div>
            <div style={{fontSize:11,color:'var(--text-muted)'}}>Super Admin</div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="pearl-main">
        {/* TOPBAR */}
        <div className="pearl-topbar">
          <div className="pearl-topbar-title">{PAGE_TITLES[page]||page}</div>

          {/* Search */}
          <div className="pearl-search-wrap" ref={searchRef}>
            <svg className="pearl-search-icon" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input placeholder="Search orders, vendors, users..." value={search}
              onChange={e=>setSearch(e.target.value)}
              onBlur={()=>setTimeout(()=>setSearchOpen(false),150)}/>
            {searchOpen && searchResults.length > 0 && (
              <div className="pearl-search-results">
                {searchResults.map((r,i)=>(
                  <div key={i} className="pearl-search-result-item" onClick={()=>{setSearch(r.label);setSearchOpen(false);}}>
                    <span>{r.icon}</span>{r.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="pearl-icon-btn" ref={notifRef} onClick={()=>setNotifOpen(p=>!p)} style={{position:'relative'}}>
            <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            {unreadNotifs > 0 && <span className="pearl-notif-badge"/>}
            {notifOpen && (
              <div className="pearl-notif-dropdown">
                <div className="pearl-notif-header">
                  Notifications
                  <button className="pearl-view-all" onClick={e=>{e.stopPropagation();}}>Mark all read</button>
                </div>
                {notifs.length === 0
                  ? <div style={{padding:'20px',textAlign:'center',color:'var(--text-muted)',fontSize:13}}>No notifications</div>
                  : notifs.slice(0,5).map(n=>(
                    <div key={n._id} className="pearl-notif-item">
                      <span className={`pearl-dot${n.isRead?' read':''}`}/>
                      <div>
                        <div style={{fontSize:13}}>{n.message}</div>
                        <div className="pearl-notif-sub">{new Date(n.createdAt).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</div>
                      </div>
                    </div>
                  ))
                }
                {/* Pending vendor alerts */}
                {pendingVendors.length > 0 && (
                  <div className="pearl-notif-item" onClick={()=>{setPage('vendors');setVendorTab('pending');setNotifOpen(false);}}>
                    <span className="pearl-dot"/>
                    <div>
                      <div style={{fontSize:13}}>⚠️ <b>{pendingVendors.length}</b> vendor{pendingVendors.length!==1?'s':''} awaiting approval</div>
                      <div className="pearl-notif-sub">Click to review</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dark mode */}
          <div className="pearl-icon-btn" onClick={()=>setDark(p=>!p)}>
            {dark
              ? <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>
              : <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            }
          </div>
        </div>

        <div className="pearl-content">

          {/* ═══ DASHBOARD ═══ */}
          {page==='dashboard' && (
            <div className="pearl-page">
              {/* Stats */}
              <div className="pearl-stats-grid">
                {loading.stats ? (
                  [...Array(4)].map((_,i)=>(
                    <div key={i} className="pearl-stat-card" style={{background:'var(--border)',height:120,borderRadius:'var(--radius)'}}/>
                  ))
                ) : [
                  {label:'Total Orders Today',  value:stats?.todayOrderCount||0,         icon:'🛒', iconBg:'var(--accent-light)', iconClr:'var(--accent)', change:'Today (paid orders)', chg:'up'},
                  {label:'Total Revenue Today', value:`LKR ${(stats?.todayRevenue||0).toLocaleString()}`, icon:'💵', iconBg:'var(--green-light)', iconClr:'var(--green)', change:'From completed orders', chg:'up'},
                  {label:'Pending Vendors',      value:stats?.pendingVendors||0,           icon:'🏪', iconBg:'var(--orange-light)', iconClr:'var(--orange)', change:`⚠ ${stats?.pendingVendors||0} application${stats?.pendingVendors!==1?'s':''}`, chg:'warn'},
                  {label:'Active Users',         value:stats?.activeUsers||0,              icon:'👥', iconBg:'var(--purple-light)', iconClr:'var(--purple)', change:`${stats?.approvedVendors||0} approved vendors`, chg:'up'},
                ].map(s=>(
                  <div key={s.label} className="pearl-stat-card">
                    <div className="pearl-stat-header">
                      <div className="pearl-stat-label">{s.label}</div>
                      <div className="pearl-stat-icon" style={{background:s.iconBg,color:s.iconClr}}>{s.icon}</div>
                    </div>
                    <div className="pearl-stat-value">{s.value}</div>
                    <div className={`pearl-stat-change ${s.chg}`}>{s.change}</div>
                  </div>
                ))}
              </div>

              <div className="pearl-bottom-grid">
                {/* Pending approvals */}
                <div className="pearl-panel">
                  <div className="pearl-panel-header">
                    <span className="pearl-panel-title">Pending Vendor Approvals</span>
                    <button className="pearl-view-all" onClick={()=>setPage('vendors')}>View All</button>
                  </div>
                  <table className="pearl-table">
                    <thead><tr><th>Vendor Name</th><th>Email</th><th>Applied</th><th>Actions</th></tr></thead>
                    <tbody>
                      {loading.vendors && <tr className="pearl-loading-row"><td colSpan={4}>Loading vendors...</td></tr>}
                      {!loading.vendors && pendingVendors.slice(0,3).map(v=>(
                        <tr key={v._id}>
                          <td><div className="pearl-vendor-name-cell"><div className="pearl-vendor-avatar">🏪</div><span className="pearl-vendor-name">{v.vendorProfile?.businessName||v.name}</span></div></td>
                          <td className="pearl-vendor-email">{v.email}</td>
                          <td className="pearl-vendor-date">{formatDate(v.createdAt)}</td>
                          <td><div className="pearl-actions-cell">
                            <button className="pearl-btn-approve" disabled={actionLoading===v._id} onClick={()=>approveVendor(v)}>Approve</button>
                            <button className="pearl-btn-reject"  disabled={actionLoading===v._id} onClick={()=>rejectVendor(v)}>Reject</button>
                          </div></td>
                        </tr>
                      ))}
                      {!loading.vendors && !pendingVendors.length && (
                        <tr><td colSpan={4} style={{textAlign:'center',color:'var(--text-muted)',padding:28}}>✅ No pending vendor approvals</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Recent Activity — REAL from DB */}
                <div className="pearl-panel">
                  <div className="pearl-panel-header">
                    <span className="pearl-panel-title">Recent Activity</span>
                    <button className="pearl-view-all" onClick={fetchActivity}>↻ Refresh</button>
                  </div>
                  {loading.activity && <div style={{padding:24,textAlign:'center',color:'var(--text-muted)',fontSize:13}}>Loading activity...</div>}
                  {!loading.activity && activity.length === 0 && <div style={{padding:24,textAlign:'center',color:'var(--text-muted)',fontSize:13}}>No activity yet</div>}
                  {activity.map((a,i)=>(
                    <div key={i} className="pearl-activity-item">
                      <div className="pearl-activity-dot" style={{background:a.bg||'var(--bg)'}}>{a.icon}</div>
                      <div>
                        <div className="pearl-activity-text" dangerouslySetInnerHTML={{__html:a.text}}/>
                        <div className="pearl-activity-time">{a.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ VENDORS ═══ */}
          {page==='vendors' && (
            <div className="pearl-page">
              <div className="pearl-page-toolbar">
                <div className="pearl-section-title">Vendors</div>
                <button className="pearl-btn-primary" onClick={fetchVendors}>↻ Refresh</button>
              </div>
              <div className="pearl-tab-bar">
                {['pending','approved','rejected'].map(t=>(
                  <button key={t} className={`pearl-tab${vendorTab===t?' active':''}`} onClick={()=>setVendorTab(t)}>
                    {t.charAt(0).toUpperCase()+t.slice(1)}
                    <span className={`pearl-tab-badge${t==='approved'?' green':t==='rejected'?' red':''}`}>{vendors.filter(v=>v.vendorStatus===t).length}</span>
                  </button>
                ))}
              </div>
              <div className="pearl-panel" style={{marginTop:16}}>
                <table className="pearl-table">
                  <thead><tr><th>Vendor</th><th>Email</th><th>Business Name</th><th>Applied</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {loading.vendors && <tr className="pearl-loading-row"><td colSpan={6}>Loading vendors...</td></tr>}
                    {!loading.vendors && filteredVendors.map(v=>(
                      <tr key={v._id}>
                        <td><div className="pearl-vendor-name-cell"><div className="pearl-vendor-avatar">🏪</div><span className="pearl-vendor-name">{v.name}</span></div></td>
                        <td className="pearl-vendor-email">{v.email}</td>
                        <td className="pearl-vendor-email">{v.vendorProfile?.businessName||'—'}</td>
                        <td className="pearl-vendor-date">{formatDate(v.createdAt)}</td>
                        <td><span className={`pearl-tag ${v.vendorStatus==='approved'?'green':v.vendorStatus==='pending'?'orange':'red'}`}>{v.vendorStatus}</span></td>
                        <td><div className="pearl-actions-cell">
                          {v.vendorStatus==='pending'  && <><button className="pearl-btn-approve" disabled={actionLoading===v._id} onClick={()=>approveVendor(v)}>Approve</button><button className="pearl-btn-reject" disabled={actionLoading===v._id} onClick={()=>rejectVendor(v)}>Reject</button></>}
                          {v.vendorStatus==='approved' && <button className="pearl-btn-reject"  disabled={actionLoading===v._id} onClick={()=>rejectVendor(v)}>Revoke</button>}
                          {v.vendorStatus==='rejected' && <button className="pearl-btn-approve" disabled={actionLoading===v._id} onClick={()=>approveVendor(v)}>Re-approve</button>}
                        </div></td>
                      </tr>
                    ))}
                    {!loading.vendors && !filteredVendors.length && <tr><td colSpan={6} style={{textAlign:'center',color:'var(--text-muted)',padding:32}}>No {vendorTab} vendors</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ USERS ═══ */}
          {page==='users' && (
            <div className="pearl-page">
              <div className="pearl-page-toolbar">
                <div className="pearl-section-title">Users</div>
                <button className="pearl-btn-primary" onClick={fetchUsers}>↻ Refresh</button>
              </div>
              <div className="pearl-panel">
                <table className="pearl-table">
                  <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
                  <tbody>
                    {loading.users && <tr className="pearl-loading-row"><td colSpan={6}>Loading users...</td></tr>}
                    {!loading.users && users.map(u=>(
                      <tr key={u._id}>
                        <td><div className="pearl-vendor-name-cell">
                          <div className="pearl-avatar" style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)',width:36,height:36,fontSize:13}}>{initials(u.name)}</div>
                          <span className="pearl-vendor-name">{u.name}</span>
                        </div></td>
                        <td className="pearl-vendor-email">{u.email}</td>
                        <td><span className={`pearl-tag ${u.role==='admin'?'blue':u.role==='vendor'?'orange':'gray'}`}>{u.role}</span></td>
                        <td><span className={`pearl-tag ${u.accountStatus==='active'?'green':'red'}`}>{u.accountStatus}</span></td>
                        <td className="pearl-vendor-date">{formatDate(u.createdAt)}</td>
                        <td>
                          {u._id !== user?._id && u.role !== 'admin' && (
                            <button className={`pearl-btn-${u.accountStatus==='active'?'deactivate':'activate'}`} disabled={actionLoading===u._id} onClick={()=>toggleUser(u)}>
                              {u.accountStatus==='active'?'Deactivate':'Activate'}
                            </button>
                          )}
                          {(u._id===user?._id||u.role==='admin') && <span style={{fontSize:12,color:'var(--text-muted)'}}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ REPORTS — REAL DATA ═══ */}
          {page==='reports' && (
            <div className="pearl-page">
              <div className="pearl-section-title" style={{marginBottom:20}}>Reports & Analytics</div>
              {loading.reports ? (
                <div style={{textAlign:'center',padding:60,color:'var(--text-muted)'}}>Loading reports from database...</div>
              ) : reports && (
                <>
                  <div className="pearl-stats-grid" style={{marginBottom:20}}>
                    {[
                      {label:'Total Revenue',    value:`LKR ${(reports.summary.totalRevenue||0).toLocaleString()}`,  icon:'💰', ib:'var(--green-light)',  ic:'var(--green)',  change:'All time (paid orders)', chg:'up'},
                      {label:'Total Orders',     value:reports.summary.totalOrders||0,                               icon:'📦', ib:'var(--accent-light)', ic:'var(--accent)', change:'Paid orders', chg:'up'},
                      {label:'Avg. Order Value', value:`LKR ${reports.summary.avgOrderValue||0}`,                    icon:'💳', ib:'var(--orange-light)', ic:'var(--orange)', change:'Per paid order', chg:'up'},
                      {label:'Cancelled Orders', value:reports.summary.cancelledOrders||0,                           icon:'🚫', ib:'var(--red-light)',    ic:'var(--red)',    change:'In this period', chg:'down'},
                    ].map(s=>(
                      <div key={s.label} className="pearl-stat-card">
                        <div className="pearl-stat-header"><div className="pearl-stat-label">{s.label}</div><div className="pearl-stat-icon" style={{background:s.ib,color:s.ic}}>{s.icon}</div></div>
                        <div className="pearl-stat-value">{s.value}</div>
                        <div className={`pearl-stat-change ${s.chg}`}>{s.change}</div>
                      </div>
                    ))}
                  </div>

                  <div className="pearl-reports-charts-grid">
                    <div className="pearl-panel">
                      <div className="pearl-panel-header">
                        <span className="pearl-panel-title">Revenue Overview</span>
                        <div className="pearl-chart-filter">
                          {['weekly','monthly'].map(m=>(
                            <button key={m} className={`pearl-chart-btn${revenueMode===m?' active':''}`} onClick={()=>setRevenueMode(m)}>{m.charAt(0).toUpperCase()+m.slice(1)}</button>
                          ))}
                        </div>
                      </div>
                      <div className="pearl-chart-wrap"><canvas ref={el=>chartRefs.current.revenue=el}/></div>
                    </div>
                    <div className="pearl-panel">
                      <div className="pearl-panel-header"><span className="pearl-panel-title">Top Items</span></div>
                      <div className="pearl-chart-wrap" style={{maxWidth:260,margin:'0 auto'}}><canvas ref={el=>chartRefs.current.category=el}/></div>
                    </div>
                  </div>

                  {/* Top Selling Items */}
                  <div className="pearl-panel">
                    <div className="pearl-panel-header"><span className="pearl-panel-title">🏆 Top Selling Items</span></div>
                    {reports.topItems.length === 0 ? (
                      <div style={{padding:32,textAlign:'center',color:'var(--text-muted)',fontSize:13}}>No order data yet for this period</div>
                    ) : (
                      reports.topItems.map((item,i)=>{
                        const maxOrders = reports.topItems[0]?.orders||1;
                        const ranks = ['pearl-rank-1','pearl-rank-2','pearl-rank-3'];
                        return (
                          <div key={item.name} className="pearl-top-item" style={{display:'flex',alignItems:'center',gap:14,padding:'12px 20px',borderBottom:'1px solid var(--border)'}}>
                            <div className={`pearl-top-item-rank ${ranks[i]||''}`} style={!ranks[i]?{background:'var(--bg)',color:'var(--text-secondary)'}:{}}>{i+1}</div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:'13.5px',fontWeight:600,color:'var(--text-primary)'}}>{item.name}</div>
                              <div style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>{item.orders} orders</div>
                              <div style={{height:5,background:'var(--border)',borderRadius:99,overflow:'hidden',marginTop:5}}>
                                <div style={{height:'100%',borderRadius:99,background:'var(--accent)',width:`${(item.orders/maxOrders)*100}%`,transition:'width .6s ease'}}/>
                              </div>
                            </div>
                            <div style={{fontSize:13,fontWeight:600,color:'var(--green)'}}>LKR {(item.revenue||0).toLocaleString()}</div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══ SETTINGS ═══ */}
          {page==='settings' && (
            <div className="pearl-page">
              <div className="pearl-page-toolbar">
                <div className="pearl-section-title">Settings</div>
              </div>
              {[
                {id:'system',   icon:'⚙️', title:'System Settings'},
                {id:'security', icon:'🛡️', title:'Security & Access'},
                {id:'notif',    icon:'🔔', title:'Notifications'},
              ].map(section=>(
                <div key={section.id} className="pearl-settings-section">
                  <div className="pearl-settings-section-header">
                    <span style={{fontSize:18}}>{section.icon}</span>
                    <span className="pearl-settings-section-title">{section.title}</span>
                  </div>
                  <div className="pearl-settings-body">
                    {section.id==='system'&&(
                      <>
                        <div className="pearl-settings-2col">
                          <div className="pearl-field-group">
                            <label>Max Orders per User</label>
                            <input type="number" value={settings.maxOrders} min="1" max="50" onChange={e=>setSettings(p=>({...p,maxOrders:e.target.value}))}/>
                            <div style={{fontSize:'11.5px',color:'var(--text-muted)'}}>Maximum concurrent orders per account</div>
                          </div>
                          <div className="pearl-field-group">
                            <label>Slot Duration</label>
                            <select className="pearl-select" value={settings.slotDuration} onChange={e=>setSettings(p=>({...p,slotDuration:e.target.value}))}>
                              {['15','30','45','60'].map(v=><option key={v} value={v}>{v} Minutes</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="pearl-field-group">
                          <label>Service Hours</label>
                          <div style={{display:'flex',alignItems:'center',gap:12}}>
                            <div style={{flex:1}}>
                              <div style={{fontSize:'10.5px',fontWeight:700,letterSpacing:'.07em',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:5}}>OPENING</div>
                              <input type="time" value={settings.openTime} onChange={e=>setSettings(p=>({...p,openTime:e.target.value}))} style={{width:'100%',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:10,padding:'10px 14px',fontSize:14,fontFamily:'DM Sans',color:'var(--text-primary)',outline:'none'}}/>
                            </div>
                            <span style={{color:'var(--text-muted)',fontSize:18}}>→</span>
                            <div style={{flex:1}}>
                              <div style={{fontSize:'10.5px',fontWeight:700,letterSpacing:'.07em',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:5}}>CLOSING</div>
                              <input type="time" value={settings.closeTime} onChange={e=>setSettings(p=>({...p,closeTime:e.target.value}))} style={{width:'100%',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:10,padding:'10px 14px',fontSize:14,fontFamily:'DM Sans',color:'var(--text-primary)',outline:'none'}}/>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                    {section.id==='security'&&(
                      <>
                        {[
                          {key:'twoFA',      label:'Two-Factor Authentication (2FA)', desc:'Require an extra code for admin logins'},
                          {key:'strongPass', label:'Strong Password Policy',           desc:'Minimum 12 chars, symbols, and numbers'},
                        ].map(t=>(
                          <div key={t.key} className="pearl-toggle-row">
                            <div><div className="pearl-toggle-label">{t.label}</div><div className="pearl-toggle-desc">{t.desc}</div></div>
                            <div className={`pearl-toggle${settings[t.key]?' on':''}`} onClick={()=>setSettings(p=>({...p,[t.key]:!p[t.key]}))}>
                              <div className="pearl-toggle-knob"/>
                            </div>
                          </div>
                        ))}
                        <div className="pearl-field-group">
                          <label>Session Inactivity Timeout</label>
                          <select className="pearl-select" value={settings.sessionTimeout} onChange={e=>setSettings(p=>({...p,sessionTimeout:e.target.value}))}>
                            {[['5','5 Minutes'],['15','15 Minutes'],['30','30 Minutes'],['60','1 Hour'],['0','Never']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
                          </select>
                        </div>
                      </>
                    )}
                    {section.id==='notif'&&(
                      <>
                        {[
                          {key:'notifCancel', label:'Order Cancellation Alerts',    desc:'Notify when a vendor or user cancels an order'},
                          {key:'notifVendor', label:'Vendor Registration Requests', desc:'Notify when a new vendor applies to join'},
                          {key:'notifHealth', label:'System Health Updates',        desc:'Weekly reports on system uptime and performance'},
                        ].map(c=>(
                          <div key={c.key} className="pearl-checkbox-row">
                            <input type="checkbox" className="pearl-checkbox" checked={settings[c.key]} onChange={()=>setSettings(p=>({...p,[c.key]:!p[c.key]}))}/>
                            <div><div className="pearl-toggle-label">{c.label}</div><div className="pearl-toggle-desc">{c.desc}</div></div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              ))}
              <div style={{display:'flex',gap:12,marginTop:4}}>
                <button className="pearl-btn-primary" onClick={saveSettings}>Save All Settings</button>
                <button className="pearl-btn-ghost" onClick={resetSettings}>Reset to Defaults</button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}