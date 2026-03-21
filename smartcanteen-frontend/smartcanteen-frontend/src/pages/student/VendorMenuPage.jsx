import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getMenuByVendor } from '../../services/api';

const categoryEmojis = {
  Rice:'🍚', Noodles:'🍜', Snacks:'🍿', Beverages:'🥤',
  Desserts:'🍰', Burgers:'🍔', Sandwiches:'🥪', Salads:'🥗',
  Soups:'🍲', Specials:'⭐', Other:'🍽️',
};

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

export default function VendorMenuPage() {
  const { vendorId } = useParams();
  const navigate     = useNavigate();

  const [items,     setItems]     = useState([]);
  const [vendor,    setVendor]    = useState(null);   // FIX: real vendor info from API
  const [loading,   setLoading]   = useState(true);
  const [cart,      setCart]      = useState({});
  const [catFilter, setCatFilter] = useState('All');
  const [search,    setSearch]    = useState('');
  const [showCart,  setShowCart]  = useState(false);
  const [bump,      setBump]      = useState(false);
  const [toast,     setToast]     = useState('');

  /* ── Fetch menu + vendor info from real API ── */
  useEffect(() => {
    if (!vendorId) return;
    getMenuByVendor(vendorId)
      .then(r => {
        const data = r?.data?.data;
        setItems(data?.items || []);
        setVendor(data?.vendor || null);  // FIX: use real vendor name
      })
      .catch(err => {
        console.error('Menu fetch error:', err);
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [vendorId]);

  /* ── Lock body scroll when cart open ── */
  useEffect(() => {
    document.body.style.overflow = showCart ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showCart]);

  const showToastMsg = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 1800);
  };

  const addToCart = (id) => {
    setCart(c => ({ ...c, [id]: (c[id] || 0) + 1 }));
    setBump(true);
    setTimeout(() => setBump(false), 300);
    showToastMsg('Added to cart 🛒');
  };

  const removeFromCart = (id) => {
    setCart(c => {
      const next = { ...c };
      if (next[id] > 1) next[id]--;
      else delete next[id];
      return next;
    });
  };

  const cartItems = items.filter(i => cart[i._id]);
  const cartTotal = cartItems.reduce((s, i) => s + i.price * cart[i._id], 0);
  const cartCount = Object.values(cart).reduce((s, q) => s + q, 0);

  const handleCheckout = () => {
    const cartPayload = cartItems.map(i => ({ ...i, quantity: cart[i._id] }));
    localStorage.setItem('cart', JSON.stringify(cartPayload));
    localStorage.setItem('checkoutVendorId', vendorId);
    navigate('/student/checkout');
  };

  /* ── Category filters from actual items ── */
  const categories = ['All', ...new Set(items.map(i => i.category))];

  const filtered = items.filter(i => {
    if (!i.isAvailable) return false;
    const matchCat    = catFilter === 'All' || i.category === catFilter;
    const matchSearch = !search.trim() ||
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  // Display name — use real vendor data from API
  const displayName        = vendor?.businessName || vendor?.name || 'Canteen';
  const displayDescription = vendor?.description  || 'Fresh meals made daily · Pre-order & skip the queue';
  const displayBanner      = vendor?.bannerImage  || null;

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif" }} className="min-h-screen bg-gray-50">
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Toast */}
      <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[70] bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-2xl shadow-2xl whitespace-nowrap transition-all duration-300 ${
        toast ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'
      }`}>
        {toast}
      </div>

      {/* NAVBAR */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto px-5 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/student/home')} className="text-gray-500 hover:text-gray-700 p-1">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center"><span>🦪</span></div>
            <span style={{ fontFamily: "'Syne',sans-serif" }} className="text-lg font-black text-gray-900">PEARL<span className="text-green-500">.</span></span>
          </div>
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search menu..."
              className="w-full bg-gray-100 rounded-xl pl-9 pr-4 py-2 text-sm placeholder-gray-400 outline-none focus:bg-white focus:ring-2 focus:ring-green-200 transition-all"/>
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">✕</button>}
          </div>
          {/* Cart button */}
          <button onClick={() => setShowCart(true)}
            className={`relative flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-green-200 transition-transform duration-150 ${bump ? 'scale-125' : 'scale-100'}`}>
            🛒
            <span className="hidden md:block">Cart</span>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs font-black rounded-full flex items-center justify-center">{cartCount}</span>
            )}
          </button>
        </div>
      </nav>

      {/* HERO BANNER — uses real vendor banner image or gradient */}
      {displayBanner ? (
        <div className="relative h-36 overflow-hidden">
          <img src={displayBanner} alt={displayName} className="w-full h-full object-cover"/>
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-end px-8 pb-5">
            <div>
              <p className="text-green-300 text-xs mb-0.5">🍽️ Menu</p>
              <h1 style={{ fontFamily: "'Syne',sans-serif" }} className="text-2xl font-black text-white">{displayName}</h1>
              <p className="text-white/75 text-sm">{displayDescription}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-5 py-6">
          <div className="max-w-4xl mx-auto">
            <p className="text-green-200 text-xs mb-1">🍽️ Menu</p>
            <h1 style={{ fontFamily: "'Syne',sans-serif" }} className="text-2xl font-black text-white mb-0.5">{displayName}</h1>
            <p className="text-green-100 text-sm">{displayDescription}</p>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-5 py-5">

        {/* ── CATEGORY FILTERS — FIX: now shown on student menu page ── */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5" style={{ scrollbarWidth: 'none' }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setCatFilter(cat)}
              className={`px-4 py-1.5 rounded-2xl text-sm font-semibold whitespace-nowrap border transition-all flex items-center gap-1.5 ${
                catFilter === cat
                  ? 'bg-green-500 text-white border-green-500 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
              }`}>
              {cat !== 'All' && <span>{categoryEmojis[cat] || '🍽️'}</span>}
              {cat}
            </button>
          ))}
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse flex">
                <div className="w-28 h-28 bg-gray-200 flex-shrink-0"/>
                <div className="flex-1 p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"/>
                  <div className="h-3 bg-gray-200 rounded"/>
                  <div className="h-3 bg-gray-200 rounded w-1/2"/>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-gray-500 text-sm">{search || catFilter !== 'All' ? 'No items match your filter' : 'No items available right now'}</p>
            {(search || catFilter !== 'All') && (
              <button onClick={() => { setSearch(''); setCatFilter('All'); }} className="text-green-500 text-sm font-semibold mt-2 hover:underline">Clear filters</button>
            )}
          </div>
        )}

        {/* Menu grid */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-32">
            {filtered.map(item => (
              <div key={item._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex hover:shadow-md transition-all">
                <FoodImage imageUrl={item.imageUrl} category={item.category} className="w-28 h-28 flex-shrink-0"/>
                <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-0.5">
                      <h3 className="font-bold text-gray-800 text-sm truncate">{item.name}</h3>
                      <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-lg flex-shrink-0">
                        {categoryEmojis[item.category] || '🍽️'} {item.category}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs line-clamp-2 mb-2">{item.description}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-green-600 font-black text-base">LKR {item.price}</span>
                    {cart[item._id] ? (
                      <div className="flex items-center gap-2">
                        <button onClick={() => removeFromCart(item._id)}
                          className="w-7 h-7 rounded-full bg-green-100 text-green-600 font-bold text-lg leading-none flex items-center justify-center hover:bg-red-100 hover:text-red-500 transition-all">−</button>
                        <span className="font-black text-gray-800 w-5 text-center text-sm">{cart[item._id]}</span>
                        <button onClick={() => addToCart(item._id)}
                          className="w-7 h-7 rounded-full bg-green-500 text-white font-bold text-lg leading-none flex items-center justify-center hover:bg-green-600 transition-all">+</button>
                      </div>
                    ) : (
                      <button onClick={() => addToCart(item._id)}
                        className="bg-green-500 hover:bg-green-600 active:scale-95 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm shadow-green-200 transition-all">
                        + Add
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FLOATING CART BAR */}
      <div className={`fixed bottom-0 left-0 right-0 z-30 px-5 pb-6 pt-3 transition-all duration-300 ${
        cartCount > 0 && !showCart ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
      }`}>
        <div className="max-w-sm mx-auto">
          <button onClick={() => setShowCart(true)}
            className="flex items-center gap-3 bg-green-500 hover:bg-green-600 active:scale-[0.98] text-white px-5 py-4 rounded-2xl shadow-2xl shadow-green-300 font-bold text-sm transition-all w-full">
            <span className="bg-white text-green-600 text-xs font-black w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">{cartCount}</span>
            <span className="flex-1 text-left">View Cart</span>
            <span className="font-black">LKR {cartTotal.toFixed(0)}</span>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </div>

      {/* CART DRAWER OVERLAY */}
      <div onClick={() => setShowCart(false)}
        className={`fixed inset-0 z-50 bg-black transition-opacity duration-300 ${showCart ? 'opacity-50 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}/>

      {/* CART DRAWER */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[90vh] flex flex-col shadow-2xl transition-transform duration-300 ease-out ${showCart ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-1 flex-shrink-0"/>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 style={{ fontFamily: "'Syne',sans-serif" }} className="text-xl font-black text-gray-800">Your Cart 🛒</h2>
            {cartCount > 0 && <p className="text-xs text-gray-400 mt-0.5">{cartCount} item{cartCount!==1?'s':''} · LKR {cartTotal.toFixed(0)}</p>}
          </div>
          <button onClick={() => setShowCart(false)} className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center text-gray-500 text-sm transition-all">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4">
          {cartItems.length === 0 ? (
            <div className="text-center py-14">
              <div className="text-5xl mb-4">🛒</div>
              <p className="text-gray-600 font-semibold mb-1">Your cart is empty</p>
              <p className="text-gray-400 text-sm mb-5">Add some delicious items from the menu!</p>
              <button onClick={() => setShowCart(false)} className="bg-green-500 hover:bg-green-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm">Browse Menu</button>
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-5">
                {cartItems.map(item => (
                  <div key={item._id} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
                    <FoodImage imageUrl={item.imageUrl} category={item.category} className="w-12 h-12 rounded-xl flex-shrink-0"/>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-800 truncate">{item.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">LKR {item.price} each</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => removeFromCart(item._id)}
                        className="w-7 h-7 rounded-full bg-green-100 text-green-600 font-bold text-lg flex items-center justify-center hover:bg-red-100 hover:text-red-500 transition-all">−</button>
                      <span className="font-black text-gray-800 w-5 text-center text-sm">{cart[item._id]}</span>
                      <button onClick={() => addToCart(item._id)}
                        className="w-7 h-7 rounded-full bg-green-500 text-white font-bold text-lg flex items-center justify-center hover:bg-green-600 transition-all">+</button>
                    </div>
                    <div className="font-bold text-gray-800 text-sm w-16 text-right flex-shrink-0">LKR {(item.price * cart[item._id]).toFixed(0)}</div>
                  </div>
                ))}
              </div>

              <div className="bg-green-50 rounded-2xl p-4 mb-5">
                <div className="flex justify-between text-sm text-gray-500 mb-2">
                  <span>Subtotal ({cartCount} item{cartCount!==1?'s':''})</span>
                  <span>LKR {cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-green-100 pt-2">
                  <span className="font-black text-gray-800">Total</span>
                  <span className="font-black text-green-600 text-xl">LKR {cartTotal.toFixed(2)}</span>
                </div>
              </div>

              <button onClick={handleCheckout}
                className="w-full bg-green-500 hover:bg-green-600 active:scale-[0.98] text-white py-4 rounded-2xl font-black shadow-lg shadow-green-200 transition-all text-sm flex items-center justify-center gap-3">
                <span>Proceed to Checkout</span>
                <span>→</span>
                <span className="bg-white bg-opacity-20 px-3 py-1 rounded-xl text-xs font-bold">LKR {cartTotal.toFixed(0)}</span>
              </button>
              <p className="text-center text-xs text-gray-400 mt-3 pb-2">🕐 You'll pick your pickup time on the next screen</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}