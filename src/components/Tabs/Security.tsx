import React, { useState } from 'react';
import { Shield, Lock, Server, Key, Eye, EyeOff, Clipboard, AlertOctagon, CheckCircle2, ChevronRight, FileText, Download, Mail, Terminal, Send, Search, Printer, Copy } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

type SecuritySection = 'infrastructure' | 'data-protection' | 'disclosure' | 'compliance';

export default function Security() {
  const { theme } = useAppContext();
  const [activeSection, setActiveSection] = useState<SecuritySection>('infrastructure');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [reportForm, setReportForm] = useState({
    name: '',
    email: '',
    vulnerabilityType: 'xss',
    description: '',
    stepsToReproduce: '',
    impact: ''
  });
  const [formSubmitted, setFormSubmitted] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reportForm.email && reportForm.description) {
      setFormSubmitted(true);
    }
  };

  const sections = [
    { id: 'infrastructure', label: 'Infrastructure & Network Security', icon: Server },
    { id: 'data-protection', label: 'Data Protection & Encryption', icon: Shield },
    { id: 'disclosure', label: 'Vulnerability Disclosure Policy', icon: Terminal },
    { id: 'compliance', label: 'Compliance & Audits', icon: FileText }
  ];

  return (
    <div className="max-w-6xl mx-auto pb-16">
      {/* Top Banner/Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
            <Lock className="w-8 h-8 text-blue-600 dark:text-blue-500" />
            Security & Trust Center
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Learn about how we secure your data, monitor infrastructure, and maintain regulatory compliance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
          >
            {isCopied ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                <span>Copied Link</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Share Link</span>
              </>
            )}
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Section</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search security controls..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible gap-1 pb-2 lg:pb-0 scrollbar-none">
            {sections.map((sect) => {
              const Icon = sect.icon;
              const isActive = activeSection === sect.id;
              return (
                <button
                  key={sect.id}
                  onClick={() => setActiveSection(sect.id as SecuritySection)}
                  className={`flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-lg transition-all whitespace-nowrap lg:whitespace-normal shrink-0 ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{sect.label}</span>
                </button>
              );
            })}
          </div>

          <div className="hidden lg:block p-4 rounded-xl bg-green-50/50 dark:bg-green-950/20 border border-green-100/50 dark:border-green-900/30">
            <h4 className="text-xs font-bold text-green-900 dark:text-green-400 flex items-center gap-1.5 mb-2">
              <Shield className="w-3.5 h-3.5" />
              Security Status
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-xs text-green-800 dark:text-green-400 font-semibold">All Systems Operational</span>
            </div>
            <p className="text-[10px] text-green-800/80 dark:text-green-400/80 leading-normal mt-2">
              Our engineering team conducts regular mock pen tests and code reviews to secure standard features.
            </p>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-6 md:p-8 shadow-sm">
          {activeSection === 'infrastructure' && (
            <div className="space-y-6 text-gray-700 dark:text-gray-300 text-xs md:text-sm leading-relaxed">
              <div>
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-[10px] font-bold rounded-full uppercase tracking-wider">
                  Reference: SEC-INF-01
                </span>
                <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white mt-3">
                  Infrastructure & Network Security
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                  Last Audited: June 2026
                </p>
              </div>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-1">
                  1. Cloud Infrastructure Architecture
                </h3>
                <p>
                  YuvaHub services are hosted exclusively on premium cloud infrastructure providers (specifically Google Cloud Platform and Render). Our systems are architected across multiple Availability Zones to ensure high availability and disaster recovery resilience.
                </p>
                <p>
                  Our server network topology isolates system tiers into virtual networks. Database nodes, storage queues, and worker runtimes operate inside isolated subnets with no public internet ingress. Public endpoints are fronted by managed load balancers which enforce strict HTTPS TLS configurations.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-1">
                  2. Edge Protection and DDoS Mitigation
                </h3>
                <p>
                  We utilize edge networks to detect, mitigate, and filter malicious traffic before it reaches our application servers. Our edge protection stack handles:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>
                    <strong>DDoS Protection:</strong> High-capacity automatic mitigation filters targeting volumetric and protocol-based distributed denial of service attacks.
                  </li>
                  <li>
                    <strong>Web Application Firewall (WAF):</strong> Automated rules designed to inspect HTTP headers and payloads to intercept common vulnerability patterns (such as SQL injections, Cross-Site Scripting, and Local File Inclusions).
                  </li>
                  <li>
                    <strong>Rate Limiting:</strong> Smart rate limiting configured on auth and submission endpoints to protect against brute-force attacks and abuse.
                  </li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-1">
                  3. System Access Control & Authentication
                </h3>
                <p>
                  Administrative access to YuvaHub infrastructure is highly restricted. We enforce the principle of least privilege, ensuring that team members only have access to resources necessary for their job functions.
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>
                    <strong>Multi-Factor Authentication (MFA):</strong> All developer and admin accounts on GCP, Render, Firebase console, and GitHub are protected by mandatory hardware token or app-based multi-factor authentication.
                  </li>
                  <li>
                    <strong>Access Logging:</strong> All infrastructure administrative actions are securely logged to read-only compliance systems and monitored for anomalies.
                  </li>
                  <li>
                    <strong>No Password SSH:</strong> Server access is controlled solely via public-key cryptography combined with bastion host jumpboxes.
                  </li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-1">
                  4. Vulnerability & Configuration Scanning
                </h3>
                <p>
                  Our codebases and systems undergo continuous scanning to identify configuration drift, package vulnerabilities, and potential security lapses:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Weekly dependency scanning using GitHub Dependabot.</li>
                  <li>Static code analysis (SAST) during our continuous integration pipelines.</li>
                  <li>Container vulnerability scanning during build phases before deployment.</li>
                </ul>
              </section>
            </div>
          )}

          {activeSection === 'data-protection' && (
            <div className="space-y-6 text-gray-700 dark:text-gray-300 text-xs md:text-sm leading-relaxed">
              <div>
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-[10px] font-bold rounded-full uppercase tracking-wider">
                  Reference: SEC-DAT-02
                </span>
                <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white mt-3">
                  Data Protection & Encryption
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                  Last Audited: June 2026
                </p>
              </div>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-1">
                  1. Encryption in Transit
                </h3>
                <p>
                  All network traffic entering or leaving our Service endpoints is encrypted using Transport Layer Security (TLS) 1.2 or 1.3 protocol. We enforce HTTPS across all web apps, mobile APIs, and backend endpoints using HTTP Strict Transport Security (HSTS).
                </p>
                <p>
                  Our cipher suites prioritize AEAD ciphers with perfect forward secrecy (ECDHE-ECDSA-AES128-GCM-SHA256, etc.) to ensure that captured past communication cannot be decrypted even if private keys are compromised in the future.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-1">
                  2. Encryption at Rest
                </h3>
                <p>
                  Sensitive user information, including profile data, auth profiles, and internal submissions, is encrypted at rest using industry-standard symmetric encryption algorithms:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>
                    <strong>Databases:</strong> All database storage volumes, file uploads, and system backups are encrypted using AES-256 with managed cryptographic keys.
                  </li>
                  <li>
                    <strong>Session Identifiers:</strong> Authentication is handled via Firebase JSON Web Tokens (JWT) using cryptographically signed HMAC keys.
                  </li>
                  <li>
                    <strong>API Keys & Credentials:</strong> If API credentials or integration tokens are stored, they are encrypted at the application layer before database commit.
                  </li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-1">
                  3. Key Management & Secrets Store
                </h3>
                <p>
                  YuvaHub does not hardcode application secrets, API keys, or private keys inside source repositories. All development and production keys are managed dynamically using professional secret management services (like Render Environment variables or Google Secret Manager). Secret access is logged, auditable, and rotated periodically.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-1">
                  4. Backups and Disaster Recovery
                </h3>
                <p>
                  To prevent data loss and ensure system persistence, we maintain automated backup schedules:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Daily incremental backups of MongoDB and Firestore databases.</li>
                  <li>Weekly complete snapshot backups stored across separate physical data centers.</li>
                  <li>Regular disaster recovery simulation drills to test restore times and pipeline integrity.</li>
                </ul>
              </section>
            </div>
          )}

          {activeSection === 'disclosure' && (
            <div className="space-y-6 text-gray-700 dark:text-gray-300 text-xs md:text-sm leading-relaxed">
              <div>
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-[10px] font-bold rounded-full uppercase tracking-wider">
                  Reference: SEC-DIS-03
                </span>
                <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white mt-3">
                  Vulnerability Disclosure Policy
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                  Last Updated: July 2026
                </p>
              </div>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-1">
                  1. Policy Statement
                </h3>
                <p>
                  We believe that keeping YuvaHub secure requires collaboration and transparency. We value the work of security researchers, whitehat hackers, and developers who help identify potential bugs. This policy outlines how you should report security concerns to us and what you can expect in return.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-1">
                  2. Reporting Guidelines
                </h3>
                <p>
                  If you believe you have discovered a vulnerability on YuvaHub, please follow these rules:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Report the details directly to our security team via the form below or email security@yuvahub.com.</li>
                  <li>Do not publicly disclose the details of the vulnerability before we have fixed it.</li>
                  <li>Do not exploit, download excess data, or view other users' private profiles during testing.</li>
                  <li>Do not perform physical social engineering, physical security tests, or Distributed Denial of Service (DDoS) tests.</li>
                </ul>
              </section>

              {/* Vulnerability Report Form Mock */}
              <div className="border border-gray-100 dark:border-gray-700 p-5 rounded-xl bg-gray-50 dark:bg-gray-900/50">
                <h4 className="font-bold text-gray-950 dark:text-white text-sm mb-4 flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-red-500" />
                  Report a Security Bug
                </h4>
                {formSubmitted ? (
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-150 text-green-700 dark:text-green-400 rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    <div>
                      <p className="font-bold text-xs">Thank you for your report!</p>
                      <p className="text-[11px] mt-0.5">Our security team will review and reply within 48 hours.</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleFormSubmit} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold mb-1 text-gray-600 dark:text-gray-400">Your Name</label>
                        <input 
                          type="text" 
                          required
                          value={reportForm.name}
                          onChange={(e) => setReportForm({...reportForm, name: e.target.value})}
                          className="w-full text-xs p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold mb-1 text-gray-600 dark:text-gray-400">Your Email</label>
                        <input 
                          type="email" 
                          required
                          value={reportForm.email}
                          onChange={(e) => setReportForm({...reportForm, email: e.target.value})}
                          className="w-full text-xs p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold mb-1 text-gray-600 dark:text-gray-400">Vulnerability Type</label>
                      <select 
                        value={reportForm.vulnerabilityType}
                        onChange={(e) => setReportForm({...reportForm, vulnerabilityType: e.target.value})}
                        className="w-full text-xs p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="xss">Cross-Site Scripting (XSS)</option>
                        <option value="sqli">SQL Injection (SQLi)</option>
                        <option value="auth">Broken Authentication / Access Control</option>
                        <option value="csrf">Cross-Site Request Forgery (CSRF)</option>
                        <option value="other">Other / General Leak</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold mb-1 text-gray-600 dark:text-gray-400">Description & Impact</label>
                      <textarea 
                        required
                        rows={3}
                        value={reportForm.description}
                        onChange={(e) => setReportForm({...reportForm, description: e.target.value})}
                        className="w-full text-xs p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <button type="submit" className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold flex items-center justify-center gap-1.5">
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Secure Report</span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {activeSection === 'compliance' && (
            <div className="space-y-6 text-gray-700 dark:text-gray-300 text-xs md:text-sm leading-relaxed">
              <div>
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-[10px] font-bold rounded-full uppercase tracking-wider">
                  Reference: SEC-COM-04
                </span>
                <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white mt-3">
                  Compliance & Audits
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                  Last Audited: June 2026
                </p>
              </div>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-1">
                  1. Regulatory Frameworks
                </h3>
                <p>
                  YuvaHub complies with major regulatory frameworks safeguarding applicant data and candidate integrity. We maintain regular updates to guarantee compliance with the following:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  <div className="border border-gray-100 dark:border-gray-700 p-4 rounded-xl">
                    <h4 className="font-bold text-gray-950 dark:text-white text-xs">GDPR Compliant</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      We offer full data portability, profile export tools, and account deletion functionality in compliance with EU General Data Protection Regulations.
                    </p>
                  </div>
                  <div className="border border-gray-100 dark:border-gray-700 p-4 rounded-xl">
                    <h4 className="font-bold text-gray-950 dark:text-white text-xs">CCPA Compliant</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      We do not sell user data, email profiles, or submission lists to third-party brokers. California users can exercise their CCPA rights via settings.
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-1">
                  2. Third-Party Subprocessors
                </h3>
                <p>
                  We utilize subprocessors to provide components of our service. All service providers are audited to verify security posture and signed under Data Processing Addendums (DPAs):
                </p>
                <table className="w-full text-xs border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden mt-3">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 font-bold text-left">
                      <th className="p-3">Subprocessor</th>
                      <th className="p-3">Service Provided</th>
                      <th className="p-3">Data Handled</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-750">
                    <tr>
                      <td className="p-3 font-semibold">Firebase (Google)</td>
                      <td className="p-3">Authentication & Profile Storage</td>
                      <td className="p-3">Email, UID, Display Name, Photo URL</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">MongoDB Atlas</td>
                      <td className="p-3">Core Application Database</td>
                      <td className="p-3">Submissions, User profiles, Bookmarks</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">Render Inc.</td>
                      <td className="p-3">Application Hosting & Cache</td>
                      <td className="p-3">IP Addresses, Session headers, logs</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">Google Cloud AI</td>
                      <td className="p-3">AIAssistant LLM Processing</td>
                      <td className="p-3">User queries, search history</td>
                    </tr>
                  </tbody>
                </table>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-1">
                  3. Audit & Reporting Schedules
                </h3>
                <p>
                  To verify the health and security of our ecosystem, we coordinate:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Quarterly security scans of the Firebase configurations.</li>
                  <li>Annual independent security assessments and review of compliance pipelines.</li>
                  <li>Review of security policies and data handling practices at least twice per year.</li>
                </ul>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
