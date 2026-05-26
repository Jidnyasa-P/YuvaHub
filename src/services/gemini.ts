import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client Lazily on the frontend as per Skill Guidelines
let _genAI: GoogleGenAI | null = null;

function getGenAI() {
  if (!_genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY_MISSING");
    }
    _genAI = new GoogleGenAI({ apiKey });
  }
  return _genAI;
}

const robustParseJSON = (text: string): any => {
  if (!text) return null;
  try {
    const firstBrace = text.indexOf('{');
    const firstBracket = text.indexOf('[');
    const lastBrace = text.lastIndexOf('}');
    const lastBracket = text.lastIndexOf(']');

    let start = -1;
    let end = -1;

    const isArray = firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace);
    
    if (isArray) {
      start = firstBracket;
      end = lastBracket;
    } else {
      start = firstBrace;
      end = lastBrace;
    }

    if (start !== -1 && end !== -1 && end > start) {
      const jsonStr = text.substring(start, end + 1);
      return JSON.parse(jsonStr);
    }
    
    return JSON.parse(text);
  } catch (e) {
    console.error("[JSON Parse Error] Raw text:", text);
    return null;
  }
};

export async function generateSmartFeed(profile: any, page: number = 1) {
  const prompt = `Return a JSON array of 5 unique student opportunities (internships, hackathons, etc) matching this profile: ${JSON.stringify(profile)}. Page: ${page}. Return JSON ONLY. Schema: [{id, title, type, organization, tags:[], deadline, apply_link, description, match_score}]`;
  
  const response = await getGenAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });
  
  const items = robustParseJSON(response.text);
  if (items && (Array.isArray(items) || Array.isArray(items.items))) {
    return Array.isArray(items) ? items : items.items;
  }
  throw new Error("EMPTY_AI_RESPONSE");
}

export async function generateApplyDraft(opportunity: any, profile: any) {
  const prompt = `Write a short professional cover letter draft for: ${opportunity.title} at ${opportunity.organization}. Candidate: ${profile.name}, Skills: ${profile.skills?.join(",")}. Keep it concise.`;
  const response = await getGenAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt
  });
  return response.text;
}

export async function refineSearchQuery(query: string, profile: any) {
  const prompt = `Refine this search query for a student: "${query}". Profile context: ${profile?.field || 'Tech'}. Return ONLY the refined query string, max 5 words.`;
  const response = await getGenAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt
  });
  return (response.text || "").trim();
}

export async function runScoutProtocol(parameters: any, profile: any) {
  const prompt = `Perform a "Scout Protocol" search. Profile: ${JSON.stringify(profile)}, Goals: ${JSON.stringify(parameters)}. Return JSON ONLY: {results: [{title, org, type, deadline, apply_link, match_reason, id}], agent_note: "..."}`;
  const response = await getGenAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });
  return robustParseJSON(response.text || "{}");
}

export async function generateExploreFeed(page: number = 1) {
  const prompt = `Return 5 unique high-value student opportunities (International scholarships, niche hackathons, creative fellowships). page ${page}. Return JSON array ONLY. Schema: [{id, title, type, organization, tags:[], deadline, apply_link, description, trending:true}]`;
  const response = await getGenAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });
  const items = robustParseJSON(response.text);
  if (items && (Array.isArray(items) || Array.isArray(items.items))) {
    return Array.isArray(items) ? items : items.items;
  }
  throw new Error("EMPTY_AI_RESPONSE");
}

export async function chatWithMentor(messages: any[], newMessage: string) {
  const prompt = `You are YuvaHub's AI Mentor. History: ${JSON.stringify(messages)}. New: ${newMessage}. Return JSON ONLY: {text: "...", options: ["Quick reply 1", "Quick reply 2"], card: {title, org, type, applyLink, description}}.`;
  const response = await getGenAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });
  return robustParseJSON(response.text) || { text: response.text };
}
