import type { Env } from "./env";
import { ownedLaunchBlueprintOrder } from "./blueprintApi";
import { loadBlueprintRecord } from "./blueprintStore";
import { consumeHourlyRateLimit } from "./runtimeControls";
import type { GhostTownLaunchBlueprint } from "../types/launchBlueprint";

export type LaunchSiteStatus = "draft" | "published" | "unpublished";

export interface LaunchSiteRecord {
  siteId: string;
  orderId: string;
  ownerId: string;
  publicSlug: string;
  status: LaunchSiteStatus;
  publishedAt: string | null;
  unpublishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type LaunchSiteTruthLabel = "INFERRED" | "VALIDATION_STAGE";
export type LaunchSiteProofLabel = "TEST" | "PROOF_TO_EARN";

export interface LaunchSiteProofItem {
  label: LaunchSiteProofLabel;
  text: string;
}

export interface LaunchSitePresentationBlock {
  job: "hero" | "specific_promise" | "customer_qualifier" | "pain_cost" | "mechanism" | "offer" | "inclusions" | "how_it_works" | "evidence_proof" | "risk_scope_boundary" | "primary_cta" | "objections" | "faq_final_cta";
  eyebrow: string;
  heading: string;
  body: string;
  truthLabel: LaunchSiteTruthLabel;
  items: string[];
}

/** A deterministic, canonical-only projection for the validation Launch Site.
 * It deliberately has no generated-site dependency. */
export interface LaunchSitePresentationModel {
  schemaVersion: "ghosttown-launch-site-presentation-v1";
  title: string;
  description: string;
  businessName: string;
  blocks: LaunchSitePresentationBlock[];
  primaryCta: string;
  secondaryCta: string;
  formConsent: string;
  customer: string;
  problem: string;
  offerName: string;
  promise: string;
  price: string;
  priceExplanation: string;
  timeline: string;
  exclusions: string[];
  proofItems: LaunchSiteProofItem[];
  verifiedOutcomeNotice: "No verified outcomes yet";
  artifactSteps: string[];
}

interface SiteRow {
  site_id: string;
  order_id: string;
  owner_id: string;
  public_slug: string;
  status: LaunchSiteStatus;
  published_at: string | null;
  unpublished_at: string | null;
  created_at: string;
  updated_at: string;
}

interface LeadRow {
  lead_id: string;
  email: string;
  name: string | null;
  message: string | null;
  source_path: string;
  consent_text: string;
  created_at: string;
}

const privateJson = (body: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store",
      ...headers,
    },
  });

function db(env: Env): D1Database {
  if (!env.DB) throw new Error("Launch Blueprint D1 binding is not configured");
  return env.DB;
}

function record(row: SiteRow): LaunchSiteRecord {
  return {
    siteId: row.site_id,
    orderId: row.order_id,
    ownerId: row.owner_id,
    publicSlug: row.public_slug,
    status: row.status,
    publishedAt: row.published_at,
    unpublishedAt: row.unpublished_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function safeSlug(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 48) || "launch"
  );
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>'"]/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        char
      ] || char,
  );
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

const genericCopy = /unlock your potential|revolutionize your workflow|game.?changer|best-in-class|next.?level|transform your business|one-stop solution|for everyone|any business/i;
const fabricatedClaim = /customers? (?:achieved|increased|saved)|\d+% (?:increase|improvement)|limited spots|act now|testimonial/i;

export const LAUNCH_SITE_CONVERSION_JOBS: LaunchSitePresentationBlock["job"][] = [
  "hero", "specific_promise", "customer_qualifier", "pain_cost", "mechanism", "offer", "inclusions",
  "how_it_works", "evidence_proof", "risk_scope_boundary", "primary_cta", "objections", "faq_final_cta",
];

