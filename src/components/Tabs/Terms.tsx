import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Scale, 
  AlertTriangle, 
  Users, 
  ShieldAlert, 
  Award, 
  BookOpen,
  Info,
  Check,
  CheckCircle,
  HelpCircle,
  Clock,
  Printer,
  ChevronDown,
  ArrowRight,
  Globe,
  Sliders
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

// Structured sections for Terms of Service
const termsSections = [
  {
    id: "agreement",
    title: "1. Agreement to Terms",
    icon: FileText,
    content: `These Terms of Service constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("you") and YuvaHub ("we", "us", or "our"), concerning your access to and use of the yuvahub.com website as well as any other media form, media channel, mobile website or mobile application related, linked, or otherwise connected thereto (collectively, the "Site").

You agree that by accessing the Site, you have read, understood, and agree to be bound by all of these Terms of Service. If you do not agree with all of these Terms of Service, then you are expressly prohibited from using the Site and you must discontinue use immediately.

Supplemental terms and conditions or documents that may be posted on the Site from time to time are hereby expressly incorporated herein by reference. We reserve the right, in our sole discretion, to make changes or modifications to these Terms of Service at any time and for any reason.`
  },
  {
    id: "intellectual",
    title: "2. Intellectual Property Rights",
    icon: Scale,
    content: `Unless otherwise indicated, the Site is our proprietary property and all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics on the Site (collectively, the "Content") and the trademarks, service marks, and logos contained therein (the "Marks") are owned or controlled by us or licensed to us, and are protected by copyright and trademark laws and various other intellectual property rights.

The Content and the Marks are provided on the Site "AS IS" for your information and personal use only. Except as expressly provided in these Terms of Service, no part of the Site and no Content or Marks may be copied, reproduced, aggregated, republished, uploaded, posted, publicly displayed, encoded, translated, transmitted, distributed, sold, licensed, or otherwise exploited for any commercial purpose whatsoever, without our express prior written permission.

Provided that you are eligible to use the Site, you are granted a limited license to access and use the Site and to download or print a copy of any portion of the Content to which you have properly gained access solely for your personal, non-commercial use.`
  },
  {
    id: "registration",
    title: "3. User Representations and Registration",
    icon: Users,
    content: `By using the Site, you represent and warrant that:
- Accurate Registration: All registration details you submit via Firebase Auth will be true, accurate, current, and complete.
- Account Maintenance: You will maintain the accuracy of such details and promptly update them under your profile settings as necessary.
- Legal Capacity: You have the legal capacity and you agree to comply with these Terms of Service.
- Age Requirements: You are not a minor in the jurisdiction in which you reside (or if a minor, you have received parental permission to use the Site), and in no event are you under the age of 13.
- Non-Automated Access: You will not access the Site through automated or non-human means, whether through a bot, script, scraper, or otherwise.
- Lawful Use: Your use of the Site will not violate any applicable law or regulation.`
  },
  {
    id: "prohibited",
    title: "4. Prohibited Activities",
    icon: ShieldAlert,
    content: `You may not access or use the Site for any purpose other than that for which we make the Site available. The Site may not be used in connection with any commercial endeavors except those that are specifically endorsed or approved by us.

As a user of the Site, you agree not to:
- Systematic Harvesting: Systematically retrieve data or other content from the Site to create or compile, directly or indirectly, a collection, compilation, database, or directory without written permission from us.
- Unauthorized Credential Use: Trick, defraud, or mislead us and other users, especially in any attempt to learn sensitive account information such as passwords.
- Security Circumvention: Circumvent, disable, or otherwise interfere with security-related features of the Site, including features that prevent or restrict the use or copying of any Content.
- Malicious Reporting: Make improper use of our support services or submit false reports of abuse or misconduct.
- Harassment: Use any information obtained from the Site in order to harass, abuse, or harm another person.`
  },
  {
    id: "submissions",
    title: "5. Opportunity Submissions",
    icon: Award,
    content: `Users may submit opportunities (e.g., hackathons, scholarship links, job postings) through the Service. By submitting an opportunity, you guarantee that you have all necessary permissions to publish the content, and that it does not infringe on third-party intellectual property or labor rights.

We reserve the right, but do not have the obligation, to:
- Monitor and screen submissions for quality, accuracy, and compliance with our guidelines.
- Edit or remove any submission at our sole discretion, without prior notice.
- Suspend accounts that repeatedly submit fraudulent or spam opportunities.
- Restrict dashboard access of organizations violating hiring timelines.`
  },
  {
    id: "disputes",
    title: "6. Governing Law & Dispute Resolution",
    icon: BookOpen,
    content: `These Terms of Service and your use of the Site are governed by and construed in accordance with the laws of the State of Delaware, USA, without regard to its conflict of law principles.

Any legal action or proceeding related to this Site shall be brought exclusively in a federal or state court of competent jurisdiction sitting in Delaware. To expedite resolution and control the cost of any dispute, controversy, or claim related to these Terms, you and YuvaHub agree to first attempt to negotiate any dispute informally for at least thirty (30) days before initiating arbitration.`
  }
];

