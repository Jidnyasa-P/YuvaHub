import { IOpportunityAdapter, NormalizedOpportunity } from '../types';

export class InternshalaAdapter implements IOpportunityAdapter {
  sourceName = 'Internshala';

  normalize(rawPayload: any): NormalizedOpportunity[] {
    const items = Array.isArray(rawPayload) ? rawPayload : [rawPayload];
    return items.map((item) => ({
      title: item.title || 'Untitled Internship',
      company: item.company || item.company_name || item.organization || 'Unknown Company',
      description: item.description || item.details || 'No description provided.',
      url: item.link || item.apply_link || item.url || 'https://internshala.com',
      location: item.location || 'Remote',
      deadline: item.deadline || new Date().toISOString(),
      tags: Array.isArray(item.tags)
        ? item.tags
        : Array.isArray(item.skills_required)
        ? item.skills_required
        : ['Internship'],
      opportunityType: item.opportunity_type || 'internship',
      sourceName: this.sourceName,
    }));
  }
}
