export type ResearchPackId =
  | 'families_gaming'
  | 'saas_builders'
  | 'local_services'
  | 'creators_digital'
  | 'consulting_agencies'
  | 'retail_products'
  | 'education'
  | 'hospitality_local'
  | 'universal';

export type ResearchAccessMode =
  | 'stack_exchange_api'
  | 'youtube_api'
  | 'github_api'
  | 'hacker_news_api'
  | 'discourse_api'
  | 'rss_atom'
  | 'sitemap'
  | 'customer_seed';

export type ResearchSourceReviewStatus =
  | 'approved_for_customer_reports'
  | 'technical_verified'
  | 'pending_terms_review'
  | 'disabled';

export type ResearchQueryStrategy =
  | 'idea'
  | 'buyer'
  | 'problem'
  | 'alternative'
  | 'community'
  | 'how_to'
  | 'local';

export interface ResearchSourceDefinition {
  sourceId: string;
  name: string;
  accessMode: ResearchAccessMode;
  packs: ResearchPackId[];
  domains: string[];
  languages: string[];
  geographies: string[];
  canonicalUrl: string;
  endpoint?: string;
  siteParameter?: string;
  queryStrategy: ResearchQueryStrategy;
  rightsBasis: 'official_api' | 'public_feed' | 'public_sitemap' | 'customer_supplied';
  reviewStatus: ResearchSourceReviewStatus;
  rawRetention: 'none' | 'transient';
  customerReportUse: boolean;
  attributionRequired: boolean;
  freshnessDays: number;
  rateLimitPerMinute: number;
  reviewedAt: string;
  notes?: string;
}

const REVIEWED_AT = '2026-07-31';

function stackExchange(
  siteParameter: string,
  name: string,
  packs: ResearchPackId[],
  queryStrategy: ResearchQueryStrategy = 'problem'
): ResearchSourceDefinition {
  const host = siteParameter === 'stackoverflow'
    ? 'stackoverflow.com'
    : siteParameter === 'superuser'
      ? 'superuser.com'
      : siteParameter === 'serverfault'
        ? 'serverfault.com'
        : `${siteParameter}.stackexchange.com`;
  return {
    sourceId: `stackexchange_${siteParameter}`,
    name,
    accessMode: 'stack_exchange_api',
    packs,
    domains: [host, 'api.stackexchange.com'],
    languages: ['en'],
    geographies: ['global'],
    canonicalUrl: `https://${host}`,
    endpoint: 'https://api.stackexchange.com/2.3/search/advanced',
    siteParameter,
    queryStrategy,
    rightsBasis: 'official_api',
    reviewStatus: 'approved_for_customer_reports',
    rawRetention: 'none',
    customerReportUse: true,
    attributionRequired: true,
    freshnessDays: 14,
    rateLimitPerMinute: 20,
    reviewedAt: REVIEWED_AT
  };
}

function youtube(slot: number, strategy: ResearchQueryStrategy, packs: ResearchPackId[]): ResearchSourceDefinition {
  return {
    sourceId: `youtube_channel_search_${slot}`,
    name: `YouTube channel search ${slot}`,
    accessMode: 'youtube_api',
    packs,
    domains: ['youtube.com', 'www.googleapis.com'],
    languages: ['en', 'es'],
    geographies: ['global'],
    canonicalUrl: 'https://www.youtube.com',
    endpoint: 'https://www.googleapis.com/youtube/v3/search',
    queryStrategy: strategy,
    rightsBasis: 'official_api',
    reviewStatus: 'approved_for_customer_reports',
    rawRetention: 'none',
    customerReportUse: true,
    attributionRequired: true,
    freshnessDays: 7,
    rateLimitPerMinute: 20,
    reviewedAt: REVIEWED_AT
  };
}

function github(slot: number, strategy: ResearchQueryStrategy, packs: ResearchPackId[]): ResearchSourceDefinition {
  return {
    sourceId: `github_repository_search_${slot}`,
    name: `GitHub public repository search ${slot}`,
    accessMode: 'github_api',
    packs,
    domains: ['github.com', 'api.github.com'],
    languages: ['en'],
    geographies: ['global'],
    canonicalUrl: 'https://github.com',
    endpoint: 'https://api.github.com/search/repositories',
    queryStrategy: strategy,
    rightsBasis: 'official_api',
    reviewStatus: 'approved_for_customer_reports',
    rawRetention: 'none',
    customerReportUse: true,
    attributionRequired: true,
    freshnessDays: 14,
    rateLimitPerMinute: 10,
    reviewedAt: REVIEWED_AT
  };
}

