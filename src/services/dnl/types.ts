export interface NormalizedOpportunity {
  title: string;
  company: string;
  description: string;
  url: string;
  location: string;
  deadline: string; // ISO format or text
  tags: string[];
  opportunityType: string;
  sourceName: string;
}

export interface IOpportunityAdapter {
  sourceName: string;
  normalize(rawPayload: any): NormalizedOpportunity[];
}

export interface ScraperMetrics {
  id: string; // e.g. "devpost"
  name: string; // e.g. "Devpost"
  status: 'healthy' | 'degraded' | 'failed';
  lastRun: string; // ISO timestamp
  ttfb_ms: number; // Time To First Byte in milliseconds
  payloads_processed: number;
  inserted: number;
  duplicates: number;
  failures: number;
  duration_sec: number;
  error: string | null; // Raw stack trace if failed, else null
  yield_quality: number;
  ops_per_hour: number;
  proxyHealth: 'green' | 'yellow' | 'red';
}
