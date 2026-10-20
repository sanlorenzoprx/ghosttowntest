import { ASSESSMENT_PACK_CREDITS, ASSESSMENT_PACK_DISPLAY_PRICE } from './assessmentPack';
import { LEGAL_POLICY } from './businessPolicy';
import { GHOSTTOWN_FIRST_30_V1, GHOSTTOWN_YEAR_SQUARED_V1 } from './ghosttownOffer';

// Public policy pages. Structure follows what the rules ask for (CalOPPA and
// CCPA privacy disclosures, CAN-SPAM for the email list, Stripe's fulfillment
// and refund disclosures, FTC guidance against income claims) and the plain,
// second-person style of the Basecamp/37signals open policies (CC BY 4.0).
// Inline markup: **bold** and [label](href).

export type LegalPageKind = 'privacy' | 'terms' | 'refund' | 'disclaimer';

export type LegalBlock =
  | { kind: 'p'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'table'; head: string[]; rows: string[][] };

export interface LegalSection {
  id: string;
  title: string;
  blocks: LegalBlock[];
}

export interface LegalPageContent {
  eyebrow: string;
  title: string;
  summary: string;
  sections: LegalSection[];
}

const p = (text: string): LegalBlock => ({ kind: 'p', text });
const list = (...items: string[]): LegalBlock => ({ kind: 'list', items });
const table = (head: string[], rows: string[][]): LegalBlock => ({ kind: 'table', head, rows });

const usd = (amount: number) => `$${amount.toLocaleString('en-US')}`;
const first30 = GHOSTTOWN_FIRST_30_V1;
const year = GHOSTTOWN_YEAR_SQUARED_V1;
const yearPrepayAfterCredit = year.prepayUsd - year.first30CreditUsd;
const yearFirstPaymentAfterCredit = year.installments.eachUsd - year.first30CreditUsd;
const yearPlanAfterCredit = year.installments.count * year.installments.eachUsd - year.first30CreditUsd;
// Tuition-style refunds: inside days 8-21 you owe half of the price of the plan
// you chose, after the First 30 credit, whatever you have paid so far.
const yearHalfPrepay = yearPrepayAfterCredit / 2;
const yearHalfPlan = yearPlanAfterCredit / 2;
const yearPlanTopUp = yearHalfPlan - yearFirstPaymentAfterCredit;
const support = `[${LEGAL_POLICY.supportEmail}](mailto:${LEGAL_POLICY.supportEmail})`;
const operator = `${LEGAL_POLICY.operator}, a company organized in the ${LEGAL_POLICY.jurisdiction.replace(', USA', '')}`;

