import { ExampleIdea, IdeaIntake } from '../types/lit';

export interface FeaturedExample {
  slug: string;
  category: string;
  videoHook: string;
  idea: ExampleIdea;
}

export const exampleIdeas: ExampleIdea[] = [
  {
    ideaName: 'SiteProof - AI Quality Assurance for Web Design',
    description: 'Automate the QA process for web design projects. Use AI to catch typos, broken links, accessibility issues, and design inconsistencies before launch.',
    targetUser: 'Web design agencies and freelancers',
    painfulProblem: 'Manual QA is slow, error-prone, and blocks project delivery. Missed bugs damage reputation.',
    currentAlternative: 'Manual testing, Figma comments, client feedback after launch.',
    motivation: 'I built 50+ websites and spent 40% of my time on tedious QA. There has to be a better way.',
    expectedVerdict: 'test_first',
    expectedDna: 'digital_product',
    explanation: 'Strong timing (AI QA is hot), clear pain point, but weak initial leverage. Need to validate with first 5 agencies before building.'
  },
  
  {
    ideaName: 'Founder Matchmaking Platform',
    description: 'Dating app for finding co-founders. Helps solo founders find technical, business, or creative co-founders based on skills and vision fit.',
    targetUser: 'Solo founders who want a co-founder',
    painfulProblem: 'Finding a co-founder is hard. Most partnerships fail due to misaligned incentives.',
    currentAlternative: 'Networking, LinkedIn, AngelList, random introductions.',
    motivation: 'I have a great idea but I\'m not technical. I need a co-founder but don\'t know how to find one.',
    expectedVerdict: 'kill_it_before_it_kills_years',
    expectedDna: 'marketplace',
    explanation: 'Huge marketplace chicken-egg problem. Require both sides (founders seeking founders). Better to focus on a niche (e.g., AI founders in SF) first.'
  },

  {
    ideaName: 'Personal Finance AI Coach',
    description: 'AI chatbot that gives personalized financial advice based on your spending, income, and goals. Helps people save, invest, and plan retirement.',
    targetUser: 'Millennials aged 25-35 who want to save more',
    painfulProblem: 'Financial advice is overwhelming. Most people don\'t know how to start investing or saving.',
    currentAlternative: 'Reddit, financial advisors (expensive), apps like Mint.',
    motivation: 'I love personal finance. I want to help people get rich.',
    expectedVerdict: 'niche_down',
    expectedDna: 'digital_product',
    explanation: 'Crowded space (Mint, YNAB, Robinhood). No leverage unless you have unique insight or data. Niche down: target high-income tech workers, or people with student debt, or specific life stage.'
  },

  {
    ideaName: 'Board Game Subscription for Families',
    description: 'Monthly delivery of new board games tailored to family size, age range, and preferences. Games handpicked by experts.',
    targetUser: 'Families with kids aged 5-15',
    painfulProblem: 'Buying board games is expensive. You don\'t know which ones your kids will like.',
    currentAlternative: 'Buying games at stores, renting from local libraries, board game cafes.',
    motivation: 'I love board games and family time. Board games are expensive. Why not subscription?',
    expectedVerdict: 'test_first',
    expectedDna: 'physical_product',
    explanation: 'Good insight (families love board games, discovery is hard). But trap: inventory & cash flow. Test with digital version first (e-book of recommendations). Prove demand before buying inventory.'
  },

  {
    ideaName: 'AI-Powered Resume Optimizer',
    description: 'Upload your resume. AI rewrites it to match job descriptions and ATS (Applicant Tracking Systems). Increases interview callbacks.',
    targetUser: 'Job seekers who are applying to tech jobs',
    painfulProblem: 'Bad resume = no callbacks. Most people don\'t know how to optimize for ATS. Hiring is competitive.',
    currentAlternative: 'Resume templates, resume review services ($50-500), hiring coaches.',
    motivation: 'I spent months job hunting. I know how important a good resume is.',
    expectedVerdict: 'test_first',
    expectedDna: 'digital_product',
    explanation: 'Clear pain, medium market size. Leverage unclear (Resume Bot, ChatGPT, many competitors). Build MVP fast, validate with 20 users, then decide if worth pursuing.'
  },

  {
    ideaName: 'Crypto Exchange for Developing Markets',
    description: 'Crypto exchange built for Nigeria, India, and other emerging markets. Low fees, local payment methods, KYC-friendly.',
    targetUser: 'People in developing countries who want to trade crypto',
    painfulProblem: 'Global exchanges have high fees, slow KYC, don\'t support local payment methods.',
    currentAlternative: 'Binance, Coinbase, local P2P trading.',
    motivation: 'I\'m from Nigeria. I see the opportunity. Crypto is huge there.',
    expectedVerdict: 'kill_it_before_it_kills_years',
    expectedDna: 'marketplace',
    explanation: 'Tough market: massive regulatory risk, low margin (crypto trading is competitive), and you have zero leverage in a 10-year-old market. Better opportunities elsewhere.'
  },

  {
    ideaName: 'Talent Marketplace for HR Services',
    description: 'Upwork for HR. Connect freelance HR consultants (recruiting, payroll, employee relations) with small businesses needing help.',
    targetUser: 'Small businesses (10-50 employees)',
    painfulProblem: 'Hiring an HR manager is expensive. Small companies need HR help but can\'t afford full-time staff.',
    currentAlternative: 'Upwork (general), hiring recruiting firms, doing it in-house.',
    motivation: 'I work in HR. I see this gap. There\'s demand.',
    expectedVerdict: 'test_first',
    expectedDna: 'marketplace',
    explanation: 'Real pain point, defined market. But two-sided hustle: need both supply (HR consultants) and demand (small businesses). Start by recruiting 10 great HR consultants in one city, then go deep before expanding.'
  },

  {
    ideaName: 'No-Code Platform for E-Commerce Sites',
    description: 'Drag-and-drop e-commerce builder for small businesses. Easier than Shopify. No coding required. AI-powered design suggestions.',
    targetUser: 'Small business owners selling products online',
    painfulProblem: 'Shopify is confusing for non-technical people. Building an e-commerce site is complex.',
    currentAlternative: 'Shopify, Wix, Square Online, WordPress + WooCommerce.',
    motivation: 'I built my own e-commerce site and it was hard. This should be easier.',
    expectedVerdict: 'niche_down',
    expectedDna: 'digital_product',
    explanation: 'Massive competition. Shopify, WooCommerce already win. No clear leverage. Niche down hard: target specific product type (e.g., Etsy sellers, print-on-demand), specific geographic region, or specific customer segment (women entrepreneurs).'
  },

  {
    ideaName: 'Mental Health Check-In Bot for Workplaces',
    description: 'Slack bot that does daily mental health check-ins for employees. Anonymous surveys. Gives managers insights on team wellbeing.',
    targetUser: 'HR managers and executives at tech companies',
    painfulProblem: 'Mental health is rising issue. Companies want to support employees but don\'t know how. Burnout is costly.',
    currentAlternative: 'Annual employee surveys, exit interviews, talking to employees.',
    motivation: 'I struggled with depression. Mental health in tech is real. Companies care.',
    expectedVerdict: 'test_first',
    expectedDna: 'digital_product',
    explanation: 'Growing concern (good timing). Moderate demand from tech companies. But: privacy concerns, need buy-in from C-suite. Test with 3 companies, measure impact, prove ROI before scaling.'
  },

  {
    ideaName: 'AI Tutoring for High School Students',
    description: 'AI tutor available 24/7 for high school subjects (math, science, history). Personalized learning. Cheaper than human tutors.',
    targetUser: 'High school students and parents',
    painfulProblem: 'Tutoring is expensive ($50-150/hr). Students need homework help. Parents can\'t afford tutors.',
    currentAlternative: 'Human tutors, ChatGPT, YouTube, Khan Academy.',
    motivation: 'Tutoring is expensive. AI can democratize education.',
    expectedVerdict: 'niche_down',
    expectedDna: 'digital_product',
    explanation: 'Huge market but intense competition (Chegg, Coursera, free ChatGPT). No defensible advantage yet. Niche hard: target specific student cohort (struggling with standardized tests? ESL learners?) or specific subject, prove efficacy, then expand.'
  }
];

