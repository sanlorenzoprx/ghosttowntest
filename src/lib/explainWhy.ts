// One rule for everything GhostTown tells a founder: research findings, Coach
// answers, First 30 days and Year Squared. A fact without its "why" is
// worthless to someone who does not know the subject. See AGENTS.md.
// For written documents and data fields (Blueprint plans, research cards):
// the why, without a conversational offer inside a static field.
export const EXPLAIN_WHY_FOR_DOCUMENTS = [
  'Explain why it matters. For each finding, number or step you give the founder, add the why in one or two plain sentences: what it means for their business and what they can do with it.',
  'Assume the founder does not know the subject. Use everyday words and, when it helps, a short concrete example from their business.',
  'Be natural and brief, not a lecture. Never pad.'
].join(' ');

// For conversations (the Coach): the same, plus an offer to explain more.
export const EXPLAIN_WHY_INSTRUCTION = [
  EXPLAIN_WHY_FOR_DOCUMENTS,
  'When the topic is new or technical, end with one short offer to explain more, such as "Want me to walk you through how to use this?"'
].join(' ');