const terms: LegalPageContent = {
  eyebrow: 'Terms of service',
  title: 'Terms of service',
  summary: `These terms are the agreement between you and ${operator}, which runs GhostTown ("GhostTown", "we", "us"). They cover ${LEGAL_POLICY.website} (formerly ${LEGAL_POLICY.formerWebsite}) and everything we offer there. By using GhostTown or buying from us, you agree to them. If you don't agree, please don't use GhostTown.`,
  sections: [
    {
      id: 'what-we-offer',
      title: 'What GhostTown offers',
      blocks: [
        p('**Free verdict.** Tell us about a business idea and answer a short set of questions. GhostTown looks for public signals about your market and gives you a verdict: what looks promising, the biggest unknown, and the fastest test to run next. It is free and needs no card.'),
        p(`**Extra verdicts.** After your free verdict you can buy ${ASSESSMENT_PACK_CREDITS} more verdicts for ${ASSESSMENT_PACK_DISPLAY_PRICE} USD, paid once.`),
        p(`**${first30.name} — ${first30.displayPrice} USD, paid once.** ${first30.name} is not on sale yet. When it opens, it is ${first30.durationDays} days of guided, step-by-step help to test your idea with real customers. It includes:`),
        list(...first30.includes),
        p('A custom domain (such as yourbusiness.com) is not included. You can buy one whenever you are ready and connect it to your website.'),
        p(`**${year.name}.** On day ${year.offeredOnDay} of ${first30.name}, we offer you a year with GhostTown. The year's list price is ${usd(year.listPriceUsd)} USD. You can pay ${usd(year.prepayUsd)} at once, or make ${year.installments.count} monthly payments of ${usd(year.installments.eachUsd)}. The ${usd(year.first30CreditUsd)} you paid for ${first30.name} is credited toward either option, so you pay ${usd(yearPrepayAfterCredit)} more at once, or ${usd(yearFirstPaymentAfterCredit)}, ${usd(year.installments.eachUsd)} and ${usd(year.installments.eachUsd)} on the payment plan. The offer ends when your ${first30.name} month ends. The year includes:`),
        list(...year.includes),
        p('Prices are in US dollars. Where sales tax applies, it is added at checkout.')
      ]
    },
    {
      id: 'what-we-are-not',
      title: 'What GhostTown is, and what it is not',
      blocks: [
        p('GhostTown is software that uses AI to help you decide what to test and to do the work of testing it. It is guidance and tools, not a business opportunity, a franchise, or a promise of income.'),
        p('We do not promise customers, sales, revenue, funding, or that your business will succeed. Examples on this site show how GhostTown works. They are not typical results or predictions of yours. Read the [disclaimer](/disclaimer) for more.')
      ]
    },
    {
      id: 'account',
      title: 'Your account',
      blocks: [
        list(
          'You must be at least 18 and able to enter a contract.',
          'Give accurate information and keep it up to date.',
          'Keep your login private. You are responsible for what happens in your account.',
          'An account is for one person. Do not share it or resell access to it.'
        )
      ]
    },
    {
      id: 'payments',
      title: 'Paying for GhostTown',
      blocks: [
        p('Stripe processes every payment on its secure checkout. GhostTown never sees or stores your full card number.'),
        p(`You are charged when you buy. On the ${year.name} payment plan, the remaining payments are charged to the same card one month and two months after the first. If a payment fails, we will email you. We may pause the year until the payment goes through.`),
        p(`${year.name} is a 12-month commitment. There is no monthly plan.`),
        p('**If a balance stays unpaid.** If you owe us money and it stays unpaid after we have emailed you about it, we may send the balance to a collection agency and report it to consumer or business credit bureaus. Collections and negative credit reports can lower your credit score and make loans, credit cards, leases, and insurance harder to get or more expensive. We will email you before we take either step.')
      ]
    },
    {
      id: 'refunds',
      title: 'Refunds',
      blocks: [
        p(`${first30.name}: ${first30.refundRule.charAt(0).toLowerCase()}${first30.refundRule.slice(1)} ${year.name}: a full refund within ${year.refund.fullRefundDays} days of your first year payment; through day ${year.refund.halfRefundThroughDay} you pay half of your plan's price; after that, no refund and any remaining payments stay due. The [refund policy](/refunds) has the details and how to ask.`)
      ]
    },
    {
      id: 'website-and-domain',
      title: 'Your website and domain',
      blocks: [
        p(`${first30.name} publishes your website to a Cloudflare account that you own. You can create a free one during setup. Because the account is yours, your website stays with you after ${first30.name} ends.`),
        p('GhostTown never buys a domain for you. If you want one, you buy it in your own account, pay the registrar directly, and own it. We help you connect it.'),
        p('You can remove GhostTown\'s access to your Cloudflare account at any time.'),
        p('If your website collects details from your own customers, such as names and emails from a contact form, you decide how to use them and you are responsible for telling your visitors how you handle them. GhostTown stores those details for you and does not use them for anything else.')
      ]
    },
    {
      id: 'ownership',
      title: 'Who owns what',
      blocks: [
        list(
          '**What you give us is yours.** Your ideas, answers, notes, business name, logos, and photos stay yours. You let us use them only to provide GhostTown to you, except for public verdict content described below.',
          '**What we make for you is yours to use.** The website copy, outreach messages, plans, and other materials GhostTown creates for you are yours to use for your business, during and after your program, with no extra fee.',
          '**GhostTown itself is ours.** Our software, design, templates, and methods stay ours. Where our templates or code are part of your website, you may keep using them as part of that website.'
        )
      ]
    },
    {
      id: 'public-content',
      title: 'Public verdict content',
      blocks: [
        p('Before a verdict runs, you confirm that the idea you submit, your GhostTown report, and the short video made from it are public content. Our Shorts Factory service may publish and reuse them. We remove email addresses and phone numbers from the public copy, but do not include private, confidential, or identifying details in what you submit.')
      ]
    },
    {
      id: 'ai',
      title: 'Work made with AI',
      blocks: [
        p('GhostTown uses AI to write verdicts, plans, website copy, and other materials. AI can be wrong, out of date, or similar to what it writes for others. Check anything important before you rely on it or publish it.'),
        p('You are responsible for what you publish and send, including the claims on your website, and for following the laws and licensing rules that apply to your business.')
      ]
    },
    {
      id: 'acceptable-use',
      title: 'Using GhostTown fairly',
      blocks: [
        p('Please do not:'),
        list(
          'break the law, or use GhostTown to mislead or harm others;',
          'upload content you do not have the right to use;',
          'try to get into another person\'s account or data;',
          'get around usage limits, send automated requests, or copy GhostTown\'s content or results at scale;',
          'resell or share GhostTown access.'
        ),
        p('We limit how many free verdicts can run per hour from one connection and one account, so the free verdict stays available for everyone.')
      ]
    },
    {
      id: 'ending',
      title: 'Ending your use',
      blocks: [
        p(`You can stop using GhostTown at any time. To close your account and delete your data, email ${support}.`),
        p('We may suspend or close an account that breaks these terms or puts other customers at risk.')
      ]
    },
    {
      id: 'warranty',
      title: 'Disclaimers',
      blocks: [
        p('GhostTown is provided "as is" and "as available." To the extent the law allows, we make no promises beyond those written in these terms, including that GhostTown will always be available, free of errors, or right for your purpose.')
      ]
    },
    {
      id: 'liability',
      title: 'Limits on our liability',
      blocks: [
        p('To the extent the law allows, we are not liable for lost profits, lost revenue, lost data, or indirect or consequential losses. Our total liability for any claim is limited to what you paid GhostTown in the 12 months before the claim. Some places do not allow these limits, so they may not apply to you, and nothing here limits rights the law says cannot be limited.')
      ]
    },
    {
      id: 'disputes',
      title: 'If we disagree',
      blocks: [
        p(`Please email ${support} first. Most problems can be fixed quickly, and we will try to resolve yours within 30 days.`),
        p(`These terms are governed by the laws of the ${LEGAL_POLICY.jurisdiction.replace(', USA', '')} and applicable United States federal law. Any court case goes to the courts located in Puerto Rico, unless the consumer law where you live gives you the right to bring it there.`)
      ]
    },
    {
      id: 'changes',
      title: 'Changes to these terms',
      blocks: [
        p('When we change these terms we update the date at the top. For important changes we email account holders before they take effect. Each purchase follows the terms in place when you made it.')
      ]
    },
    {
      id: 'contact',
      title: 'Contact',
      blocks: [p(`Questions about these terms: ${support}.`)]
    }
  ]
};

