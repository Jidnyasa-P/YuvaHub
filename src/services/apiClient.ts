/**
 * Finalized Frontend Fetch Architecture
 * This replaces direct Gemini calls for the feed and delegates logic to the FastAPI backend.
 */

import { auth } from '../lib/firebase';
import * as geminiService from './gemini';

const API_BASE_URL = "/api/v1";

// Simple persistent cache for fallbacks
const saveToCache = (key: string, data: any) => {
  try {
    localStorage.setItem(`cache_${key}`, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.warn("Storage quota exceeded for local cache");
  }
};

const getFromCache = (key: string) => {
  try {
    const cached = localStorage.getItem(`cache_${key}`);
    if (cached) return JSON.parse(cached).data;
  } catch (e) {
    return null;
  }
  return null;
};

async function getAuthHeaders() {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    };
  }
  return {
    "Content-Type": "application/json"
  };
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
  const headers = await getAuthHeaders();
  const mergedOptions = {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {})
    }
  };

  try {
    const response = await fetch(url, mergedOptions);
    if (response.ok) return response;
    
    // Don't retry on 4xx (client errors) other than 429
    if (response.status >= 400 && response.status < 500 && response.status !== 429) {
      return response;
    }
    
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 1000));
      return fetchWithRetry(url, options, retries - 1);
    }
    return response;
  } catch (error) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 1000));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

export async function fetchSmartFeed(profile: any, page: number = 1) {
  const cacheKey = "smart_feed";
  try {
    const searchParams = new URLSearchParams();
    searchParams.append('page', page.toString());
    
    if (profile?.domain) searchParams.append('domain', profile.domain);
    if (profile?.skills) {
      const skl = Array.isArray(profile.skills) ? profile.skills.join(',') : String(profile.skills);
      searchParams.append('skills', skl);
    }
    if (profile?.country) searchParams.append('country', profile.country);
    if (profile?.field) searchParams.append('field', profile.field);

    const url = `${API_BASE_URL}/feed?${searchParams.toString()}`;
    const response = await fetchWithRetry(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) throw new Error("API_ERROR");

    const data = await response.json();
    
    if (!data.items || data.items.length < 3) {
      console.log("DB returned sparse results, triggering Gemini supplemental discovery...");
      try {
        const geminiItems = await geminiService.generateSmartFeed(profile, page);
        if (geminiItems && geminiItems.length > 0) {
          data.items = [
            ...(data.items || []),
            ...geminiItems.map((item: any) => ({ ...item, isAI_Supplement: true }))
          ];
          data.meta = { ...data.meta, note: "Supplemented with AI-discovered opportunities" };
          data.next_page = page + 1; // force next page if we injected items
        }
      } catch (geminiError) {
        console.warn("Gemini supplement failed", geminiError);
      }
    }

    if (page === 1 && data.items && data.items.length > 0) {
        saveToCache(cacheKey, data);
    }
    return data;
  } catch (error) {
    console.warn("Backend feed failed, using fallback", error);
    const cached = getFromCache(cacheKey);
    if (cached) return { ...cached, isFallback: true };
    
    try {
        const geminiItems = await geminiService.generateSmartFeed(profile, page);
        return { 
           items: geminiItems.map((i: any) => ({...i, isAI_Supplement: true})), 
           isFallback: true, 
           next_page: page + 1 
        };
    } catch (e) {
        return { items: [], isFallback: true };
    }
  }
}

export async function generateApplyAssistBackend(opportunity: any, profile: any) {
  try {
    const content = await geminiService.generateApplyDraft(opportunity, profile);
    return { content };
  } catch (error) {
    return { content: "Our AI is currently optimizing your draft. Please try again in 60s." };
  }
}

export async function refineQueryBackend(query: string, profile: any) {
  try {
    return await geminiService.refineSearchQuery(query, profile);
  } catch (error) {
    return query;
  }
}

