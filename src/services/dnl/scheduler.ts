import { IOpportunityAdapter } from './types';
import { ingestOpportunities } from './deduplicator';
import { logTelemetry } from './metrics';

export class DNLDispatcher {
  private db: any;
  private adapters: IOpportunityAdapter[] = [];
  private intervalId: NodeJS.Timeout | null = null;

  constructor(db: any) {
    this.db = db;
  }

  registerAdapter(adapter: IOpportunityAdapter) {
    this.adapters.push(adapter);
  }

  // Orchestrate a single run for an adapter with its payload/url
  async runScrape(adapter: IOpportunityAdapter, fetchUrlOrPayload: string | any[]): Promise<void> {
    const startTime = performance.now();
    let ttfb = 0;
    let rawPayload: any = null;
    let errorStack: string | null = null;
    let status: 'healthy' | 'degraded' | 'failed' = 'healthy';

    try {
      if (typeof fetchUrlOrPayload === 'string') {
        // Measure TTFB by fetching from URL
        const fetchStart = performance.now();
        const response = await fetch(fetchUrlOrPayload);
        const reader = response.body?.getReader();
        if (reader) {
          await reader.read(); // Read first byte/chunk
          ttfb = Math.round(performance.now() - fetchStart);
        } else {
          ttfb = Math.round(performance.now() - fetchStart);
        }
        
        // Fetch full text
        const text = await response.text();
        rawPayload = JSON.parse(text);
      } else {
        // Static/mock payload
        const simulatedDelay = Math.floor(Math.random() * 50) + 10; // 10ms-60ms
        await new Promise((resolve) => setTimeout(resolve, simulatedDelay));
        ttfb = simulatedDelay;
        rawPayload = fetchUrlOrPayload;
      }

      // 2. Normalization
      const normalized = adapter.normalize(rawPayload);

      // 3. Deduplication & Database Ingestion
      const result = await ingestOpportunities(this.db, normalized);

      const durationSec = (performance.now() - startTime) / 1000;

      if (result.failures > 0) {
        status = 'degraded';
      }

      await logTelemetry(this.db, {
        id: adapter.sourceName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        name: adapter.sourceName,
        status,
        lastRun: new Date().toISOString(),
        ttfb_ms: ttfb,
        payloads_processed: result.processed,
        inserted: result.inserted,
        duplicates: result.duplicates,
        failures: result.failures,
        duration_sec: parseFloat(durationSec.toFixed(3)),
        error: result.errors.length > 0 ? result.errors.join('\n') : null,
        yield_quality: result.processed > 0 ? Math.round(((result.processed - result.failures) / result.processed) * 100) : 100,
        ops_per_hour: Math.round((result.inserted / durationSec) * 3600) || 0,
        proxyHealth: 'green'
      });
    } catch (err: any) {
      const durationSec = (performance.now() - startTime) / 1000;
      errorStack = err.stack || err.message || String(err);
      
      await logTelemetry(this.db, {
        id: adapter.sourceName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        name: adapter.sourceName,
        status: 'failed',
        lastRun: new Date().toISOString(),
        ttfb_ms: ttfb,
        payloads_processed: 0,
        inserted: 0,
        duplicates: 0,
        failures: 1,
        duration_sec: parseFloat(durationSec.toFixed(3)),
        error: errorStack,
        yield_quality: 0,
        ops_per_hour: 0,
        proxyHealth: 'red'
      });
      console.error(`[DNLDispatcher] Run failed for ${adapter.sourceName}:`, err);
    }
  }

  // Start periodic scraping runs (cron-job dispatcher)
  start(intervalMs: number = 3600000) {
    if (this.intervalId) return;
    
    console.log(`[DNLDispatcher] Scheduler started. Dispatching runs every ${intervalMs / 1000}s.`);
    this.intervalId = setInterval(() => {
      this.dispatchAll();
    }, intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[DNLDispatcher] Scheduler stopped.');
    }
  }

  private async dispatchAll() {
    console.log('[DNLDispatcher] Cron trigger: Dispatching all scraper runs...');
    // Orchestrated scraping runs would go here in production.
  }
}
