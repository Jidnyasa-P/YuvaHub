import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

export async function runScrapers() {
  const uri = process.env.MONGODB_URI || "";
  const dbName = process.env.MONGODB_DB_NAME || "yuvahub";
  
  if (!uri) {
    console.warn("No MONGODB_URI for scraper");
    return;
  }
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    console.log("[Scraper] Starting collection...");
    
    // Devpost Hackathons
    try {
        const dpresp = await fetch("https://devpost.com/api/hackathons");
        if (dpresp.ok) {
            const dpdata = await dpresp.json();
            const results = (dpdata.hackathons || []).map((h: any) => {
                const title = h.title || "Unknown";
                const fp = crypto.createHash("md5").update("devpost-" + title).digest("hex");
                return {
                    title,
                    description: h.description || `Hackathon hosted by ${h.organization_name}`,
                    organization: h.organization_name || "Devpost",
                    apply_link: h.url || "https://devpost.com",
                    tags: (h.submission_period_tags || []).map((t: any) => t.name).slice(0, 3),
                    type: "hackathon",
                    location: h.displayed_location?.location || "Online",
                    source: "devpost",
                    fingerprint: fp,
                    created_at: new Date(),
                    deadline: h.submission_period_ends_at
                }
            });
            let inserted = 0;
            for (const r of results) {
                const res = await db.collection("opportunities").updateOne(
                { fingerprint: r.fingerprint },
                { $setOnInsert: r },
                { upsert: true }
                );
                if (res.upsertedCount > 0) inserted++;
            }
            console.log(`[Scraper] Devpost added ${inserted} items.`);
        }
    } catch(e) { console.error("Devpost scraper failed:", e); }

    // Unstop Hackathons
    try {
        const usresp = await fetch("https://unstop.com/api/public/opportunity/search-result?opportunity=hackathons&page=1");
        if (usresp.ok) {
            const usdata = await usresp.json();
            const results = (usdata?.data?.data || []).map((h: any) => {
                const title = h.title || "Unknown Hackathon";
                const organization = h.organization?.name || h.organization?.seo_url || "Unstop";
                const fp = crypto.createHash("md5").update("unstop-" + title).digest("hex");
                return {
                    title,
                    description: h.short_desc || `Compete in ${title} and win prizes!`,
                    organization,
                    apply_link: `https://unstop.com/${h.public_url}`,
                    tags: (h.filters || []).map((t: any) => t.name).filter(Boolean).slice(0, 3),
                    type: "hackathon",
                    location: h.region || "Online",
                    source: "unstop",
                    fingerprint: fp,
                    created_at: new Date(),
                    deadline: h.regn_end || null
                }
            });
            let inserted = 0;
            for (const r of results) {
                const res = await db.collection("opportunities").updateOne(
                { fingerprint: r.fingerprint },
                { $setOnInsert: r },
                { upsert: true }
                );
                if (res.upsertedCount > 0) inserted++;
            }
            console.log(`[Scraper] Unstop added ${inserted} items.`);
        }
    } catch(e) { console.error("Unstop scraper failed:", e); }

    console.log("[Scraper] Completed collection run.");
  } catch(e) {
    console.error("[Scraper] Error:", e);
  } finally {
    await client.close();
  }
}
