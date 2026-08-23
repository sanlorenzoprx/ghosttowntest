import type { IdeaIntake } from '../types/lit';
import type { PrePurchaseResearchSignals as ResearchSignals } from '../types/researchSignals';

interface Props {
  resultId: string;
  idea: IdeaIntake;
  locale: 'en' | 'es';
  value: ResearchSignals | null;
  onChange: (signals: ResearchSignals) => void;
}

/**
 * Research-map intake is intentionally no longer presented before purchase.
 * GhostTown's paid product exists to do this heavy lifting for the customer.
 * The compatibility component remains temporarily so older call sites can stay
 * stable while the post-purchase CompetitorSeedStep owns market-reference
 * selection and confirmation.
 */
export default function PrePurchaseResearchSignals(_props: Props) {
  return null;
}