function hackerNews(slot: number, strategy: ResearchQueryStrategy): ResearchSourceDefinition {
  return {
    sourceId: `hacker_news_stream_${slot}`,
    name: slot === 1 ? 'Hacker News newest stories' : 'Hacker News top stories',
    accessMode: 'hacker_news_api',
    packs: ['saas_builders', 'creators_digital', 'consulting_agencies', 'universal'],
    domains: ['news.ycombinator.com', 'hacker-news.firebaseio.com'],
    languages: ['en'],
    geographies: ['global'],
    canonicalUrl: 'https://news.ycombinator.com',
    endpoint: `https://hacker-news.firebaseio.com/v0/${slot === 1 ? 'newstories' : 'topstories'}.json`,
    queryStrategy: strategy,
    rightsBasis: 'official_api',
    reviewStatus: 'approved_for_customer_reports',
    rawRetention: 'none',
    customerReportUse: true,
    attributionRequired: true,
    freshnessDays: 3,
    rateLimitPerMinute: 20,
    reviewedAt: REVIEWED_AT
  };
}

function discourse(
  sourceId: string,
  name: string,
  baseUrl: string,
  packs: ResearchPackId[]
): ResearchSourceDefinition {
  const host = new URL(baseUrl).hostname;
  return {
    sourceId,
    name,
    accessMode: 'discourse_api',
    packs,
    domains: [host],
    languages: ['en'],
    geographies: ['global'],
    canonicalUrl: baseUrl,
    endpoint: `${baseUrl.replace(/\/$/, '')}/search.json`,
    queryStrategy: 'problem',
    rightsBasis: 'official_api',
    reviewStatus: 'technical_verified',
    rawRetention: 'none',
    customerReportUse: false,
    attributionRequired: true,
    freshnessDays: 14,
    rateLimitPerMinute: 10,
    reviewedAt: REVIEWED_AT,
    notes: 'Public Discourse JSON is technically available. Enable only after source-specific terms review.'
  };
}

function publicFeed(
  sourceId: string,
  name: string,
  feedUrl: string,
  canonicalUrl: string,
  packs: ResearchPackId[]
): ResearchSourceDefinition {
  return {
    sourceId,
    name,
    accessMode: 'rss_atom',
    packs,
    domains: [new URL(feedUrl).hostname, new URL(canonicalUrl).hostname],
    languages: ['en'],
    geographies: ['global'],
    canonicalUrl,
    endpoint: feedUrl,
    queryStrategy: 'problem',
    rightsBasis: 'public_feed',
    reviewStatus: 'pending_terms_review',
    rawRetention: 'none',
    customerReportUse: false,
    attributionRequired: true,
    freshnessDays: 7,
    rateLimitPerMinute: 6,
    reviewedAt: REVIEWED_AT,
    notes: 'Candidate public feed. Operator must confirm customer-report use before enabling.'
  };
}

export const CUSTOMER_SEED_SOURCE: ResearchSourceDefinition = {
  sourceId: 'customer_supplied_seeds',
  name: 'Customer-supplied public source seeds',
  accessMode: 'customer_seed',
  packs: ['universal'],
  domains: [],
  languages: ['en', 'es'],
  geographies: ['global'],
  canonicalUrl: 'https://ghosttowntest.com',
  queryStrategy: 'idea',
  rightsBasis: 'customer_supplied',
  reviewStatus: 'approved_for_customer_reports',
  rawRetention: 'none',
  customerReportUse: true,
  attributionRequired: true,
  freshnessDays: 1,
  rateLimitPerMinute: 30,
  reviewedAt: REVIEWED_AT
};

