const parts = now => Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone:'Asia/Colombo', year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23' }).formatToParts(now).map(p=>[p.type,p.value]));
const localDate = (now=new Date()) => { const p=parts(now); return `${p.year}-${p.month}-${p.day}`; };
const vendorAvailability = (vendor, now=new Date()) => {
  vendor=vendor || {};
  const p=parts(now), profile=vendor.vendorProfile || {}, time=`${p.hour}:${p.minute}`;
  const day=new Date(`${localDate(now)}T12:00:00+05:30`).getUTCDay();
  let orderingReason = vendor.accountStatus !== 'active' || vendor.vendorStatus !== 'approved' ? 'Vendor unavailable' : profile.ordersPaused ? 'Ordering paused' : !(profile.openDays || [1,2,3,4,5]).includes(day) || time < (profile.openingTime || '08:00') || time >= (profile.closingTime || '18:00') ? 'Shop closed' : null;
  return {isOpen:!orderingReason, orderingReason};
};
const itemAvailability = (item, vendor, now=new Date()) => {
  const stockRemaining=item.stockDate===localDate(now) ? item.stockRemaining : item.dailyStock;
  return {...item,stockDate:localDate(now),stockRemaining,effectiveAvailable: Boolean(item.isAvailable && stockRemaining>0 && vendorAvailability(vendor,now).isOpen)};
};
module.exports={localDate,vendorAvailability,itemAvailability};