export function composeLaunchSitePresentation(blueprint: GhostTownLaunchBlueprint): LaunchSitePresentationModel {
  const site = blueprint.launchSite;
  const copy = blueprint.landingPageCopy;
  const validation = "Validation-stage: this is a bounded offer, not a promised business, compliance, conversion, or revenue outcome.";
  const blocks: LaunchSitePresentationBlock[] = [
    { job: "hero", eyebrow: site.site.businessName, heading: site.offer.headline, body: site.offer.subheadline, truthLabel: "INFERRED", items: [] },
    { job: "specific_promise", eyebrow: "The specific promise", heading: site.offer.offerName, body: copy.offerDescription, truthLabel: "INFERRED", items: [] },
    { job: "customer_qualifier", eyebrow: "Built for", heading: site.offer.targetCustomer, body: `This is for ${site.positioning.idealFor.join(", ")}. It is not for ${site.positioning.notFor.join(", ")}.`, truthLabel: "INFERRED", items: site.positioning.idealFor },
    { job: "pain_cost", eyebrow: "The cost of waiting", heading: "The problem this tests", body: site.problem.summary, truthLabel: "INFERRED", items: site.problem.painPoints },
    { job: "mechanism", eyebrow: "Why this approach", heading: site.positioning.differentiator, body: copy.currentAlternativeSection, truthLabel: "INFERRED", items: [] },
    { job: "offer", eyebrow: "The bounded offer", heading: `${site.offer.price} — ${site.offer.priceExplanation}`, body: site.solution.summary, truthLabel: "INFERRED", items: [] },
    { job: "inclusions", eyebrow: "What you receive", heading: "Included in this scope", body: "The listed deliverables define the work before either party proceeds.", truthLabel: "INFERRED", items: site.solution.deliverables },
    { job: "how_it_works", eyebrow: "How it works", heading: "A clear, manual path", body: site.offer.deliveryMethod, truthLabel: "INFERRED", items: copy.howItWorks.map(step => `${step.step}: ${step.description}`) },
    { job: "evidence_proof", eyebrow: "Evidence, honestly labeled", heading: "What is known and what is still being tested", body: validation, truthLabel: "VALIDATION_STAGE", items: [...site.proof.claimsAllowed, ...site.proof.proofPlaceholders] },
    { job: "risk_scope_boundary", eyebrow: "Risk and scope", heading: "What this does not claim", body: `${site.riskReversal.text} ${validation}`, truthLabel: "VALIDATION_STAGE", items: site.positioning.notFor },
    { job: "primary_cta", eyebrow: "Check fit before you commit", heading: site.offer.callToAction, body: "Share the relevant context. A request is not an acceptance or a charge.", truthLabel: "INFERRED", items: [] },
    { job: "objections", eyebrow: "Common questions before a request", heading: "Start with the boundary", body: "We confirm fit, scope, exclusions, and the price boundary before work begins.", truthLabel: "INFERRED", items: ["This complements the current alternative; it does not pretend to replace it."] },
    { job: "faq_final_cta", eyebrow: "Still deciding?", heading: site.offer.secondaryCallToAction, body: copy.thankYouPageCopy, truthLabel: "INFERRED", items: site.faq.map(item => `${item.question} — ${item.answer}`) }
  ];
  return {
    schemaVersion: "ghosttown-launch-site-presentation-v1",
    title: copy.metadataTitle,
    description: copy.metadataDescription,
    businessName: site.site.businessName,
    blocks,
    primaryCta: site.offer.callToAction,
    secondaryCta: site.offer.secondaryCallToAction,
    formConsent: "I agree that this business may contact me about this offer.",
    customer: site.offer.targetCustomer,
    problem: site.problem.summary,
    offerName: site.offer.offerName,
    promise: copy.offerDescription,
    price: site.offer.price,
    priceExplanation: site.offer.priceExplanation,
    timeline: site.offer.timeToFirstValue,
    exclusions: site.solution.exclusions,
    proofItems: [
      ...site.proof.claimsAllowed.map(text => ({ label: "TEST" as const, text })),
      ...site.proof.proofPlaceholders.map(text => ({ label: "PROOF_TO_EARN" as const, text })),
    ],
    verifiedOutcomeNotice: "No verified outcomes yet",
    artifactSteps: [
      site.offer.deliveryMethod,
      site.problem.painPoints[0] || site.problem.summary,
      site.solution.deliverables[0] || site.solution.summary,
      site.solution.deliverables[site.solution.deliverables.length - 1] || site.offer.timeToFirstValue,
    ],
  };
}

export function validateLaunchSitePresentation(model: LaunchSitePresentationModel, blueprint: GhostTownLaunchBlueprint): string[] {
  const failures: string[] = [];
  if (model.blocks.map(block => block.job).join(",") !== LAUNCH_SITE_CONVERSION_JOBS.join(",")) failures.push("The canonical 13 conversion jobs are incomplete or unordered.");
  const rendered = JSON.stringify(model);
  const canonicalMismatch = model.customer !== blueprint.launchSite.offer.targetCustomer
    || model.problem !== blueprint.launchSite.problem.summary
    || model.offerName !== blueprint.launchSite.offer.offerName
    || model.promise !== blueprint.landingPageCopy.offerDescription
    || model.price !== blueprint.launchSite.offer.price
    || model.primaryCta !== blueprint.launchSite.offer.callToAction
    || model.blocks[0]?.heading !== blueprint.launchSite.offer.headline;
  if (canonicalMismatch) failures.push("Customer, problem, offer, promise, price, or CTA no longer matches the canonical Blueprint.");
  if (genericCopy.test(rendered)) failures.push("Generic conversion copy is not allowed on the validation Launch Site.");
  if (fabricatedClaim.test(rendered)) failures.push("Fabricated performance, testimonial, scarcity, or urgency claims are not allowed.");
  if (!model.blocks.every(block => block.heading.trim() && block.body.trim() && ["INFERRED", "VALIDATION_STAGE"].includes(block.truthLabel))) failures.push("Every conversion block needs copy and an honest truth label.");
  if (!model.proofItems.length || model.proofItems.some(item => !item.text.trim() || !["TEST", "PROOF_TO_EARN"].includes(item.label))) failures.push("Every proof item must be labeled Test or Proof to earn.");
  if (model.proofItems.filter(item => item.label === "TEST").length !== blueprint.launchSite.proof.claimsAllowed.length || model.proofItems.filter(item => item.label === "PROOF_TO_EARN").length !== blueprint.launchSite.proof.proofPlaceholders.length) failures.push("Proof labels no longer match the canonical proof boundary.");
  if (model.verifiedOutcomeNotice !== "No verified outcomes yet") failures.push("The validation-stage outcome notice is missing.");
  if (model.artifactSteps.length !== 4 || model.artifactSteps.some(step => !step.trim())) failures.push("The canonical four-step artifact visual is incomplete.");
  if (!rendered.includes("Validation-stage")) failures.push("Validation-stage truth boundary is missing.");
  return failures;
}

