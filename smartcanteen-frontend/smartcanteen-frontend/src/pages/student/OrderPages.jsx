import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyOrders, getOrderById } from '../../services/api';

/* ══════════════════════════════
   NOTIFICATION HISTORY PAGE
══════════════════════════════ */
export function NotificationsPage() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAllNotifsRead, markNotifRead } = useAuth();

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif"}} className="min-h-screen bg-gray-50">
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>

      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={()=>navigate('/student/home')} className="text-gray-500 hover:text-gray-700">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <h1 style={{fontFamily:"'Syne',sans-serif"}} className="text-xl font-black text-gray-800">Notifications</h1>
          {unreadCount > 0 && (
            <button onClick={markAllNotifsRead} className="ml-auto text-xs text-green-600 font-semibold hover:underline">
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 py-6">
        {notifications.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🔔</div>
            <h3 className="font-bold text-gray-700 mb-1">No notifications yet</h3>
            <p className="text-gray-400 text-sm">You'll be notified when your order status changes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(n => (
              <div key={n._id}
                onClick={() => {
                  if (!n.isRead) markNotifRead(n._id);
                  if (n.meta?.orderId) navigate(`/student/track/${n.meta.orderId}`);
                }}
                className={`bg-white rounded-2xl border p-4 cursor-pointer hover:shadow-md transition-all ${!n.isRead?'border-green-200 bg-green-50':'border-gray-100'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${!n.isRead?'bg-green-500 text-white':'bg-gray-100'}`}>
                    {n.meta?.status === 'Ready for Pickup' ? '🔔' :
                     n.meta?.status === 'Preparing' ? '👨‍🍳' :
                     n.meta?.status === 'Completed' ? '✅' : '📋'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(n.createdAt).toLocaleString('en-US',{
                        month:'short', day:'numeric',
                        hour:'2-digit', minute:'2-digit'
                      })}
                    </p>
                    {n.meta?.orderId && (
                      <span className="text-xs text-green-600 font-medium mt-1 inline-block">Tap to track order →</span>
                    )}
                  </div>
                  {!n.isRead && <div className="w-2.5 h-2.5 bg-green-500 rounded-full flex-shrink-0 mt-1"/>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════
   ORDER RECEIPT / INVOICE PAGE
══════════════════════════════ */
export function OrderReceiptPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order,   setOrder]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getOrderById(id);
        setOrder(res.data.data.order);
      } catch (err) {
        console.error('Failed to fetch order:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center"><div className="text-4xl mb-3 animate-pulse">🧾</div><p className="text-gray-500 text-sm">Loading receipt...</p></div>
    </div>
  );

  if (!order) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center"><div className="text-4xl mb-3">❓</div><p className="text-gray-500 text-sm">Receipt not found</p></div>
    </div>
  );

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif"}} className="min-h-screen bg-gray-50">
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>

      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-lg mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={()=>navigate('/student/orders')} className="text-gray-500 hover:text-gray-700">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <h1 style={{fontFamily:"'Syne',sans-serif"}} className="text-xl font-black text-gray-800">Receipt</h1>
          <button onClick={()=>window.print()} className="ml-auto text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-xl font-semibold transition-all">
            🖨️ Print
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 py-8">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white text-center">
            <div className="text-4xl mb-2">🧾</div>
            <h2 style={{fontFamily:"'Syne',sans-serif"}} className="text-2xl font-black">PEARL.</h2>
            <p className="text-green-100 text-sm">Smart Canteen Pre-Ordering</p>
            <div className={`inline-flex items-center gap-2 mt-3 px-4 py-1.5 rounded-full text-sm font-semibold ${
              order.paymentStatus === 'PAID' ? 'bg-white text-green-600' : 'bg-white/20 text-white'
            }`}>
              {order.paymentStatus === 'PAID' ? '✅ Payment Confirmed' : '⏳ Payment Pending'}
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="space-y-2">
              {[
                {label:'Order ID',      value:`#${order._id?.slice(-10).toUpperCase()}`},
                {label:'Date',          value:new Date(order.createdAt).toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short'})},
                {label:'Canteen',       value:order.vendorId?.vendorProfile?.businessName || order.vendorId?.name || '—'},
                {label:'Pickup Time',   value:order.pickupTime || '—'},
                {label:'Order Status',  value:order.status},
              ].map(r => (
                <div key={r.label} className="flex justify-between text-sm">
                  <span className="text-gray-500">{r.label}</span>
                  <span className="font-semibold text-gray-800">{r.value}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-gray-200"/>

            <div>
              <h3 className="font-black text-gray-800 text-sm mb-3">Order Items</h3>
              <div className="space-y-2">
                {(order.items || []).map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <div>
                      <span className="font-semibold text-gray-800">{item.nameSnapshot}</span>
                      <span className="text-gray-400 ml-2">× {item.quantity}</span>
                    </div>
                    <span className="font-semibold text-gray-800">LKR {(item.priceSnapshot * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-dashed border-gray-200"/>

            <div className="flex justify-between items-center">
              <span className="font-black text-gray-800 text-lg">Total</span>
              <span className="font-black text-green-600 text-2xl">LKR {order.totalAmount?.toFixed(2)}</span>
            </div>

            {order.specialInstructions && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
                📝 Special Instructions: {order.specialInstructions}
              </div>
            )}

            <div className="border-t border-dashed border-gray-200"/>

            <div className="text-center text-xs text-gray-400 space-y-1">
              <p>Thank you for ordering with PEARL!</p>
              <p>No refunds after food preparation has started.</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={()=>navigate(`/student/track/${order._id}`)}
            className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-2xl font-semibold text-sm hover:bg-gray-50">
            Track Order
          </button>
          <button onClick={()=>navigate('/student/home')}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-2xl font-semibold text-sm shadow-md shadow-green-200">
            Order More
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════
   ORDER SUCCESS PAGE
══════════════════════════════ */
export function OrderSuccessPage() {
  const navigate  = useNavigate();
  const { id }    = useParams();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(t); navigate(`/student/track/${id}`); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [id, navigate]);

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif"}} className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-6">
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>
      <div className="bg-white rounded-3xl p-10 max-w-md w-full text-center shadow-2xl">
        <div className="relative inline-flex items-center justify-center mb-6">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
              <svg width="32" height="32" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          </div>
        </div>
        <h1 style={{fontFamily:"'Syne',sans-serif"}} className="text-3xl font-black text-gray-800 mb-2">Order Placed! 🎉</h1>
        <p className="text-gray-500 mb-2">Your order has been confirmed and sent to the canteen.</p>
        <div className="bg-green-50 rounded-2xl p-4 mb-6">
          <div className="text-green-600 font-bold text-sm">Order ID</div>
          <div className="font-mono text-gray-700 text-xs mt-1 break-all">{id}</div>
        </div>
        <div className="text-left space-y-3 mb-6">
          {[
            {icon:'📋',label:'Order Confirmed',  desc:'Canteen received your order',done:true},
            {icon:'👨‍🍳',label:'Being Prepared',   desc:'Chef is preparing your food',done:false},
            {icon:'🔔',label:'Ready for Pickup', desc:"We'll notify you when ready",done:false},
          ].map((s,i)=>(
            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${s.done?'bg-green-50':'bg-gray-50'}`}>
              <span className="text-xl">{s.icon}</span>
              <div>
                <div className={`text-sm font-semibold ${s.done?'text-green-700':'text-gray-600'}`}>{s.label}</div>
                <div className="text-xs text-gray-400">{s.desc}</div>
              </div>
              {s.done && <svg className="ml-auto text-green-500" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
            </div>
          ))}
        </div>
        <p className="text-gray-400 text-sm mb-4">Redirecting to order tracking in <span className="font-bold text-green-500">{countdown}s</span>...</p>
        <div className="flex gap-3">
          <button onClick={()=>navigate(`/student/receipt/${id}`)} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-2xl font-semibold text-sm hover:bg-gray-50">🧾 View Receipt</button>
          <button onClick={()=>navigate(`/student/track/${id}`)} className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-2xl font-semibold text-sm shadow-md shadow-green-200">Track Order</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════
   ORDER TRACKING PAGE — REAL-TIME
══════════════════════════════ */
export function OrderTrackingPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { socket } = useAuth();

  const [order,    setOrder]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [notified, setNotified] = useState(false);
  const prevStatus = React.useRef(null);

  const STATUS_ORDER = ['Confirmed','Preparing','Ready for Pickup','Completed'];
  const statusIcons  = {'Confirmed':'📋','Preparing':'👨‍🍳','Ready for Pickup':'🔔','Completed':'✅','Cancelled':'❌'};
  const statusDesc   = {
    'Confirmed':        'Your order has been received by the canteen.',
    'Preparing':        'The chef is cooking your food right now.',
    'Ready for Pickup': '🎉 Your food is ready! Head to the counter.',
    'Completed':        'Order complete. Enjoy your meal!',
    'Cancelled':        'This order has been cancelled.',
  };
  const colorMap = {'Confirmed':'bg-blue-500','Preparing':'bg-amber-500','Ready for Pickup':'bg-green-500','Completed':'bg-green-500','Cancelled':'bg-red-500'};

  const fetchOrder = React.useCallback(async () => {
    try {
      const res = await getOrderById(id);
      const o = res.data.data.order;
      if (prevStatus.current && prevStatus.current !== o.status && o.status === 'Ready for Pickup') {
        setNotified(true);
        setTimeout(() => setNotified(false), 5000);
      }
      prevStatus.current = o.status;
      setOrder(o);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetchOrder();
    const poll = setInterval(fetchOrder, 10000);
    return () => clearInterval(poll);
  }, [id, fetchOrder]);

  useEffect(() => {
    if (!socket?.current) return;
    const s = socket.current;
    const handler = ({ orderId, status }) => {
      if (orderId?.toString() === id?.toString()) {
        setOrder(prev => prev ? { ...prev, status } : prev);
        if (status === 'Ready for Pickup') { setNotified(true); setTimeout(()=>setNotified(false),5000); }
      }
    };
    s.on('order:statusChanged', handler);
    return () => s.off('order:statusChanged', handler);
  }, [id, socket]);

  const currentStatusIndex = order ? STATUS_ORDER.indexOf(order.status) : 0;

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center"><div className="text-4xl mb-3 animate-pulse">🍽️</div><p className="text-gray-500 text-sm">Loading order...</p></div>
    </div>
  );
  if (!order) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center"><div className="text-4xl mb-3">❓</div><p className="text-gray-500 text-sm">Order not found</p><button onClick={()=>navigate('/student/orders')} className="mt-4 bg-green-500 text-white px-5 py-2 rounded-xl font-semibold text-sm">My Orders</button></div>
    </div>
  );

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif"}} className="min-h-screen bg-gray-50">
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>

      {notified && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-2xl shadow-2xl text-sm font-medium flex items-center gap-2 animate-bounce">
          🔔 Your order is ready for pickup!
        </div>
      )}

      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-lg mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={()=>navigate('/student/home')} className="text-gray-500 hover:text-gray-700">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <h1 style={{fontFamily:"'Syne',sans-serif"}} className="text-xl font-black text-gray-800">Track Order</h1>
          <button onClick={()=>navigate(`/student/receipt/${id}`)} className="ml-auto text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-xl font-semibold">🧾 Receipt</button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 py-8">
        <div className={`${colorMap[order.status]||'bg-gray-500'} rounded-3xl p-6 text-white mb-6 relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full -translate-y-20 translate-x-20"/>
          <div className="text-4xl mb-2">{statusIcons[order.status]||'📋'}</div>
          <h2 style={{fontFamily:"'Syne',sans-serif"}} className="text-2xl font-black mb-1">{order.status}</h2>
          <p className="text-white text-opacity-80 text-sm">{statusDesc[order.status]}</p>
          {order.status !== 'Completed' && order.status !== 'Cancelled' && (
            <div className="mt-4 bg-white bg-opacity-20 rounded-full overflow-hidden h-2">
              <div className="h-full bg-white rounded-full" style={{width:`${((currentStatusIndex+1)/STATUS_ORDER.length)*100}%`,transition:'width 0.5s ease'}}/>
            </div>
          )}
          <div className="mt-3 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-white rounded-full opacity-75 animate-ping"/>
            <span className="text-white text-opacity-60 text-xs">Live updates active</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 mb-6">
          <h3 style={{fontFamily:"'Syne',sans-serif"}} className="font-black text-gray-800 mb-4">Order Timeline</h3>
          {STATUS_ORDER.map((s,i) => {
            const isDone = i < currentStatusIndex;
            const isCurrent = i === currentStatusIndex;
            return (
              <div key={s} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0 transition-all duration-500 ${isDone?'bg-green-500':isCurrent?colorMap[order.status]:'bg-gray-100'}`}>
                    {isDone ? <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                      : <span className={isCurrent?'text-white':'text-gray-400'}>{statusIcons[s]}</span>}
                  </div>
                  {i < STATUS_ORDER.length-1 && <div className={`w-0.5 h-10 transition-all duration-500 ${isDone?'bg-green-400':'bg-gray-200'}`}/>}
                </div>
                <div className="flex-1 pb-6">
                  <div className={`font-semibold text-sm ${i<=currentStatusIndex?'text-gray-800':'text-gray-400'}`}>{s}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{statusDesc[s]}</div>
                  {isCurrent && order.status !== 'Completed' && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"/>
                      <span className="text-xs text-green-600 font-medium">In progress...</span>
                    </div>
                  )}
                  {isDone && <div className="text-xs text-green-600 font-medium mt-0.5">✓ Completed</div>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 mb-6">
          <h3 style={{fontFamily:"'Syne',sans-serif"}} className="font-black text-gray-800 mb-4">Order Details</h3>
          <div className="space-y-2 mb-4">
            {(order.items||[]).map((item,i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-700">{item.nameSnapshot} <span className="text-gray-400">× {item.quantity}</span></span>
                <span className="font-medium text-gray-800">LKR {(item.priceSnapshot*item.quantity).toFixed(0)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-3 flex justify-between font-black">
            <span>Total</span><span className="text-green-600">LKR {order.totalAmount?.toFixed(2)}</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
            <span>🏪 {order.vendorId?.vendorProfile?.businessName||order.vendorId?.name}</span>
            <span>·</span>
            <span>⏰ {order.pickupTime}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={()=>navigate('/student/orders')} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-2xl font-semibold text-sm hover:bg-gray-50">All Orders</button>
          <button onClick={()=>navigate('/student/home')} className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-2xl font-semibold text-sm shadow-md shadow-green-200">Order More</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════
   MY ORDERS PAGE — REAL API
══════════════════════════════ */
export function MyOrdersPage() {
  const navigate = useNavigate();
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyOrders()
      .then(res => setOrders(res.data.data.orders || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statusColor = {
    'Completed':'bg-green-100 text-green-700',
    'Ready for Pickup':'bg-blue-100 text-blue-700',
    'Preparing':'bg-amber-100 text-amber-700',
    'Confirmed':'bg-gray-100 text-gray-700',
    'Cancelled':'bg-red-100 text-red-600',
  };

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif"}} className="min-h-screen bg-gray-50">
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-lg mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={()=>navigate('/student/home')} className="text-gray-500 hover:text-gray-700">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <h1 style={{fontFamily:"'Syne',sans-serif"}} className="text-xl font-black text-gray-800">My Orders</h1>
        </div>
      </div>
      <div className="max-w-lg mx-auto px-6 py-6 space-y-4">
        {loading && [...Array(3)].map((_,i) => (
          <div key={i} className="bg-white rounded-2xl p-5 animate-pulse border border-gray-100">
            <div className="flex justify-between mb-3"><div className="h-4 bg-gray-200 rounded w-32"/><div className="h-6 bg-gray-200 rounded w-20"/></div>
            <div className="h-3 bg-gray-200 rounded w-48 mb-2"/><div className="h-3 bg-gray-200 rounded w-32"/>
          </div>
        ))}
        {!loading && orders.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="font-bold text-gray-700 mb-1">No orders yet</h3>
            <p className="text-gray-400 text-sm mb-4">Place your first order from a canteen!</p>
            <button onClick={()=>navigate('/student/home')} className="bg-green-500 text-white px-6 py-3 rounded-xl font-semibold text-sm shadow-md shadow-green-200">Browse Canteens</button>
          </div>
        )}
        {!loading && orders.map(order => (
          <div key={order._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-mono text-xs text-gray-400">#{order._id?.slice(-8)}</div>
                <div className="text-xs text-gray-400 mt-0.5">{order.vendorId?.vendorProfile?.businessName||order.vendorId?.name} · {order.pickupTime}</div>
              </div>
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${statusColor[order.status]||'bg-gray-100 text-gray-600'}`}>{order.status}</span>
            </div>
            <div className="text-sm text-gray-700 mb-3 line-clamp-1">{(order.items||[]).map(i=>`${i.nameSnapshot} ×${i.quantity}`).join(', ')}</div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-green-600">LKR {order.totalAmount?.toFixed(2)}</span>
              <div className="flex gap-2">
                <button onClick={()=>navigate(`/student/receipt/${order._id}`)} className="text-xs text-gray-500 hover:text-gray-700 font-medium">🧾 Receipt</button>
                <button onClick={()=>navigate(`/student/track/${order._id}`)} className="text-green-500 text-sm font-medium">
                  {order.status==='Completed'?'✓ Done':'Track →'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}