import { BusinessDnaType, BusinessDnaTrap } from '../types/lit';

const businessDnaTraps: Record<BusinessDnaType, BusinessDnaTrap> = {
  'service': {
    dna: 'service',
    trap: 'Time wall. You scale by selling your time. Eventually, you hit a ceiling. You cannot work 25 hours a day.',
    winStrategy: 'Productize. Turn your repeatable service into a workflow, playbook, or tool that runs without you.'
  },
  'physical_product': {
    dna: 'physical_product',
    trap: 'Cash trap. Your money is locked in inventory. You pay suppliers before you get paid by customers. Cash flow kills.',
    winStrategy: 'Invest in supply chain and lean operations. Pre-sell or find ways to let customers fund your working capital.'
  },
  'digital_product': {
    dna: 'digital_product',
    trap: 'J-curve. You burn cash building with zero revenue for months. This is why VC exists. But you might be building the wrong thing.',
    winStrategy: 'Build the absolute minimum product first. Validate the market before taking on massive R&D costs.'
  },
  'marketplace': {
    dna: 'marketplace',
    trap: 'Two-sided hustle. No buyers without sellers, no sellers without buyers. Chicken and egg. You must solve both simultaneously.',
    winStrategy: 'Focus on dominating one tiny niche first. Create liquidity in that niche before expanding.'
  },
  'media': {
    dna: 'media',
    trap: 'Treadmill. Audience attention decays the moment you stop earning it. You run just to stay in place.',
    winStrategy: 'Build direct relationships with your audience. Move them off rented platforms (Twitter, YouTube) to owned channels (email, community).'
  },
  'capital': {
    dna: 'capital',
    trap: 'Concentration risk. One bad investment or market crash can wipe you out. Diversification is hard.',
    winStrategy: 'Build portfolio depth. Spread risk across many investments. Create recurring revenue (fees on assets under management).'
  },
  'asset': {
    dna: 'asset',
    trap: 'Illiquidity. You tie up capital in real assets. Returns take time. Market conditions can crush valuations.',
    winStrategy: 'Build leverage. Use debt to amplify returns. Create recurring income (rents, royalties) while holding the asset.'
  }
};

export function getBusinessDnaTrap(dna: BusinessDnaType): BusinessDnaTrap {
  return businessDnaTraps[dna] || businessDnaTraps['digital_product'];
}

export function classifyBusinessDnaFromQuestion(answer: number | string): BusinessDnaType {
  const mapping: Record<number, BusinessDnaType> = {
    1: 'service',
    2: 'physical_product',
    3: 'digital_product',
    4: 'marketplace',
    5: 'media',
    6: 'capital',
    7: 'asset'
  };
  
  const num = typeof answer === 'string' ? parseInt(answer) : answer;
  return mapping[num] || 'digital_product';
}

export const allDnaTypes: BusinessDnaType[] = [
  'service',
  'physical_product',
  'digital_product',
  'marketplace',
  'media',
  'capital',
  'asset'
];

export function describeDna(dna: BusinessDnaType): string {
  const descriptions: Record<BusinessDnaType, string> = {
    'service': 'You sell time and expertise. Your income depends on how much you work.',
    'physical_product': 'You sell physical goods. Cash is tied up in inventory.',
    'digital_product': 'You sell software or digital tools. High upfront cost, scales infinitely.',
    'marketplace': 'You match supply with demand. You win by creating liquidity.',
    'media': 'You sell human attention. Your audience is always one click away.',
    'capital': 'You sell access to money and manage risk/yield.',
    'asset': 'You own and operate real assets (real estate, equipment, etc.).'
  };
  
  return descriptions[dna];
}
