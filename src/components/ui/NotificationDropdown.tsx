import React, { useState, useEffect, useRef } from 'react';
import { Bell, MapPin, Zap } from 'lucide-react';

export default function NotificationDropdown({ profile }: { profile: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate some contextual notifications based on profile
    const notifs = [];
    if (profile) {
       notifs.push({
         id: 1,
         title: `New ${profile.field || 'Tech'} opportunities found!`,
         message: "We found 3 new opportunities matching your profile.",
         time: "Just now",
         type: "match",
         icon: Zap
       });
       
       if (profile.city || profile.college) {
         notifs.push({
           id: 2,
           title: "Opportunities near you",
           message: `Check out local hackathons happening around ${profile.city || profile.college}.`,
           time: "2 hours ago",
           type: "local",
           icon: MapPin
         });
       }
    } else {
       notifs.push({
         id: 1,
         title: "Welcome to YuvaHub",
         message: "Complete your profile to get personalized opportunity matches.",
         time: "Just now",
         type: "welcome",
         icon: Bell
       });
    }

    setNotifications(notifs);
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="text-gray-400 hover:text-gray-600 relative p-1 rounded-md hover:bg-gray-100 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {notifications.length > 0 && <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-900">Notifications</h3>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">{notifications.length} New</span>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
               <div className="p-6 text-center text-gray-500 text-sm">No new notifications</div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer group flex gap-3">
                  <div className="shrink-0 mt-0.5">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
                      <n.icon className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-0.5 line-clamp-1">{n.title}</h4>
                    <p className="text-xs text-gray-600 mb-1 line-clamp-2">{n.message}</p>
                    <span className="text-[10px] text-gray-400 font-medium">{n.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          <button className="w-full p-3 text-center text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors bg-white">
            Mark all as read
          </button>
        </div>
      )}
    </div>
  );
}
