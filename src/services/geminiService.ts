import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, Opportunity } from "../types";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    if (!aiClient) aiClient = new GoogleGenAI({ apiKey });
    return aiClient;
  } catch (err) {
    return null;
  }
}

const TWENTY_FIVE_MINS = 25 * 60 * 1000;

function robustParseJSON(text: string): any {
  if (!text) return null;
  try {
    const startIdx = text.indexOf('{');
    const endIdx = text.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const jsonContent = text.substring(startIdx, endIdx + 1)
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control characters
        .replace(/\\"/g, '"') // Standardize escaped quotes
        .replace(/\"(.*?)\"/g, (match) => match.replace(/\n/g, "\\n")); // Escape accidental newlines in strings
      return JSON.parse(jsonContent);
    }
    return JSON.parse(text);
  } catch (err) {
    console.error("Robust Parse Error:", err, "Original Text snippet:", text.substring(0, 500));
    return null;
  }
}

export async function loadFeed(userProfile: any, forceRefresh = false): Promise<any> {
  const mode = userProfile.discoveryMode || 'smart';
  const cacheKey = `${userProfile.uid}_${mode}`;
  let cachedDoc = await getDoc(doc(db, 'user_feeds', cacheKey));
  
  // Fallback to old cache format to prevent empty feeds
  if (!cachedDoc.exists()) {
    const oldCacheDoc = await getDoc(doc(db, 'user_feeds', userProfile.uid));
    if (oldCacheDoc.exists()) {
      cachedDoc = oldCacheDoc;
    }
  }

  const cached = cachedDoc.exists() ? cachedDoc.data() : null;
  const age = Date.now() - (cached?.fetched_at || 0);
  const isStale = age > TWENTY_FIVE_MINS;

  const cache_status = forceRefresh ? "FORCE_REFRESH"
    : !cached ? "EMPTY"
    : isStale ? "STALE" : "FRESH";

  if (cache_status === "FRESH" && cached) return cached.results;

  const aiResult = await callFeedAgent({ ...userProfile, cache_status, existingCount: cached?.results?.length || 0 });

  if (aiResult.error === "QUOTA_EXCEEDED" && cached) {
    console.log("Serving stale cache due to quota limits.");
    return cached.results;
  }

  if (aiResult.action === "USE_CACHE" && cached) return cached.results;

  if (aiResult.results && aiResult.results.length > 0) {
    let mergedResults = aiResult.results;
    
    // Incremental Update: If forcing refresh & cache exists, prepend new items
    if ((forceRefresh || isStale) && cached && cached.results) {
      const existingTitles = new Set(cached.results.map((r: any) => r.title));
      const newUnique = aiResult.results.filter((r: any) => !existingTitles.has(r.title));
      
      // Mark new items
      newUnique.forEach((r: any) => { r.isNew = true; r.added_timestamp = Date.now(); });
      
      // Keep old items, cap length at 100 to avoid infinite growth
      const keptOldItems = cached.results.map((r: any) => ({...r, isNew: false })).slice(0, 100);
      mergedResults = [...newUnique, ...keptOldItems];
    } else {
      mergedResults.forEach((r: any) => { r.isNew = true; r.added_timestamp = Date.now(); });
    }

    await setDoc(doc(db, 'user_feeds', cacheKey), {
      fetched_at: Date.now(),
      results: mergedResults,
      meta: aiResult.meta || {}
    }, { merge: true });
    
    return mergedResults;
  }
  
  return cached?.results || [];
}

export async function loadMoreFeed(userProfile: any, currentResults: any[]): Promise<any> {
  const mode = userProfile.discoveryMode || 'smart';
  const cacheKey = `${userProfile.uid}_${mode}`;
  const aiResult = await callFeedAgent({ ...userProfile, cache_status: "FORCE_REFRESH", existingCount: currentResults.length });
  
  if (aiResult.results && aiResult.results.length > 0) {
    const existingTitles = new Set(currentResults.map(r => r.title));
    const newResults = aiResult.results.filter((r: any) => !existingTitles.has(r.title));
    newResults.forEach((r: any) => { r.isNew = true; r.added_timestamp = Date.now(); });
    
    if (newResults.length > 0) {
      const mergedResults = [...newResults, ...currentResults];
      await setDoc(doc(db, 'user_feeds', cacheKey), {
        fetched_at: Date.now(),
        results: mergedResults,
        meta: aiResult.meta || {}
      }, { merge: true });
      return mergedResults;
    }
  }
  return currentResults;
}

async function callFeedAgent(profileData: any): Promise<any> {
  try {
    const ai = getAiClient();
    if (!ai) return { results: [] };

    const isExplore = profileData.discoveryMode === 'explore';

    const prompt = `
YOU ARE YuvaHub Feed Agent. Your job is to return student opportunities in structured JSON.

Today's date: ${new Date().toDateString()}

CACHE INSTRUCTION (READ THIS FIRST):
You have received a cache_status of: "${profileData.cache_status}"

If cache_status = "FRESH" -> DO NOT search. Return:
{ "action": "USE_CACHE", "reason": "Data is less than 25 minutes old." }

If cache_status = "STALE" or "EMPTY" or "FORCE_REFRESH" -> Perform full search.

SEARCH BEHAVIOR (only when cache is STALE/EMPTY/FORCE):
${isExplore ? `
EXPLORE MODE ACTIVE:
Provide a diverse, serendipitous mix of opportunities! Include trending global hackathons, high-value international scholarships, and hidden gems that might be outside their immediate field. Help them discover the unexpected.` : `
SMART MATCH MODE ACTIVE:
Provide highly personalized opportunities that strictly match the user's year, field, technology focus, and immediate goal.`}

Search the web for currently open opportunities matching the user profile.
Prioritize: internshala.com, unstop.com, devfolio.co, buddy4study.com,
dare2compete.com, fellowshipdesk.com, linkedin.com/jobs

${profileData.existingCount ? `NOTE: The user already has ${profileData.existingCount} results. Try to find DIFFERENT, fresh opportunities that are not redundant.` : ''}

Filter rule: NEVER return opportunities with deadlines before ${new Date().toDateString()}

USER PROFILE SUMMARY:
Name: ${profileData.name || "Student"}
Year of Study: ${profileData.year || "Not specified"}
Field: ${profileData.field || "Not specified"}
Technology Focus: ${profileData.tech || "Not specified"}
Immediate Goal: ${profileData.goal || "Not specified"}
Skills: ${profileData.skills?.join(", ") || "Not specified"}
Location: ${profileData.city || ""}, ${profileData.country || ""}
College: ${profileData.college || "Not specified"}

OUTPUT FORMAT:
{
  "action": "REFRESH", // or "USE_CACHE"
  "fetched_at": "${new Date().toDateString()}",
  "ttl_minutes": 25,
  "results": [
    {
      "id": "unique-slug",
      "title": "Opportunity Title",
      "type": "internship | hackathon | scholarship | scheme | job | fellowship",
      "org": "Organization Name",
      "tags": ["AI/ML", "Remote", "Stipend"],
      "deadline": "15 June 2025 | Check official page",
      "stipend_or_prize": "₹15,000/month | Not listed",
      "applyLink": "https://...",
      "source": "internshala.com",
      "verified": true,
      "status": "CONFIRMED OPEN | LIKELY OPEN | UNVERIFIED",
      "matchReason": "...",
      "smartMatch": true,
      "trending": false,
      "closingSoon": false,
      "description": "Short description max 100 words"
    }
  ],
  "updated_count": 3,
  "removed_expired": 1,
  "agent_note": "Removed 1 expired result, added 3 new ones."
}
`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          temperature: 0.1,
        }
      });

      return robustParseJSON(response.text || "{}") || { results: [] };
    } catch (err: any) {
      if (err?.message?.includes("429") || err?.message?.includes("RESOURCE_EXHAUSTED")) {
        console.warn("Gemini Quota Exceeded. Returning cached results if available.");
        return { results: [], error: "QUOTA_EXCEEDED" };
      }
      throw err;
    }
  } catch (err) {
    console.error("Feed Agent error:", err);
    return { results: [] };
  }
}

/** Scout Protocol Matcher */
export async function matchScoutProtocol(profile: any, parameters: any): Promise<any> {
  try {
    const ai = getAiClient();
    if (!ai) throw new Error("AI Client unavailable.");

    // Merge profile with scout parameters
    const scoutProfile = {
      ...profile,
      year: parameters.year || profile?.year,
      field: parameters.field || profile?.field,
      tech: parameters.tech || profile?.tech,
      goal: parameters.goal || profile?.goal
    };

    const profileContext = `
      Student Profile:
      - Name: ${scoutProfile.name || "Student"}
      - Year of Study: ${scoutProfile.year || "Not specified"}
      - Field: ${scoutProfile.field || "Not specified"}
      - Technology Focus: ${scoutProfile.tech || "Not specified"}
      - Immediate Goal: ${scoutProfile.goal || "Not specified"}
      - Skills: ${scoutProfile.skills?.join(", ") || "Not specified"}
      - Location: ${scoutProfile.city || ""}, ${scoutProfile.country || ""}
      - College: ${scoutProfile.college || "Not specified"}
    `;

    const prompt = `
YOU ARE YuvaHub Scout — an intelligent opportunity-finding agent for Indian students. You help students discover internships, hackathons, government schemes, scholarships, and jobs that are CURRENTLY OPEN and relevant to their profile.

Today's date is: ${new Date().toDateString()}
Always use this date to filter results — never suggest opportunities with deadlines in the past.

SEARCH BEHAVIOR:
1. First, analyze the user's profile (year, field, tech stack, goal)
2. Construct 2–3 targeted search queries based on their profile
3. Prioritize results from: internshala.com, unstop.com, devfolio.co, buddy4study.com, scholarships.gov.in, linkedin.com/jobs, dare2compete.com, fellowshipdesk.com
4. Cross-check deadlines wherever possible

HONESTY PROTOCOL (CRITICAL):
- You are NOT a database. You are a search agent.
- If deadline is not found in search results -> set "deadline" to "Check official page"
- If apply link is not verified -> set "verified": false and note it
- Never fabricate opportunity details
- If you find fewer than 3 verified results -> say so honestly, and suggest what the user can search manually
- Clearly distinguish between: CONFIRMED OPEN / LIKELY OPEN / UNVERIFIED

USER PROFILE INPUT:
${profileContext}

OUTPUT FORMAT (STRICT JSON):
Return ONLY valid JSON. No markdown, no preamble, no explanation outside the JSON.
{
  "meta": {
    "searched_on": "${new Date().toDateString()}",
    "profile_summary": "...",
    "search_queries_used": ["..."],
    "result_count": 5,
    "agent_note": "..."
  },
  "results": [
    {
      "id": "unique-slug",
      "title": "Opportunity Title",
      "type": "internship | hackathon | scholarship | scheme | job | fellowship",
      "org": "Organization Name",
      "tags": ["AI/ML", "Remote", "Stipend"],
      "deadline": "15 June 2025 | Check official page",
      "stipend_or_prize": "₹15,000/month | Not listed",
      "applyLink": "https://...",
      "source": "internshala.com",
      "verified": true,
      "status": "CONFIRMED OPEN | LIKELY OPEN | UNVERIFIED",
      "matchReason": "...",
      "smartMatch": true,
      "trending": false,
      "closingSoon": false,
      "description": "Short description max 100 words"
    }
  ],
  "refinement_suggestions": [
    { "label": "...", "query": "..." }
  ]
}

BADGE LOGIC:
- Set "trending": true -> if opportunity appears in multiple search results or social buzz
- Set "closingSoon": true -> if deadline is within 7 days of today
- Set "smartMatch": true -> if opportunity directly matches user's tech stack or goal
- Set "verified": false -> if you could not confirm the opportunity is currently open

WHAT TO NEVER DO:
- Never return opportunities with past deadlines
- Never hallucinate apply links — use only URLs found in search results
- Never return more than 5 results (quality over quantity, prevents truncation)
- Never skip the "meta" block
- Never return plain text — always return valid parseable JSON.
`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          temperature: 0.1,
        }
      });

      return robustParseJSON(response.text || "{}") || { results: [] };
    } catch (err: any) {
      if (err?.message?.includes("429") || err?.message?.includes("RESOURCE_EXHAUSTED")) {
        return { results: [], error: "QUOTA_EXCEEDED" };
      }
      throw err;
    }
  } catch (error) {
    console.error("Scout Matcher error:", error);
    return { results: [] };
  }
}

export async function performLiveSearch(query: string, profile: any, filterType = "All"): Promise<any> {
  try {
    const ai = getAiClient();
    if (!ai) return { results: [] };

    const profileContext = profile ? `
      Student Profile:
      - Name: ${profile.name || "Student"}
      - Year of Study: ${profile.year || "Not specified"}
      - Field: ${profile.field || "Not specified"}
      - Technology Focus: ${profile.tech || "Not specified"}
      - Immediate Goal: ${profile.goal || "Not specified"}
      - Skills: ${profile.skills?.join(", ") || "Not specified"}
      - Location: ${profile.city || ""}, ${profile.country || ""}
      - College: ${profile.college || "Not specified"}
    ` : "General Student Profile";

    const typeFilter = filterType !== "All" && filterType ? `Only show: ${filterType}` : "Show all types";
    const modeInstruction = profile?.discoveryMode === 'explore' 
      ? "\nEXPLORE MODE ACTIVE: Focus on serendipity, global/trending opportunities, and broader fields adjacent to the student's core field. Suggest some out-of-the-box ideas."
      : "\nSMART MATCH MODE ACTIVE: Focus strictly on highly relevant opportunities matching their exact year, field, and goal.";

    const prompt = `
YOU ARE YuvaHub Scout — an intelligent opportunity-finding agent for Indian students. You help students discover internships, hackathons, government schemes, scholarships, and jobs that are CURRENTLY OPEN and relevant to their profile.

Today's date is: ${new Date().toDateString()}
Always use this date to filter results — never suggest opportunities with deadlines in the past.

SEARCH BEHAVIOR:
1. First, analyze the user's profile (year, field, tech stack, goal)${modeInstruction}
2. Construct 2–3 targeted search queries based on their profile
3. Prioritize results from: internshala.com, unstop.com, devfolio.co, buddy4study.com, scholarships.gov.in, linkedin.com/jobs, dare2compete.com, fellowshipdesk.com
4. Cross-check deadlines wherever possible

HONESTY PROTOCOL (CRITICAL):
- You are NOT a database. You are a search agent.
- If deadline is not found in search results -> set "deadline" to "Check official page"
- If apply link is not verified -> set "verified": false and note it
- Never fabricate opportunity details
- If you find fewer than 3 verified results -> say so honestly, and suggest what the user can search manually
- Clearly distinguish between: CONFIRMED OPEN / LIKELY OPEN / UNVERIFIED

USER PROFILE INPUT:
${profileContext}
Query focus (if any): ${query !== 'Student opportunities' ? query : "General opportunities matching profile"}
${typeFilter}

OUTPUT FORMAT (STRICT JSON):
Return ONLY valid JSON. No markdown, no preamble, no explanation outside the JSON.
{
  "meta": {
    "searched_on": "${new Date().toDateString()}",
    "profile_summary": "...",
    "search_queries_used": ["..."],
    "result_count": 5,
    "agent_note": "..."
  },
  "results": [
    {
      "id": "unique-slug",
      "title": "Opportunity Title",
      "type": "internship | hackathon | scholarship | scheme | job | fellowship",
      "org": "Organization Name",
      "tags": ["AI/ML", "Remote", "Stipend"],
      "deadline": "15 June 2025 | Check official page",
      "stipend_or_prize": "₹15,000/month | Not listed",
      "applyLink": "https://...",
      "source": "internshala.com",
      "verified": true,
      "status": "CONFIRMED OPEN | LIKELY OPEN | UNVERIFIED",
      "matchReason": "...",
      "smartMatch": true,
      "trending": false,
      "closingSoon": false,
      "description": "Short description max 100 words"
    }
  ],
  "refinement_suggestions": [
    { "label": "...", "query": "..." }
  ]
}

BADGE LOGIC:
- Set "trending": true -> if opportunity appears in multiple search results or social buzz
- Set "closingSoon": true -> if deadline is within 7 days of today
- Set "smartMatch": true -> if opportunity directly matches user's tech stack or goal
- Set "verified": false -> if you could not confirm the opportunity is currently open

WHAT TO NEVER DO:
- Never return opportunities with past deadlines
- Never hallucinate apply links — use only URLs found in search results
- Never return more than 5 results (quality over quantity, prevents truncation)
- Never skip the "meta" block
- Never return plain text — always return valid parseable JSON.
`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          temperature: 0.1,
        }
      });

      return robustParseJSON(response.text || "{}") || { results: [] };
    } catch (err: any) {
      if (err?.message?.includes("429") || err?.message?.includes("RESOURCE_EXHAUSTED")) {
        return { results: [], error: "QUOTA_EXCEEDED" };
      }
      throw err;
    }
  } catch (error) {
    console.error("Live Search error:", error);
    return { results: [] };
  }
}

export async function refineSearchWithAI(query: string, profile: UserProfile | null): Promise<string> {
  if (!query) return query;
  try {
    const ai = getAiClient();
    if (!ai) return query;

    const profileCtx = profile ? `Skills: ${profile.skills?.join(", ")}, Field: ${profile.field}` : "General Indian Student";
    const prompt = `Task: Refine the search query to be highly relevant.
    User Query: "${query}"
    User Profile: ${profileCtx}
    Transform into a more specific search term. Max 6 words. Return ONLY the string without quotes.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    return response.text?.trim().replace(/^"|"$/g, '') || query;
  } catch (error) {
    return query;
  }
}

/** Apply Assist (Cover Letter / SOP) */
export async function generateApplyAssist(opportunity: Partial<Opportunity>, profile: UserProfile | null): Promise<string> {
  try {
    const ai = getAiClient();
    if (!ai) return "AI Service Unavailable.";

    const prompt = `Write a compelling cover letter or statement of purpose for:
    Opportunity: ${opportunity.title} at ${opportunity.organization}.
    User Profile: Name: ${profile?.name}, College: ${profile?.college}, Skills: ${profile?.skills?.join(", ")}.
    Keep it professional, concise, and structured. Include placeholders like [Insert custom detail here].`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });

      return response.text || "Failed to generate.";
    } catch (err: any) {
      if (err?.message?.includes("429") || err?.message?.includes("RESOURCE_EXHAUSTED")) {
        return "I've hit my search limit for the moment. Please try generating this draft again in a few minutes.";
      }
      throw err;
    }
  } catch (error) {
    console.error("Apply Assist error:", error);
    return "Error occurred while generating assist.";
  }
}

