import type { CustomerAccessChannel, DistributionTargetType, ResearchEvidenceRole } from '../types/launchBlueprint';

export const RESEARCH_EVIDENCE_ROLE_LABELS: Record<ResearchEvidenceRole, string> = {
  customer_access: 'Customer access',
  market_evidence: 'Market evidence',
  media_pr: 'Media / PR',
  partnership: 'Partnership'
};

export function researchEvidenceRoleForTargetType(
  targetType: DistributionTargetType | undefined
): ResearchEvidenceRole {
  if (targetType === 'community') return 'customer_access';
  if (targetType === 'review_site') return 'market_evidence';
  if (targetType === 'association' || targetType === 'complementary_partner') return 'partnership';
  return 'media_pr';
}

export function researchEvidenceRole(channel: Pick<CustomerAccessChannel, 'evidenceRole' | 'targetType'>): ResearchEvidenceRole {
  return channel.evidenceRole || researchEvidenceRoleForTargetType(channel.targetType);
}

export function isCustomerAccessChannel(channel: Pick<CustomerAccessChannel, 'evidenceRole' | 'targetType'>): boolean {
  return researchEvidenceRole(channel) === 'customer_access';
}

export function directCustomerAccessChannels<T extends Pick<CustomerAccessChannel, 'evidenceRole' | 'targetType'>>(channels: T[]): T[] {
  return channels.filter(isCustomerAccessChannel);
}

export function researchEvidenceRoleReason(role: ResearchEvidenceRole): string {
  if (role === 'customer_access') {
    return 'A public community or discussion route where prospective buyers may be approached directly. Buyer presence and qualification still require observation.';
  }
  if (role === 'market_evidence') {
    return 'Evidence about competitors, alternatives, reviews, or category behavior. It informs the market but is not a first-revenue channel.';
  }
  if (role === 'partnership') {
    return 'A potential referral, association, or complementary-partner relationship. It is not direct buyer access unless separate evidence proves otherwise.';
  }
  return 'A creator, publication, podcast, event, or media route useful for awareness, interviews, reviews, or PR. It is not direct buyer access.';
}
