import { EvaluationQuestion } from '../types/lit';

export const litQuestions: EvaluationQuestion[] = [
  // ============ GHOST TOWN TEST (Q1-Q4) ============
  {
    id: 'gt_1',
    category: 'ghost_town',
    question: 'Who urgently needs this?',
    helper: 'Be specific. Not "lots of people" but "X job title at Y company size".',
    options: [
      { label: 'I am not sure yet', value: 1 },
      { label: 'A broad group might like it', value: 2 },
      { label: 'A specific group has this problem sometimes', value: 3 },
      { label: 'A specific group has this problem often', value: 4 },
      { label: 'A specific buyer/user is actively trying to solve this now', value: 5 }
    ]
  },
  {
    id: 'gt_2',
    category: 'ghost_town',
    question: 'What breaks if this does not exist?',
    helper: 'Be honest. Does anything actually fail, cost money, or create real pain?',
    options: [
      { label: 'Nothing really breaks', value: 1 },
      { label: 'It would be nice to have', value: 2 },
      { label: 'It saves some time or annoyance', value: 3 },
      { label: 'It prevents real pain, cost, delay, or risk', value: 4 },
      { label: 'It solves a painful problem people already spend money/time avoiding', value: 5 }
    ]
  },
  {
    id: 'gt_3',
    category: 'ghost_town',
    question: 'How are people solving this today?',
    helper: 'Understand the current alternative. What do they do now?',
    options: [
      { label: 'I do not know', value: 1 },
      { label: 'They probably do nothing', value: 2 },
      { label: 'They use a workaround or manual process', value: 3 },
      { label: 'They pay for an imperfect solution', value: 4 },
      { label: 'They pay, complain, and still struggle', value: 5 }
    ]
  },
  {
    id: 'gt_4',
    category: 'ghost_town',
    question: 'Can you reach the first 10 users/buyers?',
    helper: 'Be realistic. Do you know where they are or how to contact them?',
    options: [
      { label: 'No clear path', value: 1 },
      { label: 'Maybe through cold outreach or social media', value: 2 },
      { label: 'I know where they gather (communities, forums, events)', value: 3 },
      { label: 'I can contact them directly (email, LinkedIn)', value: 4 },
      { label: 'I already have access or relationships with them', value: 5 }
    ]
  },

  // ============ PASSION GRAVEYARD TEST (Q5) ============
  {
    id: 'pg_1',
    category: 'passion_graveyard',
    question: 'Are you building this because of demand or mostly because you love the idea?',
    helper: 'Passion is fuel, not a compass. Are customers pulling this forward?',
    options: [
      { label: 'Mostly passion/fantasy, no real demand', value: 1 },
      { label: 'Passion with weak evidence of demand', value: 2 },
      { label: 'Some evidence and some passion', value: 3 },
      { label: 'Clear customer pain plus personal motivation', value: 4 },
      { label: 'Customer demand is pulling this forward', value: 5 }
    ]
  },

  // ============ LEVERAGE (Q6-Q8) ============
  {
    id: 'lev_1',
    category: 'leverage',
    question: 'What unfair advantage do you have?',
    helper: 'What can you do that competitors cannot easily copy? (network, expertise, data, relationships)',
    options: [
      { label: 'No clear unfair advantage', value: 1 },
      { label: 'Some advantage but easily replicated', value: 2 },
      { label: 'Moderate advantage (expertise, some relationships)', value: 3 },
      { label: 'Strong advantage (deep network, unique expertise)', value: 4 },
      { label: 'Durable, defensible advantage (data moat, exclusive relationships)', value: 5 }
    ]
  },
  {
    id: 'lev_2',
    category: 'leverage',
    question: 'Do you have existing distribution or audience?',
    helper: 'Can you reach customers without cold outreach? (email list, followers, network)',
    options: [
      { label: 'Zero existing distribution', value: 1 },
      { label: 'Small existing audience (<100)', value: 2 },
      { label: 'Moderate audience (100-1000)', value: 3 },
      { label: 'Good audience (1000-10000)', value: 4 },
      { label: 'Large, engaged audience (10000+)', value: 5 }
    ]
  },
  {
    id: 'lev_3',
    category: 'leverage',
    question: 'Have you done this before (or something similar)?',
    helper: 'Have you successfully built/shipped in this space before?',
    options: [
      { label: 'First time, no relevant experience', value: 1 },
      { label: 'Some tangential experience', value: 2 },
      { label: 'Relevant experience in related field', value: 3 },
      { label: 'Direct experience building similar products', value: 4 },
      { label: 'Track record of success in this exact domain', value: 5 }
    ]
  },

  // ============ INSIGHT (Q9-Q11) ============
  {
    id: 'ins_1',
    category: 'insight',
    question: 'Do you know something about the market that others miss?',
    helper: 'What secret insight drives your conviction? Why do you think this works when others don\'t see it?',
    options: [
      { label: 'No particular insight, just seems like a good idea', value: 1 },
      { label: 'Minor observation about the market', value: 2 },
      { label: 'Moderate insight (trend awareness, gap identification)', value: 3 },
      { label: 'Strong insight (customer pain, market timing)', value: 4 },
      { label: 'Deep insight (customers told you, observed the problem directly)', value: 5 }
    ]
  },
  {
    id: 'ins_2',
    category: 'insight',
    question: 'Have you talked to potential customers?',
    helper: 'Real conversations, not surveys. Do they confirm your understanding?',
    options: [
      { label: 'Never talked to customers', value: 1 },
      { label: 'Casual conversations, no real validation', value: 2 },
      { label: 'Talked to 3-5 potential customers', value: 3 },
      { label: 'Had 5-10 conversations, patterns emerging', value: 4 },
      { label: 'Talked to 10+ customers, they validated the problem', value: 5 }
    ]
  },
  {
    id: 'ins_3',
    category: 'insight',
    question: 'Could someone else build this just as well?',
    helper: 'Is this insight defensible or could any smart person with capital replicate it?',
    options: [
      { label: 'Anyone with capital could build this', value: 1 },
      { label: 'Lots of people could build this', value: 2 },
      { label: 'Some people could build this, but not easily', value: 3 },
      { label: 'Few people have the insight to build this right', value: 4 },
      { label: 'Only you (or very few) truly understand this problem', value: 5 }
    ]
  },

  // ============ TIMING (Q12-Q14) ============
  {
    id: 'tim_1',
    category: 'timing',
    question: 'Is the market ready for this NOW?',
    helper: 'Is there a tailwind (AI boom, regulation change, consumer shift) or is this ahead of its time?',
    options: [
      { label: 'Market not ready, this is 3-5 years too early', value: 1 },
      { label: 'Market not quite ready, maybe 2 years away', value: 2 },
      { label: 'Market is emerging/uncertain', value: 3 },
      { label: 'Market is clearly ready, strong tailwinds', value: 4 },
      { label: 'Market is desperate for this solution NOW', value: 5 }
    ]
  },
  {
    id: 'tim_2',
    category: 'timing',
    question: 'Are there powerful tailwinds (tech, regulation, behavior)?',
    helper: 'Is technology enabling this? Are regulations changing? Are consumers ready?',
    options: [
      { label: 'Headwinds (regulations blocking, tech not ready)', value: 1 },
      { label: 'No particular tailwinds or headwinds', value: 2 },
      { label: 'Emerging tailwinds (some market shift)', value: 3 },
      { label: 'Strong tailwinds (clear macro trend)', value: 4 },
      { label: 'Perfect storm of tailwinds (multiple forces align)', value: 5 }
    ]
  },
  {
    id: 'tim_3',
    category: 'timing',
    question: 'Why now and not later?',
    helper: 'What changes in the next 12 months that makes this urgent?',
    options: [
      { label: 'No urgency, could wait indefinitely', value: 1 },
      { label: 'Minor reason to do this now', value: 2 },
      { label: 'Good reason (market is shifting)', value: 3 },
      { label: 'Strong reason (big changes coming in 12 months)', value: 4 },
      { label: 'Urgent reason (if you wait 6 months, you lose the window)', value: 5 }
    ]
  },

  // ============ BUSINESS DNA (Q15) ============
  {
    id: 'dna_1',
    category: 'business_dna',
    question: 'What type of business is this?',
    helper: 'What are you selling: time/talent, physical goods, software, connections, attention, money, or assets?',
    options: [
      { label: 'Service (selling your time/talent)', value: 1, helper: 'Lawyers, consultants, agencies' },
      { label: 'Physical Product (atoms)', value: 2, helper: 'Hardware, manufactured goods, merchandise' },
      { label: 'Digital Product (software)', value: 3, helper: 'SaaS, apps, digital tools' },
      { label: 'Marketplace (matching supply/demand)', value: 4, helper: 'Airbnb, Uber, job boards' },
      { label: 'Media (human attention)', value: 5, helper: 'Content, YouTube, newsletter' },
      { label: 'Capital (money/yield)', value: 6, helper: 'Funds, lending, investing' },
      { label: 'Asset (real estate/resources)', value: 7, helper: 'Property, equipment, royalties' }
    ]
  },

  // ============ HIGH WALLS / MOAT (Q16-Q17) ============
  {
    id: 'walls_1',
    category: 'high_walls',
    question: 'How defensible is this business long-term?',
    helper: 'Can you build durable competitive advantages (moat)?',
    options: [
      { label: 'Easy to copy, no moat (anyone can replicate)', value: 1 },
      { label: 'Some barriers but weak defenses', value: 2 },
      { label: 'Moderate defensibility (brand, network effects possible)', value: 3 },
      { label: 'Strong defenses (data, exclusive partnerships)', value: 4 },
      { label: 'Very strong moat (network effects, scale, switching costs)', value: 5 }
    ]
  },
  {
    id: 'walls_2',
    category: 'high_walls',
    question: 'What prevents someone with capital from outrunning you?',
    helper: 'If a big company saw your success, could they crush you?',
    options: [
      { label: 'They could easily crush me with capital', value: 1 },
      { label: 'They could probably win if they tried', value: 2 },
      { label: 'It would be difficult but possible for them', value: 3 },
      { label: 'Hard for them to compete (network effects, brand)', value: 4 },
      { label: 'Nearly impossible (true defensible advantage)', value: 5 }
    ]
  }
];

export function getQuestionById(id: string): EvaluationQuestion | undefined {
  return litQuestions.find(q => q.id === id);
}

export function getQuestionsByCategory(category: string): EvaluationQuestion[] {
  return litQuestions.filter(q => q.category === category);
}
