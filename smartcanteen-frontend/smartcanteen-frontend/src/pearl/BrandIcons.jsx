import React from 'react';

// Compact filled/outlined pictograms, matching the approved dashboard's icon weight.
function Icon({size=18,children,...props}) {
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{children}</svg>;
}
export const HomeIcon = props => <Icon {...props}><path d="m3 10 9-7 9 7v11H3Z"/><path d="M9 21v-8h6v8" fill="currentColor" stroke="none"/></Icon>;
export const FoodIcon = props => <Icon {...props}><path d="M4 3v5m3-5v5M3 6h5M5.5 8v5M13 3v10m0-10c5 2 5 6 0 6M4 17h4v4H4zm10 0h4v4h-4z"/></Icon>;
export const OrdersIcon = props => <Icon {...props}><rect x="5" y="6" width="14" height="15" rx="2"/><path d="M9 6V3h6v3M9 11h6M9 15h6M9 18h4"/></Icon>;
export const WalletIcon = props => <Icon {...props}><path d="M3 6h18v14H3zM3 6V4h15v2"/><path d="M15 11h6v5h-6z" fill="currentColor" stroke="none"/><circle cx="17" cy="13.5" r=".7" fill="var(--surface,#fff)" stroke="none"/></Icon>;
export const ProfileIcon = props => <Icon {...props}><circle cx="12" cy="7" r="4" fill="currentColor" stroke="none"/><path d="M4 21v-3a8 6 0 0 1 16 0v3Z" fill="currentColor" stroke="none"/></Icon>;
export const BellIcon = props => <Icon {...props}><path d="M5 17h14l-2-4V9a5 5 0 0 0-10 0v4ZM10 21h4M12 2v2"/></Icon>;