const refund: LegalPageContent = {
  eyebrow: 'Refunds and cancellation',
  title: 'Refunds and cancellation',
  summary: 'Here is what you can get back, and until when. The refund schedule is our promise. We do not promise business results.',
  sections: [
    {
      id: 'at-a-glance',
      title: 'At a glance',
      blocks: [
        table(['What you bought', 'When you can ask', 'What you get back'], [
          ['Free verdict', '—', 'Nothing to refund'],
          [`${ASSESSMENT_PACK_CREDITS} extra verdicts (${ASSESSMENT_PACK_DISPLAY_PRICE})`, 'Any time, if something went wrong', 'Missing credits added, or a duplicate charge refunded'],
          [`${first30.name} (${first30.displayPrice})`, 'Until your website build starts', 'A full refund'],
          [year.name, `Days 1–${year.refund.fullRefundDays} after your first year payment`, 'A full refund of your year payments; remaining payments cancelled'],
          [year.name, `Days ${year.refund.fullRefundDays + 1}–${year.refund.halfRefundThroughDay}`, 'You pay half of your plan\'s price; we refund or charge the difference'],
          [year.name, `After day ${year.refund.halfRefundThroughDay}`, 'No refund; remaining payments stay due']
        ])
      ]
    },
    {
      id: 'first-30',
      title: first30.name,
      blocks: [
        p(`Ask for a refund for any reason before your website build starts, and you get the full ${first30.displayPrice} back.`),
        p(`Your website build starts when you confirm the website step in ${first30.name}. GhostTown asks you to confirm first, and tells you that confirming ends your refund window. After the build starts, ${first30.name} cannot be refunded, because building your website is the main cost of delivering it.`)
      ]
    },
    {
      id: 'year',
      title: year.name,
      blocks: [
        p(`Like school tuition, what you owe when you leave depends on when you leave and on the price of the plan you chose, after your ${usd(year.first30CreditUsd)} ${first30.name} credit: ${usd(yearPrepayAfterCredit)} if you paid at once, or ${usd(yearPlanAfterCredit)} on the payment plan. Days are counted from your first year payment.`),
        list(
          `**Days 1–${year.refund.fullRefundDays}:** you owe nothing for the year. We refund every year payment you made and cancel the rest.`,
          `**Days ${year.refund.fullRefundDays + 1}–${year.refund.halfRefundThroughDay}:** you owe half of your plan's price. If you paid at once, we keep ${usd(yearHalfPrepay)} and refund ${usd(yearPrepayAfterCredit - yearHalfPrepay)}. On the payment plan you owe ${usd(yearHalfPlan)}: you have paid ${usd(yearFirstPaymentAfterCredit)}, so we charge ${usd(yearPlanTopUp)} more and cancel the remaining payments.`,
          `**After day ${year.refund.halfRefundThroughDay}:** you owe the full price. There is no refund, and on the payment plan the remaining payments stay due.`
        ),
        p(`The ${usd(year.first30CreditUsd)} ${first30.name} credit is part of your ${first30.name} purchase. It is not paid out in cash.`)
      ]
    },
    {
      id: 'how-to-ask',
      title: 'How to ask for a refund',
      blocks: [
        p(`Email ${support} from the email on your account. Tell us what you bought. You do not need to give a reason inside a refund window.`),
        p('We confirm by email. Refunds go back to the card you paid with, through Stripe. Banks usually take 5–10 business days to show it.')
      ]
    },
    {
      id: 'charge-problems',
      title: 'If something went wrong with a charge',
      blocks: [
        p('If you were charged twice, charged for something you did not receive, or charged the wrong amount, we fix it or refund it, whatever the windows above say.'),
        p('Please contact us before you dispute a charge with your bank. It is usually faster for you.')
      ]
    }
  ]
};

