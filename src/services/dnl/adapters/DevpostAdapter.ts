import { IOpportunityAdapter, NormalizedOpportunity } from '../types';

export class DevpostAdapter implements IOpportunityAdapter {
  sourceName = 'Devpost';

  normalize(rawPayload: any): NormalizedOpportunity[] {
    const items = Array.isArray(rawPayload) ? rawPayload : [rawPayload];
    return items.map((item) => ({
      title: item.title || 'Untitled Opportunity',
      company: item.organization || item.company || 'Unknown Organization',
      description: item.description || 'No description provided.',
      url: item.apply_link || item.url || 'https://devpost.com',
      location: item.location || 'Online',
      deadline: item.deadline || new Date().toISOString(),
      tags: Array.isArray(item.tags) ? item.tags : ['Hackathon'],
      opportunityType: item.opportunity_type || 'hackathon',
      sourceName: this.sourceName,
    }));
  }
}