// Violation Simulator Data
const violationCategories = [
  { name: "Duplicate Listings", level: "Low Warning", penalty: "Content removal, email warning notice" },
  { name: "Self-Promotion Spam", level: "Medium Warning", penalty: "Temporary community block (48 hours)" },
  { name: "Fake Opportunities", level: "High Alert", penalty: "Immediate account suspension & IP blacklisting" },
  { name: "Harassment / Abuse", level: "Critical Alert", penalty: "Permanent ban, referral to compliance database" }
];

// Jurisdictions Data
const jurisdictions = [
  { name: "United States (Delaware)", clause: "Default Terms. Standard AAA Arbitration applies. Informal negotiation mandated for 30 days.", contact: "legal-us@yuvahub.com" },
  { name: "European Union (GDPR Scope)", clause: "ODR Platform access for consumer disputes. Standard Contractual Clauses (SCC) govern data transfers.", contact: "legal-eu@yuvahub.com" },
  { name: "India (IT Act Scope)", clause: "Governed by local IT Act, 2000. Grievance Officer details available upon written request.", contact: "legal-in@yuvahub.com" },
  { name: "Global / Rest of World", clause: "Delaware law governs. Disputes settled via neutral arbitration in English language.", contact: "legal-global@yuvahub.com" }
];

