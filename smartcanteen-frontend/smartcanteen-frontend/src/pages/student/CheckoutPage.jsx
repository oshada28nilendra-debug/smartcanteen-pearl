import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAvailableSlots, createOrderIntent, initiatePayment } from '../../services/api';
import API from '../../services/api';

export default function CheckoutPage() {
  useAuth(); // user destructure removed - unused
  const navigate = useNavigate();

  const [cart,         setCart]         = useState([]);
  const [vendorId,     setVendorId]     = useState('');
  const [slots,        setSlots]        = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [payMethod,    setPayMethod]    = useState('card');
  const [payLoading,   setPayLoading]   = useState(false);
  const [payError,     setPayError]     = useState('');
  const [step,         setStep]         = useState(1);

  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvv: '' });

  const today      = new Date().toISOString().split('T')[0];
  const totalPrice = cart.reduce((s, c) => s + c.price * c.quantity, 0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const savedCart   = localStorage.getItem('cart');
    const savedVendor = localStorage.getItem('checkoutVendorId');
    if (savedCart)   setCart(JSON.parse(savedCart));
    if (savedVendor) {
      setVendorId(savedVendor);
      getAvailableSlots(savedVendor, today)
        .then(r => setSlots(r.data.data.slots || []))
        .catch(console.error);
    }
  }, []);

  const formatCardNumber = v => v.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim();
  const formatExpiry     = v => { const d=v.replace(/\D/g,'').slice(0,4); return d.length>=3?`${d.slice(0,2)}/${d.slice(2)}`:d; };

  const handlePay = async () => {
    if (!selectedSlot) { setPayError('Please select a pickup time.'); return; }

    if (payMethod === 'card') {
      if (!card.number || card.number.replace(/\s/g,'').length < 16) { setPayError('Enter a valid 16-digit card number.'); return; }
      if (!card.name)   { setPayError('Enter the cardholder name.'); return; }
      if (!card.expiry) { setPayError('Enter card expiry.'); return; }
      if (!card.cvv || card.cvv.length < 3) { setPayError('Enter a valid CVV.'); return; }
    }

    setPayLoading(true);
    setPayError('');

    try {
      const intentRes = await createOrderIntent({
        vendorId,
        pickupSlotId: selectedSlot,
        items: cart.map(c => ({ menuItemId: c._id, quantity: c.quantity })),
      });
      const orderId = intentRes.data.data.orderId;

      if (payMethod === 'payhere') {
        const payRes = await initiatePayment(orderId);
        const { payhereParams, payhereUrl } = payRes.data.data;
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = payhereUrl;
        Object.entries(payhereParams).forEach(([k, v]) => {
          const input = document.createElement('input');
          input.type = 'hidden'; input.name = k; input.value = v;
          form.appendChild(input);
        });
        document.body.appendChild(form);
        form.submit();
      } else {
        await API.post(`/orders/${orderId}/confirm-payment`);
        localStorage.removeItem('cart');
        localStorage.removeItem('checkoutVendorId');
        navigate(`/student/order-success/${orderId}`);
      }
    } catch (err) {
      console.error('Payment error:', err.response?.data || err.message);
      setPayError(err.response?.data?.message || 'Payment failed. Please try again.');
      setPayLoading(false);
    }
  };

  if (cart.length === 0) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-3">🛒</div>
        <p className="text-gray-500 mb-4">Your cart is empty</p>
        <button onClick={() => navigate('/student/home')} className="bg-green-500 text-white px-6 py-3 rounded-xl font-semibold">Browse Canteens</button>
      </div>
    </div>
  );

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif"}} className="min-h-screen bg-gray-50">
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>

      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <h1 style={{fontFamily:"'Syne',sans-serif"}} className="text-xl font-black text-gray-800">Checkout</h1>
          <div className="ml-auto flex items-center gap-2">
            {[1,2,3].map(s => (
              <div key={s} className="flex items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step > s ? 'bg-green-500 text-white' : step===s ? 'bg-green-500 text-white ring-4 ring-green-100' : 'bg-gray-100 text-gray-400'
                }`}>{step > s ? '✓' : s}</div>
                {s < 3 && <div className="w-6 h-px bg-gray-200 mx-1"/>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

        {/* ── STEP 1: ORDER SUMMARY ── */}
        <div className={`bg-white rounded-3xl border overflow-hidden transition-all ${step===1?'border-green-300 shadow-lg shadow-green-50':'border-gray-100 shadow-sm'}`}>
          <div className="p-5 flex items-center justify-between cursor-pointer" onClick={() => setStep(1)}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step>1?'bg-green-500 text-white':'bg-green-100 text-green-600'}`}>
                {step>1?'✓':'1'}
              </div>
              <h2 style={{fontFamily:"'Syne',sans-serif"}} className="font-black text-gray-800">Order Summary</h2>
            </div>
            <span className="text-green-600 font-bold text-sm">LKR {totalPrice.toFixed(2)}</span>
          </div>
          {step===1 && (
            <div className="px-5 pb-5">
              <div className="space-y-3 mb-4">
                {cart.map(item => (
                  <div key={item._id} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-xl flex-shrink-0">
                      {item.category==='Rice'?'🍚':item.category==='Burgers'?'🍔':item.category==='Beverages'?'🥤':'🍽️'}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-gray-800">{item.name}</div>
                      <div className="text-gray-400 text-xs">LKR {item.price} × {item.quantity}</div>
                    </div>
                    <div className="font-bold text-gray-800 text-sm">LKR {(item.price*item.quantity).toFixed(0)}</div>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-3 flex justify-between mb-4">
                <span className="font-black text-gray-800">Total</span>
                <span className="font-black text-green-600 text-lg">LKR {totalPrice.toFixed(2)}</span>
              </div>
              <button onClick={() => setStep(2)} className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-2xl font-bold text-sm shadow-md shadow-green-200">
                Choose Pickup Time →
              </button>
            </div>
          )}
        </div>

        {/* ── STEP 2: PICKUP TIME ── */}
        <div className={`bg-white rounded-3xl border overflow-hidden transition-all ${step===2?'border-green-300 shadow-lg shadow-green-50':'border-gray-100 shadow-sm'}`}>
          <div className="p-5 flex items-center gap-3 cursor-pointer" onClick={() => step>1 && setStep(2)}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step>2?'bg-green-500 text-white':step===2?'bg-green-100 text-green-600':'bg-gray-100 text-gray-400'}`}>
              {step>2?'✓':'2'}
            </div>
            <h2 style={{fontFamily:"'Syne',sans-serif"}} className="font-black text-gray-800">Pickup Time</h2>
            {selectedSlot && step>2 && (
              <span className="ml-auto text-green-600 text-sm font-medium">
                {slots.find(s=>s._id===selectedSlot)?.slotStart} – {slots.find(s=>s._id===selectedSlot)?.slotEnd}
              </span>
            )}
          </div>
          {step===2 && (
            <div className="px-5 pb-5">
              <p className="text-gray-500 text-sm mb-4">Select your preferred pickup time slot</p>
              {slots.length===0 ? (
                <div className="text-center py-6 text-gray-400 text-sm animate-pulse">Loading time slots...</div>
              ) : (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {slots.slice(0,15).map(slot => (
                    <button key={slot._id} onClick={() => setSelectedSlot(slot._id)}
                      className={`py-3 px-2 rounded-xl text-xs font-semibold border transition-all ${
                        selectedSlot===slot._id
                          ? 'bg-green-500 text-white border-green-500 shadow-md shadow-green-200'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
                      }`}>
                      <div className="font-bold">{slot.slotStart}</div>
                      <div className={`mt-0.5 ${selectedSlot===slot._id?'text-green-100':'text-gray-400'}`}>{slot.spotsRemaining} spots</div>
                    </button>
                  ))}
                </div>
              )}
              {payError && <div className="text-red-500 text-xs mb-3">⚠️ {payError}</div>}
              <button
                onClick={() => { if(!selectedSlot){setPayError('Please select a time slot.');return;} setPayError(''); setStep(3); }}
                disabled={!selectedSlot}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-2xl font-bold text-sm shadow-md shadow-green-200 disabled:opacity-50">
                Choose Payment Method →
              </button>
            </div>
          )}
        </div>

        {/* ── STEP 3: PAYMENT ── */}
        <div className={`bg-white rounded-3xl border overflow-hidden transition-all ${step===3?'border-green-300 shadow-lg shadow-green-50':'border-gray-100 shadow-sm'}`}>
          <div className="p-5 flex items-center gap-3 cursor-pointer" onClick={() => step>2 && setStep(3)}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step===3?'bg-green-100 text-green-600':'bg-gray-100 text-gray-400'}`}>3</div>
            <h2 style={{fontFamily:"'Syne',sans-serif"}} className="font-black text-gray-800">Payment</h2>
          </div>
          {step===3 && (
            <div className="px-5 pb-5">
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button onClick={() => setPayMethod('card')}
                  className={`p-4 rounded-2xl border-2 text-sm font-semibold transition-all flex flex-col items-center gap-2 ${
                    payMethod==='card' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:border-green-300'
                  }`}>
                  <span className="text-2xl">💳</span>
                  <span>Credit / Debit</span>
                  <span className="text-xs font-normal text-gray-400">Visa, Mastercard</span>
                </button>
                <button onClick={() => setPayMethod('payhere')}
                  className={`p-4 rounded-2xl border-2 text-sm font-semibold transition-all flex flex-col items-center gap-2 ${
                    payMethod==='payhere' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:border-green-300'
                  }`}>
                  <span className="text-2xl">🏦</span>
                  <span>PayHere</span>
                  <span className="text-xs font-normal text-gray-400">Online banking</span>
                </button>
              </div>

              {payMethod==='card' && (
                <div className="space-y-4 mb-6">
                  <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-5 text-white">
                    <div className="flex items-center justify-between mb-6">
                      <div style={{fontFamily:"'Syne',sans-serif"}} className="font-black text-lg">PEARL.</div>
                      <div className="flex gap-1">
                        <div className="w-8 h-8 rounded-full bg-red-500 opacity-80"/>
                        <div className="w-8 h-8 rounded-full bg-yellow-400 opacity-80 -ml-3"/>
                      </div>
                    </div>
                    <div className="text-xl font-mono tracking-widest mb-4">{card.number || '•••• •••• •••• ••••'}</div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <div><div>Card Holder</div><div className="text-white font-semibold">{card.name || 'YOUR NAME'}</div></div>
                      <div><div>Expires</div><div className="text-white font-semibold">{card.expiry || 'MM/YY'}</div></div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Card Number</label>
                    <input value={card.number} onChange={e => setCard(c => ({...c, number:formatCardNumber(e.target.value)}))}
                      placeholder="1234 5678 9012 3456" maxLength="19"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Cardholder Name</label>
                    <input value={card.name} onChange={e => setCard(c => ({...c, name:e.target.value.toUpperCase()}))}
                      placeholder="JOHN DOE"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"/>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">Expiry Date</label>
                      <input value={card.expiry} onChange={e => setCard(c => ({...c, expiry:formatExpiry(e.target.value)}))}
                        placeholder="MM/YY" maxLength="5"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"/>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">CVV</label>
                      <input value={card.cvv} type="password" onChange={e => setCard(c => ({...c, cvv:e.target.value.replace(/\D/g,'').slice(0,4)}))}
                        placeholder="•••"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"/>
                    </div>
                  </div>
                </div>
              )}

              {payMethod==='payhere' && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
                  <span className="text-2xl">🔒</span>
                  <div>
                    <div className="font-semibold text-blue-800 text-sm">Redirecting to PayHere</div>
                    <div className="text-blue-600 text-xs mt-0.5">You will be securely redirected to complete payment.</div>
                  </div>
                </div>
              )}

              {payError && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 mb-4 text-sm">⚠️ {payError}</div>
              )}

              <div className="bg-green-50 rounded-2xl p-4 mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Items ({cart.reduce((s,c)=>s+c.quantity,0)})</span>
                  <span>LKR {totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-gray-800">
                  <span>Total</span>
                  <span className="text-green-600 text-lg">LKR {totalPrice.toFixed(2)}</span>
                </div>
              </div>

              <button onClick={handlePay} disabled={payLoading}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-green-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                {payLoading
                  ? <><span className="animate-spin">⏳</span> Processing payment...</>
                  : payMethod==='card'
                    ? <>💳 Pay LKR {totalPrice.toFixed(2)}</>
                    : <>🔒 Pay via PayHere · LKR {totalPrice.toFixed(2)}</>
                }
              </button>
              <p className="text-center text-xs text-gray-400 mt-3">🔒 All payments are encrypted and secure</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}