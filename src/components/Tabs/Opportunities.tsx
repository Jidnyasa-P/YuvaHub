import React, { useState, useEffect } from 'react';
import { Search, Sparkles, Clock, Zap, CheckCircle, X, Loader2, Copy, Globe, Bookmark, Share2, FileText, Compass } from 'lucide-react';
import { UserProfile, Opportunity } from '../../types';
import { searchOpportunities, trackInteraction, refineQueryBackend, generateApplyAssistBackend } from '../../services/apiClient';
import ShareModal from '../ui/ShareModal';
import ApplyAssistModal from '../ui/ApplyAssistModal';

export default function Opportunities({ user, profile }: { user: any, profile: UserProfile | null }) {
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isSearchingLive, setIsSearchingLive] = useState(false);
  const [searchData, setSearchData] = useState<any>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [shareOpp, setShareOpp] = useState<{title: string, link: string} | null>(null);
  const [discoveryMode, setDiscoveryMode] = useState<'smart' | 'explore'>('smart');

  // Apply Assist State
  const [isAssistModalOpen, setIsAssistModalOpen] = useState(false);
  const [assistLoading, setAssistLoading] = useState(false);
  const [assistContent, setAssistContent] = useState<string | null>(null);
  const [assistingOpp, setAssistingOpp] = useState<any>(null);

  const filledFields = [profile?.year, profile?.field, profile?.college, profile?.skills && profile.skills.length > 0].filter(Boolean).length;
  const strength = Math.round((filledFields / 4) * 100);

  const FILTERS = ['All', 'Internships', 'Hackathons', 'Scholarships', 'Jobs', 'Fellowships', 'Events', 'Programs'];
  const QUICK_ZAPS = ['GSoC Projects', 'Stanford Scholarships', 'UN Fellowships', 'Microsoft Internships'];

  const CACHE_KEY_PREFIX = 'yuva_live_search_3_';
  const CACHE_TTL_MS = 10 * 60 * 1000;

  useEffect(() => {
    if (!hasSearched && profile && strength >= 50) {
      let defaultQuery = "Student opportunities";
      if (profile.field) {
        defaultQuery = `${profile.field} opportunities`;
      }
      if (profile.year) {
        defaultQuery += ` for ${profile.year} year students`;
      }
      setSearchQuery(defaultQuery);
      handleLiveSearch(defaultQuery, filter);
    }
  }, [profile, hasSearched, filter, strength]);

  const handleLiveSearch = async (queryToSearch: string, filterToUse: string = filter) => {
    if (!queryToSearch.trim()) return;
    
    // Clear existing results to show loading state
    setIsSearchingLive(true);
    setHasSearched(true);
    
    try {
      let query = queryToSearch;
      if (discoveryMode === 'smart') {
         query = await refineQueryBackend(queryToSearch, profile);
      }
      
      const results = await searchOpportunities(query, filterToUse);
      setSearchData(results);
    } catch (e) {
      console.error("Search failed:", e);
      setSearchData(null);
    } finally {
      setIsSearchingLive(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    if (hasSearched && searchQuery) {
      const timer = setTimeout(() => {
        handleLiveSearch(searchQuery, filter);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, filter]);

  const handleFilterClick = (f: string) => {
    setFilter(f);
    handleLiveSearch(searchQuery, f);
  };

  const handleApplyAssist = async (opp: any) => {
    setAssistingOpp(opp);
    setAssistContent(null);
    setIsAssistModalOpen(true);
    setAssistLoading(true);
    
    try {
      const result = await generateApplyAssistBackend({
        title: opp.title,
        organization: opp.org || opp.organization
      }, profile);
      const content = typeof result === 'string' ? result : result.content;
      setAssistContent(content || "Unable to generate draft.");
    } catch (e) {
      console.error(e);
      setAssistContent("Failed to generate application assistant draft. Please try again.");
    } finally {
      setAssistLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLiveSearch(searchQuery);
    }
  };

  const getDeadlineColor = (daysStr: string) => {
    // simplified color coding based on string content assuming Gemini returns valid formats
    if (!daysStr) return 'text-gray-500';
    if (daysStr.toLowerCase().includes('rolling')) return 'text-green-600';
    
    // Attempt basic parsing, if "days" is part of the string
    const daysMatch = daysStr.match(/(\d+)\s+days/i);
    if (daysMatch) {
      const days = parseInt(daysMatch[1]);
      if (days < 10) return 'text-red-500 font-bold';
      if (days < 30) return 'text-amber-500 font-bold';
      return 'text-green-600';
    }
    return 'text-gray-600'; // Default
  };

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto space-y-12">
        <header>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-gray-900">
            Opportunities <span className="text-blue-600">Network</span>
          </h2>
          <p className="text-sm font-medium text-gray-500">Please log in to access the live opportunity feed.</p>
        </header>
        <div className="clean-card p-12 text-center border-dashed border-gray-300">
          <Globe className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h3>
          <p className="text-sm text-gray-500 mb-8 max-w-md mx-auto">Access restricted. Verify identity to see matching opportunities.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 relative">
      
      {strength < 50 && (
        <div className="clean-card p-6 border-amber-200 bg-amber-50 mb-8 flex justify-between items-center flex-wrap gap-4">
          <div>
            <h3 className="text-amber-800 font-bold text-lg">⚠️ Profile Incomplete ({strength}%)</h3>
            <p className="text-amber-700 text-sm mt-1">Complete your profile to unlock highly personalized, AI-matched opportunities.</p>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(f => (
            <button 
              key={f}
              onClick={() => handleFilterClick(f)}
              className={`px-4 py-2 text-sm font-semibold rounded-full transition-all ${filter === f ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300 hover:bg-blue-50'}`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-gray-500 flex items-center gap-1">
            <Zap className="w-4 h-4" /> Zap shortcuts:
          </span>
          {QUICK_ZAPS.map(z => (
            <button key={z} onClick={() => { setSearchQuery(z); handleLiveSearch(z); }} className="px-3 py-1 bg-white border border-gray-200 hover:border-blue-400 text-sm text-gray-700 rounded-md transition-colors shadow-sm cursor-pointer">
              {z}
            </button>
          ))}
        </div>

        <div className="relative flex flex-col md:flex-row gap-4 items-center">
          <div className="flex items-center bg-gray-100 p-1 rounded-full relative shrink-0 overflow-hidden">
            <div 
              className={`absolute inset-y-1 w-[110px] rounded-full bg-white shadow-sm transition-all duration-300 ease-out`}
              style={{ left: discoveryMode === 'smart' ? '4px' : 'calc(100% - 114px)' }}
            />
            <button
              onClick={() => setDiscoveryMode('smart')}
              className={`relative w-[110px] z-10 flex items-center justify-center gap-2 py-2 px-3 rounded-full text-xs font-bold transition-colors ${discoveryMode === 'smart' ? 'text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Smart Match
            </button>
            <button
              onClick={() => setDiscoveryMode('explore')}
              className={`relative w-[110px] z-10 flex items-center justify-center gap-2 py-2 px-3 rounded-full text-xs font-bold transition-colors ${discoveryMode === 'explore' ? 'text-purple-700' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Compass className="w-3.5 h-3.5" />
              Explore
            </button>
          </div>

          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
            <input 
              type="text" 
              placeholder="Search live opportunities..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="clean-input w-full pl-12 pr-4 py-3 shadow-sm border-gray-200"
            />
          </div>
          <button 
            onClick={() => handleLiveSearch(searchQuery)}
            disabled={!searchQuery || isSearchingLive}
            className="clean-btn w-full md:w-auto px-6 py-3 shrink-0 flex justify-center shadow-md"
          >
             Search
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-6">
        {isSearchingLive ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-4 clean-card">
             <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
             <p className="font-semibold text-gray-600">Discovering more opportunities for you 🚀</p>
          </div>
        ) : hasSearched && (!searchData || !searchData.results || searchData.results.length === 0) ? (
          <div className="py-20 text-center clean-card border-dashed">
             <p className="text-gray-500 font-medium">Looking for something specific? We're updating our results constantly.</p>
          </div>
        ) : searchData?.results && (
          <div className="space-y-6">
            {searchData.isFallback && (
              <div className="bg-blue-50/40 text-blue-800 p-4 rounded-lg flex items-center gap-3 border border-blue-100/50 backdrop-blur-sm">
                <Sparkles className="w-5 h-5 shrink-0 text-blue-500" />
                <p className="text-sm font-medium">Showing curated opportunities while we refresh new matches ✨</p>
              </div>
            )}
            <div className="bg-blue-50 text-blue-800 p-4 rounded-lg flex items-start gap-3 border border-blue-100">
              <Sparkles className="w-5 h-5 mt-0.5 shrink-0 text-blue-600" />
              <div>
                <p className="text-sm font-medium">{searchData.meta?.agent_note || 'Found matching opportunities based on your profile.'}</p>
                {searchData.refinement_suggestions && searchData.refinement_suggestions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {searchData.refinement_suggestions.map((s: any) => (
                      <button 
                        key={s.label}
                        onClick={() => { setSearchQuery(s.query); handleLiveSearch(s.query); }}
                        className="text-xs bg-white text-blue-700 px-3 py-1.5 rounded-full border border-blue-200 hover:bg-blue-100 transition-colors shadow-sm"
                      >
                        Try: {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {searchData.results.map((opp: any, idx: number) => (
                <div key={idx} className="clean-card p-6 flex flex-col hover:shadow-lg transition-shadow relative group">
                   <div className="absolute top-6 right-6 flex items-center gap-2">
                     <button 
                       onClick={() => {
                         setShareOpp({ title: opp.title, link: opp.apply_link || opp.applyLink || window.location.href });
                         trackInteraction(opp.id, 'save');
                       }}
                       className="text-gray-300 hover:text-blue-600 transition-colors"
                       title="Share"
                     >
                       <Share2 className="w-5 h-5" />
                     </button>
                     <button 
                       onClick={() => trackInteraction(opp.id, 'save')}
                       className="text-gray-300 hover:text-blue-600 transition-colors" title="Bookmark"
                     >
                       <Bookmark className="w-5 h-5" />
                     </button>
                   </div>
                   
                   <div className="flex gap-4 mb-4" onClick={() => trackInteraction(opp.id, 'view')}>
                     <div className="w-12 h-12 rounded bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-800 font-bold text-lg shrink-0 border border-blue-200">
                       {opp.org ? opp.org.substring(0,2).toUpperCase() : (opp.organization ? opp.organization.substring(0,2).toUpperCase() : 'OP')}
                     </div>
                     <div className="flex-1 pr-8">
                       <h3 className="text-lg font-bold text-gray-900 leading-tight mb-1">{opp.title}</h3>
                       <p className="text-sm font-medium text-gray-600">{opp.org || opp.organization}</p>
                     </div>
                   </div>

                   <p className="text-sm text-gray-700 line-clamp-2 mb-4 flex-1">{opp.description}</p>
                   
                   {(opp.match_reason || opp.matchReason) && (
                     <div className="bg-blue-50/50 rounded-lg p-3 inline-flex items-start gap-2 mb-4 border border-blue-100">
                       <span className="text-blue-600 shrink-0 mt-0.5">✓</span>
                       <p className="text-xs font-medium text-blue-800">{opp.match_reason || opp.matchReason}</p>
                     </div>
                   )}

                   <div className="flex flex-wrap gap-2 mb-5">
                      {opp.type && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded">
                          {opp.type}
                        </span>
                      )}
                      {opp.tags && opp.tags.slice(0,3).map((t: string) => (
                        <span key={t} className="px-2 py-1 bg-gray-50 border border-gray-200 text-gray-600 text-xs font-medium rounded">
                          {t}
                        </span>
                      ))}
                      {(opp.trending || opp.status === 'HOT') && (
                        <span className="px-2 py-1 bg-orange-50 text-orange-600 text-xs font-bold rounded">🔥 Trending</span>
                      )}
                      {(opp.closing_soon || opp.closingSoon) && (
                        <span className="px-2 py-1 bg-red-50 text-red-600 text-xs font-bold rounded">⚡ Closing Soon</span>
                      )}
                      {opp.verified === false && (
                        <span className="px-2 py-1 bg-yellow-50 text-yellow-700 text-xs font-bold rounded">⚠️ Unverified</span>
                      )}
                   </div>

                   <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto gap-3">
                     <div className={`flex items-center gap-1.5 text-xs sm:text-sm font-medium ${getDeadlineColor(opp.deadline)}`}>
                       <Clock className="w-4 h-4" /> {opp.deadline || 'Deadline Unknown'}
                     </div>
                     <div className="flex items-center gap-2">
                       <button 
                         onClick={() => handleApplyAssist(opp)}
                         className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors shadow-sm"
                       >
                         <FileText className="w-3.5 h-3.5" /> Apply Assist
                       </button>
                       {(opp.apply_link || opp.applyLink) && (
                         <a 
                           href={opp.apply_link || opp.applyLink} 
                           target="_blank" 
                           rel="noopener noreferrer" 
                           onClick={() => trackInteraction(opp.id, 'apply')}
                           className="clean-btn px-4 py-1.5 text-xs font-bold hover:shadow-md transition-shadow"
                         >
                           Apply Now
                         </a>
                       )}
                     </div>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <ShareModal 
        isOpen={!!shareOpp} 
        onClose={() => setShareOpp(null)} 
        opportunity={shareOpp} 
      />

      <ApplyAssistModal
        isOpen={isAssistModalOpen}
        onClose={() => setIsAssistModalOpen(false)}
        content={assistContent}
        isLoading={assistLoading}
        opportunityTitle={assistingOpp?.title || "Opportunity"}
      />
    </div>
  );
}
