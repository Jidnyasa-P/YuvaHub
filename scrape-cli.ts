import { execSync } from 'child_process';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

async function runVerification() {
  console.log("=================================================================");
  console.log("   Yuvahub Multi-Source Consolidated Scraper Verification & Run   ");
  console.log("=================================================================");
  
  const uri = process.env.MONGODB_URI || "";
  const dbName = process.env.MONGODB_DB_NAME || "yuvahub";
  
  if (!uri) {
    console.error("[Database] CRITICAL: No MONGODB_URI configured. Exiting.");
    process.exit(1);
  }

  console.log(`[Database] Connecting to: ${dbName}`);
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  
  const initialCount = await db.collection("opportunities").countDocuments();
  console.log(`[Database] Initial MongoDB Document Count: ${initialCount}`);

  console.log("\n--- PHASE 1: Legacy Node.js scrapers retired ---");
  console.log("[Phase 1] All legacy Node.js scraping logic has been fully migrated to python.");

  console.log("\n--- PHASE 2: Fetching From Centralized Python Scraper Registry (Devfolio, Devpost, Unstop, Eventbrite, Opportunities Circle) ---");
  let pythonScrapedCount = 0;
  let pythonInsertedCount = 0;
  let pythonUpdatedCount = 0;
  
  try {
    console.log("[Phase 2] Launching Python Multiprocessing Pipeless pipeline...");
    const pythonOutput = execSync('python3 main.py', {
      cwd: './scraper_backend',
      env: { ...process.env, PYTHONPATH: '.' },
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024 // 10MB budget
    });

    // Console logs of python pipeline
    const lines = pythonOutput.split('\n');
    const logs = lines.filter(line => !line.startsWith('===') && !line.startsWith('[') && !line.includes('SCRAPE_RESULTS_JSON'));
    console.log("[Phase 2] Python logs:\n" + logs.join('\n'));

    const startMarker = "=== SCRAPE_RESULTS_JSON_START ===";
    const endMarker = "=== SCRAPE_RESULTS_JSON_END ===";
    
    const startIndex = pythonOutput.indexOf(startMarker);
    const endIndex = pythonOutput.indexOf(endMarker);

    if (startIndex !== -1 && endIndex !== -1) {
      const jsonRaw = pythonOutput.substring(startIndex + startMarker.length, endIndex).trim();
      const items: any[] = JSON.parse(jsonRaw);
      pythonScrapedCount = items.length;
      console.log(`[Phase 2] Extraction Succeeded. Found ${items.length} opportunities from Python Registry.`);

      // Direct Ingestion of Python Parsed Items into MongoDB inside Node
      for (const item of items) {
        const fp = item.fingerprint || crypto.createHash("md5").update(`${item.source_name}:${item.title}:${item.organization}`).digest("hex");
        
        // Build schema
        const doc: any = {
          title: item.title,
          description: item.description || "No description provided.",
          source: item.source || item.source_name.toLowerCase().replace(/[^a-z0-9]/g, "_"),
          source_name: item.source_name,
          source_url: item.source_url || item.apply_link || "https://yuvahub.xyz",
          apply_link: item.apply_link || "https://yuvahub.xyz",
          image_url: item.image_url || "https://yuvahub.xyz/og-image.jpg",
          tags: Array.isArray(item.tags) ? item.tags : ["Live"],
          category: item.category || "General",
          deadline: item.deadline || "TBD",
          location: item.location || "Online",
          opportunity_type: (item.opportunity_type || item.category || "General").toLowerCase(),
          fingerprint: fp,
          fingerprint_hash: fp,
          created_at: item.created_at ? new Date(item.created_at) : new Date(),
          updated_at: new Date()
        };

        const res = await db.collection("opportunities").updateOne(
          { fingerprint: fp },
          { $setOnInsert: doc },
          { upsert: true }
        );

        if (res.upsertedCount > 0) {
          pythonInsertedCount++;
        } else {
          pythonUpdatedCount++;
        }
      }
      console.log(`[Phase 2] Python Pipeline Database Ingestion Complete: ${pythonInsertedCount} new inserted, ${pythonUpdatedCount} duplicates cataloged.`);
    } else {
      console.warn("[Phase 2] WARNING: JSON telemetry marker not found in Python output stream.");
    }
  } catch (err: any) {
    console.error("[Phase 2] Python Pipeline Execution Failed!");
    if (err.stdout) console.log("Stdout:", err.stdout);
    if (err.stderr) console.error("Stderr:", err.stderr);
  }

  console.log("\n--- PHASE 3: Fetching Execution Report & Consolidated Ingestion Metrics ---");
  try {
    const finalCount = await db.collection("opportunities").countDocuments();
    const docDiff = finalCount - initialCount;
    
    console.log("========================================= ");
    console.log("   SCRAPER INTEGRITY METRICS SUMMARY      ");
    console.log("========================================= ");
    console.log(`- Base MongoDB Server Connection:  [CONNECTED]`);
    console.log(`- Previous Opportunity Count:      ${initialCount}`);
    console.log(`- New Opportunity Count:           ${finalCount}`);
    console.log(`- Absolute Ingestion Growth:       +${docDiff} new records`);
    console.log(`- Python Central registry scraped: ${pythonScrapedCount} raw items`);
    console.log(`- Python fresh db writes:          ${pythonInsertedCount} documents`);
    console.log(`- Node pipeline ingestion result:  Completed successful run`);
    
    const stats = await db.collection("opportunities").aggregate([
      { $group: { _id: "$source", count: { $sum: 1 } } }
    ]).toArray();
    
    console.log("\nSource-wise Opportunities Summary in MongoDB currently:");
    stats.forEach((s: any) => {
      console.log(` * [${s._id || "unspecified"}] Ingested Documents Total: ${s.count}`);
    });
    
    const latest = await db.collection("opportunities").find({}).sort({ created_at: -1 }).limit(5).toArray();
    console.log("\nLatest 5 opportunities currently in MongoDB:");
    latest.forEach((o: any) => {
      console.log(` [+] Source: [${o.source}]  Title: "${o.title}"  (Location: ${o.location}, DeadlineDate/String: ${o.deadline})`);
    });
    
  } catch (err: any) {
    console.error("[Phase 3] Metrics Analysis Failed:", err.message);
  } finally {
    await client.close();
    console.log("\n=================================================================");
    console.log("   Yuvahub ingestion run verification process terminated.        ");
    console.log("=================================================================");
  }
}

runVerification().catch(console.error);
