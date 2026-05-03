/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, useRef, Component, ReactNode, ErrorInfo } from 'react';
import { 
  Search, MapPin, Bell, BellRing, ExternalLink, Filter, Info, 
  Briefcase, GraduationCap, X, Check, User, Sparkles, TrendingUp,
  BellOff, Settings, ChevronRight, Sliders, Globe, Menu,
  Calendar, ArrowRight, LayoutGrid, List, AlertTriangle, RefreshCw,
  Bookmark, BookmarkCheck, Trash2, Wifi, WifiOff, Clock, Mail, ChevronDown,
  Zap, Copy, Loader2, Users, MessageSquare, Send, Trophy, Star, FileText, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { fetchEventsAndSchemes, getSearchSuggestions, getRelatedDomains, getAssistantResponse, generateDraft, getSmartRefinements } from './services/geminiService';
import { Event, UserLocation, UserProfile, Notification, UserRegistration, Message, RelatedDomains, ChatMessage, ApplicationStatus } from './types';
import { cn } from './lib/utils';
import { 
  auth, 
  signInWithGoogle, 
  signInWithApple, 
  logout, 
  db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from './lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, addDoc, getDocs, query, orderBy, where } from 'firebase/firestore';
import emailjs from '@emailjs/browser';

const INTEREST_OPTIONS = [
  "Technology", "Education", "Healthcare", "Agriculture", "Finance", 
  "Environment", "Social Welfare", "Startup", "Women Empowerment", "Skill Development"
];

interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>(() => {
    const saved = localStorage.getItem('cached_events');
    return saved ? JSON.parse(saved) : [];
  });
  const [lastFetch, setLastFetch] = useState<number>(() => {
    const saved = localStorage.getItem('last_fetch_time');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [loading, setLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'hackathon' | 'scheme' | 'program'>('all');
  const [selectedOrganizer, setSelectedOrganizer] = useState('all');
  const [selectedIndustry, setSelectedIndustry] = useState('all');
  const [selectedEligibility, setSelectedEligibility] = useState('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [nearbyEvents, setNearbyEvents] = useState<Event[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [showApiWarning, setShowApiWarning] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [showAdmin, setShowAdmin] = useState(false);
  const [fetchingSubscribers, setFetchingSubscribers] = useState(false);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginModalMode, setLoginModalMode] = useState<'login' | 'signup'>('login');
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const [showConfirmReg, setShowConfirmReg] = useState<Event | null>(null);
  const [showSuccessReg, setShowSuccessReg] = useState<UserRegistration | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [userRegistrations, setUserRegistrations] = useState<UserRegistration[]>([]);
  const [visibleCount, setVisibleCount] = useState(6);
  const [relatedDomains, setRelatedDomains] = useState<RelatedDomains | null>(null);
  const [isFetchingDeepDive, setIsFetchingDeepDive] = useState(false);
  const [smartRefinements, setSmartRefinements] = useState<string[]>([]);
  const [isSmartRankEnabled, setIsSmartRankEnabled] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const saved = localStorage.getItem('user_notifications');
    return saved ? JSON.parse(saved) : [];
  });
  
  const isAdmin = user?.email === 'uditt490@gmail.com';
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('user_profile');
    return saved ? JSON.parse(saved) : null;
  });
  const [activeTab, setActiveTab] = useState<'discover' | 'recommendations' | 'tracker' | 'community' | 'profile'>('discover');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const chatMessagesContainerRef = useRef<HTMLDivElement>(null);

  const assistantSuggestions = [
    "Find hackathons for beginners",
    "Scholarships for AI/ML students",
    "Top internships in Bangalore",
    "How to build a strong resume?",
    "Government schemes for startups"
  ];

  useEffect(() => {
    if (chatMessagesContainerRef.current) {
      chatMessagesContainerRef.current.scrollTo({
        top: chatMessagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [chatMessages, assistantLoading]);
  const [draftContent, setDraftContent] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const statusColor = useMemo(() => {
    const diff = (new Date().getTime() - lastRefreshed.getTime()) / 1000 / 60;
    if (diff < 5) return 'bg-emerald-500';
    if (diff < 30) return 'bg-amber-500';
    return 'bg-slate-300';
  }, [lastRefreshed]);

  const handleRefreshFeed = () => {
    setLastRefreshed(new Date());
    // In a real app, this would re-fetch data
    addToast("Feed Updated", "Fetched latest opportunities.", "success");
  };
  const [trackerSubTab, setTrackerSubTab] = useState<'applied' | 'saved'>('applied');

  // Sub-components
  const SkeletonCard = () => (
    <div className="bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-8 border border-slate-100 shadow-sm overflow-hidden relative">
      <div className="flex justify-between items-start mb-6">
        <div className="w-24 h-6 bg-slate-200 border-2 border-black rounded-none animate-pulse" />
        <div className="w-8 h-8 bg-slate-200 border-2 border-black rounded-none animate-pulse" />
      </div>
      <div className="w-full h-8 bg-slate-200 border-2 border-black rounded-none animate-pulse mb-4" />
      <div className="w-1/2 h-8 bg-slate-200 border-2 border-black rounded-none animate-pulse mb-8" />
      <div className="flex items-center gap-4 mb-8">
        <div className="w-24 h-4 bg-slate-200 border-2 border-black rounded-none animate-pulse" />
        <div className="w-24 h-4 bg-slate-200 border-2 border-black rounded-none animate-pulse" />
      </div>
      <div className="w-full h-14 bg-slate-200 border-2 border-black rounded-none animate-pulse" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
    </div>
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [assistantInput, setAssistantInput] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [hasVisitedForYou, setHasVisitedForYou] = useState(() => localStorage.getItem('has_visited_for_you') === 'true');

  const [showSettings, setShowSettings] = useState(!profile);
  const [settingsTab, setSettingsTab] = useState<'profile' | 'applications'>('profile');
  const DEFAULT_PROFILE: UserProfile = {
    name: '',
    email: '',
    phone: '',
    address: '',
    dob: '',
    college: '',
    skills: [],
    location: '',
    age: '',
    interests: [],
    notificationsEnabled: false
  };

  const [tempProfile, setTempProfile] = useState<UserProfile>(() => {
    if (profile) return { ...DEFAULT_PROFILE, ...profile };
    return DEFAULT_PROFILE;
  });

  const [regPermission, setRegPermission] = useState(false);
  const [showApplyAssist, setShowApplyAssist] = useState<Event | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Effects
  useEffect(() => {
    setVisibleCount(6);
  }, [searchQuery, filterType]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Sync profile from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            setProfile(data);
            setTempProfile(data);
            localStorage.setItem('user_profile', JSON.stringify(data));
          } else if (firebaseUser.email) {
            // Pre-fill email from auth if no profile exists
            const initialProfile: UserProfile = {
              name: firebaseUser.displayName || '',
              email: firebaseUser.email,
              location: '',
              age: '',
              interests: [],
              notificationsEnabled: false
            };
            setProfile(null);
            setTempProfile(initialProfile);
          }

          // Fetch registrations
          const regsQuery = query(
            collection(db, 'registrations'),
            where('userId', '==', firebaseUser.uid),
            orderBy('registeredAt', 'desc')
          );
          const regsSnapshot = await getDocs(regsQuery);
          const regs = regsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as UserRegistration[];
          setUserRegistrations(regs);
        } catch (err) {
          console.error("Error syncing profile/registrations:", err);
        }
      } else {
        setUserRegistrations([]);
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Track notified events
  const [notifiedEventIds, setNotifiedEventIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('notified_event_ids');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  useEffect(() => {
    // Check for API key on mount
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not set. Please add it to your environment variables.");
      setApiKeyMissing(true);
    }
    loadInitialData();
    getUserLocation();

    const handleOnline = () => {
      setIsOnline(true);
      addToast("Back Online", "Your internet connection has been restored.", "success");
      // Try to fetch fresh data if we were using fallback
      if (isFallback) {
        loadInitialData(true);
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      addToast("Network Lost", "You are currently offline. Using cached data.", "warning");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('form') && !target.closest('.suggestions-dropdown')) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profile, isFallback]);

  const addToast = useCallback((title: string, message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => {
      const newToasts = [...prev, { id, title, message, type }];
      // Limit to 3 most recent toasts to avoid blocking the UI
      return newToasts.slice(-3);
    });
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const loadInitialData = async (force: boolean = false) => {
    const CACHE_DURATION = 1000 * 60 * 60; // 1 hour
    const now = Date.now();
    
    // Skip if we have data and it's not expired, unless forced
    if (!force && events.length > 0 && (now - lastFetch < CACHE_DURATION)) {
      const minutesLeft = Math.round((CACHE_DURATION - (now - lastFetch)) / 60000);
      console.log("Using cached data to save API usage. Next update in:", minutesLeft, "minutes");
      return;
    }

    // Only show loading if we have no cached events
    if (events.length === 0) {
      setLoading(true);
    } else {
      setIsUpdating(true);
    }

    try {
      const data = await fetchEventsAndSchemes(searchQuery, profile || undefined);
      if (data && data.length > 0) {
        // Fallback detection
        const isFromFallback = data.some(e => e.id.startsWith('fb-'));
        setIsFallback(isFromFallback);

        // Notifications for new data
        if (profile?.notificationsEnabled && events.length > 0) {
          const currentIds = new Set(events.map(e => e.id));
          const newEvents = data.filter(e => !currentIds.has(e.id));
          if (newEvents.length > 0) {
            addNotification("Update Found!", `We've synced ${newEvents.length} fresh opportunities.`, "new_event");
          }
        }

        setEvents(data);
        setLastServerSearch(searchQuery);
        setLastFetch(now);
        localStorage.setItem('cached_events', JSON.stringify(data));
        localStorage.setItem('last_fetch_time', now.toString());
      }
    } catch (err) {
      console.error("Failed to fetch events:", err);
      if (events.length === 0) {
        addToast("Fetch Error", "Could not load events. Check your API key.", "warning");
      }
    } finally {
      setLoading(false);
      setIsUpdating(false);
    }
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  };

  const handleSaveProfile = async () => {
    if (!tempProfile.location || !tempProfile.age || !tempProfile.name || !tempProfile.phone || !tempProfile.address || !tempProfile.dob || !tempProfile.college || (tempProfile.skills && tempProfile.skills.length === 0) || (tempProfile.interests || []).length === 0) {
      addToast("Missing Info", "Please fill in all identity fields, college, skills, and select at least one interest.", "warning");
      return;
    }

    setProfile(tempProfile);
    localStorage.setItem('user_profile', JSON.stringify(tempProfile));
    setShowSettings(false);

    // Save to Firestore if logged in
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          ...tempProfile,
          uid: user.uid,
          email: user.email,
          updatedAt: serverTimestamp()
        });
        addToast("Sync Complete", "Your full profile is now synced over the cloud.", "success");
      } catch (err) {
        console.error("Error saving profile:", err);
        addToast("Sync Error", "Could not sync profile to cloud.", "warning");
      }
    } else {
      addToast("Profile Saved", "Saved locally. Log in to sync across devices.", "success");
    }
  };

  const handleNewsletterSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;

    // Basic frontend validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newsletterEmail)) {
      addToast("Invalid Email", "Please enter a valid email address.", "warning");
      return;
    }
    
    setSubscribing(true);
    try {
      const email = newsletterEmail.toLowerCase();
      await setDoc(doc(db, 'newsletter', email), {
        email: email,
        subscribedAt: serverTimestamp()
      });
      
      // Send Email Notification via EmailJS (Free Tier)
      const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

      if (serviceId && templateId && publicKey) {
        try {
          await emailjs.send(
            serviceId,
            templateId,
            {
              to_email: email, // Dynamic recipient
              reply_to: 'uditt490@gmail.com',
              subscriber_email: email,
              timestamp: new Date().toLocaleString()
            },
            publicKey
          );
          console.log("Email notification sent successfully via EmailJS");
        } catch (emailErr) {
          console.error("Email notification failed:", emailErr);
        }
      } else {
        console.warn("EmailJS credentials missing. Check your environment variables.", {
          hasServiceId: !!serviceId,
          hasTemplateId: !!templateId,
          hasPublicKey: !!publicKey
        });
      }

      addToast("Subscribed!", "You've been added to our newsletter.", "success");
      setNewsletterEmail('');
    } catch (err) {
      console.error("Newsletter error:", err);
      addToast("Error", "Could not subscribe. Please try again.", "warning");
    } finally {
      setSubscribing(false);
    }
  };

  const fetchSubscribers = async () => {
    if (!isAdmin) return;
    setFetchingSubscribers(true);
    try {
      const q = query(collection(db, 'newsletter'), orderBy('subscribedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const list = querySnapshot.docs.map(doc => doc.data());
      setSubscribers(list);
    } catch (err) {
      console.error("Error fetching subscribers:", err);
      addToast("Error", "Could not load subscribers.", "warning");
    } finally {
      setFetchingSubscribers(false);
    }
  };

  const handleSendBroadcast = async () => {
    if (!isAdmin || subscribers.length === 0 || !broadcastMessage) return;
    if (!window.confirm(`Are you sure you want to send this broadcast to ${subscribers.length} subscribers? This uses your EmailJS daily quota.`)) return;
    
    setSendingBroadcast(true);
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

    if (!serviceId || !templateId || !publicKey) {
      addToast("Error", "EmailJS credentials missing.", "warning");
      setSendingBroadcast(false);
      return;
    }

    let successCount = 0;
    try {
      // Loop through subscribers and send one by one
      // Note: This is a simple implementation, for large lists a backend is better
      for (const sub of subscribers) {
        try {
          await emailjs.send(
            serviceId,
            templateId,
            {
              to_email: sub.email,
              subscriber_email: sub.email,
              message: broadcastMessage,
              timestamp: new Date().toLocaleString()
            },
            publicKey
          );
          successCount++;
        } catch (err) {
          console.error(`Failed to send email to ${sub.email}:`, err);
        }
      }
      addToast("Broadcast Sent", `Successfully sent to ${successCount} subscribers.`, "success");
      setBroadcastMessage("");
    } catch (err) {
      console.error("Broadcast error:", err);
      addToast("Error", "Some emails failed to send.", "warning");
    } finally {
      setSendingBroadcast(false);
    }
  };

  useEffect(() => {
    if (isAdmin && showAdmin) {
      fetchSubscribers();
    }
  }, [isAdmin, showAdmin]);

  const toggleInterest = (interest: string) => {
    setTempProfile(prev => {
      const currentInterests = prev.interests || [];
      return {
        ...prev,
        interests: currentInterests.includes(interest)
          ? currentInterests.filter(i => i !== interest)
          : [...currentInterests, interest]
      };
    });
  };

  const toggleBookmark = async (eventId: string) => {
    if (!profile) {
      setShowSettings(true);
      addToast("Profile Required", "Please set up your profile to bookmark events.", "info");
      return;
    }

    const isBookmarked = profile.bookmarkedEventIds?.includes(eventId);
    const newBookmarks = isBookmarked
      ? (profile.bookmarkedEventIds || []).filter(id => id !== eventId)
      : [...(profile.bookmarkedEventIds || []), eventId];

    const updatedProfile = { ...profile, bookmarkedEventIds: newBookmarks };
    setProfile(updatedProfile);
    setTempProfile(updatedProfile);
    localStorage.setItem('user_profile', JSON.stringify(updatedProfile));

    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          ...updatedProfile,
          uid: user.uid,
          email: user.email,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (err) {
        console.error("Error syncing bookmark:", err);
      }
    }

    addToast(
      isBookmarked ? "Bookmark Removed" : "Event Bookmarked",
      isBookmarked ? "Removed from your saved list." : "Saved to your bookmarks.",
      "success"
    );
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isProfileComplete = useMemo(() => {
    return !!(profile && 
           profile.name && 
           profile.email && 
           profile.phone && 
           profile.dob && 
           profile.college && 
           profile.skills && 
           (profile.skills.length > 0) && 
           profile.location);
  }, [profile]);

  const handleTabChange = (tab: any) => {
    if (tab === 'recommendations') {
      setHasVisitedForYou(true);
      localStorage.setItem('has_visited_for_you', 'true');
    }
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  const directRegister = async (event: Event) => {
    if (!user) {
      setShowLoginModal(true);
      addToast("Login Required", "Please sign in to use the Apply Assist system.", "info");
      return;
    }

    if (!isProfileComplete) {
      setShowSettings(true);
      addToast("Profile Incomplete", "Please complete your full profile (College, Skills, etc.) to enable Apply Assist.", "warning");
      return;
    }

    if (profile?.registeredEventIds?.includes(event.id)) {
      addToast("Already Applied", "You have already used Apply Assist for this opportunity. Redirecting...", "info");
      window.open(event.applyLink || event.link, '_blank');
      return;
    }

    if (event.isPaid) {
      // Step 3: Paid Opportunity Flow -> Confirmation Modal
      setShowApplyAssist(event);
    } else {
      // Step 2: Free Opportunity Flow -> Redirect with Quick Assist Message
      addToast("Apply Assist Ready", "Your details are prepared. Continuing to official site...", "success");
      confirmDirectRegister(event);
    }
  };

  const confirmDirectRegister = async (eventOverride?: Event) => {
    const event = eventOverride || showApplyAssist;
    if (!event || !user || !profile) return;
    
    setShowApplyAssist(null);
    setRegisteringId(event.id);

    try {
      // Create Assist Log (Backend)
      const regDoc = await addDoc(collection(db, 'registrations'), {
        userId: user.uid,
        userEmail: user.email,
        userName: profile.name || user.displayName,
        userPhone: profile.phone || '',
        userDob: profile.dob || '',
        userCollege: profile.college || '',
        userSkills: profile.skills || [],
        userLocation: profile.location,
        userAge: profile.age,
        eventId: event.id,
        eventTitle: event.title,
        registeredAt: serverTimestamp(),
        type: 'apply_assist'
      });

      // Update Local Assist State
      const newReg: UserRegistration = {
        id: regDoc.id,
        userId: user.uid,
        userEmail: user.email,
        userName: profile.name || user.displayName || undefined,
        userPhone: profile.phone,
        userDob: profile.dob,
        userCollege: profile.college,
        userSkills: profile.skills,
        userLocation: profile.location,
        userAge: profile.age,
        eventId: event.id,
        eventTitle: event.title,
        registeredAt: { toDate: () => new Date() },
        status: 'Applied'
      };
      
      const newRegistrations = [...(profile.registeredEventIds || []), event.id];
      const updatedProfile = { ...profile, registeredEventIds: newRegistrations };
      
      setProfile(updatedProfile);
      setTempProfile(updatedProfile);
      localStorage.setItem('user_profile', JSON.stringify(updatedProfile));
      setUserRegistrations(prev => [newReg, ...prev]);

      await setDoc(doc(db, 'users', user.uid), {
        ...updatedProfile,
        uid: user.uid,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Redirect to official link after a short delay
      setTimeout(() => {
        window.open(event.applyLink || event.link, '_blank');
      }, 500);

    } catch (err) {
      console.error("Apply assist error:", err);
      addToast("Assist Failed", "Redirecting you anyway...", "warning");
      window.open(event.applyLink || event.link, '_blank');
    } finally {
      setRegisteringId(null);
    }
  };

  const addNotification = useCallback((title: string, message: string, type: Notification['type'], link?: string) => {
    const newNotif: Notification = {
      id: Math.random().toString(36).substring(2, 9),
      title,
      message,
      timestamp: Date.now(),
      read: false,
      type,
      link
    };
    setNotifications(prev => {
      const updated = [newNotif, ...prev].slice(0, 50);
      localStorage.setItem('user_notifications', JSON.stringify(updated));
      return updated;
    });
    
    if (profile?.notificationsEnabled || type === 'system' || !profile) {
      addToast(title, message, "info");
    }
  }, [profile, addToast]);

  const markNotificationAsRead = (id: string) => {
    const updatedNotifs = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifications(updatedNotifs);
    localStorage.setItem('user_notifications', JSON.stringify(updatedNotifs));
  };

  const clearNotifications = () => {
    setNotifications([]);
    localStorage.removeItem('user_notifications');
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    if (userLocation && events.length > 0) {
      const nearby = events.filter(event => {
        if (event.coordinates) {
          const distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            event.coordinates.lat,
            event.coordinates.lng
          );
          return distance < 50;
        }
        return false;
      });
      setNearbyEvents(nearby);

      if (profile?.notificationsEnabled || !profile) {
        const newNearbyEvents = nearby.filter(event => !notifiedEventIds.has(event.id));
        if (newNearbyEvents.length > 0) {
          if (newNearbyEvents.length > 2) {
            addNotification(
              "Nearby Opportunities!",
              `We found ${newNearbyEvents.length} new events happening near you. View them in your local feed.`,
              "new_event"
            );
          } else {
            (newNearbyEvents || []).forEach(event => {
              addNotification(
                "Nearby Opportunity!",
                `${event.title} is happening near you.`,
                "new_event",
                event.link
              );
            });
          }
          
          const updatedIds = new Set([...notifiedEventIds, ...newNearbyEvents.map(e => e.id)]);
          setNotifiedEventIds(updatedIds);
          localStorage.setItem('notified_event_ids', JSON.stringify(Array.from(updatedIds)));
        }
      }
    }
  }, [userLocation, events, profile?.notificationsEnabled, notifiedEventIds, addNotification]);

  const organizers = useMemo(() => ['all', ...Array.from(new Set(events.map(e => e.organization)))], [events]);
  const industries = useMemo(() => ['all', ...Array.from(new Set(events.map(e => e.industry).filter(Boolean) as string[]))], [events]);
  const eligibilities = useMemo(() => ['all', ...Array.from(new Set(events.map(e => e.eligibility).filter(Boolean) as string[]))], [events]);

  const [lastServerSearch, setLastServerSearch] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    const saved = localStorage.getItem('recent_searches');
    return saved ? JSON.parse(saved) : [];
  });
  const [isSearching, setIsSearching] = useState(false);

  const filteredEvents = useMemo(() => {
    const list = events.filter(event => {
      // If this list of events was JUST fetched for this search query (or similar),
      // don't apply the strict local string filter, because AI results 
      // might not contain the exact keyword but are relevant (semantic search).
      const currentQuery = searchQuery.trim().toLowerCase();
      const lastQuery = lastServerSearch.trim().toLowerCase();
      
      const isAIPerfectMatch = currentQuery !== '' && 
                             (currentQuery === lastQuery || 
                              (lastQuery !== '' && currentQuery.startsWith(lastQuery)));
      
      const title = event.title?.toLowerCase() || "";
      const org = event.organization?.toLowerCase() || "";
      const desc = event.description?.toLowerCase() || "";
      const ind = event.industry?.toLowerCase() || "";
      const elig = event.eligibility?.toLowerCase() || "";
      const queryStr = currentQuery;

      const matchesSearch = isAIPerfectMatch || 
                          title.includes(queryStr) ||
                          org.includes(queryStr) ||
                          desc.includes(queryStr) ||
                          ind.includes(queryStr) ||
                          elig.includes(queryStr);

      const matchesType = filterType === 'all' || event.type === filterType;
      const matchesOrganizer = selectedOrganizer === 'all' || event.organization === selectedOrganizer;
      const matchesIndustry = selectedIndustry === 'all' || event.industry === selectedIndustry;
      const matchesEligibility = selectedEligibility === 'all' || event.eligibility === selectedEligibility;
      
      return matchesSearch && matchesType && matchesOrganizer && matchesIndustry && matchesEligibility;
    });

    if (isSmartRankEnabled && profile) {
      return [...list].sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;
        
        const textA = (a.title + " " + a.description + " " + a.industry).toLowerCase();
        const textB = (b.title + " " + b.description + " " + b.industry).toLowerCase();

        (profile.interests || []).forEach(i => {
          if (textA.includes(i.toLowerCase())) scoreA += 2;
          if (textB.includes(i.toLowerCase())) scoreB += 2;
        });
        (profile.skills || []).forEach(s => {
          if (textA.includes(s.toLowerCase())) scoreA += 3;
          if (textB.includes(s.toLowerCase())) scoreB += 3;
        });
        (profile.preferredDomains || []).forEach(d => {
          if (textA.includes(d.toLowerCase())) scoreA += 4;
          if (textB.includes(d.toLowerCase())) scoreB += 4;
        });

        return scoreB - scoreA;
      });
    }

    return list;
  }, [events, searchQuery, filterType, selectedOrganizer, selectedIndustry, selectedEligibility, lastServerSearch, isSmartRankEnabled, profile]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2 && !isUpdating && !loading) {
        setIsFetchingSuggestions(true);
        const results = await getSearchSuggestions(searchQuery);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
        setIsFetchingSuggestions(false);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleAssistantChat = async (e?: React.FormEvent, directInput?: string) => {
    if (e) e.preventDefault();
    const input = directInput || assistantInput.trim();
    if (!input) return;

    if (!directInput) setAssistantInput('');
    
    // Only add user message if it's not a direct trigger message (or we can include it)
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: input, timestamp: Date.now() };
    setChatMessages(prev => [...prev, userMsg]);
    setIsAssistantOpen(true);
    setAssistantLoading(true);

    const response = await getAssistantResponse(input, profile, events);
    const assistantMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: response, timestamp: Date.now() };
    setChatMessages(prev => [...prev, assistantMsg]);
    setAssistantLoading(false);
  };

  const getRecommendedEvents = useMemo(() => {
    if (!profile) return events.slice(0, 4);
    
    // Simple relevance scoring
    return [...events].sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // Interest matching
      (profile?.interests || []).forEach(interest => {
        if (a.description.toLowerCase().includes(interest.toLowerCase())) scoreA += 2;
        if (b.description.toLowerCase().includes(interest.toLowerCase())) scoreB += 2;
      });

      // Domain matching
      (profile?.preferredDomains || []).forEach(domain => {
        if (a.title.toLowerCase().includes(domain.toLowerCase())) scoreA += 3;
        if (b.title.toLowerCase().includes(domain.toLowerCase())) scoreB += 3;
      });

      // Skill matching
      (profile?.skills || []).forEach(skill => {
        if (a.description.toLowerCase().includes(skill.toLowerCase())) scoreA += 4;
        if (b.description.toLowerCase().includes(skill.toLowerCase())) scoreB += 4;
      });

      // Budget matching
      if (profile.budgetPreference === 'free') {
        if (!a.isPaid) scoreA += 5;
        if (!b.isPaid) scoreB += 5;
      }

      return scoreB - scoreA;
    }).slice(0, 10);
  }, [events, profile]);

  const updateApplicationStatus = async (regId: string, status: ApplicationStatus) => {
    try {
      const regRef = doc(db, 'registrations', regId);
      await setDoc(regRef, { status }, { merge: true });
      setUserRegistrations(prev => prev.map(r => r.id === regId ? { ...r, status } : r));
      addToast("Status Updated", `Marked as ${status}`, "success");
    } catch (err) {
      console.error("Update status error:", err);
    }
  };

  const handleSearch = async (e?: React.FormEvent | string) => {
    if (e && typeof e !== 'string') e.preventDefault();
    const query = (typeof e === 'string' ? e : searchQuery).trim();
    if (!query) return;

    setSearchQuery(query); // Ensure state matches the query being searched
    setLoading(true);
    setShowSuggestions(false);
    
    // Reset advanced filters on new search to ensure results are visible
    setFilterType('all');
    setSelectedOrganizer('all');
    setSelectedIndustry('all');
    setSelectedEligibility('all');
    setVisibleCount(6);

    try {
      const results = await fetchEventsAndSchemes(query, profile || undefined);
      
      // Fallback detection in search
      const isFromFallback = results.some(e => e.id.startsWith('fb-'));
      setIsFallback(isFromFallback);
      
      if (results.length > 0 && query) {
        addNotification("Search Results", `AI found ${results.length} results for "${query}"`, "system");
      }
      
      setLastServerSearch(query); // Update this BEFORE setEvents to ensure filter re-runs correctly
      setEvents(results);
      
      // Fetch smart refinements in background
      getSmartRefinements(query, profile).then(refinements => {
        setSmartRefinements(refinements);
      });

      if (results.length === 0) {
        addToast("No Results", "Try broadening your search terms.", "info");
      }
    } catch (err) {
      console.error("Search error:", err);
      addToast("Search Error", "Check your connection and try again.", "warning");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      setProfile(null);
      setUserRegistrations([]);
      addToast("Signed Out", "Come back soon!", "info");
    } catch (err) {
      addToast("Error", "Failed to sign out.", "warning");
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'recommendations':
        if (!user) {
          return (
            <div className="p-8 h-full flex items-center justify-center">
              <div className="max-w-md w-full text-center p-12 bg-indigo-50/50 border border-indigo-100 rounded-[40px] shadow-sm">
                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-indigo-600 mx-auto mb-8 shadow-xl shadow-indigo-100">
                  <Sparkles className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Personalized for You</h3>
                <p className="text-slate-500 font-medium mb-10 leading-relaxed">Log in to see opportunities matched specifically to your skills, interests, and profile.</p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => { setLoginModalMode('login'); setShowLoginModal(true); }}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-200"
                  >
                    Login to Continue
                  </button>
                  <button 
                    onClick={() => { setLoginModalMode('signup'); setShowLoginModal(true); }}
                    className="w-full py-4 text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 rounded-2xl transition-all"
                  >
                    Create Free Account
                  </button>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="p-8">
            <header className="mb-10">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Recommended for You</h2>
              <p className="text-slate-500 font-medium max-w-2xl">Based on your profile, we think you'll excel in these opportunities.</p>
            </header>

            {!profile?.smartMatchOnboarded ? (
              <div className="p-12 text-center bg-indigo-50 rounded-[40px] border border-indigo-100 mb-10">
                <Sparkles className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
                <h3 className="text-xl font-black text-slate-900 mb-2">Personalize Your Feed</h3>
                <p className="text-slate-600 mb-8 max-w-md mx-auto font-medium">Complete a quick 1-minute onboarding quiz to unlock better recommendations.</p>
                <button 
                  onClick={() => setShowOnboarding(true)}
                  className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100"
                >
                  Start Onboarding
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {getRecommendedEvents.map((event, idx) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <EventCard event={event} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        );

      case 'tracker':
        return (
          <div className="p-6 lg:p-10 max-w-screen-2xl mx-auto">
            <header className="mb-10">
              <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-2">My Tracker</h2>
              <p className="text-slate-500 font-medium max-w-xl">Organize your journey, track applications, and view your saved picks.</p>
            </header>

            <div className="flex items-center gap-2 mb-10 p-1.5 bg-slate-100 rounded-2xl w-fit">
              <button 
                onClick={() => setTrackerSubTab('applied')}
                className={cn(
                  "px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                  trackerSubTab === 'applied' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Applications
              </button>
              <button 
                onClick={() => setTrackerSubTab('saved')}
                className={cn(
                  "px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                  trackerSubTab === 'saved' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Saved Items
              </button>
            </div>

            {trackerSubTab === 'applied' ? (
              userRegistrations.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 max-w-5xl">
                  {userRegistrations.map((reg) => (
                    <motion.div 
                      key={reg.id} 
                      className="bg-white p-6 md:p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group relative overflow-hidden"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="absolute top-0 right-0 h-full w-2 bg-indigo-500 opacity-20" />
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                          <div className={cn(
                            "w-16 h-16 rounded-3xl flex items-center justify-center shadow-inner",
                            reg.status === 'Selected' ? "bg-emerald-50 text-emerald-600" :
                            reg.status === 'Rejected' ? "bg-red-50 text-red-600" :
                            "bg-slate-50 text-slate-400"
                          )}>
                            {reg.status === 'Selected' ? <Trophy className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
                          </div>
                          <div>
                            <h4 className="text-xl font-black text-slate-900 mb-1 leading-tight">{reg.eventTitle}</h4>
                            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs font-bold text-slate-400 uppercase tracking-[0.1em]">
                              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Applied {reg.registeredAt?.toDate ? new Date(reg.registeredAt.toDate()).toLocaleDateString() : 'Recently'}</span>
                              <span className="w-1 h-1 bg-slate-200 rounded-full" />
                              <span className="text-indigo-600 font-black">Status: {reg.status}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 p-1 bg-slate-50 rounded-2xl">
                          {(['Interested', 'Applied', 'Rejected', 'Selected'] as ApplicationStatus[]).map((status) => (
                            <button
                              key={status}
                              onClick={() => updateApplicationStatus(reg.id, status)}
                              className={cn(
                                "px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                reg.status === status 
                                  ? "bg-white text-indigo-600 shadow-sm border border-indigo-100" 
                                  : "text-slate-400 hover:text-slate-600"
                              )}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="mt-8 pt-8 border-t border-slate-50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                          { item: 'Resume/CV', key: 'resume' },
                          { item: 'Pitch Deck', key: 'deck' },
                          { item: 'ID Proof', key: 'id' },
                          { item: 'GitHub/Portfolio', key: 'portfolio' }
                        ].map((check) => (
                          <div key={check.key} className="flex items-center justify-between px-5 py-4 bg-slate-50/50 rounded-2xl border border-transparent hover:border-indigo-100 transition-colors">
                             <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{check.item}</span>
                             <div className="w-5 h-5 rounded-lg border-2 border-slate-200 bg-white flex items-center justify-center cursor-pointer hover:border-indigo-400 transition-all active:scale-95 group/check">
                               <Check className="w-3.5 h-3.5 text-white group-hover/check:text-indigo-400" />
                             </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-24 bg-white rounded-[40px] border border-dashed border-slate-200">
                  <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mx-auto mb-6">
                    <Calendar className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-2">No Applications Tracked</h3>
                  <p className="text-slate-500 font-medium mb-8 max-w-sm mx-auto">Apply to opportunities and track your progress through every stage.</p>
                  <button 
                    onClick={() => setActiveTab('discover')}
                    className="bg-slate-900 px-8 py-4 rounded-[24px] text-[10px] font-black text-white uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200"
                  >
                    Explore Feeds
                  </button>
                </div>
              )
            ) : (
              /* Saved Items */
              profile?.bookmarkedEventIds && profile.bookmarkedEventIds.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {/* Tracked Events List */}
                  {events
                    .filter(e => profile.bookmarkedEventIds?.includes(e.id))
                    .map(event => (
                      <div key={event.id} className="bg-white p-8 border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative group overflow-hidden">
                        <div className="flex justify-between items-start mb-6">
                          <div className={cn(
                            "px-4 py-2 border-2 border-black text-[10px] font-black uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                            event.type === 'hackathon' ? "bg-neo-yellow text-black" :
                            event.type === 'internship' ? "bg-neo-green text-black" :
                            "bg-neo-pink text-white"
                          )}>
                            {event.type}
                          </div>
                          <button 
                            onClick={() => toggleBookmark(event.id)}
                            className="text-black hover:scale-110 transition-transform"
                          >
                            <Bookmark className="w-6 h-6 fill-neo-pink" />
                          </button>
                        </div>
                        <h4 className="text-2xl font-black text-black leading-tight mb-4 uppercase tracking-tighter italic">{event.title}</h4>
                        <div className="flex items-center gap-4 text-[10px] font-black text-black/40 uppercase tracking-widest mb-8">
                           <span className="flex items-center gap-2 border-b-2 border-black/10"><Calendar className="w-4 h-4" /> {event.date}</span>
                        </div>
                        <button 
                          onClick={() => { setSelectedEvent(event); setShowConfirmReg(event); }}
                          className="w-full py-5 bg-black text-white brutal-btn font-black text-[10px] uppercase tracking-[0.2em]"
                        >
                          Access Intel
                        </button>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-24 bg-white border-[4px] border-black border-dashed">
                  <div className="w-24 h-24 bg-neo-pink border-4 border-black flex items-center justify-center text-white mx-auto mb-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rotate-[-6deg]">
                    <Bookmark className="w-12 h-12" />
                  </div>
                  <h3 className="text-3xl font-black text-black mb-2 uppercase tracking-tighter italic">Archive Empty</h3>
                  <p className="text-black/50 font-black text-xs mb-10 max-w-sm mx-auto uppercase tracking-widest leading-relaxed">Your surveillance list has no data. Scout the field for opportunities.</p>
                  <button 
                    onClick={() => setActiveTab('discover')}
                    className="bg-black text-white brutal-btn px-10 py-5 text-[10px] font-black uppercase tracking-[0.2em]"
                  >
                    Start Patrol
                  </button>
                </div>
              )
            )}
          </div>
        );

      case 'community':
        return (
          <div className="p-8 lg:p-12 max-w-screen-2xl">
            <header className="mb-16">
              <h2 className="text-5xl lg:text-7xl font-black text-black tracking-[-0.04em] leading-none mb-4 uppercase italic">Comm Hall</h2>
              <p className="text-black font-black uppercase tracking-[0.25em] opacity-40 text-xs">Coalition archives: learn // adapt // conquer.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <section>
                <h3 className="text-[10px] font-black text-black uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                  <Star className="w-5 h-5 text-neo-yellow fill-neo-yellow" /> Battlefield Victories
                </h3>
                <div className="space-y-6">
                  {[
                    { name: 'Aditya S.', win: 'MLH Fellowship Scouted', text: 'YuvaHub data points were critical. Secured fellowship deployment after 3 months of tracking.', date: '2 days ago' },
                    { name: 'Priya M.', win: 'SIH Selection Confirmed', text: 'Detected SIH target 7 days before deadline via feed. National victory achieved.', date: '1 week ago' },
                  ].map((story, idx) => (
                    <div key={idx} className="bg-white p-8 border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-neo-yellow/10" />
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 border-2 border-black bg-neo-blue flex items-center justify-center text-white font-black text-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                          {story.name[0]}
                        </div>
                        <div>
                          <h4 className="text-lg font-black text-black uppercase tracking-tight italic">{story.name}</h4>
                          <p className="text-[10px] text-neo-green font-black uppercase tracking-widest">{story.win}</p>
                        </div>
                      </div>
                      <p className="text-sm text-black leading-relaxed font-black uppercase tracking-tighter opacity-60">"{story.text}"</p>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-[10px] font-black text-black uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-neo-pink" /> Neural Network
                </h3>
                <div className="p-10 bg-black text-white border-[4px] border-black shadow-[12px_12px_0px_0px_rgba(34,197,94,1)] overflow-hidden relative group">
                  <div className="relative z-10">
                    <h4 className="text-4xl font-black mb-4 uppercase tracking-tighter italic leading-none">JOIN THE <span className="text-neo-green">COALITION</span></h4>
                    <p className="text-white/60 text-xs font-black uppercase tracking-widest mb-10 max-w-xs leading-relaxed">Mobilize with 5.2k units. Data relays, team assembly, and tactical support via decrypted WhatsApp channel.</p>
                    <button className="bg-neo-green text-black brutal-btn px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] shadow-none hover:bg-white transition-all">
                      INFILTRATE WHATSAPP
                    </button>
                  </div>
                  <Users className="absolute -right-12 -bottom-12 w-48 h-48 text-white/5 group-hover:rotate-12 transition-transform duration-700" />
                </div>
              </section>
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="p-8 lg:p-12 max-w-4xl">
            <header className="mb-12">
              <h2 className="text-5xl font-black text-black tracking-tighter uppercase italic leading-none mb-4">Command Center</h2>
              <p className="text-black font-black uppercase tracking-widest text-[10px] opacity-40">User identity // access protocols // system preferences.</p>
            </header>
            
            <div className="bg-white border-[4px] border-black p-10 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-12">
              <section>
                <h3 className="text-[10px] font-black text-black uppercase tracking-[0.3em] mb-8 border-b-2 border-black inline-block pb-1">Personnel Info</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-black uppercase tracking-widest px-1 opacity-50">Full Name</label>
                    <input 
                      type="text" 
                      value={tempProfile.name || ''}
                      onChange={(e) => setTempProfile(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full brutal-input px-6 py-4 text-sm font-black uppercase tracking-tight"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-black uppercase tracking-widest px-1 opacity-50">Email Address</label>
                    <input 
                      type="email" 
                      value={tempProfile.email || ''}
                      onChange={(e) => setTempProfile(prev => ({ ...prev, email: e.target.value }))}
                      disabled={!!user}
                      className={cn(
                        "w-full brutal-input px-6 py-4 text-sm font-black tracking-tight",
                        user ? "bg-slate-50 opacity-40 cursor-not-allowed shadow-none" : "bg-white"
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-black uppercase tracking-widest px-1 opacity-50">Educational Base</label>
                    <input 
                      type="text" 
                      value={tempProfile.college || ''}
                      onChange={(e) => setTempProfile(prev => ({ ...prev, college: e.target.value }))}
                      className="w-full brutal-input px-6 py-4 text-sm font-black uppercase tracking-tight"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-black uppercase tracking-widest px-1 opacity-50">Comms Logic (Phone)</label>
                    <input 
                      type="text" 
                      value={tempProfile.phone || ''}
                      onChange={(e) => setTempProfile(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full brutal-input px-6 py-4 text-sm font-black tracking-tight"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-black uppercase tracking-widest px-1 opacity-50">Chronology (DOB)</label>
                    <input 
                      type="date" 
                      value={tempProfile.dob || ''}
                      onChange={(e) => setTempProfile(prev => ({ ...prev, dob: e.target.value }))}
                      className="w-full brutal-input px-6 py-4 text-sm font-black tracking-tight"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="block text-[10px] font-black text-black uppercase tracking-widest px-1 opacity-50">Strategic Location (Address)</label>
                    <input 
                      type="text" 
                      value={tempProfile.address || ''}
                      onChange={(e) => setTempProfile(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full brutal-input px-6 py-4 text-sm font-black uppercase tracking-tight"
                    />
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-12 border-t-2 border-black pt-12">
                <div>
                  <h4 className="text-[10px] font-black text-black uppercase tracking-[0.3em] mb-6 border-b-2 border-black inline-block pb-1 italic">Tactical Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {['Frontend', 'Backend', 'Python', 'Design', 'Management', 'Public Speaking', 'Data Analysis', 'Problem Solving'].map(s => (
                      <button 
                        key={s}
                        onClick={() => {
                          const skills = tempProfile.skills || [];
                          setTempProfile({ ...tempProfile, skills: skills.includes(s) ? skills.filter(x => x !== s) : [...skills, s] });
                        }}
                        className={cn(
                          "px-4 py-2 border-2 border-black text-[9px] font-black uppercase tracking-widest transition-all", 
                          tempProfile.skills?.includes(s) ? "bg-neo-blue text-white shadow-none translate-x-[1px] translate-y-[1px]" : "bg-white text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-black uppercase tracking-[0.3em] mb-6 border-b-2 border-black inline-block pb-1 italic">Intel Focus</h4>
                  <div className="flex flex-wrap gap-2">
                    {['AI/ML', 'Blockchain', 'Cybersecurity', 'Sustainable Devel.', 'Govt. Schemes', 'Internships', 'Social Impact'].map(d => (
                      <button 
                        key={d}
                        onClick={() => {
                          const domains = tempProfile.preferredDomains || [];
                          setTempProfile({ ...tempProfile, preferredDomains: domains.includes(d) ? domains.filter(x => x !== d) : [...domains, d] });
                        }}
                        className={cn(
                          "px-4 py-2 border-2 border-black text-[9px] font-black uppercase tracking-widest transition-all", 
                          tempProfile.preferredDomains?.includes(d) ? "bg-neo-yellow text-black shadow-none translate-x-[1px] translate-y-[1px]" : "bg-white text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]"
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="bg-neo-yellow/10 border-2 border-black p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)]">
                <h3 className="text-[10px] font-black text-black uppercase tracking-[0.3em] mb-6 italic">Signal Configuration</h3>
                <div className="flex items-center justify-between p-6 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex items-start gap-5">
                    <div className="p-3 bg-neo-pink text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      <BellRing className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-black uppercase tracking-tighter italic">Opportunity Pings</h4>
                      <p className="text-[9px] text-black/50 font-black uppercase tracking-widest leading-relaxed mt-1">Real-time alerts for schemes, hackathons, and deadlines.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setTempProfile(prev => ({ ...prev, notificationsEnabled: !prev.notificationsEnabled }))}
                    className={cn(
                      "relative inline-flex h-8 w-14 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-colors focus:outline-none",
                      tempProfile.notificationsEnabled ? "bg-neo-green" : "bg-white"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-6 w-6 transform border border-black bg-white transition-transform",
                        tempProfile.notificationsEnabled ? "translate-x-6" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              </section>

              <div className="flex items-center justify-between pt-10 border-t-2 border-black">
                {user ? (
                  <button 
                    onClick={handleSignOut}
                    className="text-neo-pink text-[10px] font-black uppercase tracking-[0.2em] border-2 border-neo-pink px-6 py-4 hover:bg-neo-pink hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
                  >
                    Terminate Session
                  </button>
                ) : (
                  <button 
                    onClick={() => setShowLoginModal(true)}
                    className="flex items-center gap-3 text-neo-blue border-2 border-neo-blue text-[10px] font-black uppercase tracking-[0.2em] px-6 py-4 hover:bg-neo-blue hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
                  >
                    <User className="w-4 h-4" />
                    Initiate Access
                  </button>
                )}
                <button 
                  onClick={handleSaveProfile}
                  disabled={isUpdating}
                  className="bg-black text-white brutal-btn px-10 py-5 text-[10px] font-black uppercase tracking-[0.3em] disabled:opacity-50"
                >
                  {isUpdating ? 'Uploading Data...' : 'Commit Changes'}
                </button>
              </div>
            </div>
          </div>
        );

      default: // Discover
        return (
          <div className="p-6 lg:p-10 max-w-screen-2xl mx-auto">
            {/* Existing Hero & Search */}
            <header className="mb-12">
              {apiKeyMissing && showApiWarning && (
                <div className="mb-10 p-8 bg-neo-yellow border-[4px] border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group">
                  <div className="flex items-start gap-6 relative z-10">
                    <div className="w-14 h-14 bg-white border-2 border-black flex items-center justify-center text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xl font-black text-black mb-1 uppercase tracking-tighter italic">Engine Offline: AI Disabled</h4>
                      <p className="text-xs text-black font-black leading-relaxed max-w-xl uppercase tracking-widest opacity-70">
                        Smart match algorithm requires authentication. Infiltrate the environment by providing GEMINI_API_KEY.
                      </p>
                    </div>
                  </div>
                  <div className="mt-8 flex items-center gap-4 relative z-10">
                    <button 
                      onClick={() => setShowApiWarning(false)}
                      className="px-6 py-4 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black text-[10px] uppercase tracking-widest hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                    >
                      Ignore Intel
                    </button>
                    <button 
                      onClick={() => addToast("Protocol", "Insert credentials in the Settings matrix.", "info")}
                      className="px-8 py-4 bg-black text-white brutal-btn font-black text-[10px] uppercase tracking-[0.2em]"
                    >
                      Initialize Key
                    </button>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-4 mb-8">
                <div className="flex items-center gap-3 px-6 py-3 bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <div className={cn("w-2.5 h-2.5 rounded-none border border-black animate-pulse", statusColor)} />
                  <span className="text-[10px] font-black text-black uppercase tracking-[0.25em]">
                    Live Stream // Synchronized: {getRelativeTime(lastRefreshed)}
                  </span>
                  <button 
                    onClick={handleRefreshFeed}
                    disabled={isUpdating}
                    className="p-1 text-black hover:bg-black hover:text-white border-black transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={cn("w-4 h-4", isUpdating && "animate-spin")} />
                  </button>
                </div>
              </div>
              <div className="mb-12 max-w-3xl">
                 <h2 className="text-5xl lg:text-7xl font-black text-black tracking-[-0.04em] leading-[0.9] uppercase italic">
                   CLAIM YOUR <span className="text-neo-pink underline decoration-[8px] decoration-black underline-offset-[12px] not-italic">FUTURE</span> NOW.
                 </h2>
              </div>

              <div className="max-w-2xl relative group mb-12">
                <div className="relative">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                    {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  </div>
                  <input 
                    type="text" 
                    placeholder="Search hackathons, scholarships, domains..."
                    className="w-full pl-16 pr-32 py-6 brutal-input text-lg font-black placeholder:text-black/30"
                    value={searchQuery}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch();
                      }
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSearchQuery(val);
                      if (val === '') {
                        setLastServerSearch('');
                        setSmartRefinements([]);
                      }
                    }}
                    onFocus={() => setShowSuggestions(true)}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="p-2 text-black/40 hover:text-black transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  <button 
                    onClick={() => handleSearch()}
                    className="brutal-btn bg-black text-white px-6 py-3 text-sm font-black uppercase tracking-widest"
                  >
                    Search
                  </button>
                  </div>
                </div>
                
                {/* AI Refinements */}
                {smartRefinements.length > 0 && !loading && (
                  <div className="flex flex-wrap gap-3 mt-8 px-2">
                    <span className="text-[10px] font-black text-black uppercase tracking-[0.2em] self-center mr-2 italic border-b-2 border-black">Refined Intel:</span>
                    {smartRefinements.map((ref, idx) => (
                      <button 
                        key={idx}
                        onClick={() => {
                          setSearchQuery(ref);
                          handleSearch(ref);
                          setSmartRefinements([]);
                        }}
                        className="px-5 py-2 bg-white border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-[10px] font-black uppercase tracking-widest hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all flex items-center gap-2 group"
                      >
                        <Zap className="w-3 h-3 text-neo-yellow group-hover:scale-125 transition-transform" />
                        {ref}
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Suggestions Dropdown */}
                <AnimatePresence>
                  {showSuggestions && (recentSearches.length > 0 || searchQuery.length > 0) && (
                    <motion.div 
                      className="absolute top-full left-0 right-0 mt-6 bg-white border-[4px] border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] p-6 z-[100] suggestions-dropdown overflow-hidden"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                      {searchQuery.length === 0 && recentSearches.length > 0 && (
                        <div className="mb-8">
                           <div className="flex items-center justify-between mb-4 px-2">
                             <span className="text-[10px] font-black text-black uppercase tracking-[0.2em] italic border-b-2 border-black">Recent Logs</span>
                             <button onClick={() => { setRecentSearches([]); localStorage.removeItem('recent_searches'); }} className="text-[10px] font-black text-neo-pink uppercase hover:underline">Flush Logs</button>
                           </div>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                             {recentSearches.map((s, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => { setSearchQuery(s); handleSearch(s); }}
                                  className="flex items-center gap-4 px-5 py-3 border-2 border-black bg-white hover:bg-neo-yellow shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] text-left text-xs font-black uppercase tracking-tight transition-all"
                                >
                                  <Clock className="w-4 h-4 text-black/30 shrink-0" />
                                  {s}
                                </button>
                              ))}
                           </div>
                        </div>
                      )}

                      <div className="mb-4 px-2">
                        <span className="text-[10px] font-black text-black uppercase tracking-[0.2em] italic border-b-2 border-black">System Recommended Targets</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[
                          "Google Summer of Code", 
                          "DAAD Scholarship", 
                          "IIT Bombay Hackathon",
                          "Reliance Foundation Scholarship",
                          "Smart India Hackathon",
                          "Tata Imagination Challenge",
                          "HDFC Badhte Kadam",
                          "Stanford University Scholarship",
                        ].map((s, idx) => (
                           <button
                             key={idx}
                             onClick={() => { setSearchQuery(s); handleSearch(s); }}
                             className="flex items-center gap-4 px-5 py-3 border-2 border-black bg-white hover:bg-neo-blue hover:text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] text-left text-xs font-black uppercase tracking-tight transition-all"
                           >
                             <Zap className="w-4 h-4 text-neo-yellow group-hover:scale-125 transition-transform shrink-0" />
                             {s}
                           </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </header>

            {/* Filter Bar */}
            <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-4 no-scrollbar -mx-6 px-6 lg:mx-0 lg:px-0">
               {filterType !== 'all' && (
                  <button 
                    onClick={() => setFilterType('all')}
                    className="flex items-center gap-2.5 px-5 py-3 brutal-btn bg-neo-pink text-white text-[10px] font-black uppercase tracking-widest whitespace-nowrap shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                    Reset
                  </button>
                )}
              {[
                { id: 'all', label: 'All', icon: LayoutGrid, color: 'bg-neo-yellow' },
                { id: 'hackathon', label: 'Hackathons', icon: Sparkles, color: 'bg-neo-blue' },
                { id: 'scheme', label: 'Scholarships', icon: GraduationCap, color: 'bg-neo-green' },
                { id: 'program', label: 'Mentorships', icon: Briefcase, color: 'bg-neo-violet' },
                { id: 'internship', label: 'Internships', icon: ExternalLink, color: 'bg-neo-pink' },
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setFilterType(type.id as any)}
                  className={cn(
                    "flex items-center gap-3 px-6 py-3.5 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border-2 border-black shrink-0",
                    filterType === type.id 
                      ? type.color + " text-black shadow-none translate-x-[2px] translate-y-[2px]" 
                      : "bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
                  )}
                >
                  <type.icon className={cn("w-3.5 h-3.5", filterType === type.id ? "text-black" : "text-black/30")} />
                  {type.label}
                </button>
              ))}

              <div className="flex-1" />

              {profile && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (!profile.smartMatchOnboarded) {
                        setShowOnboarding(true);
                      } else {
                        setIsSmartRankEnabled(!isSmartRankEnabled);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-3 px-8 py-4 border-[3px] border-black text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap group relative overflow-hidden",
                      isSmartRankEnabled
                        ? "bg-neo-blue text-white shadow-none translate-x-[2px] translate-y-[2px]"
                        : "bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
                    )}
                  >
                    <div className="relative z-10 flex items-center gap-3">
                      <Zap className={cn("w-4 h-4", isSmartRankEnabled ? "fill-white" : "fill-current")} />
                      {isSmartRankEnabled ? (
                        <>
                          <span className="flex items-center gap-3 italic">
                            Smart Sync Active
                            <span className="w-2 h-2 bg-neo-green border border-black animate-pulse" />
                          </span>
                        </>
                      ) : 'Activate Smart Sync'}
                    </div>
                  </button>
                  <div className="group relative">
                    <button className="p-2 text-slate-300 hover:text-indigo-500 transition-colors">
                      <Info className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-slate-900 text-white text-[10px] font-bold rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all shadow-2xl z-50">
                      AI-powered matching based on your profile interests, skills and studies.
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-12 flex flex-wrap items-center gap-6 mb-12 p-8 bg-white border-[4px] border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex flex-col gap-2 min-w-[200px] flex-1">
                <label className="text-[10px] font-black text-black uppercase tracking-widest px-1">Source</label>
                <select 
                  value={selectedOrganizer}
                  onChange={(e) => setSelectedOrganizer(e.target.value)}
                  className="w-full bg-white brutal-input px-4 py-3 text-xs font-black uppercase"
                >
                  {organizers.map(o => <option key={o} value={o}>{o === 'all' ? 'All Units' : o}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-2 min-w-[200px] flex-1">
                <label className="text-[10px] font-black text-black uppercase tracking-widest px-1">Sector</label>
                <select 
                  value={selectedIndustry}
                  onChange={(e) => setSelectedIndustry(e.target.value)}
                  className="w-full bg-white brutal-input px-4 py-3 text-xs font-black uppercase"
                >
                  {industries.map(i => <option key={i} value={i}>{i === 'all' ? 'All Sectors' : i}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-2 min-w-[200px] flex-1">
                <label className="text-[10px] font-black text-black uppercase tracking-widest px-1">Security Clearance</label>
                <select 
                  value={selectedEligibility}
                  onChange={(e) => setSelectedEligibility(e.target.value)}
                  className="w-full bg-white brutal-input px-4 py-3 text-xs font-black uppercase"
                >
                  {eligibilities.map(el => <option key={el} value={el}>{el === 'all' ? 'Universal' : el}</option>)}
                </select>
              </div>

              <button 
                onClick={() => {
                  setSelectedOrganizer('all');
                  setSelectedIndustry('all');
                  setSelectedEligibility('all');
                  setFilterType('all');
                }}
                className="self-end px-6 py-4 border-2 border-neo-pink text-[10px] font-black text-neo-pink uppercase tracking-widest hover:bg-neo-pink hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-none"
              >
                Flush System
              </button>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {filteredEvents.length === 0 ? (
                    <motion.div 
                      key="no-results"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="col-span-full py-24 text-center bg-white border-[4px] border-black border-dashed shadow-[12px_12px_0px_0px_rgba(0,0,0,0.05)]"
                    >
                      <div className="w-20 h-20 bg-neo-yellow border-4 border-black mx-auto mb-8 flex items-center justify-center rotate-12 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                        <Info className="w-10 h-10 text-black" />
                      </div>
                      <h3 className="text-3xl font-black text-black mb-2 uppercase tracking-tighter italic">No Target Found</h3>
                      <p className="text-black/50 text-xs font-black mb-10 px-8 leading-relaxed uppercase tracking-widest max-w-xl mx-auto">
                        {isFallback && searchQuery 
                          ? `Protocol limited. Local archives do not contain data regarding "${searchQuery}".`
                          : "Recalibrate your search parameters. The network is vast, but these coordinates are empty."}
                      </p>
                      <button 
                        onClick={() => {
                          setSelectedOrganizer('all');
                          setSelectedIndustry('all');
                          setSelectedEligibility('all');
                          setFilterType('all');
                          setSearchQuery('');
                          setLastServerSearch('');
                          loadInitialData(true);
                        }}
                        className="bg-black text-white brutal-btn px-10 py-5 text-[10px] font-black uppercase tracking-[0.2em]"
                      >
                        {isFallback ? 'Restore Default' : 'System Purge'}
                      </button>
                    </motion.div>
                  ) : (
                    filteredEvents
                      .slice(0, visibleCount)
                      .map((event, idx) => (
                        <motion.div
                          layout
                          key={event.id}
                          id={`event-${event.id}`}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.4, delay: idx * 0.05 }}
                        >
                          <EventCard event={event} />
                        </motion.div>
                      ))
                  )}
                </AnimatePresence>
                
                {filteredEvents.length > visibleCount && (
                   <button 
                    onClick={() => setVisibleCount(prev => prev + 6)}
                    className="col-span-full py-12 mt-8 brutal-btn bg-white text-black hover:bg-neo-yellow flex flex-col items-center gap-4 group mx-auto w-full max-w-sm"
                   >
                     <RefreshCw className="w-8 h-8 group-hover:rotate-180 transition-transform duration-1000" />
                     <span className="text-sm font-black uppercase tracking-widest">Deploy More Intel</span>
                   </button>
                )}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-neo-yellow/10 font-sans text-black selection:bg-neo-yellow selection:text-black flex flex-col">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-[100] w-full bg-white border-b-[3px] border-black h-20 flex items-center shrink-0">
        <div className="max-w-screen-2xl mx-auto w-full px-6 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => handleTabChange('discover')}>
            <div className="bg-neo-yellow border-2 border-black w-10 h-10 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:translate-x-[1px] group-hover:translate-y-[1px] group-hover:shadow-none transition-all">
              <Sparkles className="text-black w-5 h-5" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-black tracking-tighter text-black leading-none">YuvaHub</h1>
              <p className="text-[10px] uppercase tracking-widest font-black text-black/50 mt-1">Student Platform</p>
            </div>
          </div>

          {/* Main Nav (Center) - Desktop */}
          <nav className="hidden md:flex items-center gap-1 bg-white p-1 rounded-none border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            {[
              { id: 'discover', label: 'Explore', sub: 'New feeds', icon: Globe, color: 'bg-neo-yellow' },
              { id: 'recommendations', label: 'For You', sub: 'Smart Picks', icon: Sparkles, badge: !hasVisitedForYou ? 'New' : null, color: 'bg-neo-green' },
              { id: 'assistant', label: 'Ask AI', sub: 'Chat Assit', icon: MessageSquare, isAssistant: true, color: 'bg-neo-pink' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => item.isAssistant ? setIsAssistantOpen(true) : handleTabChange(item.id as any)}
                title={item.sub}
                className={cn(
                  "relative flex items-center gap-2.5 px-5 py-2 transition-all group overflow-hidden border-r-2 border-black last:border-r-0",
                  activeTab === item.id && !item.isAssistant
                    ? item.color + " text-black" 
                    : "text-black/60 hover:bg-slate-50"
                )}
              >
                <item.icon className={cn("w-4 h-4", activeTab === item.id && !item.isAssistant ? "text-black" : "text-black/40 group-hover:text-black")} />
                <div className="text-left">
                  <p className="font-black text-[10px] leading-none mb-0.5">{item.label}</p>
                  <p className="text-[7px] uppercase tracking-widest font-black opacity-50">{item.sub}</p>
                </div>
              </button>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            {!user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <button 
                  onClick={() => { setLoginModalMode('signup'); setShowLoginModal(true); }}
                  className="hidden sm:block text-black text-[10px] font-black uppercase tracking-widest px-4 py-2 hover:underline"
                >
                  Sign Up Free
                </button>
                <button 
                  onClick={() => { setLoginModalMode('login'); setShowLoginModal(true); }}
                  className="brutal-btn flex items-center gap-2.5 px-6 py-3 bg-neo-yellow text-black text-[10px] font-black uppercase tracking-widest"
                >
                  <User className="w-4 h-4" />
                  <span>Login</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowNotifications(true)}
                  className="relative p-3 bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all"
                >
                  <Bell className="w-5 h-5" />
                  {notifications.some(n => !n.read) && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-neo-pink border-2 border-black rounded-full" />
                  )}
                </button>
                <button 
                  onClick={() => setActiveTab('profile')}
                  className={cn(
                    "flex items-center gap-3 pl-2 pr-3 py-2 border-2 border-black transition-all",
                    activeTab === 'profile' ? "bg-neo-blue text-white shadow-none translate-x-[2px] translate-y-[2px]" : "bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all"
                  )}
                >
                  <div className="w-8 h-8 border-2 border-black bg-neo-pink flex items-center justify-center text-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                    {user.photoURL ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <User className="w-4 h-4" />}
                  </div>
                  <div className="hidden lg:block text-left">
                    <p className="text-[10px] font-black text-black uppercase">My Profile</p>
                    <p className="text-[9px] font-bold text-black/40 -mt-0.5 max-w-[80px] truncate">{user.displayName || user.email}</p>
                  </div>
                </button>
              </div>
            )}
            
            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-4 bg-white text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Desktop (Secondary Nav) */}
        <aside className="hidden lg:flex w-72 bg-white border-r-[3px] border-black flex-col shrink-0 overflow-y-auto">
          <div className="p-8 pt-6">
            <h3 className="text-[10px] font-black text-black uppercase tracking-widest mb-6 px-4">Dashboard</h3>
            <nav className="space-y-1.5">
              {[
                { id: 'discover', label: 'Discover', icon: Globe, sub: 'Explore all', color: 'bg-neo-yellow' },
                { id: 'assistant', label: 'AI Assistant', icon: Sparkles, sub: 'Instant help', isAssistant: true, color: 'bg-neo-pink' },
                { id: 'tracker', label: 'My Tracker', icon: Calendar, sub: 'Applied & Saved', color: 'bg-neo-green' },
                { id: 'community', label: 'Community', icon: Users, sub: 'Connect & Discuss', color: 'bg-neo-blue' },
                { id: 'profile', label: 'Settings', icon: Settings, sub: 'Account Privacy', color: 'bg-neo-violet' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => item.isAssistant ? setIsAssistantOpen(true) : handleTabChange(item.id as any)}
                  className={cn(
                    "w-full flex items-center gap-3 px-5 py-4 transition-all group border-2 border-black",
                    activeTab === item.id && !item.isAssistant 
                      ? item.color + " translate-x-[4px] translate-y-[4px] shadow-none" 
                      : "bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", activeTab === item.id && !item.isAssistant ? "text-black" : "text-black/40 group-hover:text-black")} />
                  <div className="text-left">
                    <p className="font-black text-sm tracking-tight">{item.label}</p>
                    <p className="text-[9px] font-bold text-black/40 mt-0.5">{item.sub}</p>
                  </div>
                </button>
              ))}
            </nav>

            <div className="mt-12 bg-neo-yellow border-[3px] border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-black/5 rotate-45 transform translate-x-10 -translate-y-10" />
              <div className="bg-white w-14 h-14 border-2 border-black flex items-center justify-center text-black mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:rotate-12 transition-transform">
                <Trophy className="w-7 h-7" />
              </div>
              <h4 className="text-xl font-black text-black mb-2 uppercase tracking-tighter italic leading-none">Win ₹50K Bounty</h4>
              <p className="text-[10px] font-black text-black/60 uppercase tracking-widest leading-relaxed mb-6">Deploy your skills in monthly operations. Build your legacy.</p>
              <button 
                onClick={() => { handleTabChange('discover'); setFilterType('hackathon'); }}
                className="w-full py-5 bg-black text-white brutal-btn text-[10px] font-black uppercase tracking-[0.2em] shadow-none"
              >
                Infiltrate Now
              </button>
            </div>
          </div>

          <div className="mt-auto p-6">
            <div className="bg-neo-blue border-[4px] border-black h-[280px] p-10 relative overflow-hidden group shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
               <div className="absolute top-0 right-0 p-8">
                 <div className="w-16 h-16 bg-white border-2 border-black flex items-center justify-center shadow-[4px_4px_00x_0px_rgba(0,0,0,1)]">
                    <TrendingUp className="w-8 h-8 text-black" />
                 </div>
               </div>
              <div className="relative z-10 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-3 h-3 bg-neo-green border border-black animate-pulse" />
                   <p className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Operational Protocol</p>
                </div>
                <h4 className="text-white font-black text-2xl uppercase tracking-tighter leading-[1.1] mb-auto italic">
                   India's premier node for student intelligence & strategic scaling.
                </h4>
                <button 
                  onClick={() => handleTabChange('discover')}
                  className="w-full bg-white text-black border-2 border-black py-5 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-neo-yellow transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
                >
                  Acquire Targets
                </button>
              </div>
              <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-black/10 rounded-full group-hover:scale-150 transition-transform duration-1000" />
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto h-full scroll-smooth bg-white md:bg-transparent">
          {renderContent()}
        </main>
      </div>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm md:hidden"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[160] bg-white border-t-[6px] border-black p-8 md:hidden flex flex-col gap-8 shadow-[0px_-20px_0px_0px_rgba(0,0,0,0.1)]"
            >
              <div className="w-16 h-2 bg-black border border-white rounded-none mx-auto mb-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" />
              
              <div className="grid grid-cols-2 gap-6">
                {[
                  { id: 'discover', label: 'Discover', icon: Globe, sub: 'Explore all' },
                  { id: 'tracker', label: 'Tracker', icon: Calendar, sub: 'Save events' },
                  { id: 'community', label: 'Community', icon: Users, sub: 'Social space' },
                  { id: 'profile', label: 'Settings', icon: User, sub: 'Manage identity' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { handleTabChange(item.id as any); setIsMobileMenuOpen(false); }}
                    className={cn(
                      "flex flex-col items-center justify-center p-8 border-[4px] border-black transition-all gap-4 relative overflow-hidden group",
                      activeTab === item.id 
                        ? "bg-neo-blue text-white shadow-none translate-x-[2px] translate-y-[2px]" 
                        : "bg-white text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                    )}
                  >
                    <item.icon className={cn("w-10 h-10", activeTab === item.id ? "text-white" : "text-black")} />
                    <div className="text-center">
                      <p className="text-xs font-black uppercase tracking-widest">{item.label}</p>
                      <p className={cn("text-[9px] font-black opacity-30 mt-1 uppercase", activeTab === item.id ? "text-white" : "text-black")}>{item.sub}</p>
                    </div>
                  </button>
                ))}
              </div>

              {!user && (
                <button 
                  onClick={() => { setIsMobileMenuOpen(false); setLoginModalMode('signup'); setShowLoginModal(true); }}
                  className="w-full py-6 bg-black text-white brutal-btn font-black text-xs uppercase tracking-[0.2em]"
                >
                  Join the Coalition
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* AI Assistant Sidebar/Modal */}
      <AnimatePresence>
        {isAssistantOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAssistantOpen(false)}
              className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 z-[300] w-full max-w-lg bg-white border-l-[4px] border-black shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b-[4px] border-black flex items-center justify-between bg-neo-pink text-black relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Sparkles className="w-40 h-40" />
                </div>
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-12 h-12 bg-white border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    <Sparkles className="w-6 h-6 text-black" />
                  </div>
                  <div>
                    <h2 className="font-black text-2xl tracking-tight leading-none mb-1">YuvaHub AI</h2>
                    <p className="text-[10px] font-black text-black/60 uppercase tracking-[0.2em]">Always Helpful</p>
                  </div>
                </div>
                <button onClick={() => setIsAssistantOpen(false)} className="relative z-10 p-2 hover:bg-black hover:text-white border-2 border-black transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div 
                ref={chatMessagesContainerRef}
                className="flex-1 overflow-y-auto p-6 space-y-6 bg-orange-50/20 no-scrollbar pb-20"
              >
                {chatMessages.length === 0 && (
                  <div className="py-10">
                    <div className="text-center mb-10">
                      <div className="w-20 h-20 bg-neo-yellow border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-black mx-auto mb-6">
                        <MessageSquare className="w-10 h-10" />
                      </div>
                      <h3 className="text-2xl font-black text-black mb-2 tracking-tight">How can I help you?</h3>
                      <p className="text-black/60 font-bold text-sm max-w-xs mx-auto">I can help you find opportunities, draft applications, and plan your career path.</p>
                    </div>
                    
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-black/40 uppercase tracking-widest px-2 mb-2">Suggested Questions</p>
                      {assistantSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => handleAssistantChat(undefined, suggestion)}
                          className="w-full text-left p-4 bg-white border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-sm font-black text-black hover:bg-neo-yellow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center justify-between group"
                        >
                          {suggestion}
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {chatMessages.map((msg) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={msg.id} 
                    className={cn(
                      "max-w-[90%] p-5 text-sm font-black leading-relaxed border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                      msg.role === 'user' 
                        ? "bg-neo-yellow text-black ml-auto" 
                        : "bg-white text-black prose prose-indigo max-w-none"
                    )}
                  >
                    {msg.role === 'assistant' ? (
                       <div className="markdown-body">
                         <Markdown>{msg.content}</Markdown>
                       </div>
                    ) : msg.content}
                  </motion.div>
                ))}
                {assistantLoading && (
                  <div className="bg-white border-2 border-black p-5 w-20 flex gap-1 justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <div className="w-2 h-2 bg-black rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-black rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-2 h-2 bg-black rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                )}
              </div>

              <div className="p-6 border-t-[4px] border-black bg-white">
                <form onSubmit={handleAssistantChat} className="relative">
                  <input 
                    type="text" 
                    placeholder="Message YuvaHub AI..."
                    className="w-full pl-6 pr-14 py-5 bg-white brutal-input text-sm font-black"
                    value={assistantInput}
                    onChange={(e) => setAssistantInput(e.target.value)}
                    disabled={assistantLoading}
                  />
                  <button 
                    type="submit" 
                    disabled={!assistantInput.trim() || assistantLoading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-black text-white border-2 border-black flex items-center justify-center hover:bg-neo-pink hover:text-black transition-all disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
                <div className="mt-4 text-center">
                   <p className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em]">Powered by Gemini</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Onboarding Modal */}
      <AnimatePresence>
        {showOnboarding && <SmartMatchOnboarding onComplete={() => setShowOnboarding(false)} />}
      </AnimatePresence>

      <NotificationsPanel />
      <SuccessModal />
      <DraftViewer />
      <ToastContainer />
      <AnimatePresence>
        {showLoginModal && <LoginModal />}
      </AnimatePresence>

      {/* Floating Toggle for Mobile AI */}
      <button 
        onClick={() => setIsAssistantOpen(true)}
        className="lg:hidden fixed bottom-24 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center z-[200] active:scale-90 transition-transform"
      >
        <Sparkles className="w-6 h-6" />
      </button>
    </div>
  );

  // Sub-components
  function DraftViewer() {
    return (
      <AnimatePresence>
        {draftContent && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDraftContent('')} className="fixed inset-0 z-[400] bg-slate-900/40 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[410] w-full max-w-2xl bg-white border-[4px] border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-8 border-b-[4px] border-black flex items-center justify-between bg-neo-yellow">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black"><FileText className="w-5 h-5" /></div>
                  <h3 className="text-2xl font-black text-black tracking-tight uppercase italic">Target: Application Draft</h3>
                </div>
                <button onClick={() => setDraftContent('')} className="p-2 border-2 border-black hover:bg-black hover:text-white transition-all"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-10 bg-orange-50/10">
                <div className="bg-neo-pink text-white border-2 border-black p-6 mb-8 flex gap-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                   <AlertCircle className="w-6 h-6 shrink-0" />
                   <div>
                     <p className="text-sm font-black uppercase tracking-widest mb-1">Warning: User Action Required</p>
                     <p className="text-xs leading-relaxed font-bold uppercase opacity-80">This is an AI blueprint. You MUST personalize this data before infiltration. Non-customized content will be detected.</p>
                   </div>
                </div>
                <div className="whitespace-pre-wrap text-sm text-black leading-relaxed font-black font-mono bg-white p-8 border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                  {draftContent}
                </div>
              </div>
              <div className="p-8 border-t-[4px] border-black flex gap-4 bg-white">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(draftContent);
                    addToast("Data Secured", "Template copied to clipboard. Deploy as needed.", "success");
                  }}
                  className="flex-1 py-5 bg-black text-white brutal-btn font-black text-xs uppercase tracking-[0.2em]"
                >
                  Acquire Text
                </button>
                <button onClick={() => setDraftContent('')} className="flex-1 py-5 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] text-black font-black text-xs uppercase tracking-widest transition-all">Abort</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // Sub-components
  function EventCard({ event }: { event: Event }) {
    const isRegistered = profile?.registeredEventIds?.includes(event.id);
    const isBookmarked = profile?.bookmarkedEventIds?.includes(event.id);

    return (
      <div id={`event-${event.id}`} className="brutal-card flex flex-col h-full active:scale-[0.98] group">
        <div className="p-8 pb-4 flex-1">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-2">
              <span className={cn(
                "px-3 py-1 text-[9px] font-black uppercase tracking-widest border-2 border-black",
                event.type === 'hackathon' ? "bg-neo-yellow text-black" :
                event.type === 'scheme' ? "bg-neo-green text-black" :
                "bg-neo-pink text-white"
              )}>
                {event.type}
              </span>
              {!event.isPaid && (
                <span className="bg-white border-2 border-black text-black px-2 py-0.5 text-[8px] font-black uppercase tracking-tighter">
                  Free
                </span>
              )}
            </div>
            <div className="flex gap-1.5">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleAssistantChat(undefined, `Help me write a statement of purpose (SOP) for ${event.title} organized by ${event.organization}.`);
                }}
                className="p-2.5 transition-all border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-neo-blue transition-colors"
                title="Draft SOP with AI"
              >
                <FileText className="w-4 h-4" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); toggleBookmark(event.id); }}
                className={cn(
                  "p-2.5 transition-all border-2 border-black",
                  isBookmarked ? "bg-black text-white shadow-none" : "bg-white text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-neo-pink"
                )}
              >
                {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <p className="text-[10px] font-black text-black/60 uppercase tracking-widest mb-1.5">{event.organization}</p>
          <h3 className="text-xl font-black text-black leading-[1.2] mb-3 group-hover:underline transition-all">
            {event.title}
          </h3>
          <p className="text-xs text-black/70 font-bold leading-relaxed mb-6 line-clamp-3">
            {event.description}
          </p>

          <div className="space-y-2.5 mb-6">
            <div className="flex items-center gap-2.5 text-xs font-black text-black/60">
              <Calendar className="w-3.5 h-3.5" />
              <span>Ends {event.date}</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs font-black text-black/60">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate">{event.location}</span>
            </div>
          </div>
        </div>

        <div className="px-8 pb-8 pt-0 mt-auto">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => directRegister(event)}
              className={cn(
                "flex-1 brutal-btn flex items-center justify-center gap-2 px-6 py-4 text-[11px] font-black uppercase tracking-widest",
                isRegistered 
                  ? "bg-black/10 text-black/40 shadow-none translate-x-[3px] translate-y-[3px]" 
                  : "bg-neo-yellow text-black"
              )}
              disabled={isRegistered}
            >
              <Zap className={cn("w-4 h-4", isRegistered ? "text-black/20" : "fill-black")} />
              {isRegistered ? 'Registered' : 'Apply Fast'}
            </button>
            <a 
              href={event.link}
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              title="Official Site"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  function SmartMatchOnboarding({ onComplete }: { onComplete: () => void }) {
    const [step, setStep] = useState(1);
    const [data, setData] = useState<Partial<UserProfile>>({
      interests: profile?.interests || [],
      degree: profile?.degree || '',
      yearOfStudy: profile?.yearOfStudy || '',
      college: profile?.college || '',
      location: profile?.location || '',
      eligibility: profile?.eligibility || 'Open to all',
      notificationsEnabled: profile?.notificationsEnabled || false
    });

    const handleNext = () => {
      if (step < 3) setStep(step + 1);
      else {
        const updated = { ...profile, ...data, smartMatchOnboarded: true } as UserProfile;
        setProfile(updated);
        localStorage.setItem('user_profile', JSON.stringify(updated));
        if (user) {
          setDoc(doc(db, 'users', user.uid), updated, { merge: true });
        }
        onComplete();
      }
    };

    const INTERESTS = ['AI/ML', 'Web Dev', 'Design', 'Finance', 'Research', 'Social Impact', 'Hardware', 'Biotech'];

    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          onClick={() => onComplete()}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
        />
        <motion.div 
          initial={{ scale: 0.9, y: 20, opacity: 0 }} 
          animate={{ scale: 1, y: 0, opacity: 1 }} 
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          className="bg-white w-full max-w-md border-[4px] border-black p-10 relative shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex gap-2">
               {[1, 2, 3].map(s => (
                 <div key={s} className={cn("h-3 border-2 border-black transition-all duration-500", s === step ? "bg-neo-pink w-10" : s < step ? "bg-neo-green w-4" : "bg-white w-4")} />
               ))}
            </div>
            <span className="text-[10px] font-black text-black uppercase tracking-[0.2em]">{step}/3</span>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h3 className="text-3xl font-black text-black mb-2 tracking-tighter uppercase italic">Interested?</h3>
                <p className="text-sm font-black text-black/50 mb-8 uppercase tracking-widest leading-relaxed">Select domains you want to dominate.</p>
                <div className="flex flex-wrap gap-2 mb-10">
                  {INTERESTS.map(interest => (
                    <button
                      key={interest}
                      onClick={() => {
                        const current = data.interests || [];
                        setData({ ...data, interests: current.includes(interest) ? current.filter(i => i !== interest) : [...current, interest] });
                      }}
                      className={cn(
                        "px-4 py-2 text-xs font-black border-2 border-black transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                        data.interests?.includes(interest) ? "bg-neo-yellow text-black shadow-none translate-x-[1px] translate-y-[1px]" : "bg-white text-black hover:bg-neo-pink"
                      )}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <h3 className="text-3xl font-black text-black mb-2 tracking-tighter uppercase italic">Studies</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-black uppercase tracking-widest px-1">Year</label>
                      <select 
                        value={data.yearOfStudy} 
                        onChange={e => setData({ ...data, yearOfStudy: e.target.value })}
                        className="w-full bg-white brutal-input px-4 py-4 text-sm font-black"
                      >
                        <option value="">Select Year</option>
                        {['1st Year', '2nd Year', '3rd Year', '4th Year+', 'Masters', 'PhD'].map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-black uppercase tracking-widest px-1">Degree</label>
                      <input 
                        placeholder="e.g. B.Tech"
                        value={data.degree} 
                        onChange={e => setData({ ...data, degree: e.target.value })}
                        className="w-full bg-white brutal-input px-4 py-4 text-sm font-black"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-black uppercase tracking-widest px-1">University</label>
                    <input 
                      placeholder="Enter your college name"
                      value={data.college} 
                      onChange={e => setData({ ...data, college: e.target.value })}
                      className="w-full bg-white brutal-input px-4 py-4 text-sm font-black"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <h3 className="text-3xl font-black text-black mb-2 tracking-tighter uppercase italic">Preferences</h3>
                <div className="space-y-4">
                   <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-black uppercase tracking-widest px-1">Location</label>
                    <input 
                      placeholder="e.g. Karnataka"
                      value={data.location} 
                      onChange={e => setData({ ...data, location: e.target.value })}
                      className="w-full bg-white brutal-input px-4 py-4 text-sm font-black"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-black uppercase tracking-widest px-1">Eligibility</label>
                    <select 
                      value={data.eligibility} 
                      onChange={e => setData({ ...data, eligibility: e.target.value })}
                      className="w-full bg-white brutal-input px-4 py-4 text-sm font-black"
                    >
                      <option value="Open to all">Open to all</option>
                      <option value="Indian nationals">Indian nationals</option>
                      <option value="Women only">Women only</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-neo-yellow/20 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex items-center gap-3">
                      <Bell className="w-4 h-4 text-black" />
                      <span className="text-xs font-black uppercase tracking-widest">Notifications</span>
                    </div>
                    <button 
                      onClick={() => setData({ ...data, notificationsEnabled: !data.notificationsEnabled })}
                      className={cn("w-12 h-7 border-2 border-black transition-colors relative", data.notificationsEnabled ? "bg-neo-green" : "bg-white")}
                    >
                      <div className={cn("absolute top-0.5 w-5 h-5 bg-black border border-white transition-all", data.notificationsEnabled ? "left-6" : "left-0.5")} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-10 flex gap-4">
            {step > 1 && (
              <button 
                onClick={() => setStep(step - 1)}
                className="flex-1 py-4 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-black hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] font-black text-[10px] uppercase tracking-widest transition-all"
              >
                Back
              </button>
            )}
            <button 
              onClick={handleNext}
              className="flex-[2] py-4 bg-black text-white brutal-btn font-black text-[10px] uppercase tracking-widest hover:bg-neo-pink hover:text-black transition-all"
            >
              {step === 3 ? 'Activate Hub' : 'Proceed'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }
  // Extract other modals to sub-components for better organization
  function LoginModal() {
    const [isLogin, setIsLogin] = useState(loginModalMode === 'login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);

    useEffect(() => {
      setIsLogin(loginModalMode === 'login');
    }, [loginModalMode]);

    const handleEmailAuth = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
        if (isLogin) {
          await signInWithEmailAndPassword(auth, email, password);
          addToast("Welcome Back!", "Successfully signed in.", "success");
        } else {
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName: name });
            addToast("Account Created", "Welcome to YuvaHub!", "success");
          } catch (createErr: any) {
            if (createErr.code === 'auth/email-already-in-use') {
              addToast("Email Exists", "This email is already registered. Try logging in.", "warning");
              setIsLogin(true);
              setLoading(false);
              return;
            }
            throw createErr;
          }
        }
        setShowLoginModal(false);
      } catch (err: any) {
        console.error("Auth error:", err);
        addToast("Authentication Error", err.message || "Failed to authenticate.", "warning");
      } finally {
        setLoading(false);
      }
    };

    const handleGoogleLogin = async () => {
      setLoading(true);
      try {
        await signInWithGoogle();
        addToast("Welcome!", "Successfully signed in.", "success");
        setShowLoginModal(false);
      } catch (err: any) {
        console.error("Google login error:", err);
        addToast("Login Failed", "Failed to sign in with Google.", "warning");
      } finally {
        setLoading(false);
      }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email) {
        addToast("Email Required", "Please enter your email to reset password.", "warning");
        return;
      }
      setLoading(true);
      try {
        await sendPasswordResetEmail(auth, email);
        addToast("Reset Sent", "Check your email for password reset instructions.", "success");
        setShowForgotPassword(false);
      } catch (err: any) {
        addToast("Error", err.message || "Failed to send reset email.", "warning");
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={() => setShowLoginModal(false)} 
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
        />
        <motion.div 
          initial={{ scale: 0.9, y: 20, opacity: 0 }} 
          animate={{ scale: 1, y: 0, opacity: 1 }} 
          exit={{ scale: 0.9, y: 20, opacity: 0 }} 
          className="bg-white w-full max-w-md border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden relative z-10"
        >
          <div className="p-8 sm:p-10">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="bg-neo-yellow border-2 border-black w-12 h-12 flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <Sparkles className="text-black w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tighter text-black uppercase">
                    {showForgotPassword ? 'Reset' : (isLogin ? 'Login' : 'Join')}
                  </h2>
                  <p className="text-black/50 text-[10px] font-black uppercase tracking-widest mt-0.5">
                    {showForgotPassword ? 'Enter email' : 'Empower your future'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowLoginModal(false)}
                className="p-2 border-2 border-black hover:bg-neo-pink transition-colors"
              >
                <X className="w-6 h-6 text-black" />
              </button>
            </div>

            {showForgotPassword ? (
              <form onSubmit={handleResetPassword} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-2 px-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
                    <input 
                      required
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full pl-12 pr-6 py-4 brutal-input text-sm font-black"
                    />
                  </div>
                </div>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-4 bg-black text-white brutal-btn font-black text-xs uppercase tracking-widest disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
                <button 
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full text-center text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  Back to Login
                </button>
              </form>
            ) : (
              <>
                <button 
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-4 border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all active:scale-[0.98]"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="currentColor"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor"/>
                  </svg>
                  <span className="text-sm font-black text-black uppercase tracking-tight">Continue with Google</span>
                </button>

                <div className="relative mb-8">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t-2 border-black"></div></div>
                  <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-white px-4 font-black text-black/30 tracking-widest italic">Secret Entrance</span></div>
                </div>

                <form onSubmit={handleEmailAuth} className="space-y-4">
                  {!isLogin && (
                    <div>
                      <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-2 px-1">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
                        <input 
                          required
                          type="text" 
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="John Doe"
                          className="w-full pl-12 pr-6 py-4 brutal-input text-sm font-black"
                        />
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-2 px-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
                      <input 
                        required
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full pl-12 pr-6 py-4 brutal-input text-sm font-black"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-2 px-1">Password</label>
                    <div className="relative">
                      {!loading && <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />}
                      <input 
                        required
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-6 py-4 brutal-input text-sm font-black"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button 
                      type="button" 
                      onClick={() => setShowForgotPassword(true)}
                      className="text-[10px] font-black text-black uppercase tracking-widest hover:underline"
                    >
                      Forgot Word?
                    </button>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full py-5 bg-black text-white brutal-btn font-black text-[12px] uppercase tracking-[0.2em] shadow-none hover:bg-neo-green hover:text-black transition-all disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : (isLogin ? 'Login Now' : 'Create Account')}
                  </button>
                </form>

                <p className="mt-8 text-center text-[10px] font-black text-black uppercase tracking-widest">
                  {isLogin ? "No entry key? " : "Already verified? "}
                  <button 
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-black underline hover:text-neo-pink transition-colors"
                  >
                    {isLogin ? 'Register' : 'Access'}
                  </button>
                </p>
              </>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  function SuccessModal() {
    return (
      <AnimatePresence>
        {showSuccessReg && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSuccessReg(null)} className="fixed inset-0 z-[170] bg-emerald-950/20 backdrop-blur-xl" />
            <motion.div initial={{ opacity: 0, scale: 0.8, y: 100 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: 100 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[180] w-full max-w-sm p-4">
              <div className="bg-white border-[4px] border-black p-8 text-center shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-4 bg-neo-green border-b-2 border-black" />
                <div className="bg-neo-green w-24 h-24 border-4 border-black flex items-center justify-center mx-auto mb-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rotate-3">
                  <Check className="w-12 h-12 text-black" />
                </div>
                <h2 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Applied!</h2>
                <p className="text-black/60 font-black text-sm mb-8 uppercase tracking-widest">Victory is yours. confirmed for <span className="text-black underline">{showSuccessReg.eventTitle}</span>.</p>
                <div className="p-5 bg-neo-yellow border-2 border-black mb-8 rotate-[-1deg]">
                  <p className="text-[10px] font-black text-black uppercase tracking-[0.2em] mb-1">Mission Status</p>
                  <p className="font-black text-black text-xl uppercase italic tracking-tighter">On File</p>
                </div>
                <button onClick={() => setShowSuccessReg(null)} className="w-full py-5 bg-black text-white brutal-btn font-black text-sm uppercase tracking-[0.3em]">Return to Base</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  function ToastContainer() {
    return (
      <div className="fixed top-4 right-4 left-4 sm:left-auto sm:top-auto sm:bottom-6 sm:right-6 z-[200] flex flex-col gap-2 max-w-[calc(100vw-2rem)] sm:max-w-md pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map(toast => (
            <motion.div 
              key={toast.id} 
              layout
              initial={{ opacity: 0, x: 50, scale: 0.95 }} 
              animate={{ opacity: 1, x: 0, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className={cn(
                "pointer-events-auto p-4 border-[3px] border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-start gap-4", 
                toast.type === 'success' ? "bg-neo-green/10" : "bg-neo-pink/10"
              )}
            >
              <div className={cn("p-2 border-2 border-black shrink-0", toast.type === 'success' ? "bg-neo-green text-black" : "bg-neo-pink text-white")}>
                <Bell className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-black text-[12px] uppercase tracking-tighter text-black leading-tight">{toast.title}</h4>
                <p className="text-[10px] font-bold text-black/50 mt-1 line-clamp-2 uppercase tracking-widest">{toast.message}</p>
              </div>
              <button 
                onClick={() => setToasts(t => t.filter(x => x.id !== toast.id))}
                className="p-1 border-2 border-black hover:bg-black hover:text-white transition-all shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  }

  function NotificationsPanel() {
    return (
      <AnimatePresence>
        {showNotifications && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNotifications(false)} className="fixed inset-0 z-[150] bg-slate-900/20 backdrop-blur-sm" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed right-0 top-0 bottom-0 z-[160] w-full max-w-md bg-white border-l-[4px] border-black shadow-2xl flex flex-col">
              <div className="p-8 border-b-[4px] border-black flex items-center justify-between bg-neo-blue text-white">
                <div>
                  <h3 className="font-black text-2xl tracking-tighter uppercase italic">Alerts Center</h3>
                  <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] mt-1">System Critical</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowNotifications(false)} className="p-3 border-2 border-white hover:bg-white hover:text-black transition-all">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-orange-50/20">
                {notifications.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center px-6">
                    <div className="w-24 h-24 bg-neo-yellow border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-black mb-10 rotate-12">
                      <BellOff className="w-10 h-10" />
                    </div>
                    <h4 className="text-2xl font-black text-black uppercase tracking-tighter italic mb-4">Radio Silence</h4>
                    <p className="text-sm font-black text-black/50 mb-10 leading-relaxed uppercase tracking-widest">No active threats or opportunities detected. Carry on, soldier.</p>
                    <button 
                      onClick={() => { setShowNotifications(false); setActiveTab('discover'); }}
                      className="w-full brutal-btn py-5 bg-black text-white text-[10px] font-black uppercase tracking-[0.2em]"
                    >
                      Patrol the Field
                    </button>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} onClick={() => {
                        markNotificationAsRead(n.id);
                        if (n.link) window.open(n.link, '_blank');
                      }} 
                      className={cn(
                        "p-6 border-2 border-black transition-all cursor-pointer group shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]", 
                        n.read ? "bg-white opacity-40" : "bg-white"
                      )}>
                      <div className="flex items-start gap-5">
                        <div className={cn(
                          "w-12 h-12 border-2 border-black shrink-0 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                          n.type === 'new_event' ? "bg-neo-green text-black" :
                          n.type === 'deadline' ? "bg-neo-pink text-white" :
                          "bg-neo-yellow text-black"
                        )}>
                          {n.type === 'new_event' ? <Sparkles className="w-5 h-5" /> : 
                           n.type === 'deadline' ? <Clock className="w-5 h-5" /> : 
                           <BellRing className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-black text-black truncate pr-4 uppercase tracking-tighter">{n.title}</h4>
                          </div>
                          <p className="text-[10px] text-black/60 leading-relaxed font-black uppercase tracking-widest line-clamp-2">{n.message}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }
}