/** AI Mentor Chat (Stateless single message response for now) */
export async function chatWithAIMentor(messageHistory: {role: string, content: string}[], newMessage: string): Promise<any> {
  try {
    const ai = getAiClient();
    if (!ai) return { text: "System offline. Please check your connection." };

    const context = messageHistory.map(m => {
      let contentString = m.content;
      try {
        const parsed = JSON.parse(m.content);
        if (parsed.text) contentString = parsed.text;
      } catch (e) {
        // ignore
      }
      return `${m.role.toUpperCase()}: ${contentString}`;
    }).join("\n");

    const prompt = `You are YuvaHub's AI Mentor — a wise, encouraging guide for Indian and global youth.
    You help with career decisions, application strategy, interview prep, skill roadmaps, and personal growth.
    
    If you need more details, ask with short quick-reply options (Options should be short phrases the user can click).
    If the user asks to register for something, find opportunities or mentors, return a mock opportunity card in the JSON.
    
    CRITICAL: YOU MUST RETURN ONLY VALID JSON. No markdown blocking.
    
    JSON Schema:
    {
      "text": "Your conversational response here.",
      "options": ["Quick reply 1", "Quick reply 2"], // Keep empty if no options are needed
      "card": { // Optional. Provide if suggesting an opportunity or registration link
        "title": "Opportunity Title",
        "type": "internship/hackathon/etc",
        "org": "Organization",
        "deadline": "Deadline",
        "applyLink": "https://example.com",
        "description": "Short description"
      }
    }
    
    Conversation History:
    ${context}
    
    USER: ${newMessage}
    AI MENTOR JSON RESPONSE:`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      return robustParseJSON(response.text || "{}") || { text: "Error parsing mentor response." };
    } catch (err: any) {
      if (err?.message?.includes("429") || err?.message?.includes("RESOURCE_EXHAUSTED")) {
        return { text: "AI Mentor is currently over-taxed with many requests. Please try again in a few minutes.", error: "QUOTA_EXCEEDED" };
      }
      throw err;
    }
  } catch (error) {
    console.error("Mentor error:", error);
    return { text: "I'm having trouble connecting to my knowledge base right now." };
  }
}
