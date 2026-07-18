import React, { useState, useMemo } from 'react';
import { 
  Users, 
  ShieldAlert, 
  MessageSquare, 
  HelpCircle, 
  CheckCircle, 
  Award, 
  AlertTriangle, 
  Send, 
  Clock, 
  Scale, 
  ChevronRight,
  Info,
  Sliders,
  ThumbsUp,
  Bookmark
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

// Structured sections for Community Guidelines
const guidelineSections = [
  {
    id: "purpose",
    title: "1. Community Purpose & Vision",
    icon: Users,
    content: `YuvaHub is built to bring ambitious students, professional mentors, and organizations together in a supportive network. Our platform allows members to collaborate on hackathons, find internships, request technical guidance, and discuss emerging engineering projects.

Our vision is to maintain an inclusive, educational, and high-signal workspace. Sarcasm, duplicate postings, or self-promotional spam undermine the learning environment and are actively filtered.

All members must uphold these community principles, ensuring that discussions stay constructive and opportunities remain transparent.`
  },
  {
    id: "conduct",
    title: "2. Rules of Engagement & Conduct",
    icon: MessageSquare,
    content: `We expect all communications within YuvaHub channels (forum threads, comments, Direct Messages, and mentorship bookings) to remain professional and respectful.

Prohibited Behavior Includes:
- Harassment & Abuse: Any comments targeting a member's gender, identity, race, religion, or technical experience.
- Toxic Sarcasm: Dismissive comments or responses to student queries (e.g., 'Google it', 'This is a basic question'). We support beginners and value constructive feedback.
- Plagiarism: Reposting others' project summaries, code repos, or submission ideas without citing authors or obtaining rights.`
  },
  {
    id: "authenticity",
    title: "3. Opportunity Submission Integrity",
    icon: ShieldAlert,
    content: `Opportunities indexed on our dashboard (hackathons, quizzes, internships, scholarship links) must be authentic and verifiable.

Submission Standards:
- Verified URLs: Links must point directly to the host organization's application forms. Affiliate URLs or tracker landing pages are banned.
- No Data Harvesting: Stating fake prizes or mock opportunities to collect email addresses or resumes is a severe infraction.
- Up-to-date details: Deadlines and eligibility rules must match official guidelines.`
  },
  {
    id: "enforcement",
    title: "4. Moderation & Escalation Matrix",
    icon: Scale,
    content: `To keep YuvaHub high-signal, our community moderation team reviews flagged comments and submissions daily.

We enforce a tiered penalty schedule:
- 1st Infraction: Written warning notice sent via registered email. Offending content is deleted.
- 2nd Infraction: Temporary account restriction (read-only mode for 48 hours).
- 3rd Infraction: Account suspension. Review of organization verification status.
- Severe Violations: Immediate IP ban (for fake opportunities or malware distribution).`
  }
];

// Appeal Registry Database
const initialAppeals = [
  { id: "APL-77412", date: "July 12, 2026", type: "Comment Flag", status: "Resolved (Approved)", detail: "Clarified sarcasm was a misinterpretation." },
  { id: "APL-88104", date: "July 15, 2026", type: "Listing Flag", status: "Under Review", detail: "Reviewing company hiring registration docs." }
];

export default function Guidelines() {
  const [activeTab, setActiveTab] = useState("purpose");
  const [searchQuery, setSearchQuery] = useState("");

  // Quiz States
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Pledge States
  const [pledgeName, setPledgeName] = useState("");
  const [pledgeChecks, setPledgeChecks] = useState({
    respect: false,
    noSpam: false,
    verifyLinks: false
  });
  const [showBadge, setShowBadge] = useState(false);

  // Appeal States
  const [appealType, setAppealType] = useState("comment");
  const [appealReason, setAppealReason] = useState("");
  const [appealsList, setAppealsList] = useState(initialAppeals);
  const [submittingAppeal, setSubmittingAppeal] = useState(false);

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return guidelineSections;
    const query = searchQuery.toLowerCase();
    return guidelineSections.filter(
      (sec) =>
        sec.title.toLowerCase().includes(query) ||
        sec.content.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Quiz details
  const quizScenario = {
    q: "Scenario: A student posts a repository query that has an obvious syntax error. Which response complies with YuvaHub guidelines?",
    options: [
      { id: 0, text: "\"This is basic JS. You should Google it before posting here.\"", correct: false, explanation: "Incorrect. This is condescending and discourages learners from asking questions." },
      { id: 1, text: "\"Check line 14, looks like you missed a comma. Here is a link to MDN syntax rules.\"", correct: true, explanation: "Correct! This is constructive, direct, and offers actionable help." },
      { id: 2, text: "\"Looks broken. Just copy my code instead, link in bio.\"", correct: false, explanation: "Incorrect. While helpful, it uses the post to advertise/self-promote a link." }
    ]
  };

  const handleQuizSubmit = () => {
    if (selectedAnswer === null) return;
    setQuizSubmitted(true);
  };

  const handlePledgeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pledgeName.trim() || !pledgeChecks.respect || !pledgeChecks.noSpam || !pledgeChecks.verifyLinks) return;
    setShowBadge(true);
  };

  const handleAppealSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealReason.trim()) return;
    setSubmittingAppeal(true);
    setTimeout(() => {
      const appealId = "APL-" + Math.floor(10000 + Math.random() * 90000);
      setAppealsList([
        {
          id: appealId,
          date: new Date().toLocaleDateString(),
          type: appealType === 'comment' ? 'Comment Flag' : 'Opportunity Flag',
          status: 'Under Review',
          detail: appealReason
        },
        ...appealsList
      ]);
      setAppealReason("");
      setSubmittingAppeal(false);
    }, 1500);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-indigo-750 to-purple-800 p-8 md:p-12 text-white shadow-lg">
        <div className="absolute top-0 right-0 -translate-y-6 translate-x-6 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-semibold uppercase tracking-wider mb-4">
            <Users className="w-3.5 h-3.5" /> Community Code of Conduct
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
            Community Guidelines
          </h1>
          <p className="mt-4 text-base md:text-lg text-purple-100 font-medium">
            Read our expected rules of behavior, peer-to-peer mentoring code, opportunity audit standards, and warning procedures.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 text-xs text-purple-200">
            <span>Last Updated: July 16, 2026</span>
            <span>•</span>
            <span>Version 2.0.0 (Split Modular)</span>
            <span>•</span>
            <span>Document Ref: GUIDELINES-2026-C</span>
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Navigation Sidebar */}
        <aside className="lg:col-span-4 space-y-6 sticky top-6">
          <div className="clean-card p-5 dark:bg-gray-800 dark:border-gray-700">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-1.5 px-1">
              <Sliders className="w-4 h-4 text-purple-500" /> Guideline Sections
            </h3>
            <nav className="space-y-1">
              {guidelineSections.map((sec) => {
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
                        ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400' 
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
                  placeholder="Search guidelines..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-gray-900 dark:text-white"
                />
                <Sliders className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Quick appeal helper */}
          <div className="p-5 rounded-2xl bg-purple-50 dark:bg-purple-950/15 border border-purple-200/50 dark:border-purple-900/30 text-purple-950 dark:text-purple-400 shadow-xs">
            <h4 className="font-extrabold text-sm flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-purple-650 dark:text-purple-400" /> Appeals Desk
            </h4>
            <p className="text-[11px] leading-relaxed mt-2 text-purple-800/90 dark:text-purple-405/85">
              Flagged by mistake? Submit a formal review ticket through our appeals simulator below for moderation review.
            </p>
          </div>
        </aside>

        {/* Clause Details */}
        <div className="lg:col-span-8 space-y-8">
          <div className="clean-card p-6 md:p-8 dark:bg-gray-800 dark:border-gray-700 space-y-8">
            {filteredSections.length === 0 ? (
              <div className="text-center py-12">
                <AlertTriangle className="w-12 h-12 text-purple-550 mx-auto mb-3" />
                <h3 className="font-bold text-lg text-gray-800 dark:text-white">No guidelines found</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                  Try searching for keywords like "Respect", "Authenticity", "Sarcasm", or "Warning".
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
                      isHighlighted ? 'bg-purple-50/5 dark:bg-purple-950/5 -mx-4 px-4 rounded-xl' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
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

          {/* Interactive Widget 1: Guideline case study Quiz */}
          <section className="clean-card p-6 md:p-8 dark:bg-gray-800 dark:border-gray-700 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-700">
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-650 dark:text-purple-400">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Conduct Case Study Quiz</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Test your understanding of how constructive responses should be framed.</p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-xs font-bold text-gray-800 dark:text-white">{quizScenario.q}</p>
              
              <div className="space-y-2.5">
                {quizScenario.options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      if (quizSubmitted) return;
                      setSelectedAnswer(opt.id);
                    }}
                    disabled={quizSubmitted}
                    className={`w-full flex items-center justify-between p-3.5 border rounded-xl text-left text-xs transition ${
                      selectedAnswer === opt.id
                        ? "border-purple-600 bg-purple-50/10 dark:border-purple-500"
                        : "border-gray-150 bg-gray-50/50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750"
                    }`}
                  >
                    <span className="font-semibold text-gray-700 dark:text-gray-350">{opt.text}</span>
                    <span className="w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center text-[10px] text-white shrink-0">
                      {selectedAnswer === opt.id && "✓"}
                    </span>
                  </button>
                ))}
              </div>

              {quizSubmitted ? (
                <div className={`p-4 rounded-xl border text-xs leading-relaxed space-y-1.5 ${
                  quizScenario.options[selectedAnswer!].correct
                    ? "border-green-200 bg-green-50/10 text-green-800 dark:text-green-400"
                    : "border-red-200 bg-red-50/10 text-red-800 dark:text-red-400"
                }`}>
                  <h4 className="font-bold flex items-center gap-1.5">
                    {quizScenario.options[selectedAnswer!].correct ? "Correct Choice" : "Incorrect Choice"}
                  </h4>
                  <p className="font-medium">{quizScenario.options[selectedAnswer!].explanation}</p>
                  <button 
                    onClick={() => { setQuizSubmitted(false); setSelectedAnswer(null); }}
                    className="mt-2 text-xs font-bold underline block text-purple-600 dark:text-purple-400 hover:text-purple-700"
                  >
                    Retry Scenario
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleQuizSubmit}
                  disabled={selectedAnswer === null}
                  className="w-full clean-btn py-2.5 text-xs font-semibold"
                >
                  Verify Conduct Answer
                </button>
              )}
            </div>
          </section>

          {/* Interactive Widget 2: Code of Conduct Pledge Badge */}
          <section className="clean-card p-6 md:p-8 dark:bg-gray-800 dark:border-gray-700 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-700">
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-650 dark:text-purple-400">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Community Engagement Pledge</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Commit to maintain positive standards and unlock your Certified Citizen Badge.</p>
              </div>
            </div>

            {showBadge ? (
              <div className="p-6 border border-dashed border-purple-200 dark:border-purple-900/60 bg-purple-50/10 dark:bg-purple-950/10 rounded-2xl text-center space-y-4 animate-float">
                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center mx-auto shadow-md">
                  <Award className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-gray-900 dark:text-white">Certified Citizen Badge Unlocked</h4>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Thank you for committing to help and respect learners on YuvaHub!</p>
                </div>

                <div className="max-w-xs mx-auto bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 text-xs font-semibold shadow-xs">
                  <span className="text-gray-400 block font-normal">Holder Signature</span>
                  <span className="font-bold text-purple-700 dark:text-purple-400 font-mono text-sm block mt-1">{pledgeName}</span>
                  <div className="mt-3 flex items-center justify-center gap-1.5 text-[9px] text-green-600 dark:text-green-400 uppercase font-bold">
                    <CheckCircle className="w-3.5 h-3.5" /> Citizen Registered
                  </div>
                </div>

                <button 
                  onClick={() => { setShowBadge(false); setPledgeName(""); setPledgeChecks({ respect: false, noSpam: false, verifyLinks: false }); }}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-semibold text-xs rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Clear Pledge
                </button>
              </div>
            ) : (
              <form onSubmit={handlePledgeSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Your Username / Handle</label>
                  <input
                    type="text"
                    required
                    placeholder="@dev_coder"
                    value={pledgeName}
                    onChange={(e) => setPledgeName(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-xs text-gray-950 dark:text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-start gap-2.5 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={pledgeChecks.respect}
                      onChange={(e) => setPledgeChecks({ ...pledgeChecks, respect: e.target.checked })}
                      className="h-4.5 w-4.5 rounded border-gray-300 dark:border-gray-700 text-purple-600 focus:ring-purple-500/20 cursor-pointer mt-0.5"
                    />
                    <span className="text-[11px] text-gray-450 dark:text-gray-450 leading-normal">
                      I pledge to communicate respectfully, avoid toxic sarcasm, and support beginners on forums.
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={pledgeChecks.noSpam}
                      onChange={(e) => setPledgeChecks({ ...pledgeChecks, noSpam: e.target.checked })}
                      className="h-4.5 w-4.5 rounded border-gray-300 dark:border-gray-700 text-purple-600 focus:ring-purple-500/20 cursor-pointer mt-0.5"
                    />
                    <span className="text-[11px] text-gray-450 dark:text-gray-450 leading-normal">
                      I pledge to refrain from posting affiliate links, duplicate listings, or spam promotion in forums.
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={pledgeChecks.verifyLinks}
                      onChange={(e) => setPledgeChecks({ ...pledgeChecks, verifyLinks: e.target.checked })}
                      className="h-4.5 w-4.5 rounded border-gray-300 dark:border-gray-700 text-purple-600 focus:ring-purple-500/20 cursor-pointer mt-0.5"
                    />
                    <span className="text-[11px] text-gray-450 dark:text-gray-450 leading-normal">
                      I warrant that all opportunities submitted by my handle represent verified, direct, and authentic contest links.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full clean-btn bg-purple-600 hover:bg-purple-700 py-2.5 text-xs font-semibold"
                >
                  Submit Pledge & Unlock Badge
                </button>
              </form>
            )}
          </section>

          {/* Interactive Widget 3: Moderation appeals simulator */}
          <section className="clean-card p-6 md:p-8 dark:bg-gray-800 dark:border-gray-700 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-700">
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-650 dark:text-purple-400">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Moderation Appeals Registry</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">File appeal requests to correct misidentified flags or request reinstatement.</p>
              </div>
            </div>

            <form onSubmit={handleAppealSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Incident Scope</label>
                  <select
                    value={appealType}
                    onChange={(e) => setAppealType(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-250 dark:border-gray-700 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-xs text-gray-950 dark:text-white"
                  >
                    <option value="comment">Flagged Forum Comment / Post</option>
                    <option value="listing">Flagged Opportunity Listing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Estimated queue delay</label>
                  <div className="p-2.5 bg-gray-55 dark:bg-gray-900 border border-gray-200 dark:border-gray-750 text-xs text-gray-550 dark:text-gray-400 rounded-lg font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>~ 12 Hours (Moderation Queue active)</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Explanation Appeal Details</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide context on why this item was flagged in error or what edits were done to resolve policies..."
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-250 dark:border-gray-700 rounded-lg px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-xs text-gray-950 dark:text-white resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submittingAppeal}
                className="w-full clean-btn bg-purple-600 hover:bg-purple-700 py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
              >
                {submittingAppeal ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" /> Staging Appeal Ticket...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Submit Appeal Request
                  </>
                )}
              </button>
            </form>

            <div className="space-y-2 pt-4 border-t border-gray-100 dark:border-gray-700">
              <span className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Appeal History Logs</span>
              <div className="space-y-2">
                {appealsList.map((appeal) => (
                  <div key={appeal.id} className="p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-150 dark:border-gray-750 rounded-xl flex items-center justify-between text-[11px]">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 font-bold">
                        <span className="text-gray-900 dark:text-white font-mono">{appeal.id}</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-450 font-normal">{appeal.type}</span>
                      </div>
                      <p className="text-gray-450 dark:text-gray-500 truncate max-w-[280px]">{appeal.detail}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        appeal.status.includes('Resolved')
                          ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400"
                      }`}>
                        {appeal.status}
                      </span>
                      <span className="block text-[9px] text-gray-400 mt-1">{appeal.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