export function launchSitePublishFailures(
  blueprint: GhostTownLaunchBlueprint,
): string[] {
  const config = blueprint.launchSite;
  const failures: string[] = [];
  if (blueprint.status !== "ready" || !blueprint.qualityGate.passed)
    failures.push("The canonical Blueprint quality gate has not passed.");
  if (config.proof.status !== "validation-stage")
    failures.push("Proof must remain explicitly labeled as validation-stage.");
  if (!config.offer.headline.trim() || !config.offer.callToAction.trim())
    failures.push("Headline and primary call to action are required.");
  if (!config.site.contactEmail.trim())
    failures.push("A contact email is required.");
  if (
    !config.legal.privacyPolicy ||
    !config.legal.termsOfService ||
    !config.legal.disclaimer
  )
    failures.push("Privacy, terms, and disclaimer flags must be enabled.");
  if (!config.proof.proofPlaceholders.length)
    failures.push("At least one honest proof placeholder is required.");
  return failures;
}

async function siteByOrder(env: Env, orderId: string): Promise<SiteRow | null> {
  return db(env)
    .prepare("SELECT * FROM launch_sites WHERE order_id = ?")
    .bind(orderId)
    .first<SiteRow>();
}

async function ensureSite(
  env: Env,
  blueprint: GhostTownLaunchBlueprint,
): Promise<SiteRow> {
  const existing = await siteByOrder(env, blueprint.orderId);
  if (existing) return existing;
  const base = `${safeSlug(blueprint.launchSite.site.businessName || blueprint.offer.offerName)}-${blueprint.orderId.slice(-8).toLowerCase()}`;
  const now = new Date().toISOString();
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    const slug = attempt === 1 ? base : `${base}-${attempt}`;
    try {
      await db(env)
        .prepare(
          `INSERT INTO launch_sites (site_id, order_id, owner_id, public_slug, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'draft', ?, ?)`,
        )
        .bind(
          `site_${crypto.randomUUID()}`,
          blueprint.orderId,
          blueprint.ownerId.trim().toLowerCase(),
          slug,
          now,
          now,
        )
        .run();
      const created = await siteByOrder(env, blueprint.orderId);
      if (created) return created;
    } catch (error) {
      const concurrent = await siteByOrder(env, blueprint.orderId);
      if (concurrent) return concurrent;
      if (!String(error).toLowerCase().includes("unique")) throw error;
    }
  }
  throw new Error("A unique Launch Site URL could not be allocated");
}

