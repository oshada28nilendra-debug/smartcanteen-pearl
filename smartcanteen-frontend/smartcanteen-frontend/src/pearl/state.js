import { useCallback, useEffect, useState } from 'react';
import API from '../services/api';
export const money = n => `LKR ${Number(n || 0).toLocaleString('en-LK', { maximumFractionDigits: 2 })}`;
export const today = () => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Colombo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const errorText = e => e.response?.data?.message || e.message || 'Something went wrong. Please try again.';
export function useResource(path) {
  const [data,setData]=useState(null), [error,setError]=useState(''), [loading,setLoading]=useState(true);
  const load=useCallback(async()=>{setError('');try{const r=await API.get(path);setData(r.data.data);}catch(e){setError(errorText(e));}finally{setLoading(false);}},[path]);
  useEffect(()=>{setLoading(true);setData(null);load();},[load]);
  return {data,error,loading,reload:load};
}
export function readCart(userId) {
  try { const value=JSON.parse(localStorage.getItem(`pearl:cart:${userId}`)); return value?.items?.length ? value : {vendorId:'',items:[]}; } catch { return {vendorId:'',items:[]}; }
}
export function saveCart(userId, cart) { localStorage.setItem(`pearl:cart:${userId}`,JSON.stringify(cart));window.dispatchEvent(new Event('pearl:cart')); }
export function useCart(userId) {
  const [cart,setCart]=useState(()=>readCart(userId));
  useEffect(()=>{const fn=()=>setCart(readCart(userId));window.addEventListener('pearl:cart',fn);return()=>window.removeEventListener('pearl:cart',fn);},[userId]);
  return [cart, value=>saveCart(userId,value)];
}
