import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getMenuByVendor, createMenuItem, updateMenuItem,
  deleteMenuItem, toggleAvailability,
  getVendorProfile, updateVendorProfile,
} from '../../services/api';

const CATEGORIES = ['Rice','Noodles','Snacks','Beverages','Desserts','Burgers','Sandwiches','Salads','Soups','Specials','Other'];
const categoryEmojis = { Rice:'🍚',Noodles:'🍜',Snacks:'🍿',Beverages:'🥤',Desserts:'🍰',Burgers:'🍔',Sandwiches:'🥪',Salads:'🥗',Soups:'🍲',Specials:'⭐',Other:'🍽️' };
const EMPTY_FORM = { name:'', description:'', price:'', category:'Rice', imageUrl:'' };

const FoodImage = ({ imageUrl, category, className }) => {
  const [err, setErr] = useState(false);
  useEffect(() => { setErr(false); }, [imageUrl]);
  if (!imageUrl || err) {
    return (
      <div className={`${className} bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center`}>
        <span className="text-4xl filter drop-shadow">{categoryEmojis[category] || '🍽️'}</span>
      </div>
    );
  }
  return <img src={imageUrl} alt="" className={`${className} object-cover`} onError={() => setErr(true)} />;
};

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload  = ev => resolve(ev.target.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export default function VendorMenuManagement() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const VENDOR_ID = user?._id || user?.id;

  const [items,     setItems]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem,  setEditItem]  = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(null);
  const [toast,     setToast]     = useState('');
  const [search,    setSearch]    = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [confirmDel,setConfirmDel]= useState(null);
  const [imgPreview,setImgPreview]= useState('');
  const [imgTab,    setImgTab]    = useState('upload');

  // Shop profile state
  const [showShopProfile,    setShowShopProfile]    = useState(false);
  const [shopProfileSaving,  setShopProfileSaving]  = useState(false);
  const [shopProfileLoading, setShopProfileLoading] = useState(false);
  const [shopProfile, setShopProfile] = useState({
    businessName: '',
    description:  '',
    contactPhone: '',
    bannerImage:  '',
  });
  const [bannerPreview, setBannerPreview] = useState('');

  const bannerFileRef = useRef();
  const foodFileRef   = useRef();

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(''),2500); };

  // ── Fetch menu items ──
  useEffect(() => {
    if (!VENDOR_ID) { setLoading(false); return; }
    getMenuByVendor(VENDOR_ID)
      .then(r => setItems(r.data.data?.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [VENDOR_ID]);

  useEffect(() => { setImgPreview(form.imageUrl); }, [form.imageUrl]);

  // ── Load shop profile from DB when modal opens ──
  const loadShopProfile = async () => {
    setShopProfileLoading(true);
    try {
      const res = await getVendorProfile();
      const vp  = res.data.data.user?.vendorProfile || {};
      const loaded = {
        businessName: vp.businessName || '',
        description:  vp.description  || '',
        contactPhone: vp.contactPhone  || '',
        bannerImage:  vp.bannerImage   || '',
      };
      setShopProfile(loaded);
      setBannerPreview(vp.bannerImage || '');
    } catch (err) {
      console.error('Failed to load shop profile:', err);
      showToast('Failed to load profile', 'error');
    } finally {
      setShopProfileLoading(false);
    }
  };

  const openShopProfile = () => {
    setShowShopProfile(true);
    loadShopProfile(); // Always reload from DB when opening
  };

  // ── Save shop profile to DB ──
  const saveShopProfile = async () => {
    if (!shopProfile.businessName.trim()) { showToast('Business name is required.', 'error'); return; }
    setShopProfileSaving(true);
    try {
      await updateVendorProfile({
        businessName: shopProfile.businessName.trim(),
        description:  shopProfile.description.trim(),
        contactPhone: shopProfile.contactPhone.trim(),
        bannerImage:  shopProfile.bannerImage || null,
      });
      showToast('✓ Shop profile saved — visible to students!');
      setShowShopProfile(false);
    } catch (err) {
      console.error('Save failed:', err.response?.data || err.message);
      showToast(err.response?.data?.message || 'Save failed.', 'error');
    } finally {
      setShopProfileSaving(false);
    }
  };

  const handleFoodImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('Image must be under 2MB', 'error'); return; }
    const base64 = await fileToBase64(file);
    setForm(f => ({ ...f, imageUrl: base64 }));
    setImgPreview(base64);
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('Image must be under 2MB', 'error'); return; }
    const base64 = await fileToBase64(file);
    setBannerPreview(base64);
    setShopProfile(p => ({ ...p, bannerImage: base64 }));
  };

  const filtered = items.filter(i => {
    const matchCat    = catFilter === 'All' || i.category === catFilter;
    const matchSearch = !search.trim() ||
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const openAdd = () => { setEditItem(null); setForm(EMPTY_FORM); setImgPreview(''); setImgTab('upload'); setShowModal(true); };
  const openEdit = item => {
    setEditItem(item);
    setForm({ name:item.name, description:item.description, price:item.price, category:item.category, imageUrl:item.imageUrl||'' });
    setImgPreview(item.imageUrl || '');
    setImgTab(item.imageUrl?.startsWith('data:') ? 'upload' : 'url');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim())        { showToast('Item name is required.', 'error');    return; }
    if (!form.description.trim()) { showToast('Description is required.', 'error'); return; }
    if (!form.price || parseFloat(form.price) <= 0) { showToast('Price must be > 0.', 'error'); return; }
    setSaving(true);
    const payload = {
      name:        form.name.trim(),
      description: form.description.trim(),
      price:       parseFloat(form.price),
      category:    form.category,
      imageUrl:    form.imageUrl.trim() || null,
    };
    try {
      if (editItem) {
        const res = await updateMenuItem(editItem._id, payload);
        setItems(prev => prev.map(i => i._id === editItem._id ? res.data.data.item : i));
        showToast('Menu item updated ✓');
      } else {
        const res = await createMenuItem(payload);
        setItems(prev => [...prev, res.data.data.item]);
        showToast('Menu item added ✓');
      }
      setShowModal(false);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Save failed.';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async id => {
    setDeleting(id);
    try {
      await deleteMenuItem(id);
      setItems(prev => prev.filter(i => i._id !== id));
      showToast('Item deleted');
    } catch (err) {
      showToast(err.response?.data?.message || 'Delete failed.', 'error');
    } finally { setConfirmDel(null); setDeleting(null); }
  };

  const handleToggle = async item => {
    try {
      await toggleAvailability(item._id);
      setItems(prev => prev.map(i => i._id === item._id ? {...i, isAvailable: !i.isAvailable} : i));
      showToast(`"${item.name}" is now ${!item.isAvailable ? 'Available' : 'Unavailable'}`);
    } catch (err) { showToast(err.response?.data?.message || 'Toggle failed.', 'error'); }
  };

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif"}} className="min-h-screen bg-gray-50">
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[60] px-5 py-2.5 rounded-2xl shadow-2xl text-sm font-medium text-white ${toast.type==='error'?'bg-red-500':'bg-green-500'}`}>
          {toast.msg}
        </div>
      )}

      {/* NAVBAR */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={()=>navigate('/vendor/dashboard')} className="text-gray-500 hover:text-gray-700 p-1">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center"><span>🦪</span></div>
            <span style={{fontFamily:"'Syne',sans-serif"}} className="text-lg font-black text-gray-900">Menu Management</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openShopProfile}
              className="flex items-center gap-2 border border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-600 px-4 py-2 rounded-xl text-sm font-semibold transition-all">
              🏪 Shop Profile
            </button>
            <button onClick={openAdd}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-green-200 transition-all">
              + Add Item
            </button>
          </div>
        </div>
      </nav>

      {/* Banner preview */}
      {bannerPreview && (
        <div className="relative h-36 overflow-hidden">
          <img src={bannerPreview} alt="Shop banner" className="w-full h-full object-cover"/>
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-end px-8 pb-5">
            <div>
              <h2 style={{fontFamily:"'Syne',sans-serif"}} className="text-2xl font-black text-white">
                {shopProfile.businessName || user?.vendorProfile?.businessName || 'My Shop'}
              </h2>
              {shopProfile.description && <p className="text-white/75 text-sm mt-0.5">{shopProfile.description}</p>}
            </div>
          </div>
          <button onClick={openShopProfile}
            className="absolute top-3 right-3 bg-white/90 hover:bg-white text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all">
            ✏️ Edit Banner
          </button>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-5 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            {label:'Total Items', value:items.length},
            {label:'Available',   value:items.filter(i=>i.isAvailable).length},
            {label:'Unavailable', value:items.filter(i=>!i.isAvailable).length},
            {label:'Categories',  value:[...new Set(items.map(i=>i.category))].length},
          ].map(s=>(
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
              <div style={{fontFamily:"'Syne',sans-serif"}} className="text-2xl font-black text-green-600">{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col md:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search menu items..."
              className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-10 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all"/>
            {search && <button onClick={()=>setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {['All',...CATEGORIES].map(cat=>(
              <button key={cat} onClick={()=>setCatFilter(cat)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${catFilter===cat?'bg-green-500 text-white border-green-500':'bg-white text-gray-600 border-gray-200 hover:border-green-300'}`}>
                {cat!=='All'&&categoryEmojis[cat]} {cat}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_,i)=>(
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="h-28 bg-gray-200"/>
                <div className="p-4 space-y-2"><div className="h-4 bg-gray-200 rounded w-3/4"/><div className="h-3 bg-gray-200 rounded"/></div>
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length===0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="text-4xl mb-3">{search?'🔍':'🍽️'}</div>
            <h3 className="font-bold text-gray-700 mb-1">{search?`No results for "${search}"`:'No menu items yet'}</h3>
            <p className="text-gray-400 text-sm mb-4">{search?'Try a different term':'Add your first item to get started'}</p>
            {!search&&<button onClick={openAdd} className="bg-green-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-green-200">+ Add Menu Item</button>}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item=>(
            <div key={item._id} className={`bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-all ${!item.isAvailable?'opacity-70 border-gray-100':'border-gray-100'}`}>
              <div className="relative h-28">
                <FoodImage imageUrl={item.imageUrl} category={item.category} className="w-full h-28"/>
                <span className="absolute top-2 left-2 bg-black bg-opacity-40 text-white text-xs px-2 py-0.5 rounded-full">{item.category}</span>
                <button onClick={()=>handleToggle(item)}
                  className={`absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${item.isAvailable?'bg-green-500 text-white':'bg-gray-500 text-white'}`}>
                  {item.isAvailable?'● ON':'○ OFF'}
                </button>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-800 text-sm mb-0.5 truncate">{item.name}</h3>
                <p className="text-gray-400 text-xs mb-3 line-clamp-1">{item.description}</p>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-green-600 font-black text-lg">LKR {item.price}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>openEdit(item)} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-xl text-xs font-semibold hover:bg-gray-50 flex items-center justify-center gap-1 transition-all">✏️ Edit</button>
                  <button onClick={()=>setConfirmDel(item)} className="flex-1 border border-red-200 text-red-500 py-2 rounded-xl text-xs font-semibold hover:bg-red-50 flex items-center justify-center gap-1 transition-all">🗑️ Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── ADD / EDIT MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={()=>setShowModal(false)}>
          <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"/>
          <div className="relative bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e=>e.stopPropagation()}>
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-5 text-white flex-shrink-0">
              <h2 style={{fontFamily:"'Syne',sans-serif"}} className="text-xl font-black">{editItem?'Edit Menu Item':'Add New Item'}</h2>
              <p className="text-green-100 text-xs mt-0.5">{editItem?'Update item details':'Fill in the details for your new menu item'}</p>
            </div>
            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {/* Food Image */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">Food Image <span className="text-gray-400 font-normal">(optional)</span></label>
                <div className="h-32 rounded-2xl overflow-hidden mb-3 border-2 border-dashed border-gray-200 cursor-pointer group relative" onClick={()=>imgTab==='upload'&&foodFileRef.current.click()}>
                  <FoodImage imageUrl={imgPreview} category={form.category} className="w-full h-32"/>
                  {imgTab==='upload'&&<div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"><span className="text-white font-semibold text-sm">📷 Click to upload</span></div>}
                </div>
                <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-3">
                  <button onClick={()=>setImgTab('upload')} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${imgTab==='upload'?'bg-white text-gray-800 shadow-sm':'text-gray-500'}`}>📁 Upload file</button>
                  <button onClick={()=>setImgTab('url')}    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${imgTab==='url'?'bg-white text-gray-800 shadow-sm':'text-gray-500'}`}>🔗 Paste URL</button>
                </div>
                {imgTab==='upload'&&(
                  <div>
                    <input ref={foodFileRef} type="file" accept="image/*" className="hidden" onChange={handleFoodImageUpload}/>
                    <button onClick={()=>foodFileRef.current.click()} className="w-full border-2 border-dashed border-gray-300 hover:border-green-400 hover:bg-green-50 text-gray-500 hover:text-green-600 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2">📷 Choose Image File</button>
                    <p className="text-xs text-gray-400 mt-1.5 text-center">Max 2MB · JPG, PNG, WEBP</p>
                    {imgPreview?.startsWith('data:')&&<button onClick={()=>{setForm(f=>({...f,imageUrl:''}));setImgPreview('');}} className="w-full mt-2 text-red-500 text-xs font-semibold hover:underline">🗑️ Remove image</button>}
                  </div>
                )}
                {imgTab==='url'&&(
                  <div>
                    <input value={imgPreview?.startsWith('data:')? '' : form.imageUrl} onChange={e=>{setForm(f=>({...f,imageUrl:e.target.value}));setImgPreview(e.target.value);}} placeholder="https://images.unsplash.com/..."
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"/>
                    <p className="text-xs text-gray-400 mt-1.5">💡 Paste a direct image URL (must start with https://)</p>
                  </div>
                )}
              </div>
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Item Name *</label>
                <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Chicken Rice"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"/>
              </div>
              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Description *</label>
                <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Describe the item..." rows={2}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 resize-none"/>
              </div>
              {/* Price + Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Price (LKR) *</label>
                  <input type="number" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} placeholder="350" min="0.01" step="0.01"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Category *</label>
                  <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 bg-white">
                    {CATEGORIES.map(c=><option key={c} value={c}>{categoryEmojis[c]} {c}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 flex-shrink-0">
              <button onClick={()=>setShowModal(false)} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold text-sm shadow-md shadow-green-200 disabled:opacity-60 flex items-center justify-center gap-2">
                {saving?<><span className="animate-spin">⏳</span> Saving...</>:editItem?'✓ Save Changes':'+ Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SHOP PROFILE MODAL ── */}
      {showShopProfile && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={()=>setShowShopProfile(false)}>
          <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"/>
          <div className="relative bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-lg shadow-2xl max-h-[90vh] flex flex-col" onClick={e=>e.stopPropagation()}>
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-5 text-white rounded-t-3xl flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 style={{fontFamily:"'Syne',sans-serif"}} className="text-xl font-black">Shop Profile</h2>
                  <p className="text-green-100 text-xs mt-0.5">Changes save to database and show to students instantly</p>
                </div>
                <button onClick={()=>setShowShopProfile(false)} className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center text-white">✕</button>
              </div>
            </div>

            {shopProfileLoading ? (
              <div className="p-12 text-center text-gray-400 text-sm animate-pulse">Loading profile from database...</div>
            ) : (
              <div className="overflow-y-auto flex-1 p-5 space-y-5">

                {/* Banner Image */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2">Shop Banner Image
                    <span className="text-gray-400 font-normal ml-1">— shown on student's menu page</span>
                  </label>
                  <div className="relative h-36 rounded-2xl overflow-hidden border-2 border-dashed border-gray-200 mb-3 cursor-pointer group" onClick={()=>bannerFileRef.current.click()}>
                    {bannerPreview ? (
                      <>
                        <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover"/>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">📷 Change Image</span>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 group-hover:bg-gray-100 transition-all">
                        <div className="text-3xl mb-2">🏪</div>
                        <p className="text-gray-400 text-sm font-medium">Click to upload banner</p>
                        <p className="text-gray-300 text-xs mt-1">Max 2MB · Recommended 1200×400px</p>
                      </div>
                    )}
                  </div>
                  <input ref={bannerFileRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload}/>
                  <div className="flex gap-2">
                    <button onClick={()=>bannerFileRef.current.click()}
                      className="flex-1 border border-dashed border-gray-300 text-gray-500 hover:border-green-400 hover:text-green-600 py-2 rounded-xl text-xs font-semibold transition-all">
                      📷 Upload Image
                    </button>
                    {bannerPreview && (
                      <button onClick={()=>{setBannerPreview('');setShopProfile(p=>({...p,bannerImage:''}));}}
                        className="border border-red-200 text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl text-xs font-semibold transition-all">
                        🗑️ Remove
                      </button>
                    )}
                  </div>
                </div>

                {/* Shop details */}
                {[
                  {label:'Business Name', key:'businessName', placeholder:'e.g. Perera Sons Canteen', required:true},
                  {label:'Description',   key:'description',  placeholder:'Fresh meals made daily...'},
                  {label:'Contact Phone', key:'contactPhone', placeholder:'077XXXXXXX'},
                ].map(f=>(
                  <div key={f.key}>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                      {f.label} {f.required&&<span className="text-red-400">*</span>}
                    </label>
                    <input value={shopProfile[f.key]} onChange={e=>setShopProfile(p=>({...p,[f.key]:e.target.value}))}
                      placeholder={f.placeholder}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"/>
                  </div>
                ))}

                {/* Preview */}
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 mb-3">👁️ Preview — how students see your shop header</p>
                  <div className="bg-white rounded-xl overflow-hidden border border-gray-100">
                    {bannerPreview ? (
                      <div className="relative h-16">
                        <img src={bannerPreview} alt="" className="w-full h-full object-cover"/>
                        <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent flex items-center px-4">
                          <div>
                            <p className="text-white font-bold text-sm">{shopProfile.businessName||'Your Shop'}</p>
                            <p className="text-white/70 text-xs">{shopProfile.description||'Your description'}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-16 bg-gradient-to-r from-green-400 to-emerald-600 flex items-center px-4">
                        <div>
                          <p className="text-white font-bold text-sm">{shopProfile.businessName||'Your Shop'}</p>
                          <p className="text-white/70 text-xs">{shopProfile.description||'Your description'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 p-5 border-t border-gray-100 flex-shrink-0">
              <button onClick={()=>setShowShopProfile(false)} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={saveShopProfile} disabled={shopProfileSaving||shopProfileLoading}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold text-sm shadow-md shadow-green-200 disabled:opacity-60 flex items-center justify-center gap-2">
                {shopProfileSaving?<><span className="animate-spin">⏳</span> Saving to DB...</>:'✓ Save Profile'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={()=>setConfirmDel(null)}>
          <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"/>
          <div className="relative bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center" onClick={e=>e.stopPropagation()}>
            <div className="text-4xl mb-3">🗑️</div>
            <h3 style={{fontFamily:"'Syne',sans-serif"}} className="text-xl font-black text-gray-800 mb-2">Delete Item?</h3>
            <p className="text-gray-500 text-sm mb-5">Are you sure you want to delete "<strong>{confirmDel.name}</strong>"?</p>
            <div className="flex gap-3">
              <button onClick={()=>setConfirmDel(null)} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-semibold text-sm">Cancel</button>
              <button onClick={()=>handleDelete(confirmDel._id)} disabled={deleting===confirmDel._id}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                {deleting===confirmDel._id?<><span className="animate-spin">⏳</span> Deleting...</>:'🗑️ Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}