export async function handleLaunchSiteOwner(
  request: Request,
  env: Env,
  orderId: string,
  action: "get" | "publish" | "unpublish" | "leads" | "csv",
): Promise<Response> {
  const owned = await ownedLaunchBlueprintOrder(request, env, orderId);
  if (owned instanceof Response) return owned;
  const stored = await loadBlueprintRecord(env, orderId);
  if (!stored)
    return privateJson(
      { error: "Canonical Launch Blueprint record not found" },
      404,
    );

  let site = await siteByOrder(env, stored.blueprint.orderId);
  if (site && site.owner_id !== owned.email.trim().toLowerCase())
    return privateJson({ error: "Launch Site not found" }, 404);

  const publishFailures = launchSitePublishFailures(stored.blueprint);
  if (action === "get") {
    const publicUrl = site
      ? `${new URL(request.url).origin}/launch/${encodeURIComponent(site.public_slug)}`
      : null;
    return privateJson({
      site: site ? record(site) : null,
      publicUrl,
      publishFailures,
      canonicalBlueprintId: stored.blueprint.blueprintId,
    });
  }

  if (action === "publish") {
    if (publishFailures.length)
      return privateJson(
        { error: "Launch Site is not publishable", publishFailures },
        409,
      );
    site = site ?? await ensureSite(env, stored.blueprint);
    if (site.owner_id !== owned.email.trim().toLowerCase())
      return privateJson({ error: "Launch Site not found" }, 404);
    const now = new Date().toISOString();
    await db(env)
      .prepare(
        `UPDATE launch_sites SET status = 'published', published_at = ?, unpublished_at = NULL, updated_at = ? WHERE order_id = ? AND owner_id = ?`,
      )
      .bind(now, now, orderId, site.owner_id)
      .run();
    site = (await siteByOrder(env, orderId))!;
  } else {
    if (!site) return privateJson({ error: "Launch Site not found" }, 404);
    if (action === "unpublish") {
      const now = new Date().toISOString();
      await db(env)
        .prepare(
          `UPDATE launch_sites SET status = 'unpublished', unpublished_at = ?, updated_at = ? WHERE order_id = ? AND owner_id = ?`,
        )
        .bind(now, now, orderId, site.owner_id)
        .run();
      site = (await siteByOrder(env, orderId))!;
    }
  }

  const publicUrl = `${new URL(request.url).origin}/launch/${encodeURIComponent(site.public_slug)}`;
  if (action === "leads" || action === "csv") {
    const result = await db(env)
      .prepare(
        "SELECT lead_id, email, name, message, source_path, consent_text, created_at FROM launch_site_leads WHERE site_id = ? ORDER BY created_at DESC",
      )
      .bind(site.site_id)
      .all<LeadRow>();
    const leads = result.results || [];
    if (action === "csv") {
      const cell = (value: unknown) => {
        const raw = String(value ?? "");
        const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
        return `"${safe.replace(/"/g, '""')}"`;
      };
      const rows = [
        [
          "lead_id",
          "email",
          "name",
          "message",
          "source_path",
          "consent_text",
          "created_at",
        ],
        ...leads.map((item) => [
          item.lead_id,
          item.email,
          item.name || "",
          item.message || "",
          item.source_path,
          item.consent_text,
          item.created_at,
        ]),
      ];
      return new Response(
        rows.map((row) => row.map(cell).join(",")).join("\r\n"),
        {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="launch-site-${site.public_slug}-leads.csv"`,
            "Cache-Control": "private, no-store",
          },
        },
      );
    }
    return privateJson({ site: record(site), publicUrl, leads });
  }
  return privateJson({
    site: record(site),
    publicUrl,
    publishFailures,
    canonicalBlueprintId: stored.blueprint.blueprintId,
  });
}

async function publishedSite(
  env: Env,
  slug: string,
): Promise<{ site: SiteRow; blueprint: GhostTownLaunchBlueprint } | null> {
  const site = await db(env)
    .prepare(
      `SELECT * FROM launch_sites WHERE public_slug = ? AND status = 'published'`,
    )
    .bind(slug)
    .first<SiteRow>();
  if (!site) return null;
  const stored = await loadBlueprintRecord(env, site.order_id);
  return stored ? { site, blueprint: stored.blueprint } : null;
}

export async function handlePublicLaunchSite(
  _request: Request,
  env: Env,
  slug: string,
): Promise<Response> {
  const loaded = await publishedSite(env, slug);
  if (!loaded)
    return new Response("Launch Site not found", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const html = renderLaunchSite(
    loaded.blueprint,
    loaded.site.public_slug,
  ).replace("<script>", `<script nonce="${nonce}">`);
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": `default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; script-src 'nonce-${nonce}'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`,
    },
  });
}

export async function handlePublicLaunchLead(
  request: Request,
  env: Env,
  slug: string,
): Promise<Response> {
  const loaded = await publishedSite(env, slug);
  if (!loaded) return privateJson({ error: "Launch Site not found" }, 404);
  let body: {
    email?: unknown;
    name?: unknown;
    message?: unknown;
    consent?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return privateJson({ error: "Invalid JSON body" }, 400);
  }
  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  const name = String(body.name || "")
    .trim()
    .slice(0, 120);
  const message = String(body.message || "")
    .trim()
    .slice(0, 2000);
  if (!validEmail(email) || body.consent !== true)
    return privateJson(
      { error: "A valid email and explicit consent are required" },
      400,
    );

  const ip = request.headers.get("CF-Connecting-IP") || "anonymous";
  const digest = new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`${loaded.site.site_id}:${ip}`),
    ),
  );
  const fingerprint = Array.from(
    digest.slice(0, 12),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  const budget = await consumeHourlyRateLimit(
    env,
    `launch_lead:${loaded.site.site_id}:${fingerprint}`,
    5,
  );
  if (!budget.allowed)
    return privateJson(
      { error: "Too many submissions. Try again later." },
      429,
      { "Retry-After": String(budget.retryAfter) },
    );

  const now = new Date().toISOString();
  await db(env)
    .prepare(
      "INSERT INTO launch_site_leads (lead_id, site_id, email, name, message, source_path, consent_text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      `lead_${crypto.randomUUID()}`,
      loaded.site.site_id,
      email,
      name || null,
      message || null,
      `/launch/${slug}`,
      "I agree that this business may contact me about this offer.",
      now,
    )
    .run();
  return privateJson(
    { ok: true, message: loaded.blueprint.landingPageCopy.thankYouPageCopy },
    201,
  );
}

export function renderLaunchSite(
  blueprint: GhostTownLaunchBlueprint,
  slug: string,
): string {
  const config = blueprint.launchSite;
  const presentation = composeLaunchSitePresentation(blueprint);
  const presentationFailures = validateLaunchSitePresentation(presentation, blueprint);
  if (presentationFailures.length) {
    throw new Error(`Launch Site presentation is not safe to render: ${presentationFailures.join(" ")}`);
  }
  const list = (values: string[]) =>
    values.map((value) => `<li>${escapeHtml(value)}</li>`).join("");
  const byJob = (job: LaunchSitePresentationBlock["job"]) =>
    presentation.blocks.find(block => block.job === job)!;
  const truth = (block: LaunchSitePresentationBlock) =>
    `<span class="truth truth-${escapeHtml(block.truthLabel.toLowerCase().replace(/_/g, "-"))}">${escapeHtml(block.truthLabel === "VALIDATION_STAGE" ? "Validation stage" : "Inferred")}</span>`;
  const items = (block: LaunchSitePresentationBlock) =>
    block.items.length ? `<ul>${list(block.items)}</ul>` : "";
  const proofItems = presentation.proofItems.map(item =>
    `<li class="proof-item"><span class="proof-label proof-${escapeHtml(item.label.toLowerCase().replace(/_/g, "-"))}">${escapeHtml(item.label === "TEST" ? "Test" : "Proof to earn")}</span><span>${escapeHtml(item.text)}</span></li>`,
  ).join("");
  const artifactSteps = presentation.artifactSteps.map((step, index) =>
    `<li><span>${String(index + 1).padStart(2, "0")}</span><strong>${escapeHtml(step)}</strong></li>`,
  ).join("");
  const faq = config.faq.map(item =>
    `<details><summary>${escapeHtml(item.question)}</summary><p>${escapeHtml(item.answer)}</p></details>`,
  ).join("");
  const hero = byJob("hero");
  const promise = byJob("specific_promise");
  const qualifier = byJob("customer_qualifier");
  const pain = byJob("pain_cost");
  const mechanism = byJob("mechanism");
  const offer = byJob("offer");
  const inclusions = byJob("inclusions");
  const process = byJob("how_it_works");
  const evidence = byJob("evidence_proof");
  const risk = byJob("risk_scope_boundary");
  const cta = byJob("primary_cta");
  const objections = byJob("objections");
  const final = byJob("faq_final_cta");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(presentation.title)}</title><meta name="description" content="${escapeHtml(presentation.description)}"><style>
:root{--ink:#11231c;--paper:#f5efe3;--cream:#fffaf0;--rust:#a84225;--rust-dark:#7d2f1b;--gold:#f0c86c;--line:#d8cfbd;--muted:#536158;--focus:#087e8b}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.5 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}a{color:inherit}.skip-link{position:fixed;left:12px;top:-80px;z-index:20;background:#fff;color:var(--ink);padding:12px 18px;border:3px solid var(--focus);border-radius:8px}.skip-link:focus{top:12px}.site-header{max-width:1180px;margin:auto;min-height:56px;padding:12px 24px;display:flex;align-items:center;justify-content:space-between;font-weight:800}.site-header a{text-decoration:none}.header-cta{min-height:44px;display:inline-flex;align-items:center;padding:8px 14px;border:1px solid var(--ink);border-radius:999px;font-size:.875rem}main{max-width:1180px;margin:auto;padding:0 24px 48px}.conversion-job{scroll-margin-top:16px}.eyebrow{margin:0 0 8px;text-transform:uppercase;letter-spacing:.12em;font-size:.75rem;font-weight:900;color:var(--rust)}.truth{display:inline-flex;align-items:center;min-height:28px;padding:4px 9px;border:1px solid currentColor;border-radius:999px;text-transform:uppercase;letter-spacing:.08em;font-size:.6875rem;font-weight:900}.truth-validation-stage{color:#6b4a00;background:#fff3ca}.hero{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(300px,.8fr);gap:36px;align-items:center;min-height:calc(100vh - 72px);max-height:760px;padding:30px 0 36px}.hero-copy{align-self:center}.hero h1{max-width:760px;margin:8px 0 12px;font-size:clamp(2.65rem,4.7vw,4.5rem);line-height:.96;letter-spacing:-.045em}.hero-subhead{max-width:690px;margin:0 0 16px;font-size:1.05rem;color:#33443b}.hero-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.button{min-height:48px;display:inline-flex;align-items:center;justify-content:center;padding:11px 18px;border:2px solid transparent;border-radius:9px;font-weight:850;text-decoration:none}.button-primary{background:var(--rust);color:#fff}.button-primary:hover{background:var(--rust-dark)}.button-secondary{border-color:var(--ink);background:transparent}.offer-meta{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0 0}.offer-meta span{padding:7px 10px;background:#fff;border:1px solid var(--line);border-radius:8px;font-size:.875rem}.artifact-window{background:var(--ink);color:#fff;border-radius:18px;box-shadow:0 18px 44px #463d2b2b;overflow:hidden}.artifact-bar{display:flex;gap:6px;align-items:center;min-height:38px;padding:8px 14px;background:#20352c;font-size:.75rem;color:#d8e3dc}.artifact-bar i{width:8px;height:8px;border-radius:50%;background:var(--gold)}.artifact-window ol{list-style:none;margin:0;padding:12px 16px 16px}.artifact-window li{display:grid;grid-template-columns:30px 1fr;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid #ffffff24;font-size:.84rem;line-height:1.25}.artifact-window li:last-child{border-bottom:0}.artifact-window li span{color:var(--gold);font:800 .72rem/1 ui-monospace,monospace}.promise-band{margin:10px 0 28px;padding:28px 34px;background:var(--ink);color:#fff;border-radius:18px;display:grid;grid-template-columns:.45fr 1fr;gap:26px;align-items:center}.promise-band .eyebrow{color:var(--gold)}.promise-band h2,.section-heading h2,.offer-panel h2,.cta-panel h2{margin:0;font-size:clamp(1.75rem,3vw,2.8rem);line-height:1.05;letter-spacing:-.025em}.promise-band p:last-child{margin:8px 0 0;color:#d7e2dc}.section{padding:54px 0;border-top:1px solid var(--line)}.section-heading{max-width:760px;margin-bottom:24px}.section-heading h2{margin-top:8px}.section-heading>p:last-child{color:var(--muted)}.two-column{display:grid;grid-template-columns:1fr 1fr;gap:18px}.panel{padding:24px;border:1px solid var(--line);border-radius:14px;background:var(--cream)}.panel-accent{background:#fff0c8}.panel h3{margin:0 0 8px;font-size:1.15rem}.panel p{margin:0 0 10px}.panel ul,.section ul{margin:10px 0 0;padding-left:20px}.panel li,.section li{margin:6px 0}.mechanism-track{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:20px}.mechanism-track div{min-height:112px;padding:18px;background:#fff;border-top:5px solid var(--gold);border-radius:8px}.mechanism-track span{display:block;color:var(--rust);font-weight:900;margin-bottom:8px}.offer-panel{display:grid;grid-template-columns:1fr auto;gap:30px;align-items:center;padding:34px;background:#fff;border:2px solid var(--ink);border-radius:18px}.price{font-size:clamp(2.2rem,5vw,4.2rem);font-weight:950;letter-spacing:-.05em;white-space:nowrap}.deliverables{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;list-style:none;padding:0!important}.deliverables li{margin:0;padding:18px;background:#fff;border-left:4px solid var(--rust);border-radius:7px}.steps{counter-reset:step;display:grid;grid-template-columns:repeat(2,1fr);gap:14px;list-style:none;padding:0!important}.steps li{counter-increment:step;margin:0;padding:20px 20px 20px 58px;position:relative;background:var(--cream);border:1px solid var(--line);border-radius:12px}.steps li:before{content:counter(step);position:absolute;left:18px;top:19px;width:28px;height:28px;display:grid;place-items:center;background:var(--ink);color:#fff;border-radius:50%;font-weight:900}.proof-section{padding:40px;background:#fff1bf;border-radius:18px;border:1px solid #dab75b}.proof-list{display:grid;grid-template-columns:1fr 1fr;gap:12px;list-style:none;padding:0!important}.proof-item{margin:0!important;padding:16px;background:#fffcf3;border:1px solid #dccb96;border-radius:10px}.proof-label{display:block;width:max-content;margin-bottom:7px;padding:3px 7px;border-radius:5px;background:var(--ink);color:#fff;text-transform:uppercase;letter-spacing:.06em;font-size:.6875rem;font-weight:900}.proof-proof-to-earn{background:#6b4a00}.no-outcomes{font-weight:900}.cta-panel{padding:36px;background:var(--rust);color:#fff;border-radius:18px;display:grid;grid-template-columns:1fr auto;gap:24px;align-items:center}.cta-panel .eyebrow{color:#ffe4a3}.cta-panel .button{background:#fff;color:var(--ink)}details{border-top:1px solid var(--line)}summary{min-height:48px;padding:13px 4px;display:flex;align-items:center;font-weight:800;cursor:pointer}details p{margin:0;padding:0 4px 16px;color:var(--muted)}.final-grid{display:grid;grid-template-columns:.85fr 1.15fr;gap:28px}.lead-form{padding:24px;background:#fff;border:2px solid var(--ink);border-radius:16px}.lead-form label:not(.consent){display:block;font-weight:750;margin-bottom:12px}.lead-form input,.lead-form textarea{display:block;width:100%;min-height:46px;margin-top:5px;padding:10px 12px;border:1px solid #7d877f;border-radius:7px;font:inherit}.lead-form textarea{min-height:86px;resize:vertical}.consent{display:grid;grid-template-columns:24px 1fr;gap:9px;align-items:start;margin:12px 0}.consent input{width:22px;height:22px;margin:1px 0}.lead-form button{width:100%;min-height:48px;border:0;border-radius:8px;background:var(--rust);color:#fff;font:850 1rem/1.2 inherit;padding:12px}.lead-form button[disabled]{opacity:.62;cursor:wait}.form-message{min-height:24px;margin:12px 0 0;font-weight:800}.site-footer{max-width:1180px;margin:auto;padding:22px 24px 36px;border-top:1px solid var(--line);display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap;font-size:.875rem;color:var(--muted)}.site-footer nav{display:flex;gap:16px}:focus-visible{outline:3px solid var(--focus);outline-offset:3px}@media(max-width:720px){.site-header{min-height:48px;padding:8px 16px}.header-cta{display:none}main{padding:0 16px 36px}.hero{display:flex;flex-direction:column;align-items:stretch;gap:12px;min-height:auto;max-height:none;padding:12px 0 22px}.hero h1{margin:5px 0 8px;font-size:clamp(2.375rem,10.2vw,3rem);line-height:.98}.hero-subhead{font-size:1rem;line-height:1.38;margin-bottom:10px}.hero-actions{display:grid;grid-template-columns:1fr}.button{min-height:46px;padding:9px 12px}.button-secondary{min-height:44px}.offer-meta{margin-top:10px;display:grid;grid-template-columns:auto 1fr}.offer-meta span{padding:6px 8px;font-size:.78rem}.artifact-window{border-radius:12px}.artifact-window ol{display:grid;grid-template-columns:1fr 1fr;padding:8px 12px}.artifact-window li{padding:7px 4px;font-size:.7rem;grid-template-columns:22px 1fr}.promise-band,.two-column,.offer-panel,.mechanism-track,.deliverables,.steps,.proof-list,.cta-panel,.final-grid{grid-template-columns:1fr}.promise-band{padding:24px}.section{padding:38px 0}.section-heading{margin-bottom:18px}.offer-panel,.proof-section,.cta-panel{padding:24px}.price{font-size:2.5rem}.cta-panel .button{width:100%}}@media(max-width:400px){body{font-size:16px}.site-header,main{padding-left:12px;padding-right:12px}.hero{gap:8px;padding-top:8px}.hero h1{font-size:2.375rem}.hero-subhead{line-height:1.3}.artifact-window li{padding:5px 3px}.artifact-bar{min-height:30px;padding:5px 10px}.offer-meta{gap:6px}.offer-meta span{font-size:.72rem}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*:before,*:after{animation-duration:.01ms!important;transition-duration:.01ms!important}}
@media(max-width:400px){.site-header{min-height:42px}.hero{gap:5px;padding-top:2px;padding-bottom:10px}.hero h1{font-size:2.25rem}.hero-subhead{line-height:1.24;margin-bottom:5px}.hero-actions{gap:6px}.button{min-height:44px;padding:8px 12px}.artifact-window ol{max-height:76px}.artifact-window li{padding:2px 3px;font-size:.64rem;line-height:1.12}.artifact-window li strong{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}.artifact-bar{min-height:26px;padding:3px 10px}.offer-meta{gap:5px;margin-top:5px}.offer-meta span{font-size:.7rem;padding:4px 6px}}
</style></head><body><a class="skip-link" href="#main">Skip to main content</a><header class="site-header"><a href="#main" aria-label="${escapeHtml(presentation.businessName)} home">${escapeHtml(presentation.businessName)}</a><a class="header-cta" href="#contact">${escapeHtml(presentation.primaryCta)}</a></header><main id="main">
<section class="conversion-job hero" data-conversion-job="hero" aria-labelledby="hero-title"><div class="hero-copy"><p class="eyebrow">For ${escapeHtml(presentation.customer)}</p><h1 id="hero-title">${escapeHtml(hero.heading)}</h1><p class="hero-subhead">${escapeHtml(hero.body)}</p><div class="hero-actions"><a class="button button-primary" data-primary-cta href="#contact">${escapeHtml(presentation.primaryCta)}</a><a class="button button-secondary" data-secondary-cta href="#scope">${escapeHtml(presentation.secondaryCta)}</a></div><p class="offer-meta"><span><strong>${escapeHtml(presentation.price)}</strong></span><span>${escapeHtml(presentation.timeline)}</span></p></div><aside class="artifact-window" data-product-artifact aria-label="Offer artifact preview"><div class="artifact-bar"><i></i><span>Bounded delivery record</span></div><ol>${artifactSteps}</ol></aside></section>
<section class="conversion-job promise-band" data-conversion-job="specific_promise" aria-labelledby="promise-title"><div><p class="eyebrow">${escapeHtml(promise.eyebrow)}</p>${truth(promise)}</div><div><h2 id="promise-title">${escapeHtml(promise.heading)}</h2><p>${escapeHtml(promise.body)}</p></div></section>
<section class="conversion-job section" data-conversion-job="customer_qualifier" aria-labelledby="qualifier-title"><div class="section-heading"><p class="eyebrow">${escapeHtml(qualifier.eyebrow)}</p><h2 id="qualifier-title">${escapeHtml(qualifier.heading)}</h2><p>${escapeHtml(qualifier.body)}</p></div><div class="two-column"><div class="panel panel-accent"><h3>Built for</h3>${items(qualifier)}</div><div class="panel"><h3>Not for</h3><ul>${list(config.positioning.notFor)}</ul></div></div></section>
<section class="conversion-job section" data-conversion-job="pain_cost" aria-labelledby="pain-title"><div class="section-heading"><p class="eyebrow">${escapeHtml(pain.eyebrow)}</p><h2 id="pain-title">${escapeHtml(pain.heading)}</h2><p>${escapeHtml(pain.body)}</p></div><div class="two-column"><div class="panel"><h3>Observed friction to test</h3>${items(pain)}</div><div class="panel panel-accent"><h3>Current alternative</h3><p>${escapeHtml(blueprint.landingPageCopy.currentAlternativeSection)}</p></div></div></section>
<section class="conversion-job section" data-conversion-job="mechanism" aria-labelledby="mechanism-title"><div class="section-heading"><p class="eyebrow">${escapeHtml(mechanism.eyebrow)}</p><h2 id="mechanism-title">${escapeHtml(mechanism.heading)}</h2><p>${escapeHtml(mechanism.body)}</p></div><div class="mechanism-track" aria-label="Delivery mechanism">${presentation.artifactSteps.map((step,index)=>`<div><span>${String(index+1).padStart(2,"0")}</span>${escapeHtml(step)}</div>`).join("")}</div></section>
<section class="conversion-job section" data-conversion-job="offer" aria-labelledby="offer-title"><div class="offer-panel"><div><p class="eyebrow">${escapeHtml(offer.eyebrow)}</p><h2 id="offer-title">${escapeHtml(presentation.offerName)}</h2><p>${escapeHtml(offer.body)}</p><p>${escapeHtml(presentation.priceExplanation)}</p></div><div><div class="price">${escapeHtml(presentation.price)}</div><a class="button button-primary" href="#contact">${escapeHtml(presentation.primaryCta)}</a></div></div></section>
<section id="scope" class="conversion-job section" data-conversion-job="inclusions" aria-labelledby="scope-title"><div class="section-heading"><p class="eyebrow">${escapeHtml(inclusions.eyebrow)}</p><h2 id="scope-title" tabindex="-1">${escapeHtml(inclusions.heading)}</h2><p>${escapeHtml(inclusions.body)}</p></div><ul class="deliverables">${list(inclusions.items)}</ul></section>
<section class="conversion-job section" data-conversion-job="how_it_works" aria-labelledby="process-title"><div class="section-heading"><p class="eyebrow">${escapeHtml(process.eyebrow)}</p><h2 id="process-title">${escapeHtml(process.heading)}</h2><p>${escapeHtml(process.body)} ${escapeHtml(presentation.timeline)}</p></div><ol class="steps">${process.items.map(item=>`<li>${escapeHtml(item)}</li>`).join("")}</ol></section>
<section class="conversion-job section proof-section" data-conversion-job="evidence_proof" aria-labelledby="proof-title"><div class="section-heading"><p class="eyebrow">${escapeHtml(evidence.eyebrow)}</p>${truth(evidence)}<h2 id="proof-title">${escapeHtml(evidence.heading)}</h2><p>${escapeHtml(evidence.body)}</p><p class="no-outcomes">${escapeHtml(presentation.verifiedOutcomeNotice)}</p></div><ul class="proof-list">${proofItems}</ul></section>
<section class="conversion-job section" data-conversion-job="risk_scope_boundary" aria-labelledby="risk-title"><div class="section-heading"><p class="eyebrow">${escapeHtml(risk.eyebrow)}</p>${truth(risk)}<h2 id="risk-title">${escapeHtml(risk.heading)}</h2><p>${escapeHtml(risk.body)}</p></div><div class="two-column"><div class="panel"><h3>Excluded</h3><ul>${list(presentation.exclusions)}</ul></div><div class="panel"><h3>Buyer responsibilities</h3><ul>${list(blueprint.offer.buyerResponsibilities)}</ul></div></div></section>
<section class="conversion-job section" data-conversion-job="primary_cta" aria-labelledby="cta-title"><div class="cta-panel"><div><p class="eyebrow">${escapeHtml(cta.eyebrow)}</p><h2 id="cta-title">${escapeHtml(cta.heading)}</h2><p>${escapeHtml(cta.body)}</p></div><a class="button" href="#contact">${escapeHtml(presentation.primaryCta)}</a></div></section>
<section class="conversion-job section" data-conversion-job="objections" aria-labelledby="objections-title"><div class="section-heading"><p class="eyebrow">${escapeHtml(objections.eyebrow)}</p><h2 id="objections-title">${escapeHtml(objections.heading)}</h2><p>${escapeHtml(objections.body)}</p></div><div class="two-column"><div class="panel"><h3>Current alternative</h3><p>${escapeHtml(blueprint.landingPageCopy.currentAlternativeSection)}</p></div><div class="panel panel-accent"><h3>Bounded mechanism</h3><p>${escapeHtml(config.positioning.differentiator)}</p></div></div></section>
<section class="conversion-job section" data-conversion-job="faq_final_cta" aria-labelledby="final-title"><div class="section-heading"><p class="eyebrow">${escapeHtml(final.eyebrow)}</p><h2 id="final-title">${escapeHtml(final.heading)}</h2><p>${escapeHtml(final.body)}</p></div><div class="final-grid"><div aria-label="Frequently asked questions">${faq}</div><form id="contact" class="lead-form" data-lead-form aria-labelledby="form-title"><h3 id="form-title" tabindex="-1">${escapeHtml(presentation.primaryCta)}</h3><label>Email<input name="email" type="email" autocomplete="email" required maxlength="254"></label><label>Name<input name="name" autocomplete="name" maxlength="120"></label><label>Message<textarea name="message" maxlength="2000"></textarea></label><label class="consent"><input name="consent" type="checkbox" required><span>${escapeHtml(presentation.formConsent)}</span></label><button type="submit">${escapeHtml(config.leadCapture.buttonLabel)}</button><p class="form-message" data-message role="status" aria-live="polite" tabindex="-1"></p></form></div></section>
</main><footer class="site-footer"><span>${escapeHtml(presentation.businessName)} · Validation-stage offer</span><nav aria-label="Legal"><a href="/privacy">Privacy policy</a><a href="/terms">Terms of service</a><span>Validation disclaimer</span></nav></footer><script>document.querySelectorAll('a[href="#contact"]').forEach(function(link){link.addEventListener('click',function(){setTimeout(function(){document.querySelector('#form-title').focus()},0)})});document.querySelector('[data-secondary-cta]').addEventListener('click',function(){setTimeout(function(){document.querySelector('#scope-title').focus()},0)});document.querySelector('[data-lead-form]').addEventListener('submit',async function(e){e.preventDefault();const f=e.currentTarget,m=f.querySelector('[data-message]'),button=f.querySelector('button[type="submit"]');f.setAttribute('aria-busy','true');button.disabled=true;m.setAttribute('role','status');m.textContent='Sending request…';try{const r=await fetch('/api/launch-sites/${encodeURIComponent(slug)}/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:f.email.value,name:f.name.value,message:f.message.value,consent:f.consent.checked})});const b=await r.json();m.setAttribute('role',r.ok?'status':'alert');m.textContent=b.message||b.error||(r.ok?'Request received.':'Request could not be sent.');if(r.ok)f.reset()}catch(error){m.setAttribute('role','alert');m.textContent='Request could not be sent. Please try again.'}finally{f.removeAttribute('aria-busy');button.disabled=false;m.focus()}})</script></body></html>`;
}