export const RESEARCH_SOURCE_REGISTRY: ResearchSourceDefinition[] = [
  CUSTOMER_SEED_SOURCE,

  stackExchange('boardgames', 'Board & Card Games Stack Exchange', ['families_gaming', 'retail_products'], 'idea'),
  stackExchange('parenting', 'Parenting Stack Exchange', ['families_gaming', 'education'], 'buyer'),
  stackExchange('gaming', 'Arqade gaming community', ['families_gaming', 'retail_products'], 'idea'),
  stackExchange('rpg', 'Role-playing Games Stack Exchange', ['families_gaming', 'retail_products'], 'idea'),
  stackExchange('puzzling', 'Puzzling Stack Exchange', ['families_gaming', 'education'], 'idea'),
  stackExchange('chess', 'Chess Stack Exchange', ['families_gaming', 'education'], 'idea'),
  stackExchange('scifi', 'Science Fiction & Fantasy Stack Exchange', ['families_gaming', 'creators_digital'], 'buyer'),
  stackExchange('movies', 'Movies & TV Stack Exchange', ['families_gaming', 'creators_digital'], 'buyer'),
  stackExchange('cooking', 'Seasoned Advice cooking community', ['families_gaming', 'retail_products', 'hospitality_local'], 'problem'),
  stackExchange('diy', 'Home Improvement Stack Exchange', ['families_gaming', 'local_services'], 'problem'),
  stackExchange('crafts', 'Arts & Crafts Stack Exchange', ['families_gaming', 'creators_digital', 'retail_products'], 'idea'),
  stackExchange('pets', 'Pets Stack Exchange', ['families_gaming', 'local_services', 'retail_products'], 'buyer'),
  stackExchange('outdoors', 'The Great Outdoors Stack Exchange', ['families_gaming', 'hospitality_local'], 'buyer'),
  stackExchange('travel', 'Travel Stack Exchange', ['families_gaming', 'hospitality_local'], 'local'),
  stackExchange('academia', 'Academia Stack Exchange', ['education', 'consulting_agencies'], 'buyer'),
  stackExchange('matheducators', 'Mathematics Educators Stack Exchange', ['education'], 'problem'),
  stackExchange('ux', 'User Experience Stack Exchange', ['saas_builders', 'creators_digital', 'consulting_agencies'], 'problem'),
  stackExchange('webmasters', 'Webmasters Stack Exchange', ['saas_builders', 'creators_digital', 'consulting_agencies'], 'how_to'),
  stackExchange('softwareengineering', 'Software Engineering Stack Exchange', ['saas_builders', 'consulting_agencies'], 'problem'),
  stackExchange('stackoverflow', 'Stack Overflow', ['saas_builders', 'creators_digital'], 'problem'),
  stackExchange('workplace', 'The Workplace Stack Exchange', ['consulting_agencies', 'local_services', 'saas_builders'], 'buyer'),
  stackExchange('money', 'Personal Finance & Money Stack Exchange', ['consulting_agencies', 'retail_products', 'local_services'], 'problem'),
  stackExchange('graphicdesign', 'Graphic Design Stack Exchange', ['creators_digital', 'consulting_agencies'], 'problem'),
  stackExchange('wordpress', 'WordPress Development Stack Exchange', ['creators_digital', 'saas_builders', 'consulting_agencies'], 'how_to'),
  stackExchange('salesforce', 'Salesforce Stack Exchange', ['saas_builders', 'consulting_agencies'], 'problem'),
  stackExchange('security', 'Information Security Stack Exchange', ['saas_builders', 'consulting_agencies', 'local_services'], 'problem'),
  stackExchange('law', 'Law Stack Exchange', ['local_services', 'consulting_agencies', 'retail_products'], 'problem'),
  stackExchange('electronics', 'Electrical Engineering Stack Exchange', ['local_services', 'saas_builders', 'retail_products'], 'problem'),
  stackExchange('mechanics', 'Motor Vehicle Maintenance & Repair Stack Exchange', ['local_services', 'retail_products'], 'problem'),
  stackExchange('fitness', 'Physical Fitness Stack Exchange', ['local_services', 'retail_products', 'education'], 'buyer'),

  youtube(1, 'idea', ['universal']),
  youtube(2, 'buyer', ['universal']),
  youtube(3, 'problem', ['universal']),
  youtube(4, 'alternative', ['universal']),
  youtube(5, 'community', ['universal']),
  youtube(6, 'how_to', ['universal']),
  youtube(7, 'local', ['universal']),
  youtube(8, 'idea', ['families_gaming', 'retail_products', 'education']),
  youtube(9, 'problem', ['saas_builders', 'consulting_agencies', 'local_services']),
  youtube(10, 'buyer', ['creators_digital', 'hospitality_local']),

  github(1, 'idea', ['saas_builders', 'creators_digital', 'education', 'universal']),
  github(2, 'problem', ['saas_builders', 'consulting_agencies', 'local_services', 'universal']),
  github(3, 'alternative', ['saas_builders', 'retail_products', 'universal']),
  github(4, 'community', ['saas_builders', 'creators_digital', 'education', 'universal']),
  github(5, 'how_to', ['saas_builders', 'consulting_agencies', 'universal']),
  github(6, 'buyer', ['creators_digital', 'education', 'universal']),
  github(7, 'idea', ['families_gaming', 'retail_products', 'universal']),
  github(8, 'local', ['local_services', 'hospitality_local', 'universal']),

  hackerNews(1, 'problem'),
  hackerNews(2, 'idea'),

  discourse('discourse_meta', 'Discourse Meta', 'https://meta.discourse.org', ['saas_builders', 'creators_digital']),
  discourse('discourse_python', 'Python community forum', 'https://discuss.python.org', ['saas_builders', 'education']),
  discourse('discourse_rust', 'Rust users forum', 'https://users.rust-lang.org', ['saas_builders', 'education']),
  discourse('discourse_openai', 'OpenAI developer community', 'https://community.openai.com', ['saas_builders', 'creators_digital']),
  discourse('discourse_cloudflare', 'Cloudflare community', 'https://community.cloudflare.com', ['saas_builders', 'local_services']),
  discourse('discourse_freecodecamp', 'freeCodeCamp forum', 'https://forum.freecodecamp.org', ['education', 'saas_builders']),
  discourse('discourse_codecademy', 'Codecademy forum', 'https://discuss.codecademy.com', ['education', 'saas_builders']),
  discourse('discourse_ghost', 'Ghost publishing forum', 'https://forum.ghost.org', ['creators_digital', 'saas_builders']),

  publicFeed('feed_dice_tower', 'The Dice Tower podcast', 'https://dicetower.libsyn.com/rss', 'https://www.dicetower.com', ['families_gaming']),
  publicFeed('feed_board_game_barrage', 'Board Game Barrage podcast', 'https://boardgamebarrage.libsyn.com/rss', 'https://boardgamebarrage.com', ['families_gaming']),
  publicFeed('feed_hidden_gems_board_games', 'Hidden Gems board-game podcast', 'https://feeds.buzzsprout.com/1650766.rss', 'https://www.hiddengemsboardgamepodcast.com', ['families_gaming']),
  publicFeed('feed_board_game_snobs', 'Board Game Snobs podcast', 'https://feed.podbean.com/boardgamesnobs/feed.xml', 'https://boardgamesnobs.podbean.com', ['families_gaming']),
  publicFeed('feed_board_game_gateway', 'Board Game Gateway podcast', 'https://anchor.fm/s/a59fab3c/podcast/rss', 'https://www.boardgamegateway.com', ['families_gaming']),
  publicFeed('feed_board_game_hot_takes', 'Board Game Hot Takes podcast', 'https://anchor.fm/s/35be69e8/podcast/rss', 'https://anchor.fm/boardgamehottakes', ['families_gaming']),
  publicFeed('feed_shelf_stable', 'Shelf Stable board-gaming podcast', 'https://feeds.libsyn.com/542992/rss', 'https://sites.libsyn.com/542992', ['families_gaming'])
];

export function sourceRegistryCounts(): Record<ResearchSourceReviewStatus, number> {
  return RESEARCH_SOURCE_REGISTRY.reduce<Record<ResearchSourceReviewStatus, number>>((counts, source) => {
    counts[source.reviewStatus] += 1;
    return counts;
  }, {
    approved_for_customer_reports: 0,
    technical_verified: 0,
    pending_terms_review: 0,
    disabled: 0
  });
}

export function approvedResearchSources(): ResearchSourceDefinition[] {
  return RESEARCH_SOURCE_REGISTRY.filter(source =>
    source.reviewStatus === 'approved_for_customer_reports'
    && source.customerReportUse
    && source.rawRetention === 'none'
  );
}
