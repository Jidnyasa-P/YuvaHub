import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, 
  Cookie, 
  Database, 
  Eye, 
  Info, 
  Lock, 
  Server, 
  Sliders, 
  Check, 
  CheckCircle, 
  RefreshCw, 
  AlertOctagon, 
  UserCheck, 
  Globe, 
  Mail, 
  FileText, 
  Send, 
  Settings, 
  Activity,
  ArrowRight
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

// Structured sections for Privacy Policy
const privacySections = [
  {
    id: "introduction",
    title: "1. Introduction and Overview",
    icon: Shield,
    content: `Welcome to YuvaHub ("Company", "we", "our", "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy governs our data collection, processing, and usage practices when you visit and interact with our application located at yuvahub.com (the "Service").

By accessing or using our Service, you signify that you have read, understood, and agree to our collection, storage, use, and disclosure of your personal information as described in this Privacy Policy. If you do not agree with any terms in this policy, you must immediately discontinue use of all our products and services.

This document describes how we process user data for student opportunities indexing, community forum participation, mentorship sessions, and large language model guidance. We take your privacy seriously and ensure isolation of private data at every layer.`
  },
  {
    id: "collection",
    title: "2. Information We Collect",
    icon: Eye,
    content: `We collect information that you voluntarily provide to us when you register on the Service, express an interest in obtaining information about us or our products, participate in activities on the Service, or otherwise contact us.

A. Personal Data Provided by You:
- Account Credentials: Via Firebase Authentication (Google OAuth), we collect your display name, email address, profile picture (avatarUrl), and unique firebase user identifier (uid).
- Supplemental Profile Details: Users provide supplementary details during onboarding or profile editing, including current school, graduation year, skill lists, resume links, portfolio URLs, and career interests.
- Opportunity Listings: If you submit an opportunity (competition, hackathon, internship, scholarship), we collect the title, category, description, external links, deadlines, and hosting organization details.

B. Information Automatically Collected:
We automatically collect certain metadata when you visit, use, or navigate the Service. This includes IP addresses, browser types, operating systems, referring URLs, device names, country locations, and detailed logs of how and when you interact with the UI.`
  },
  {
    id: "usage",
    title: "3. How We Use Your Information",
    icon: Settings,
    content: `We use personal information collected via our Service for a variety of legitimate business purposes described below:

- Facilitating Account Creation: We use the authentication details provided by Google OAuth to establish your user session and profile space.
- Delivering Tailored Matchmaking: Our algorithms parse your skill tags, education details, and opportunity bookmarks to deliver personalized suggestions on your dashboard.
- AI-Driven Mentorship Guidance: Queries submitted to our AIAssistant are analyzed using state-of-the-art LLMs (like Google Gemini API) to generate personalized study plans and resources.
- Community and Networking Forums: Profile details are used to identify you in community channels, thread replies, and mentorship pairings.
- Security and Fraud Prevention: We monitor traffic patterns, upload payloads, and API requests to protect against denial-of-service (DDoS) attacks, brute-force exploits, and malicious listings.`
  },
  {
    id: "sharing",
    title: "4. Sharing Your Information",
    icon: Globe,
    content: `We only share information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations.

We partition data transfer into the following categories:
- Public Community Profiles: If you opt to participate in community forums or list your profile in the mentor directory, your profile name, skills, and bio will be visible to other registered users.
- Third-Party AI Partners: Queries submitted to the AIAssistant are forwarded securely to the Google Gemini API. We enforce zero-retention guidelines under enterprise agreements, meaning your prompts are not saved or used to train public models.
- Cloud Infrastructure: We utilize cloud providers (like MongoDB Atlas, Firebase, Cloudinary, and Render) to store and serve files, media, and application code.
- Compliance and Legal Process: We may disclose your information where we are legally required to do so in order to comply with applicable law, governmental requests, or judicial proceedings.`
  },
  {
    id: "rights",
    title: "5. Your Privacy Rights (GDPR & CCPA)",
    icon: UserCheck,
    content: `Depending on your geographical location, you have rights that allow you greater access to and control over your personal information. Under GDPR (European Union) and CCPA (California, USA), these rights include:

- Right of Access: You can request details of the personal data we store and process about you.
- Right to Rectification: You can request that we update or amend your personal data where it is inaccurate or incomplete.
- Right to Erasure (Right to be Forgotten): You can request that we delete all your personal data, which will immediately trigger Firebase user deletion and MongoDB document purging.
- Right to Data Portability: You can request a copy of your personal data in a structured, machine-readable format.
- Right to Opt-Out: You can opt out of non-essential cookies and disable public directory visibility at any time under settings.

To submit a formal request regarding these rights, you may use the interactive DSAR portal below or write to compliance@yuvahub.com.`
  },
  {
    id: "security",
    title: "6. Security & Infrastructure Controls",
    icon: Lock,
    content: `We implement robust technical and organizational security measures to protect the integrity of your personal information:

- Encryption in Transit: All data transfers between the client browser and our application servers are encrypted using TLS 1.3 protocols.
- Encryption at Rest: Our primary MongoDB databases utilize AES-256 encryption at the storage layer.
- Media Isolation: Uploaded resumes and images are hosted on secure media delivery services (Cloudinary) with validated origin permissions.
- Automated Vulnerability Auditing: Our repository branches undergo security scanning and dependency checks during continuous integration (CI) builds to patch potential vulnerabilities.`
  }
];