const privacy: LegalPageContent = {
  eyebrow: 'Privacy policy',
  title: 'Privacy policy',
  summary: `This policy explains what ${LEGAL_POLICY.operator} ("GhostTown", "we") collects when you use ${LEGAL_POLICY.website} (formerly ${LEGAL_POLICY.formerWebsite}), why, who helps us process it, how long we keep it, and the choices you have. We do not sell your personal information, and we do not share it for advertising.`,
  sections: [
    {
      id: 'what-we-collect',
      title: 'What we collect and why',
      blocks: [
        p('We collect only what we need to run GhostTown for you.'),
        list(
          '**Account.** Your email address and password, to log you in and save your work. Passwords are stored only as a one-way secure hash.',
          '**Your idea and answers.** What you type into the verdict questions, to make your verdict. Part of it becomes public content (see below).',
          '**Your program work.** Notes, evidence you record, your business name, and your website content, to guide you day by day and build your website.',
          '**Website connection.** When you connect your Cloudflare account, we keep the access Cloudflare gives us so we can publish your site. We never see your Cloudflare password.',
          '**Your customers\' messages.** If your website has a contact form, we store what your visitors send so you can see and answer it. We use it for nothing else.',
          '**Payments.** Stripe takes your card details on its own checkout. We keep the order record: what you bought, the amount, the date, and its status.',
          '**First 30 email list.** Your email, the language you used, where you signed up, and the consent you gave, to tell you about First 30.',
          '**Support emails.** What you send us, to help you.',
          '**Technical data.** Your IP address, used briefly and stored in a scrambled (hashed) form to apply fair-use limits, plus browser and error details in our server logs, to keep GhostTown working and secure.',
          '**Product events.** Steps such as "verdict started" or "checkout started", and the link or campaign that brought you here (for example UTM tags or a referral code), to learn whether GhostTown works and where visitors come from.',
          '**Browser storage.** Your browser\'s local storage keeps you logged in and saves drafts and your language. We do not use advertising cookies or third-party trackers.'
        )
      ]
    },
    {
      id: 'providers',
      title: 'Who helps us process it',
      blocks: [
        p('These service providers process information for us, only to provide GhostTown:'),
        table(['Provider', 'What they do'], [
          ['Cloudflare', 'Runs our website, database, and file storage, and routes AI requests'],
          ['Google Cloud (Vertex AI)', 'Writes verdicts, plans, website copy, and materials from what you submit'],
          ['DataForSEO, YouTube Data API (Google), Podcast Index', 'Search public sources using short phrases from your idea, to find market signals'],
          ['Stripe', 'Processes payments'],
          ['Shorts Factory (our video service)', 'Turns public verdicts into short videos']
        ]),
        p('When we start emailing the First 30 list, we will use an email delivery service and name it here.')
      ]
    },
    {
      id: 'public-content',
      title: 'Public verdict content',
      blocks: [
        p('Before a verdict runs, you confirm that your submitted idea, your report, and the video made from it are public and may be published and reused. We remove email addresses and phone numbers from the public copy. Please leave private or identifying details out of what you submit.')
      ]
    },
    {
      id: 'sharing',
      title: 'When we share information',
      blocks: [
        list(
          'With the service providers above, to run GhostTown.',
          'When you ask us to, such as publishing your website to your own Cloudflare account.',
          'When the law requires it, or to protect GhostTown, our customers, or the public from fraud or harm.',
          'If GhostTown is sold or merged. We would tell you before your information moved under a different privacy policy.'
        ),
        p('We do not sell personal information, and we do not share it for cross-context behavioral advertising.')
      ]
    },
    {
      id: 'retention',
      title: 'How long we keep it',
      blocks: [
        table(['Information', 'How long'], [
          ['Your account, saved verdicts, and program work', 'Until you ask us to delete your account'],
          ['Verdicts not saved to an account', 'Up to 90 days'],
          ['Public video copy of a verdict', 'Up to 1 year'],
          ['First 30 email list entry', 'Until you unsubscribe or ask us to remove it'],
          ['Payment and order records', 'As long as tax and accounting law requires'],
          ['Server logs', 'A short time'],
          ['Fair-use counters', 'They hold only a hashed form of your IP address, never the address itself']
        ])
      ]
    },
    {
      id: 'rights',
      title: 'Your choices and rights',
      blocks: [
        p('You can ask us to:'),
        list(
          'tell you what personal information we have about you, and give you a copy;',
          'correct information that is wrong;',
          'delete your information;',
          'stop sending you First 30 emails.'
        ),
        p(`Email ${support} with "Privacy request" in the subject. We may confirm the request from the email on your account before acting on it. You can also ask someone to make a request for you with your written permission. We answer within 45 days, and we will not treat you differently for using these rights.`),
        p('**California residents** have these rights under the California Consumer Privacy Act, including the right to know the categories of information we collect (listed above), where it comes from (you, your browser, and your use of GhostTown), why we use it (listed above), and who we disclose it to (the providers above). We do not sell or share personal information, and we do not use sensitive personal information to infer things about you. Residents of other states with privacy laws, and of the EU and UK, can make the same requests the same way.')
      ]
    },
    {
      id: 'email',
      title: 'Emails',
      blocks: [
        p('We email the First 30 list only about First 30, including when it opens. Every such email has an unsubscribe link and our mailing address, and we stop within 10 business days of your request.'),
        p('Service emails, such as password resets and payment receipts, are not marketing. We send them while you have an account.')
      ]
    },
    {
      id: 'tracking',
      title: 'Do Not Track and Global Privacy Control',
      blocks: [
        p('We do not track you across other websites, so a Do Not Track signal does not change anything we do. We treat a Global Privacy Control signal as a request not to sell or share your information, which we already do not do.')
      ]
    },
    {
      id: 'children',
      title: 'Children',
      blocks: [
        p('GhostTown is for adults 18 and over. It is not meant for children, and we do not knowingly collect information from children under 13. If we learn that we have, we delete it.')
      ]
    },
    {
      id: 'security',
      title: 'Security and storage',
      blocks: [
        p('Connections to GhostTown use encryption (HTTPS), passwords are hashed, and access to customer data is limited. No system is perfectly secure. If a breach affects your information, we will tell you as the law requires.'),
        p('Our data is stored in the United States and on Cloudflare\'s global network.')
      ]
    },
    {
      id: 'changes',
      title: 'Changes to this policy',
      blocks: [
        p('When we change this policy we update the date at the top. For important changes we email account holders before they take effect.')
      ]
    },
    {
      id: 'contact',
      title: 'Contact',
      blocks: [p(`Privacy questions or requests: ${support}.`)]
    }
  ]
};

