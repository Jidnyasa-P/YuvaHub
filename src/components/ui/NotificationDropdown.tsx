import React, { useState, useEffect, useRef } from 'react';
import { Bell, MapPin, Zap, Info, Loader2 } from 'lucide-react';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from '../../services/apiClient';

export default function NotificationDropdown({ profile }: { profile: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    const data = await fetchNotifications();
    setNotifications(data || []);
  };

  useEffect(() => {
    loadNotifications();
    
    // Connect to real-time notification stream
    const eventSource = new EventSource('/api/v1/admin/stream/telemetry');
    
    eventSource.addEventListener('NOTIFICATION_RECEIVED', (event: any) => {
      const newNotif = JSON.parse(event.data);
      setNotifications(prev => [newNotif, ...prev]);
    });

    return () => {
      eventSource.close();
    };
  }, [profile]);

  useEffect(() => {
    // Click outside to close
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    loadNotifications();
  };

  const handleMarkAllRead = async () => {
    setLoading(true);
    await markAllNotificationsRead();
    await loadNotifications();
    setLoading(false);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'match': return Zap;
      case 'local': return MapPin;
      case 'welcome': return Bell;
      default: return Info;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="text-gray-400 hover:text-gray-600 relative p-1 rounded-md hover:bg-gray-100 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                {unreadCount} New
              </span>
            )}
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
               <div className="p-8 text-center flex flex-col items-center gap-2">
                 <Bell className="w-8 h-8 text-gray-200" />
                 <p className="text-gray-500 text-xs">All caught up!</p>
               </div>
            ) : (
              notifications.map((n) => {
                const Icon = getIcon(n.type);
                return (
                  <div 
                    key={n.id} 
                    onClick={() => !n.read && handleMarkRead(n.id)}
                    className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer group flex gap-3 ${!n.read ? 'bg-blue-50/30' : ''}`}
                  >
                    <div className="shrink-0 mt-0.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${!n.read ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm mb-0.5 line-clamp-1 ${!n.read ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>{n.title}</h4>
                      <p className="text-xs text-gray-600 mb-1 line-clamp-2">{n.message}</p>
                      <span className="text-[10px] text-gray-400 font-medium">{n.time}</span>
                    </div>
                    {!n.read && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 shrink-0"></div>}
                  </div>
                );
              })
            )}
          </div>
          
          <button 
            onClick={handleMarkAllRead}
            disabled={loading || unreadCount === 0}
            className="w-full p-3 text-center text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors bg-white disabled:opacity-50 disabled:bg-white border-t border-gray-100 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-3 h-3 animate-spin" />}
            Mark all as read
          </button>
        </div>
      )}
    </div>
  );
}
