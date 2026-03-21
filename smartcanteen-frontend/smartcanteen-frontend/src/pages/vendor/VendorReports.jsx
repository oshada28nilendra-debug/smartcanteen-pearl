import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVendorOrders } from '../../services/api';

const COLORS      = ['bg-green-500','bg-emerald-400','bg-teal-400','bg-cyan-400','bg-blue-400'];
const TEXT_COLORS = ['text-green-600','text-emerald-500','text-teal-500','text-cyan-500','text-blue-500'];

export default function VendorReports() {
  const navigate = useNavigate();
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [period,  setPeriod]  = useState('week');

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const res = await getVendorOrders();
        setOrders(res.data.data.orders || []);
      } catch (err) {
        console.error('Failed to fetch orders:', err);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  // ── Compute stats from real orders ──
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodStart  = period === 'week' ? startOfWeek : startOfMonth;

  const periodOrders = orders.filter(o => {
    const date = new Date(o.createdAt);
    return date >= periodStart && o.status !== 'Cancelled';
  });
  const completedOrders = orders.filter(o => o.status === 'Completed');

  const totalOrders  = periodOrders.length;
  const totalRevenue = completedOrders
    .filter(o => new Date(o.createdAt) >= periodStart)
    .reduce((s, o) => s + (o.totalAmount || 0), 0);
  const avgOrder     = totalOrders ? Math.round(totalRevenue / Math.max(completedOrders.filter(o => new Date(o.createdAt) >= periodStart).length, 1)) : 0;
  const cancelCount  = orders.filter(o => o.status === 'Cancelled' && new Date(o.createdAt) >= periodStart).length;

  // ── Daily breakdown (last 7 days) ──
  const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const dailyData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    const next = new Date(d); next.setDate(d.getDate() + 1);
    const dayOrders = completedOrders.filter(o => {
      const oc = new Date(o.createdAt);
      return oc >= d && oc < next;
    });
    return {
      day:     DAYS[d.getDay()],
      orders:  dayOrders.length,
      revenue: dayOrders.reduce((s, o) => s + (o.totalAmount || 0), 0),
    };
  });

  const maxRevenue = Math.max(...dailyData.map(d => d.revenue), 1);
  const maxOrders  = Math.max(...dailyData.map(d => d.orders), 1);

  // ── Top selling items ──
  const itemMap = {};
  completedOrders.forEach(order => {
    (order.items || []).forEach(item => {
      const key = item.nameSnapshot;
      if (!itemMap[key]) itemMap[key] = { name: key, orders: 0, revenue: 0 };
      itemMap[key].orders  += item.quantity;
      itemMap[key].revenue += item.lineTotal || (item.priceSnapshot * item.quantity);
    });
  });
  const topItems = Object.values(itemMap)
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 5);
  const maxTopOrders = topItems[0]?.orders || 1;

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif"}} className="min-h-screen bg-gray-50">
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>

      {/* NAVBAR */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={()=>navigate('/vendor/dashboard')} className="text-gray-500 hover:text-gray-700 p-1">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center"><span>🦪</span></div>
            <span style={{fontFamily:"'Syne',sans-serif"}} className="text-lg font-black text-gray-900">Sales Reports</span>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {['week','month'].map(p => (
              <button key={p} onClick={()=>setPeriod(p)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all capitalize ${period===p?'bg-white text-green-600 shadow-sm':'text-gray-500'}`}>
                {p==='week'?'This Week':'This Month'}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {loading ? (
        <div className="max-w-5xl mx-auto px-5 py-12 text-center">
          <div className="text-4xl mb-3 animate-pulse">📊</div>
          <p className="text-gray-500 text-sm">Loading your reports...</p>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto px-5 py-6 space-y-5">

          {/* KPI CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {label:'Total Revenue',   value:`LKR ${totalRevenue.toLocaleString()}`, icon:'💰', color:'text-emerald-600'},
              {label:'Total Orders',    value:totalOrders,                            icon:'📦', color:'text-blue-600'},
              {label:'Avg Order Value', value:`LKR ${avgOrder}`,                      icon:'💳', color:'text-violet-600'},
              {label:'Cancelled',       value:cancelCount,                            icon:'❌', color:'text-red-500'},
            ].map(k => (
              <div key={k.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="text-2xl mb-2">{k.icon}</div>
                <div style={{fontFamily:"'Syne',sans-serif"}} className={`text-xl font-black ${k.color}`}>{k.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
              </div>
            ))}
          </div>

          {/* REVENUE BAR CHART */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 style={{fontFamily:"'Syne',sans-serif"}} className="font-black text-gray-800">Revenue — Last 7 Days</h3>
              <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-lg">LKR</span>
            </div>
            <div className="flex items-end gap-3 h-44">
              {dailyData.map(d => {
                const pct = (d.revenue / maxRevenue) * 100;
                return (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium">
                      {d.revenue > 0 ? `${Math.round(d.revenue/1000)}k` : '0'}
                    </span>
                    <div className="w-full flex items-end" style={{height:'120px'}}>
                      <div className={`w-full bg-gradient-to-t from-green-600 to-emerald-400 rounded-t-lg transition-all duration-700 hover:from-green-500 hover:to-emerald-300 cursor-pointer ${pct < 2 ? 'opacity-20' : ''}`}
                        style={{height:`${Math.max(pct, 2)}%`}}
                        title={`LKR ${d.revenue.toLocaleString()}`}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-600">{d.day}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ORDERS PER DAY */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 style={{fontFamily:"'Syne',sans-serif"}} className="font-black text-gray-800 mb-4">Orders Per Day</h3>
            <div className="space-y-3">
              {dailyData.map(d => (
                <div key={d.day} className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-gray-500 w-8 flex-shrink-0">{d.day}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-700"
                      style={{width:`${maxOrders > 0 ? (d.orders/maxOrders)*100 : 0}%`}}/>
                  </div>
                  <span className="text-xs font-bold text-gray-700 w-6 text-right flex-shrink-0">{d.orders}</span>
                </div>
              ))}
            </div>
          </div>

          {/* TOP SELLING ITEMS */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 style={{fontFamily:"'Syne',sans-serif"}} className="font-black text-gray-800 mb-4">🏆 Top Selling Items</h3>
            {topItems.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">No completed orders yet for this period</div>
            ) : (
              <div className="space-y-4">
                {topItems.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white flex-shrink-0 ${COLORS[i] || 'bg-gray-400'}`}>{i+1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-gray-800 truncate">{item.name}</span>
                        <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{item.orders} sold</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div className={`h-full ${COLORS[i] || 'bg-gray-400'} rounded-full transition-all duration-700`}
                            style={{width:`${(item.orders/maxTopOrders)*100}%`}}/>
                        </div>
                        <span className={`text-xs font-bold flex-shrink-0 ${TEXT_COLORS[i] || 'text-gray-500'}`}>LKR {item.revenue.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* DAILY SUMMARY TABLE */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 style={{fontFamily:"'Syne',sans-serif"}} className="font-black text-gray-800 mb-4">Daily Summary</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-semibold text-gray-500 px-3 py-2 bg-gray-50 rounded-l-xl">Day</th>
                    <th className="text-right text-xs font-semibold text-gray-500 px-3 py-2 bg-gray-50">Orders</th>
                    <th className="text-right text-xs font-semibold text-gray-500 px-3 py-2 bg-gray-50">Revenue</th>
                    <th className="text-right text-xs font-semibold text-gray-500 px-3 py-2 bg-gray-50 rounded-r-xl">Avg/Order</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyData.map(d => (
                    <tr key={d.day} className="border-b border-gray-50 last:border-none hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2.5 font-semibold text-gray-700">{d.day}</td>
                      <td className="px-3 py-2.5 text-right text-gray-600">{d.orders}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-green-600">LKR {d.revenue.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right text-gray-500">
                        {d.orders > 0 ? `LKR ${Math.round(d.revenue / d.orders)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-green-50 rounded-xl">
                    <td className="px-3 py-2.5 font-black text-gray-800 rounded-l-xl">Total</td>
                    <td className="px-3 py-2.5 text-right font-black text-gray-800">{totalOrders}</td>
                    <td className="px-3 py-2.5 text-right font-black text-green-600">LKR {totalRevenue.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right font-black text-gray-600 rounded-r-xl">LKR {avgOrder}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}