const disclaimer: LegalPageContent = {
  eyebrow: 'Disclaimer',
  title: 'Disclaimer',
  summary: 'GhostTown helps you decide what to test and helps you do the testing. It cannot promise how it turns out.',
  sections: [
    {
      id: 'results',
      title: 'No promise of income or results',
      blocks: [
        p('GhostTown does not promise income, customers, sales, or business success. Examples on this site show how GhostTown works. They are not typical results, and they are not predictions of yours. What happens depends on your idea, your market, your effort, and many things outside anyone\'s control.')
      ]
    },
    {
      id: 'advice',
      title: 'Not professional advice',
      blocks: [
        p('GhostTown is not legal, financial, tax, accounting, investment, medical, or other professional advice. If your idea is regulated (for example health, finance, food, childcare, or licensed trades), talk to a qualified professional before you act on it.')
      ]
    },
    {
      id: 'ai-and-evidence',
      title: 'AI and evidence have limits',
      blocks: [
        p('Verdicts and plans combine your answers, AI, and public signals from a short automated search of web, video, and podcast sources. Those signals show that a market or conversation exists. They are not customer interviews or proof that your offer will sell, and they can be incomplete or out of date. When the search or the AI is unavailable, GhostTown falls back to a scored review of your answers.'),
        p('AI can be wrong. Check anything important before you rely on it or publish it.')
      ]
    },
    {
      id: 'responsibility',
      title: 'What you publish',
      blocks: [
        p('You are responsible for what you publish and send, including your website, your claims about your business, and how you handle your own customers\' information. Your submitted idea, report, and verdict video are public content.')
      ]
    },
    {
      id: 'links',
      title: 'Other websites',
      blocks: [
        p('GhostTown links to other websites and services, such as Cloudflare and Stripe. Their own terms and privacy policies apply there.')
      ]
    }
  ]
};

export const LEGAL_PAGES: Record<LegalPageKind, LegalPageContent> = { terms, refund, privacy, disclaimer };