export async function runScoutProtocolBackend(parameters: any, profile: any) {
  try {
    const searchParams = new URLSearchParams();
    if (parameters.tech) searchParams.append('q', parameters.tech);
    if (parameters.goal) searchParams.append('type', parameters.goal);
    
    const url = `${API_BASE_URL}/search?${searchParams.toString()}`;
    const response = await fetchWithRetry(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    
    if (!response.ok) throw new Error("API_ERROR");
    
    return await response.json();
  } catch (error) {
    return { results: [], error: "Scout failed" };
  }
}

export async function chatWithAIMentorBackend(messages: any[], newMessage: string) {
  try {
    return await geminiService.chatWithMentor(messages, newMessage);
  } catch (error) {
    return { text: "I'm having trouble connecting to my knowledge base right now." };
  }
}

export async function fetchExploreFeed(page: number = 1, limit: number = 20) {
  const cacheKey = "explore_feed";
  try {
    const url = `${API_BASE_URL}/feed/trending?page=${page}&limit=${limit}`;
    const response = await fetchWithRetry(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) throw new Error("API_ERROR");

    const data = await response.json();
    
    if (!data.items || data.items.length < 3) {
      console.log("DB returned sparse explore results, triggering Gemini supplemental discovery...");
      try {
        const geminiItems = await geminiService.generateExploreFeed(page);
        if (geminiItems && geminiItems.length > 0) {
          data.items = [
            ...(data.items || []),
            ...geminiItems.map((item: any) => ({ ...item, isAI_Supplement: true }))
          ];
          data.next_page = page + 1;
        }
      } catch (e) {
        console.warn("Gemini explore supplement failed", e);
      }
    }

    if (page === 1 && data.items && data.items.length > 0) saveToCache(cacheKey, data);
    return data;
  } catch (error) {
    const cached = getFromCache(cacheKey);
    if (cached) return { ...cached, isFallback: true };
    
    try {
        const geminiItems = await geminiService.generateExploreFeed(page);
        return { 
           items: geminiItems.map((i: any) => ({...i, isAI_Supplement: true})), 
           isFallback: true, 
           next_page: page + 1 
        };
    } catch (e) {
        throw error;
    }
  }
}

export async function searchOpportunities(query: string, type?: string, page: number = 1) {
  const cacheKey = `search_${query.toLowerCase().replace(/\s+/g, '_')}`;
  try {
    const searchParams = new URLSearchParams();
    searchParams.append('q', query);
    if (type && type !== 'All') searchParams.append('type', type);
    searchParams.append('page', page.toString());
    
    const url = `${API_BASE_URL}/search?${searchParams.toString()}`;

    const response = await fetchWithRetry(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) throw new Error("API_ERROR");

    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
        console.log("DB search empty, using Gemini Scout Protocol...");
        try {
           const geminiRes = await geminiService.runScoutProtocol({ tech: query, goal: type }, {});
           if (geminiRes && geminiRes.results) {
               data.results = geminiRes.results.map((r: any) => ({ ...r, isAI_Supplement: true }));
               data.meta = geminiRes.meta || data.meta;
               data.isAI_Supplement = true;
           }
        } catch (e) {
           console.warn("Gemini scout supplement failed", e);
        }
    }
    
    if (data.results && data.results.length > 0) saveToCache(cacheKey, data);
    return data;
  } catch (error) {
    const cached = getFromCache(cacheKey);
    if (cached) return { ...cached, isFallback: true };
    
    try {
        const geminiRes = await geminiService.runScoutProtocol({ tech: query, goal: type }, {});
        return { 
           results: (geminiRes.results || []).map((r: any) => ({ ...r, isAI_Supplement: true })),
           meta: geminiRes.meta,
           isFallback: true 
        };
    } catch(e) {
        throw error;
    }
  }
}

export async function fetchNotifications() {
  try {
    const response = await fetchWithRetry(`${API_BASE_URL}/notifications`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    if (!response.ok) throw new Error("API_ERROR");
    return await response.json();
  } catch (error) {
    console.warn("Could not fetch notifications");
    return [];
  }
}

export async function markNotificationRead(id: string) {
  try {
    const response = await fetchWithRetry(`${API_BASE_URL}/notifications/${id}/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

export async function markAllNotificationsRead() {
  try {
    const response = await fetchWithRetry(`${API_BASE_URL}/notifications/read-all`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

export async function fetchSystemStats() {
  try {
    const response = await fetch(API_BASE_URL.replace('/api/v1', ''));
    if (response.ok) return await response.json();
    return null;
  } catch (e) {
    return null;
  }
}

export async function trackInteraction(opportunityId: string, actionType: 'view' | 'click' | 'save' | 'apply') {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/interactions/track`, {
      method: "POST",
      headers,
      body: JSON.stringify({ opportunity_id: opportunityId, action_type: actionType })
    });
    return response.ok;
  } catch (e) {
    // Fire and forget, don't break UI for tracking failures
    console.warn("Failed to track interaction", e);
    return false;
  }
}

export async function fetchOpportunityById(id: string) {
  try {
    const url = `${API_BASE_URL}/opportunity/${id}`;
    const response = await fetchWithRetry(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    if (!response.ok) throw new Error("Opportunity offline");
    return await response.json();
  } catch (error) {
    console.warn(`Could not sync opportunity details for ${id}:`, error);
    return null;
  }
}
