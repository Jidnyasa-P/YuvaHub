import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Globe, PlusCircle, Users, User, Menu, X, Github, Linkedin, Instagram, Twitter, Bell, MessageSquare, Settings, Activity } from 'lucide-react';
import { auth, signInWithGoogle, logout, db } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { UserProfile } from './types';
import { fetchSystemStats } from './services/apiClient';

// Tab/View Components
import Dashboard from './components/Tabs/Dashboard';
import Opportunities from './components/Tabs/Opportunities';
import SubmitOpportunity from './components/Tabs/SubmitOpportunity';
import Mentorship from './components/Tabs/Mentorship';
import Profile from './components/Tabs/Profile';
import Community from './components/Tabs/Community';
import SettingsTab from './components/Tabs/Settings';
import AdminDashboard from './components/Admin/AdminDashboard';
import NotificationDropdown from './components/ui/NotificationDropdown';
import OpportunityDetail from './components/Tabs/OpportunityDetail';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [backendReady, setBackendReady] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState(new Date().toLocaleTimeString());

  // Dynamic Routing state based on the HTML5 History API (perfect crawlability)
  const [selectedOppId, setSelectedOppId] = useState<string | null>(() => {
    const oppMatch = window.location.pathname.match(/^\/opportunity\/([^/]+)/);
    return oppMatch ? oppMatch[1] : null;
  });

  // Track popstate changes (back and forward buttons on browsers)
  useEffect(() => {
    const handleLocationChange = () => {
      const oppMatch = window.location.pathname.match(/^\/opportunity\/([^/]+)/);
      if (oppMatch) {
         setSelectedOppId(oppMatch[1]);
      } else {
         setSelectedOppId(null);
      }
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const viewOpportunity = (id: string, title?: string) => {
    const cleanTitle = title 
      ? title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
      : "view";
    window.history.pushState(null, '', `/opportunity/${id}/${cleanTitle}`);
    setSelectedOppId(id);
  };

  const clearSelectedOpportunity = () => {
    window.history.pushState(null, '', '/');
    setSelectedOppId(null);
  };

  useEffect(() => {
    const checkBackend = async () => {
      const stats = await fetchSystemStats();
      if (stats) {
        setBackendReady(true);
        setLastSyncedTime(new Date().toLocaleTimeString());
      }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const docRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            setProfile({
              uid: currentUser.uid,
              name: currentUser.displayName || '',
              email: currentUser.email || ''
            });
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setProfile({
            uid: currentUser.uid,
            name: currentUser.displayName || '',
            email: currentUser.email || ''
          });
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'opportunities', label: 'Opportunities', icon: Globe },
    { id: 'submit', label: 'Submit Opportunity', icon: PlusCircle },
    { id: 'mentorship', label: 'Mentorship', icon: Users },
    { id: 'community', label: 'Community', icon: MessageSquare },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
    ...(user?.email === 'uditt490@gmail.com' ? [{ id: 'admin', label: 'Admin', icon: Activity }] : []),
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard user={user} profile={profile} onViewDetails={viewOpportunity} />;
      case 'opportunities': return <Opportunities user={user} profile={profile} onViewDetails={viewOpportunity} />;
      case 'submit': return <SubmitOpportunity user={user} />;
      case 'mentorship': return <Mentorship user={user} />;
      case 'community': return <Community user={user} profile={profile} />;
      case 'profile': return <Profile user={user} profile={profile} setProfile={setProfile} />;
      case 'settings': return <SettingsTab user={user} profile={profile} />;
      case 'admin': return <AdminDashboard />;
      default: return <Dashboard user={user} profile={profile} onViewDetails={viewOpportunity} />;
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-blue-600 font-bold tracking-widest uppercase">INITIALIZING SYSTEM...</div>;
  }

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      
      {/* Sidebar Desktop - Fixed 220px */}
      <aside className="hidden lg:flex w-[220px] border-r border-gray-200 flex-col bg-white z-10 shrink-0 relative">
        <div className="p-6 border-b border-gray-100 flex items-center justify-center">
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-gray-900">Yuva</span><span className="text-blue-600">Hub</span>
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto no-scrollbar">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id && !selectedOppId;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  clearSelectedOpportunity();
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all rounded-lg ${isActive ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent'}`}
                style={{ borderLeftWidth: isActive ? '4px' : '0px', paddingLeft: isActive ? '12px' : '16px' }}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                {tab.label}
              </button>
            )
          })}
        </nav>
        <div className="p-4 border-t border-gray-100">
          {user ? (
            <div className="flex flex-col gap-3">
              <span className="text-xs text-gray-500 font-medium truncate px-2">{user.email}</span>
              <button onClick={logout} className="clean-btn-outline w-full py-2 text-sm">Logout</button>
            </div>
          ) : (
            <button onClick={signInWithGoogle} className="clean-btn w-full py-3 text-sm flex items-center justify-center gap-2">
               Sign in with Google
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 border-b border-gray-200 bg-white z-50 flex items-center justify-between px-4">
        <h1 className="text-xl font-bold">
          <span className="text-gray-900">Yuva</span><span className="text-blue-600">Hub</span>
        </h1>
        <div className="flex items-center gap-4">
          <NotificationDropdown profile={profile} />
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-gray-500 hover:text-gray-900">
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-16 bg-white z-40 p-4 border-b border-gray-200 overflow-y-auto">
          <nav className="space-y-2">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id && !selectedOppId;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    clearSelectedOpportunity();
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-4 text-sm font-medium transition-all rounded-lg ${isActive ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600' : 'text-gray-600 hover:bg-gray-50 border-l-4 border-transparent'}`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              )
            })}
            <div className="pt-6 mt-6 border-t border-gray-100">
              {user ? (
                <button onClick={() => { logout(); setIsMobileMenuOpen(false); }} className="clean-btn-outline w-full py-3 text-sm">Logout</button>
              ) : (
                <button onClick={() => { signInWithGoogle(); setIsMobileMenuOpen(false); }} className="clean-btn w-full py-3 text-sm">Sign in with Google</button>
              )
              }
            </div>
          </nav>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col pt-16 lg:pt-0 h-screen overflow-hidden relative">
        
        {/* Topbar */}
        <div className="hidden lg:flex h-16 border-b border-gray-200 bg-white items-center justify-between px-8 shrink-0">
           <div className="flex-1 max-w-xl">
             <p className="text-sm text-gray-500 font-medium">
               {selectedOppId 
                 ? "Detail Overview" 
                 : (user ? `Welcome back, ${profile?.name || user.displayName || 'Student'}` : 'Welcome to YuvaHub')
               }
             </p>
           </div>
           <div className="flex items-center gap-6">
              <NotificationDropdown profile={profile} />
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                {profile?.name ? profile.name.charAt(0).toUpperCase() : (user?.email?.charAt(0).toUpperCase() || 'U')}
              </div>
           </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 p-4 lg:p-8 overflow-y-auto no-scrollbar pb-24" id="app-content">
          {selectedOppId ? (
            <OpportunityDetail 
              id={selectedOppId} 
              onBack={clearSelectedOpportunity} 
              profile={profile} 
            />
          ) : (
            renderContent()
          )}
        </div>
        
        {/* Live Feed Strip Footer */}
        <div className="absolute bottom-0 left-0 right-0 bg-gray-900 text-gray-400 text-xs py-2 px-6 flex items-center justify-center gap-2 border-t border-gray-800 z-25">
          <span className={`${backendReady ? 'text-green-400' : 'text-red-400'} animate-pulse`}>●</span> 
          <span className="font-medium">{backendReady ? 'Live' : 'Offline'}</span>
          <span className="hidden sm:inline">· Last synced: {lastSyncedTime}</span>
          <span>· Opportunities indexed & verified</span>
          <span className="hidden md:inline">· YuvaHub © 2026</span>
        </div>
      </main>

    </div>
  );
}

export default App;