export function getExampleIdeaById(index: number): ExampleIdea | undefined {
  return exampleIdeas[index];
}

export function getRandomExampleIdea(): ExampleIdea {
  const randomIndex = Math.floor(Math.random() * exampleIdeas.length);
  return exampleIdeas[randomIndex];
}

export function getAllExampleIdeas(): ExampleIdea[] {
  return exampleIdeas;
}

export const featuredExamples: FeaturedExample[] = [
  {
    slug: 'ai-agency-qa',
    category: 'AI SaaS',
    videoHook: 'Can AI replace the most painful part of shipping websites?',
    idea: exampleIdeas[0]
  },
  {
    slug: 'ai-resume-optimizer',
    category: 'Career Tech',
    videoHook: 'Would job seekers pay AI to beat applicant tracking systems?',
    idea: exampleIdeas[4]
  },
  {
    slug: 'personal-finance-ai',
    category: 'Fintech',
    videoHook: 'Is an AI money coach useful—or just another crowded chatbot?',
    idea: exampleIdeas[2]
  },
  {
    slug: 'hr-talent-marketplace',
    category: 'Marketplace',
    videoHook: 'Can small businesses buy HR help without hiring full-time?',
    idea: exampleIdeas[6]
  },
  {
    slug: 'family-game-subscription',
    category: 'Subscription',
    videoHook: 'Would families subscribe instead of buying another forgotten game?',
    idea: exampleIdeas[3]
  },
  {
    slug: 'ai-tutor',
    category: 'Education',
    videoHook: 'Can an AI tutor win when students already have ChatGPT?',
    idea: exampleIdeas[9]
  }
];

export function getFeaturedExampleBySlug(slug: string | null): FeaturedExample | undefined {
  if (!slug) return undefined;
  return featuredExamples.find(example => example.slug === slug);
}

export function toIdeaIntake(example: ExampleIdea): IdeaIntake {
  return {
    ideaName: example.ideaName,
    description: example.description,
    targetUser: example.targetUser,
    painfulProblem: example.painfulProblem,
    currentAlternative: example.currentAlternative,
    motivation: example.motivation
  };
}
