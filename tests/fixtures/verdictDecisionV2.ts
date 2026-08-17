export const verdictDecisionV2GoldenFixture = {
  idea: {
    ideaName: 'Fractional accessibility audits',
    description: 'A fixed-scope manual accessibility audit for independent ecommerce stores.',
    targetUser: 'independent ecommerce stores with active checkout traffic',
    painfulProblem: 'Checkout accessibility issues cause avoidable customer friction and support work.',
    currentAlternative: 'sporadic internal QA and generic automated scans'
  },
  scores: {
    litScore: 3.4,
    ghostTownRisk: 'medium',
    insightScore: 3.2,
    leverageScore: 2.6,
    timingScore: 3.5,
    highWallsScore: 2.4
  },
  expected: {
    decision: 'REVISE_BEFORE_TESTING',
    initialCustomerIncludes: '10 independent ecommerce stores',
    sectionOrder: [
      'DECISION',
      'WHAT WE ARE ACTUALLY PREDICTING',
      'CONFIDENCE',
      'WHY THIS MAY WORK',
      'WHY THIS MAY FAIL',
      'BIGGEST UNKNOWN',
      'CHEAPEST WAY TO PROVE US WRONG',
      'DO THIS FIRST',
      'WHAT WOULD CHANGE THIS VERDICT'
    ]
  }
} as const;
