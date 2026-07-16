import crypto from 'crypto';
import { NormalizedOpportunity } from './types';

export function generateDedupeHash(url: string, title: string, company: string): string {
  const normalizedTitle = (title || '').toLowerCase();
  const normalizedCompany = (company || '').toLowerCase();
  const baseString = (url || '') + normalizedTitle + normalizedCompany;
  return crypto.createHash('sha256').update(baseString).digest('hex');
}

export interface IngestionResult {
  processed: number;
  inserted: number;
  duplicates: number;
  failures: number;
  errors: string[];
}

export async function ingestOpportunities(
  db: any,
  opportunities: NormalizedOpportunity[]
): Promise<IngestionResult> {
  const result: IngestionResult = {
    processed: opportunities.length,
    inserted: 0,
    duplicates: 0,
    failures: 0,
    errors: [],
  };

  if (!db) {
    result.failures = opportunities.length;
    result.errors.push('Database connection is not available.');
    return result;
  }

  for (const item of opportunities) {
    const dedupe_hash = generateDedupeHash(item.url, item.title, item.company);

    const doc = {
      title: item.title,
      description: item.description,
      source: item.sourceName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      source_name: item.sourceName,
      source_url: item.url,
      apply_link: item.url,
      image_url: 'https://yuvahub.xyz/og-image.jpg',
      tags: item.tags,
      category: item.opportunityType,
      deadline: item.deadline,
      location: item.location,
      opportunity_type: item.opportunityType.toLowerCase(),
      dedupe_hash: dedupe_hash,
      created_at: new Date(),
      updated_at: new Date(),
    };

    try {
      if (db.isMock) {
        // Handle mock database unique constraint emulation
        const existing = db.collection('opportunities').data.find(
          (o: any) => o.dedupe_hash === dedupe_hash
        );
        if (existing) {
          const err: any = new Error('Duplicate key error');
          err.code = 11000;
          throw err;
        }
        await db.collection('opportunities').insertOne(doc);
      } else {
        await db.collection('opportunities').insertOne(doc);
      }
      result.inserted++;
    } catch (err: any) {
      if (err.code === 11000) {
        result.duplicates++;
      } else {
        result.failures++;
        result.errors.push(err.stack || err.message || String(err));
      }
    }
  }

  return result;
}
