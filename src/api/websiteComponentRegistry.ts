import type { CustomWebsiteSpec, WebsiteComponentId } from '../types/customWebsite';

export interface WebsiteComponentDefinition {
  id: WebsiteComponentId;
  purpose: string;
  required: boolean;
  maxInstances: number;
}

export const WEBSITE_COMPONENT_REGISTRY: readonly WebsiteComponentDefinition[] = [
  { id: 'hero', purpose: 'Primary positioning, promise, and action', required: true, maxInstances: 1 },
  { id: 'problem', purpose: 'Customer problem and stakes', required: true, maxInstances: 1 },
  { id: 'solution', purpose: 'Offer and deliverables', required: true, maxInstances: 1 },
  { id: 'how_it_works', purpose: 'Simple delivery sequence', required: false, maxInstances: 1 },
  { id: 'comparison', purpose: 'Truthful differentiation from current alternatives', required: false, maxInstances: 1 },
  { id: 'pricing', purpose: 'Blueprint-approved test price and risk reversal', required: true, maxInstances: 1 },
  { id: 'proof', purpose: 'Validation-stage proof and explicitly labeled placeholders only', required: true, maxInstances: 1 },
  { id: 'faq', purpose: 'Objection handling and frequently asked questions', required: true, maxInstances: 1 },
  { id: 'lead_capture', purpose: 'Primary conversion action', required: true, maxInstances: 1 },
  { id: 'footer', purpose: 'Business identity, contact, and legal disclosure', required: true, maxInstances: 1 }
] as const;

const REGISTRY = new Map<WebsiteComponentId, WebsiteComponentDefinition>(
  WEBSITE_COMPONENT_REGISTRY.map(definition => [definition.id, definition])
);

export function websiteComponentIds(): WebsiteComponentId[] {
  return WEBSITE_COMPONENT_REGISTRY.map(definition => definition.id);
}

export function websiteComponentDefinition(id: WebsiteComponentId): WebsiteComponentDefinition {
  const definition = REGISTRY.get(id);
  if (!definition) throw new Error(`Unknown website component: ${id}`);
  return definition;
}

export function websiteComponentFailures(spec: CustomWebsiteSpec): string[] {
  const failures: string[] = [];
  if (!spec.sections.length) failures.push('Website spec contains no sections.');
  if (spec.sections.length > 12) failures.push('Website spec exceeds the 12-section deterministic build limit.');
  if (spec.sections[0]?.component !== 'hero') failures.push('The hero component must be first.');
  if (spec.sections.at(-1)?.component !== 'footer') failures.push('The footer component must be last.');

  const counts = new Map<WebsiteComponentId, number>();
  const sectionIds = new Set<string>();
  for (const section of spec.sections) {
    if (!REGISTRY.has(section.component)) {
      failures.push(`Unknown component ${String(section.component)}.`);
      continue;
    }
    if (!section.sectionId.trim()) failures.push(`Section ${section.component} is missing sectionId.`);
    if (sectionIds.has(section.sectionId)) failures.push(`Duplicate sectionId ${section.sectionId}.`);
    sectionIds.add(section.sectionId);
    counts.set(section.component, (counts.get(section.component) || 0) + 1);
  }

  for (const definition of WEBSITE_COMPONENT_REGISTRY) {
    const count = counts.get(definition.id) || 0;
    if (definition.required && count < 1) failures.push(`Required component ${definition.id} is missing.`);
    if (count > definition.maxInstances) failures.push(`Component ${definition.id} exceeds maxInstances=${definition.maxInstances}.`);
  }
  return failures;
}

export function assertWebsiteComponentContract(spec: CustomWebsiteSpec): void {
  const failures = websiteComponentFailures(spec);
  if (failures.length) throw new Error(`Website component contract failed: ${failures.join(' ')}`);
}
