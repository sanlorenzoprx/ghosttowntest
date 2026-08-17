import { EvaluationResult } from '../types/lit';

export function createShareSummary(
  result: EvaluationResult,
  shareUrl = 'https://lit-ghosttown.com',
  includeIdeaName = true
): string {
  const scores = result.deterministicScores;
  const decision = result.verdictDecisionV2;
  if (!decision) {
    const verdict = result.verdict || {
      verdict_headline: scores.verdictHeadline,
      one_sentence_advice: scores.oneSentenceAdvice
    };
    return `I ran my idea through the LIT Ghost Town Test.

**Idea:** ${includeIdeaName ? result.idea.ideaName : 'Kept private'}

**Verdict:** ${verdict.verdict_headline}

**Ghost Town Risk:** ${scores.ghostTownScore}/5
**LIT Score:** ${scores.litScore}/5
**Business DNA:** ${scores.businessDnaType}

**Advice:** ${verdict.one_sentence_advice}

**Next Test:** ${scores.recommendedNextTest}

Test your idea: ${shareUrl}`;
  }

  return `I ran my idea through the LIT Ghost Town Test.

**Idea:** ${includeIdeaName ? result.idea.ideaName : 'Kept private'}

**Decision:** ${decision.decision.replace(/_/g, ' ')}
**What is being tested:** ${decision.predictionTarget}

**Ghost Town Risk:** ${scores.ghostTownScore}/5
**LIT Score:** ${scores.litScore}/5
**Business DNA:** ${scores.businessDnaType}

**First action:** ${decision.firstAction.action}

**Commitment ask:** ${decision.offerHypothesis.commitmentRequested}

Test your idea: ${shareUrl}`;
}

export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    throw error;
  }
}

export function getReferralIdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('ref');
}

export function getShareText(result: EvaluationResult): string {
  return createShareSummary(result);
}