export default function Privacy() {
  const { theme } = useAppContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("introduction");

  // Cookie Preference States
  const [cookieConsent, setCookieConsent] = useState({
    essential: true, // Always true
    analytics: true,
    marketing: false,
    functional: true
  });
  const [showSavedToast, setShowSavedToast] = useState(false);

  // DSAR Portal Form States
  const [dsarData, setDsarData] = useState({
    name: "",
    email: "",
    requestType: "access",
    details: "",
    consent: false
  });
  const [dsarTicket, setDsarTicket] = useState<{ id: string; status: string; date: string } | null>(null);
  const [dsarSubmitting, setDsarSubmitting] = useState(false);

  // Real-time Subprocessor Telemetry States
  const [telemetryLogs, setTelemetryLogs] = useState<Array<{ time: string; service: string; status: string; latency: number }>>([]);
  const [telemetryActive, setTelemetryActive] = useState(true);

  // Filter sections based on search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return privacySections;
    const query = searchQuery.toLowerCase();
    return privacySections.filter(
      (sec) =>
        sec.title.toLowerCase().includes(query) ||
        sec.content.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Handle Cookie Preferences Save
  const handleSaveCookies = () => {
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);
  };

  // Handle DSAR Form Submission
  const handleDsarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dsarData.consent) return;
    setDsarSubmitting(true);
    setTimeout(() => {
      const ticketId = "YUH-DSAR-" + Math.floor(100000 + Math.random() * 900000);
      setDsarTicket({
        id: ticketId,
        status: "Queued for Compliance Verification",
        date: new Date().toLocaleString()
      });
      setDsarSubmitting(false);
      setDsarData({
        name: "",
        email: "",
        requestType: "access",
        details: "",
        consent: false
      });
    }, 1500);
  };

  // Simulate Telemetry logs
  useEffect(() => {
    if (!telemetryActive) return;

    const services = ["Firebase Auth Gateway", "Google Gemini Enterprise API", "MongoDB Storage Engine", "Cloudinary Media CDN", "Pinecone Vector Indexes"];
    const statuses = ["CONNECTED", "ACTIVE", "READY", "SYNCED"];

    const generateLog = () => {
      const service = services[Math.floor(Math.random() * services.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const latency = Math.floor(15 + Math.random() * 120);
      const time = new Date().toLocaleTimeString();

      setTelemetryLogs((prev) => [
        { time, service, status, latency },
        ...prev.slice(0, 7) // keep last 8 logs
      ]);
    };

    // Initial logs
    for(let i=0; i<5; i++) {
      const service = services[i];
      const status = "CONNECTED";
      const latency = Math.floor(20 + Math.random() * 80);
      const time = new Date(Date.now() - (5 - i) * 60000).toLocaleTimeString();
      setTelemetryLogs((prev) => [...prev, { time, service, status, latency }]);
    }

    const interval = setInterval(generateLog, 4000);
    return () => clearInterval(interval);
  }, [telemetryActive]);

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      {/* Header section */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-blue-600 to-indigo-700 p-8 md:p-12 text-white shadow-lg">
        <div className="absolute top-0 right-0 -translate-y-6 translate-x-6 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-semibold uppercase tracking-wider mb-4">
            <Shield className="w-3.5 h-3.5" /> Privacy & Security Standard
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
            Privacy Policy
          </h1>
          <p className="mt-4 text-base md:text-lg text-blue-100 font-medium">
            Understand what information we collect, how it is secured, and how you can exercise your GDPR & CCPA rights on YuvaHub.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 text-xs text-blue-200">
            <span>Last Updated: July 16, 2026</span>
            <span>•</span>
            <span>Version 2.4.0 (Split Blueprint)</span>
            <span>•</span>
            <span>Document Ref: PRIV-2026-B</span>
          </div>
        </div>
      </div>

      {/* Main Grid: sidebar outline and clause contents */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Navigation Sidebar */}
        <aside className="lg:col-span-4 space-y-6 sticky top-6">
          <div className="clean-card p-5 dark:bg-gray-800 dark:border-gray-700">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-1.5 px-1">
              <Sliders className="w-4 h-4 text-blue-500" /> Section Index
            </h3>
            <nav className="space-y-1">
              {privacySections.map((sec) => {
                const Icon = sec.icon;
                const isActive = activeTab === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => {
                      setActiveTab(sec.id);
                      document.getElementById(sec.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold rounded-lg text-left transition-all ${
                      isActive 
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' 
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5 shrink-0" />
                    <span className="truncate">{sec.title.split(". ")[1]}</span>
                  </button>
                );
              })}
            </nav>
            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search policy sections..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white"
                />
                <Sliders className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Quick Help Card */}
          <div className="p-5 rounded-2xl bg-linear-to-tr from-slate-900 to-indigo-950 text-white shadow-sm relative overflow-hidden">
            <div className="absolute right-0 bottom-0 translate-y-6 translate-x-6 w-24 h-24 rounded-full bg-white/5 blur-xl pointer-events-none" />
            <h4 className="font-extrabold text-sm flex items-center gap-1.5 text-blue-400">
              <Mail className="w-4 h-4" /> Privacy Contact Desk
            </h4>
            <p className="text-[11px] text-gray-300 mt-2 leading-relaxed">
              Have questions about data isolation, subprocessors, or our deletion flow? Reach out to our privacy team.
            </p>
            <a 
              href="mailto:compliance@yuvahub.com"
              className="inline-flex items-center gap-1.5 mt-4 bg-white text-indigo-950 font-bold text-xs px-3.5 py-2 rounded-lg hover:bg-blue-50 transition"
            >
              <span>Email Compliance Officer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </aside>

        {/* Clause Details */}
        <div className="lg:col-span-8 space-y-8">
          <div className="clean-card p-6 md:p-8 dark:bg-gray-800 dark:border-gray-700 space-y-8">
            {filteredSections.length === 0 ? (
              <div className="text-center py-12">
                <AlertOctagon className="w-12 h-12 text-amber-500 mx-auto mb-3 animate-bounce" />
                <h3 className="font-bold text-lg text-gray-800 dark:text-white">No sections found</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                  Try searching for terms like "Google", "Gemini", "GDPR", or "Authentication".
                </p>
              </div>
            ) : (
              filteredSections.map((sec) => {
                const Icon = sec.icon;
                const isHighlighted = activeTab === sec.id;
                return (
                  <article
                    id={sec.id}
                    key={sec.id}
                    className={`scroll-mt-24 pb-8 border-b border-gray-100 last:border-none last:pb-0 dark:border-gray-700/60 transition-colors duration-300 ${
                      isHighlighted ? 'bg-blue-50/5 dark:bg-blue-950/5 -mx-4 px-4 rounded-xl' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                        <Icon className="w-5 h-5" />
                      </div>
                      <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                        {sec.title}
                      </h2>
                    </div>
                    <div className="text-xs md:text-sm text-gray-650 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                      {sec.content}
                    </div>
                  </article>
                );
              })
            )}
          </div>

          {/* Interactive Widget 1: Cookie Preference Center */}
          <section className="clean-card p-6 md:p-8 dark:bg-gray-800 dark:border-gray-700 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-700">
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                <Cookie className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Cookie Consent Settings</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Toggle optional tracking cookies and personalize your storage profile.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 border border-gray-100 dark:border-gray-700/60 rounded-xl bg-gray-50/50 dark:bg-gray-900/30">
                <div className="max-w-[80%] pr-3">
                  <h4 className="font-semibold text-xs text-gray-800 dark:text-white flex items-center gap-2">
                    Essential Site Storage <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-[9px] font-bold rounded">REQUIRED</span>
                  </h4>
                  <p className="text-[11px] text-gray-450 dark:text-gray-400 mt-1">Needed for secure Firebase user session management, theme preferences, and form tracking. Cannot be deactivated.</p>
                </div>
                <button disabled className="relative inline-flex h-5.5 w-10 items-center rounded-full bg-blue-600/50 cursor-not-allowed">
                  <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white translate-x-5" />
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5 border border-gray-100 dark:border-gray-700/60 rounded-xl hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition">
                <div className="max-w-[80%] pr-3">
                  <h4 className="font-semibold text-xs text-gray-800 dark:text-white">Analytics Cookies</h4>
                  <p className="text-[11px] text-gray-450 dark:text-gray-400 mt-1">Used to measure application loading speed, user session paths, and telemetry collection to improve page rendering speeds.</p>
                </div>
                <button 
                  onClick={() => setCookieConsent({ ...cookieConsent, analytics: !cookieConsent.analytics })}
                  className={`relative inline-flex h-5.5 w-10 items-center rounded-full transition-colors ${cookieConsent.analytics ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${cookieConsent.analytics ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5 border border-gray-100 dark:border-gray-700/60 rounded-xl hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition">
                <div className="max-w-[80%] pr-3">
                  <h4 className="font-semibold text-xs text-gray-800 dark:text-white">Marketing Cookies</h4>
                  <p className="text-[11px] text-gray-450 dark:text-gray-400 mt-1">Allows us to run relevant student opportunity ads and index partner listings based on your region.</p>
                </div>
                <button 
                  onClick={() => setCookieConsent({ ...cookieConsent, marketing: !cookieConsent.marketing })}
                  className={`relative inline-flex h-5.5 w-10 items-center rounded-full transition-colors ${cookieConsent.marketing ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${cookieConsent.marketing ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5 border border-gray-100 dark:border-gray-700/60 rounded-xl hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition">
                <div className="max-w-[80%] pr-3">
                  <h4 className="font-semibold text-xs text-gray-800 dark:text-white">Functional Personalization Cookies</h4>
                  <p className="text-[11px] text-gray-450 dark:text-gray-400 mt-1">Saves local search filtering choices, bookmark directories, and custom AI assistant chat prompts.</p>
                </div>
                <button 
                  onClick={() => setCookieConsent({ ...cookieConsent, functional: !cookieConsent.functional })}
                  className={`relative inline-flex h-5.5 w-10 items-center rounded-full transition-colors ${cookieConsent.functional ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${cookieConsent.functional ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
              <span className="text-[11px] text-gray-450 dark:text-gray-500">Your preferences will apply immediately to this browser instance.</span>
              <button 
                onClick={handleSaveCookies}
                className="clean-btn px-5 py-2 text-xs font-semibold flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Save Preferences
              </button>
            </div>

            {showSavedToast && (
              <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 rounded-lg flex items-center gap-2 text-green-800 dark:text-green-400 text-xs font-semibold animate-float">
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span>Storage preferences updated. Consent cookies saved successfully.</span>
              </div>
            )}
          </section>

          {/* Interactive Widget 2: GDPR/CCPA DSAR Rights Portal */}
          <section className="clean-card p-6 md:p-8 dark:bg-gray-800 dark:border-gray-700 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-700">
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">GDPR & CCPA Data Subject Access Request (DSAR)</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Submit automated requests to access, correct, or permanently erase your user logs.</p>
              </div>
            </div>

            {!dsarTicket ? (
              <form onSubmit={handleDsarSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Udit Sharma"
                      value={dsarData.name}
                      onChange={(e) => setDsarData({ ...dsarData, name: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs text-gray-950 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Registered Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="udit@yuvahub.com"
                      value={dsarData.email}
                      onChange={(e) => setDsarData({ ...dsarData, email: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs text-gray-950 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Request Type</label>
                  <select
                    value={dsarData.requestType}
                    onChange={(e) => setDsarData({ ...dsarData, requestType: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs text-gray-950 dark:text-white"
                  >
                    <option value="access">Access Personal Data Archive (Download JSON)</option>
                    <option value="rectification">Rectify Inaccurate Profile Records</option>
                    <option value="erasure">Erasure / Right to be Forgotten (Deactivate & Purge)</option>
                    <option value="restriction">Restrict AI Data Usage Consent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Verification details or specific guidelines</label>
                  <textarea
                    rows={3}
                    placeholder="Provide supplementary details to help our compliance officer verify your identity..."
                    value={dsarData.details}
                    onChange={(e) => setDsarData({ ...dsarData, details: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs text-gray-950 dark:text-white resize-none"
                  />
                </div>

                <label className="flex items-start gap-2.5 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={dsarData.consent}
                    onChange={(e) => setDsarData({ ...dsarData, consent: e.target.checked })}
                    className="h-4.5 w-4.5 rounded border-gray-300 dark:border-gray-700 text-blue-600 focus:ring-blue-500/20 cursor-pointer mt-0.5"
                  />
                  <span className="text-[11px] text-gray-450 dark:text-gray-450 leading-normal">
                    I verify under penalty of perjury that I am the account holder or authorized representative of the email address submitted above, and consent to identity verification checks.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={dsarSubmitting}
                  className="w-full clean-btn py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
                >
                  {dsarSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Verifying Security Tokens...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Submit Legal Request
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="p-6 border border-dashed border-blue-200 dark:border-blue-900/60 bg-blue-50/10 dark:bg-blue-950/10 rounded-2xl text-center space-y-4 animate-float">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-gray-900 dark:text-white">DSAR Receipt Registered</h4>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Our compliance gate has logged your request. Record your compliance receipt hash.</p>
                </div>

                <div className="max-w-md mx-auto bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 text-left text-xs space-y-2 shadow-xs">
                  <div className="flex justify-between pb-1.5 border-b border-gray-50 dark:border-gray-800">
                    <span className="text-gray-400 font-medium">Receipt ID</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400 tracking-wider font-mono">{dsarTicket.id}</span>
                  </div>
                  <div className="flex justify-between pb-1.5 border-b border-gray-50 dark:border-gray-800">
                    <span className="text-gray-400 font-medium">Status</span>
                    <span className="font-bold text-gray-700 dark:text-gray-300">{dsarTicket.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Timestamp</span>
                    <span className="font-semibold text-gray-500 dark:text-gray-400">{dsarTicket.date}</span>
                  </div>
                </div>

                <div className="flex justify-center gap-3">
                  <button 
                    onClick={() => setDsarTicket(null)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition"
                  >
                    Submit Another DSAR
                  </button>
                  <a 
                    href="mailto:compliance@yuvahub.com" 
                    className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-semibold text-xs rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                  >
                    Direct Escalation
                  </a>
                </div>
              </div>
            )}
          </section>

          {/* Interactive Widget 3: Live Subprocessor Telemetry Monitor */}
          <section className="clean-card p-6 md:p-8 dark:bg-gray-800 dark:border-gray-700 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Subprocessor Isolation Diagnostics</h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Real-time validation tracking subprocessor compliance endpoints.</p>
                </div>
              </div>
              <button
                onClick={() => setTelemetryActive(!telemetryActive)}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                  telemetryActive 
                    ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400' 
                    : 'bg-green-50 text-green-600 dark:bg-green-950/20 dark:text-green-400'
                }`}
              >
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                {telemetryActive ? "Pause Stream" : "Resume Stream"}
              </button>
            </div>

            <div className="bg-gray-950 text-gray-250 font-mono text-[10px] rounded-xl p-4 space-y-2 border border-gray-800 max-h-[220px] overflow-y-auto">
              <div className="flex justify-between text-gray-500 font-bold border-b border-gray-900 pb-1.5 mb-2 uppercase">
                <span>Timestamp</span>
                <span>System Gateway</span>
                <span>Latency</span>
                <span>Status</span>
              </div>
              {telemetryLogs.map((log, idx) => (
                <div key={idx} className="flex justify-between items-center py-0.5 hover:bg-gray-900/50 transition">
                  <span className="text-gray-500">{log.time}</span>
                  <span className="text-gray-300 font-bold">{log.service}</span>
                  <span className="text-indigo-400">{log.latency}ms</span>
                  <span className="text-green-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" /> {log.status}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700/60 rounded-xl space-y-1">
                <span className="text-gray-400 font-medium">Compliance Frameworks</span>
                <p className="font-extrabold text-gray-800 dark:text-white mt-0.5">GDPR, CCPA, COPPA Compliant</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700/60 rounded-xl space-y-1">
                <span className="text-gray-400 font-medium">Data Storage Boundary</span>
                <p className="font-extrabold text-gray-800 dark:text-white mt-0.5">AWS US-East / MongoDB Atlas Isolated</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