export default function Terms() {
  const { theme } = useAppContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("agreement");

  // Signature Panel States
  const [sigName, setSigName] = useState("");
  const [sigRole, setSigRole] = useState("student");
  const [sigChecks, setSigChecks] = useState({
    acceptTerms: false,
    acceptGuidelines: false,
    verifyAge: false
  });
  const [certificate, setCertificate] = useState<{ hash: string; date: string; owner: string; role: string } | null>(null);
  const [signing, setSigning] = useState(false);

  // FAQ Expanded index state
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Governing Law Jurisdiction State
  const [selectedJurisdiction, setSelectedJurisdiction] = useState(0);

  // Filter sections based on search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return termsSections;
    const query = searchQuery.toLowerCase();
    return termsSections.filter(
      (sec) =>
        sec.title.toLowerCase().includes(query) ||
        sec.content.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Handle Digital Signature Submit
  const handleSignTerms = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sigChecks.acceptTerms || !sigChecks.acceptGuidelines || !sigChecks.verifyAge || !sigName.trim()) return;

    setSigning(true);
    setTimeout(() => {
      const cryptoHash = "SHA256-" + Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join("").toUpperCase();
      setCertificate({
        hash: cryptoHash,
        date: new Date().toLocaleString(),
        owner: sigName,
        role: sigRole
      });
      setSigning(false);
    }, 1200);
  };

  const faqs = [
    {
      q: "What constitutes a 'Spam Opportunity' on YuvaHub?",
      a: "Any opportunity submission containing affiliate URLs, tracking links with hidden redirects, duplicate entries for the same event, or entries designed to collect personal student data under false pretenses. These are flag-checked and instantly deleted."
    },
    {
      q: "Can I copy Opportunity descriptions for educational purposes?",
      a: "Yes. You are granted a limited license to access and share opportunity links for personal, non-commercial use. However, bulk scraping or database mirroring is strictly prohibited."
    },
    {
      q: "How does the dispute resolution process work?",
      a: "In the event of a disagreement, you and YuvaHub agree to first communicate informally to seek resolution for 30 days. If unresolved, disputes proceed to binding neutral arbitration administered in Delaware."
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-indigo-600 to-blue-700 p-8 md:p-12 text-white shadow-lg">
        <div className="absolute top-0 right-0 -translate-y-6 translate-x-6 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-semibold uppercase tracking-wider mb-4">
            <Scale className="w-3.5 h-3.5" /> General Terms of Agreement
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
            Terms of Service
          </h1>
          <p className="mt-4 text-base md:text-lg text-blue-100 font-medium">
            Read carefully our service conditions, user expectations, submission rules, and intellectual property limits.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 text-xs text-blue-200">
            <span>Last Updated: July 16, 2026</span>
            <span>•</span>
            <span>Version 2.4.0 (Split Blueprint)</span>
            <span>•</span>
            <span>Document Ref: TERMS-2026-A</span>
          </div>
        </div>
      </div>

      {/* Main Grid content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Outline Sidebar */}
        <aside className="lg:col-span-4 space-y-6 sticky top-6">
          <div className="clean-card p-5 dark:bg-gray-800 dark:border-gray-700">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-1.5 px-1">
              <Sliders className="w-4 h-4 text-blue-500" /> Clause Directory
            </h3>
            <nav className="space-y-1">
              {termsSections.map((sec) => {
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
                  placeholder="Search contract terms..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white"
                />
                <Sliders className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Quick Warning Card */}
          <div className="p-5 rounded-2xl bg-yellow-50 dark:bg-yellow-950/15 border border-yellow-200/50 dark:border-yellow-900/30 text-yellow-900 dark:text-yellow-400 shadow-xs">
            <h4 className="font-extrabold text-sm flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" /> Acceptable Use Notice
            </h4>
            <p className="text-[11px] leading-relaxed mt-2 text-yellow-800/90 dark:text-yellow-400/80">
              Any user found scraping content, publishing phishing opportunity forms, or spamming mentorship bookings will face instant account restriction.
            </p>
          </div>
        </aside>

        {/* Clause Details */}
        <div className="lg:col-span-8 space-y-8">
          <div className="clean-card p-6 md:p-8 dark:bg-gray-800 dark:border-gray-700 space-y-8">
            {filteredSections.length === 0 ? (
              <div className="text-center py-12">
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3 animate-bounce" />
                <h3 className="font-bold text-lg text-gray-800 dark:text-white">No clauses found</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                  Try searching for words like "Arbitration", "Intellectual", or "Registration".
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
                    className={`scroll-mt-24 pb-8 border-b border-gray-100 last:border-none last:pb-0 dark:border-gray-700/60 transition-all ${
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

          {/* Interactive Widget 1: Acceptable Use Violations Simulator */}
          <section className="clean-card p-6 md:p-8 dark:bg-gray-800 dark:border-gray-700 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-700">
              <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Escalation Matrix & Violations</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Understand penalty actions tied to community policy infractions.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {violationCategories.map((violation) => (
                <div 
                  key={violation.name} 
                  className={`p-4 rounded-xl border transition-all ${
                    violation.level.includes("Critical") 
                      ? "border-red-100 bg-red-50/10 dark:border-red-950/30" 
                      : violation.level.includes("High")
                      ? "border-amber-100 bg-amber-50/10 dark:border-amber-950/30"
                      : "border-gray-150 bg-gray-50/10 dark:border-gray-700/40"
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-xs text-gray-900 dark:text-white">{violation.name}</h4>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      violation.level.includes("Critical") 
                        ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400" 
                        : violation.level.includes("High")
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400"
                    }`}>
                      {violation.level}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-normal">{violation.penalty}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Interactive Widget 2: Governing Law Jurisdictional Selector */}
          <section className="clean-card p-6 md:p-8 dark:bg-gray-800 dark:border-gray-700 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-700">
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Regional Dispute Clauses</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Select your territory to review regional legal additions.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {jurisdictions.map((jur, idx) => (
                <button
                  key={jur.name}
                  onClick={() => setSelectedJurisdiction(idx)}
                  className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all ${
                    selectedJurisdiction === idx
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-gray-50 text-gray-600 dark:bg-gray-900 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  {jur.name.split(" ")[0]}
                </button>
              ))}
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-150 dark:border-gray-700 rounded-xl space-y-3">
              <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-100 dark:border-gray-800">
                <span className="font-bold text-gray-800 dark:text-white">{jurisdictions[selectedJurisdiction].name} Jurisdiction</span>
                <span className="text-[10px] text-gray-450 dark:text-gray-500 font-semibold">{jurisdictions[selectedJurisdiction].contact}</span>
              </div>
              <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                {jurisdictions[selectedJurisdiction].clause}
              </p>
            </div>
          </section>

          {/* Interactive Widget 3: Digital Signature Panel */}
          <section className="clean-card p-6 md:p-8 dark:bg-gray-800 dark:border-gray-700 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-700">
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Workspace Digital Signature</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Electronically verify your acceptance of the Terms of Service.</p>
              </div>
            </div>

            {!certificate ? (
              <form onSubmit={handleSignTerms} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Signatory Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={sigName}
                      onChange={(e) => setSigName(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs text-gray-950 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Member Role</label>
                    <select
                      value={sigRole}
                      onChange={(e) => setSigRole(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs text-gray-950 dark:text-white"
                    >
                      <option value="student">Student Learner</option>
                      <option value="mentor">Registered Mentor</option>
                      <option value="recruiter">Organization Recruiter</option>
                      <option value="admin">System Administrator</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-start gap-2.5 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={sigChecks.acceptTerms}
                      onChange={(e) => setSigChecks({ ...sigChecks, acceptTerms: e.target.checked })}
                      className="h-4.5 w-4.5 rounded border-gray-300 dark:border-gray-700 text-blue-600 focus:ring-blue-500/20 cursor-pointer mt-0.5"
                    />
                    <span className="text-[11px] text-gray-450 dark:text-gray-450 leading-normal">
                      I have read, understood, and agree to be bound by the General Terms of Service, including Delaware dispute guidelines.
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={sigChecks.acceptGuidelines}
                      onChange={(e) => setSigChecks({ ...sigChecks, acceptGuidelines: e.target.checked })}
                      className="h-4.5 w-4.5 rounded border-gray-300 dark:border-gray-700 text-blue-600 focus:ring-blue-500/20 cursor-pointer mt-0.5"
                    />
                    <span className="text-[11px] text-gray-450 dark:text-gray-450 leading-normal">
                      I agree to respect Community Guidelines and acknowledge the spam opportunity listing escalation matrix.
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={sigChecks.verifyAge}
                      onChange={(e) => setSigChecks({ ...sigChecks, verifyAge: e.target.checked })}
                      className="h-4.5 w-4.5 rounded border-gray-300 dark:border-gray-700 text-blue-600 focus:ring-blue-500/20 cursor-pointer mt-0.5"
                    />
                    <span className="text-[11px] text-gray-450 dark:text-gray-450 leading-normal">
                      I verify that I am over 13 years of age, or have active parental consent to access YuvaHub features.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={signing}
                  className="w-full clean-btn py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
                >
                  {signing ? (
                    <>
                      <Clock className="w-4 h-4 animate-spin" /> Compiling Cryptographic Hash...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" /> Electronically Sign Terms
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="p-6 border border-dashed border-green-200 dark:border-green-900/60 bg-green-50/10 dark:bg-green-950/10 rounded-2xl text-center space-y-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-950/60 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-gray-900 dark:text-white">Terms Certificate Generated</h4>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">A secure digital signature has been recorded for this session.</p>
                </div>

                <div className="max-w-md mx-auto bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 text-left text-xs space-y-2.5 shadow-xs font-mono">
                  <div className="flex justify-between pb-1.5 border-b border-gray-50 dark:border-gray-800">
                    <span className="text-gray-400">Signatory</span>
                    <span className="font-bold text-gray-700 dark:text-gray-300">{certificate.owner}</span>
                  </div>
                  <div className="flex justify-between pb-1.5 border-b border-gray-50 dark:border-gray-800">
                    <span className="text-gray-400">Profile Role</span>
                    <span className="font-bold text-gray-700 dark:text-gray-300 capitalize">{certificate.role}</span>
                  </div>
                  <div className="flex justify-between pb-1.5 border-b border-gray-50 dark:border-gray-800">
                    <span className="text-gray-400">Timestamp</span>
                    <span className="text-gray-500">{certificate.date}</span>
                  </div>
                  <div className="pt-1.5">
                    <span className="text-gray-400 block mb-1">Receipt Hash</span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold block break-all">{certificate.hash}</span>
                  </div>
                </div>

                <button 
                  onClick={() => setCertificate(null)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-semibold text-xs rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Clear Signature
                </button>
              </div>
            )}
          </section>

          {/* Interactive FAQs Accordion */}
          <section className="clean-card p-6 md:p-8 dark:bg-gray-800 dark:border-gray-700 space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Terms FAQs
                </h2>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                  Common clarifications regarding user responsibilities and opportunity submissions.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, idx) => {
                const isOpen = expandedFaq === idx;
                return (
                  <div
                    key={idx}
                    className="border border-gray-150 dark:border-gray-700/60 rounded-xl overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedFaq(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-900/10 hover:bg-gray-50 dark:hover:bg-gray-700/30 text-left transition duration-150"
                    >
                      <span className="font-semibold text-xs text-gray-900 dark:text-white">
                        {faq.q}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ml-2 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="p-4 bg-white dark:bg-gray-850 border-t border-gray-150 dark:border-gray-700/60 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
