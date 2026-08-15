export type WebsiteStylePreset =
  | 'warm_editorial'
  | 'clean_saas'
  | 'local_trust'
  | 'premium_service'
  | 'bold_validation';

export type WebsiteComponentId =
  | 'hero'
  | 'problem'
  | 'solution'
  | 'how_it_works'
  | 'comparison'
  | 'pricing'
  | 'proof'
  | 'faq'
  | 'lead_capture'
  | 'footer';

export interface WebsiteSectionItem {
  title: string;
  body: string;
}

export interface WebsiteSectionSpec {
  sectionId: string;
  component: WebsiteComponentId;
  eyebrow: string;
  heading: string;
  body: string;
  items: WebsiteSectionItem[];
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
}

export interface CustomWebsiteSpec {
  schemaVersion: 'custom-website-spec-v1';
  businessName: string;
  metadataTitle: string;
  metadataDescription: string;
  stylePreset: WebsiteStylePreset;
  sections: WebsiteSectionSpec[];
}

export interface WebsiteBuildFile {
  path: string;
  contentType: string;
  content: string;
  sha256: string;
}

export interface WebsiteBuildResult {
  schemaVersion: 'custom-website-build-v1';
  buildId: string;
  createdAt: string;
  specSha256: string;
  files: WebsiteBuildFile[];
}

export type WebsiteFindingSeverity = 'blocker' | 'high' | 'medium' | 'low';

export interface WebsiteBrowserFinding {
  findingId: string;
  severity: WebsiteFindingSeverity;
  viewport: string;
  message: string;
  screenshotRef?: string;
}

export interface WebsiteBrowserTestResult {
  passed: boolean;
  testedAt: string;
  viewports: string[];
  findings: WebsiteBrowserFinding[];
}

export interface WebsiteDeploymentReceipt {
  provider: string;
  deploymentId: string;
  publicUrl: string;
  deployedAt: string;
  buildId: string;
}

export interface WebsiteCreationReceipt {
  schemaVersion: 'custom-website-creation-receipt-v1';
  sourceBlueprintId: string;
  sourceOrderId: string;
  generatedAt: string;
  websiteModel: string;
  generationResponseHash: string;
  buildId: string;
  repairCount: number;
  browserTested: boolean;
  browserPassed: boolean;
  deployed: boolean;
  productionAutoDeploy: false;
}

export interface WebsiteCreationResult {
  spec: CustomWebsiteSpec;
  build: WebsiteBuildResult;
  browserTest?: WebsiteBrowserTestResult;
  deployment?: WebsiteDeploymentReceipt;
  receipt: WebsiteCreationReceipt;
}
