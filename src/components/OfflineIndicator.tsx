import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-16 left-4 sm:bottom-4 z-40 pointer-events-none flex items-center gap-2 rounded-full bg-[#142225] border border-[#1b2c2e] px-3.5 py-2 text-xs font-medium text-[#e6f2f2] shadow-lg"
    >
      <WifiOff className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
      <span>Çevrimdışı Mod — Yerel belleğe kaydediliyor</span>
    </div>
  );
};
