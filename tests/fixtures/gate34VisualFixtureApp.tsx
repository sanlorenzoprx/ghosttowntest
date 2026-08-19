import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/styles/globals.css';
import ResultReport from '../../src/components/ResultReport';
import ActionPlanModal from '../../src/components/ActionPlanModal';
import CompetitorSeedStep from '../../src/components/CompetitorSeedStep';
import UserDashboard from '../../src/components/UserDashboard';
import LaunchSitePanel from '../../src/components/LaunchSitePanel';
import LaunchBlueprintViewV21, { type BlueprintV21Payload } from '../../src/components/LaunchBlueprintViewV21';
import { buildVerdictDecisionV2 } from '../../src/verdict/verdictDecisionV2';
import type { EvaluationResult } from '../../src/types/lit';
import { launchBlueprintFixture } from './launchBlueprint';

const params = new URLSearchParams(window.location.search);
const surface = params.get('surface') || 'verdict';
localStorage.setItem('lit_user_token_v1', 'fixture-token-not-a-secret');

const idea = {
  ideaName: 'Checkout accessibility audit',
  description: 'A fixed-scope accessibility audit for independent ecommerce stores.',
  targetUser: 'independent ecommerce stores with active checkout traffic',
  painfulProblem: 'Checkout accessibility issues create customer friction and support work.',
  currentAlternative: 'sporadic internal QA and generic automated scans',
  motivation: 'Deterministic Gate 34 visual fixture'
};
const scores = {
  ghostTownScore: 3,
  ghostTownRisk: 'medium' as const,
  leverageScore: 3,
  insightScore: 3,
  timingScore: 3.5,
  litScore: 3.4,
  litBand: 'unclear' as const,
  highWallsScore: 2.4,
  highWallsBand: 'weak' as const,
  businessDnaType: 'service',
  businessDnaTrap: 'Unverified demand',
  businessDnaWinStrategy: 'Ask for one paid pilot',
  finalVerdict: 'test_first' as const,
  verdictHeadline: 'Test the paid commitment before building more.',
  verdictExplanation: 'The buyer and pain are specific enough for a bounded paid test.',
  recommendedNextTest: 'Ask five qualified buyers for a paid pilot.',
  doNotBuildUntil: 'A qualified buyer makes a meaningful commitment.',
  oneSentenceAdvice: 'Test the commitment before increasing product work.'
};
const decision = buildVerdictDecisionV2({ idea, scores, priceOrCommitmentRange: '$300–$500 paid audit pilot' });
const result = {
  resultId: 'gate34-visual-verdict',
  idea,
  answers: {},
  deterministicScores: scores,
  verdictDecisionV2: decision,
  usedAI: false,
  generatedAt: '2026-08-19T00:00:00.000Z',
  cacheHit: false
} as EvaluationResult;

const blueprint = launchBlueprintFixture();
const blueprintPayload: BlueprintV21Payload = {
  blueprint,
  progress: {
    completedDays: [],
    evidenceNotes: {},
    evidenceLedger: [{
      entryId: 'fixture-evidence-1',
      blueprintId: blueprint.blueprintId,
      blueprintVersion: blueprint.blueprintVersion,
      actionId: 'day-1',
      createdAt: '2026-08-19T00:00:00.000Z',
      contactOrChannel: 'Qualified buyer interview',
      date: '2026-08-19',
      action: 'Asked for a paid pilot commitment',
      response: 'Requested a concrete delivery example',
      customerLanguage: 'Show me what I receive in 48 hours',
      alternativeMentioned: 'Internal QA checklist',
      objection: 'Needs proof of turnaround time',
      commitmentOffered: '$300 pilot',
      commitmentReceived: 'Follow-up requested',
      revenueCents: 0,
      founderMinutes: 20,
      variableCostCents: 0,
      followUpDate: '2026-08-20',
      evidenceStrength: 'moderate',
      sourceNote: 'Deterministic visual fixture'
    }],
    checkpointReviews: [],
    reminderPreferences: { dailyAction: true, followUps: true, checkpoints: true, preferredHourLocal: 9 },
    scheduledReminders: [],
    metrics: {
      outreachSent: 1,
      replies: 1,
      interviews: 1,
      qualifiedConversations: 1,
      commitments: 0,
      revenueCents: 0,
      founderMinutes: 20,
      variableCostCents: 0,
      leads: 0
    },
    updatedAt: '2026-08-19T00:00:00.000Z'
  },
  research: {
    provider: 'fixture',
    model: 'deterministic',
    completedAt: '2026-08-19T00:00:00.000Z',
    attemptedSourceCount: 6,
    successfulSourceCount: 6,
    sourceTypeCount: 3,
    verifiedChannelCount: 3
  }
};

function App() {
  if (surface === 'verdict' || surface === 'micro-commitments') {
    return <ResultReport result={result} onReset={() => undefined} isLoggedIn={false} onLoginClick={() => undefined} onRewardClaimed={() => undefined} locale="en" />;
  }
  if (surface === 'checkout') {
    return <ActionPlanModal idea={idea} verdictId={result.resultId} loading={false} error="" onClose={() => undefined} onSubmit={() => undefined} />;
  }
  if (surface === 'seed-confirmation') {
    return <main className="mx-auto max-w-5xl p-4 py-8"><CompetitorSeedStep orderId="fixture-order" onStarted={() => undefined} onBack={() => undefined} /></main>;
  }
  if (surface === 'leads-table') {
    return <main className="mx-auto max-w-6xl bg-[#f6f1e8] p-4 py-8"><LaunchSitePanel orderId="fixture-order" /></main>;
  }
  if (surface.startsWith('blueprint-')) {
    return <LaunchBlueprintViewV21 orderId="fixture-order" onBack={() => undefined} initialPayload={blueprintPayload} />;
  }
  return <UserDashboard onLogout={() => undefined} onBuy={() => undefined} onStart={() => undefined} onOpenResult={() => undefined} />;
}

createRoot(document.getElementById('root')!).render(<App />);
