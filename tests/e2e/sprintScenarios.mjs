// Synthetic 30-day Sprint scenarios for the Acceptance journey.
//
// Every value here is fake and marked SYNTHETIC. The data exists to prove the
// plan reacts to evidence: "on_track" must keep the plan unchanged for all 30
// days, and "plan_change" must move it through four named revisions at the
// checkpoints (Days 7, 14, 21 and 30). The route each checkpoint must produce is
// computed by `formalCheckpointBranch` in src/lib/blueprintExecutionIntelligence.ts;
// tests/sprintScenarios.test.ts runs that function on this data, so a scenario that
// would not produce its expected routes fails in normal CI before any live run.

export const SPRINT_SCENARIOS = ['on_track', 'plan_change'];
export const CHECKPOINT_DAYS = [7, 14, 21, 30];

const NOT_REAL = 'SYNTHETIC ACCEPTANCE DATA — not a real customer quote.';

// The week a day belongs to: days 1-7 -> 0, 8-14 -> 1, 15-21 -> 2, 22-30 -> 3.
export function weekOf(dayNumber) {
  if (dayNumber <= 7) return 0;
  if (dayNumber <= 14) return 1;
  if (dayNumber <= 21) return 2;
  return 3;
}

const SCENARIOS = {
  on_track: {
    label: 'Correct responses: prospects are interested and the plan continues unchanged',
    weeks: [
      {
        response: 'SYNTHETIC: prospect replied and asked how the pilot works.',
        language: `${NOT_REAL} "This would save me time every morning."`,
        commitmentOffered: 'Synthetic 15-minute pilot call',
        commitmentReceived: 'SYNTHETIC: agreed to a 15-minute pilot call',
        strength: 'moderate',
        checkpoint: { strongestEvidence: 'moderate', primaryConstraint: 'none' }
      },
      {
        response: 'SYNTHETIC: prospect took the call and asked for pilot terms.',
        language: `${NOT_REAL} "Send me the pilot terms."`,
        commitmentOffered: 'Synthetic pilot terms',
        commitmentReceived: 'SYNTHETIC: asked for pilot terms in writing',
        strength: 'strong',
        checkpoint: { strongestEvidence: 'strong', primaryConstraint: 'none' }
      },
      {
        response: 'SYNTHETIC: prospect accepted the pilot terms.',
        language: `${NOT_REAL} "Let's start next week."`,
        commitmentOffered: 'Synthetic pilot start date',
        commitmentReceived: 'SYNTHETIC: agreed a pilot start date',
        strength: 'strong',
        checkpoint: { strongestEvidence: 'strong', primaryConstraint: 'none' }
      },
      {
        response: 'SYNTHETIC: pilot customer asked to continue after the trial.',
        language: `${NOT_REAL} "We want to keep using it."`,
        commitmentOffered: 'Synthetic continuation after the pilot',
        commitmentReceived: 'SYNTHETIC: agreed to continue after the pilot',
        strength: 'strong',
        checkpoint: { strongestEvidence: 'strong', primaryConstraint: 'none' }
      }
    ]
  },
  plan_change: {
    label: 'Data that forces the plan to change at every checkpoint',
    weeks: [
      {
        response: 'SYNTHETIC: prospect said they did not understand what is being offered.',
        language: `${NOT_REAL} "I read it twice and I still don't know what you do."`,
        commitmentOffered: 'Synthetic 15-minute pilot call',
        commitmentReceived: 'no commitment',
        strength: 'weak',
        checkpoint: { strongestEvidence: 'weak', primaryConstraint: 'message' }
      },
      {
        response: 'SYNTHETIC: prospect understood the offer but said the price is too high for a first try.',
        language: `${NOT_REAL} "That's too much before I know it works."`,
        commitmentOffered: 'Synthetic paid pilot',
        commitmentReceived: 'declined',
        strength: 'early',
        checkpoint: { strongestEvidence: 'early', primaryConstraint: 'price' }
      },
      {
        response: 'SYNTHETIC: prospect wants a much smaller first step than the full offer.',
        language: `${NOT_REAL} "Could I try just one part first?"`,
        commitmentOffered: 'Synthetic full offer',
        commitmentReceived: 'declined',
        strength: 'early',
        checkpoint: { strongestEvidence: 'early', primaryConstraint: 'offer' }
      },
      {
        response: 'SYNTHETIC: the people who reply are staff who buy for others, not the people we targeted.',
        language: `${NOT_REAL} "I'd be buying this for my team, not for me."`,
        commitmentOffered: 'Synthetic smaller first step',
        commitmentReceived: 'SYNTHETIC: a team buyer asked for a quote',
        strength: 'moderate',
        checkpoint: { strongestEvidence: 'moderate', primaryConstraint: 'customer' }
      }
    ]
  }
};

// The route and the one variable each named constraint allows to change. This
// mirrors routeForConstraint / variablePlan; the unit test checks it against them.
const EXPECTED_BY_CONSTRAINT = {
  none: { route: 'continue', mayChange: [] },
  message: { route: 'revise_message', mayChange: ['message'] },
  price: { route: 'revise_price', mayChange: ['price'] },
  offer: { route: 'revise_offer', mayChange: ['offer'] },
  customer: { route: 'revise_customer', mayChange: ['customer'] }
};

export function sprintScenario(name) {
  const scenario = SCENARIOS[name];
  if (!scenario) throw new Error(`Unknown Sprint scenario "${name}". Use one of: ${SPRINT_SCENARIOS.join(', ')}.`);
  return scenario;
}

export function scenarioEvidence(name, dayNumber) {
  const week = sprintScenario(name).weeks[weekOf(dayNumber)];
  return {
    response: week.response,
    customerLanguage: week.language,
    commitmentOffered: week.commitmentOffered,
    commitmentReceived: week.commitmentReceived,
    strength: week.strength
  };
}

export function scenarioCheckpoint(name, dayNumber) {
  if (!CHECKPOINT_DAYS.includes(dayNumber)) throw new Error(`Day ${dayNumber} is not a checkpoint day.`);
  return sprintScenario(name).weeks[weekOf(dayNumber)].checkpoint;
}

// The branch the Coach must be working from when it reviews `dayNumber`: the
// latest checkpoint saved on or before that day, or "continue" before Day 7.
export function expectedBranchForDay(name, dayNumber) {
  const latest = [...CHECKPOINT_DAYS].reverse().find(day => day <= dayNumber);
  if (!latest) return { checkpointDay: null, route: 'continue', mayChange: [] };
  const { primaryConstraint } = scenarioCheckpoint(name, latest);
  return { checkpointDay: latest, ...EXPECTED_BY_CONSTRAINT[primaryConstraint] };
}

export function expectedRouteTrail(name) {
  return CHECKPOINT_DAYS.map(day => ({ day, route: expectedBranchForDay(name, day).route }));
}
