import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';

const initials = n => (n||'').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);

export default function AdminProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [name,        setName]        = useState('');
  const [email,       setEmail]       = useState('');
  const [newPass,     setNewPass]     = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [avatar,      setAvatar]      = useState(null);
  const [showPass,    setShowPass]    = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [toast,       setToast]       = useState(null);
  const avatarRef = useRef();

  const showToast = (msg, type='success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    API.get('/admin/profile')
      .then(res => {
        const u = res.data.data.user;
        setName(u.name || '');
        setEmail(u.email || '');
      })
      .catch(() => {
        setName(user?.name  || '');
        setEmail(user?.email || '');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleAvatarUpload = e => {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 2 * 1024 * 1024) { showToast('Image must be under 2MB', 'error'); return; }
    const r = new FileReader();
    r.onload = ev => setAvatar(ev.target.result);
    r.readAsDataURL(f);
  };

  const handleSave = async () => {
    if (!name.trim())         { showToast('Name cannot be empty.', 'error'); return; }
    if (!email.includes('@')) { showToast('Invalid email address.', 'error'); return; }
    if (newPass && newPass.length < 8) { showToast('Password must be at least 8 characters.', 'error'); return; }
    if (newPass && newPass !== confirmPass) { showToast('Passwords do not match.', 'error'); return; }

    setSaving(true);
    try {
      await API.patch('/admin/profile', {
        name:  name.trim(),
        email: email.trim().toLowerCase(),
        ...(newPass ? { password: newPass } : {}),
      });
      setNewPass(''); setConfirmPass(''); setShowPass(false);
      showToast('Profile saved successfully!', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save. Try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pearl-shell">
      {toast && (
        <div className="pearl-toast-container">
          <div className={`pearl-toast ${toast.type}`}>{toast.msg}</div>
        </div>
      )}
      <aside className="pearl-sidebar">
        <div className="pearl-logo">PEARL<span>.</span></div>
        <nav className="pearl-nav">
          {['Dashboard','Vendors','Users','Reports','Settings'].map(label => (
            <div key={label} className="pearl-nav-item" onClick={()=>navigate('/admin/dashboard')}>
              {label}
            </div>
          ))}
        </nav>
        <div className="pearl-sidebar-footer" style={{background:'var(--accent-light)'}}>
          <div className="pearl-avatar">
            {avatar
              ? <img src={avatar} alt="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}/>
              : initials(name)}
          </div>
          <div style={{minWidth:0}}>
            <div style={{fontSize:13,fontWeight:600,color:'var(--text-primary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{name||'Admin'}</div>
            <div style={{fontSize:11,color:'var(--accent)',fontWeight:600}}>Super Admin</div>
          </div>
        </div>
      </aside>
      <main className="pearl-main">
        <div className="pearl-topbar">
          <button onClick={()=>navigate('/admin/dashboard')}
            style={{background:'none',border:'1px solid var(--border)',cursor:'pointer',color:'var(--text-secondary)',display:'flex',alignItems:'center',gap:6,fontSize:13,fontFamily:'DM Sans',fontWeight:500,padding:'6px 14px',borderRadius:9}}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back
          </button>
          <div className="pearl-topbar-title">My Profile</div>
          <div style={{width:80}}/>
        </div>
        <div className="pearl-content">
          <div className="pearl-page">
            <div className="pearl-section-title" style={{marginBottom:24}}>My Profile</div>
            {loading ? (
              <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:260,color:'var(--text-muted)',fontSize:14,gap:10}}>
                <span style={{animation:'spin 1s linear infinite',display:'inline-block'}}>⏳</span> Loading profile...
              </div>
            ) : (
              <div style={{maxWidth:540}}>
                <div className="pearl-panel" style={{padding:'32px 36px'}}>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',marginBottom:30}}>
                    <div style={{position:'relative',marginBottom:14}}>
                      <div onClick={()=>avatarRef.current.click()} style={{width:100,height:100,borderRadius:'50%',cursor:'pointer',overflow:'hidden',background:avatar?'transparent':'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:30,color:'#fff',boxShadow:'0 6px 24px rgba(99,102,241,.3)',border:'3px solid white'}}>
                        {avatar ? <img src={avatar} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : initials(name)}
                      </div>
                      <div onClick={()=>avatarRef.current.click()} style={{position:'absolute',bottom:2,right:2,width:28,height:28,borderRadius:'50%',background:'var(--accent)',border:'2px solid white',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
                        <svg width="13" height="13" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                      </div>
                    </div>
                    <input ref={avatarRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleAvatarUpload}/>
                    {avatar
                      ? <button className="pearl-btn-ghost-red" onClick={()=>setAvatar(null)}>Remove Photo</button>
                      : <div style={{fontSize:12,color:'var(--text-muted)'}}>Click avatar to upload photo</div>
                    }
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:16}}>
                    <div className="pearl-field-group">
                      <label>Display Name</label>
                      <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name"/>
                    </div>
                    <div className="pearl-field-group">
                      <label>Email Address</label>
                      <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@example.com"/>
                    </div>
                    <div className="pearl-field-group">
                      <label>Role</label>
                      <input value="Super Admin" disabled style={{opacity:.5,cursor:'not-allowed'}}/>
                    </div>
                    <div style={{borderTop:'1px solid var(--border)',paddingTop:16}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:showPass?16:0}}>
                        <div>
                          <div style={{fontSize:13.5,fontWeight:600,color:'var(--text-primary)'}}>New Password</div>
                          <div style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>Leave blank to keep current password</div>
                        </div>
                        <button onClick={()=>setShowPass(p=>!p)} style={{background:'none',border:'1px solid var(--border)',borderRadius:8,padding:'5px 14px',fontSize:12,fontWeight:600,color:'var(--text-secondary)',cursor:'pointer',fontFamily:'DM Sans',transition:'all .15s'}}>
                          {showPass?'Cancel':'Change'}
                        </button>
                      </div>
                      {showPass && (
                        <div style={{display:'flex',flexDirection:'column',gap:14}}>
                          <div className="pearl-field-group">
                            <label>New Password</label>
                            <input type="password" placeholder="Min 8 chars · uppercase · number · symbol" value={newPass} onChange={e=>setNewPass(e.target.value)}/>
                          </div>
                          <div className="pearl-field-group">
                            <label>Confirm New Password</label>
                            <input type="password" placeholder="Repeat new password" value={confirmPass} onChange={e=>setConfirmPass(e.target.value)}/>
                            {newPass && confirmPass && (
                              <div style={{fontSize:12,marginTop:4,color:newPass===confirmPass?'var(--green)':'var(--red)'}}>
                                {newPass===confirmPass ? '✓ Passwords match' : '⚠ Passwords do not match'}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{display:'flex',gap:12,paddingTop:6}}>
                      <button className="pearl-btn-primary" onClick={handleSave} disabled={saving} style={{flex:1,opacity:saving?.6:1}}>
                        {saving?'Saving...':'Save Changes'}
                      </button>
                      <button className="pearl-btn-ghost-red" onClick={async()=>{await logout();navigate('/login');}} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                        Log Out
                      </button>
                    </div>
                  </div>
                </div>
                <div style={{marginTop:14,padding:'12px 18px',background:'var(--accent-light)',border:'1px solid var(--border)',borderRadius:'var(--radius)',fontSize:13,color:'var(--accent)',display:'flex',gap:8,alignItems:'center'}}>
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  Changes save directly to MongoDB and take effect immediately.
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}