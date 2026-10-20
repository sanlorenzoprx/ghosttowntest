import { useEffect, useMemo, useRef, useState } from "react";
import { apiUrl, authHeaders } from "../lib/api";
import type { GhostTownLaunchBlueprintV21 } from "../types/launchBlueprintV21";
import GetMeLiveUpsell from "./GetMeLiveUpsell";
import SprintShareMoment from "./SprintShareMoment";
import SprintWebsiteEvidence from "./SprintWebsiteEvidence";
import CommunityResearchCards from "./CommunityResearchCards";
import { researchEvidenceRole, RESEARCH_EVIDENCE_ROLE_LABELS } from "../api/researchEvidenceRole";
import type { Locale } from "../lib/locale";
import type { TruthLabel } from "../types/paidTest";
import type { BusinessModelExecutionLane } from "../types/launchBlueprintV21";
import type { CurrentActivityStatus, DistributionTargetType, EvidenceRecency, ResearchConfidence, ResearchEvidenceRole } from "../types/launchBlueprint";

export type EvidenceStrength = "strong" | "moderate" | "early" | "weak";
export type PrimaryConstraint = "customer" | "urgency" | "access" | "trust" | "offer" | "fulfillment" | "price" | "message" | "missing_evidence" | "none";

export interface EvidenceLedgerEntryV21 {
  entryId: string;
  blueprintId?: string;
  blueprintVersion?: string;
  actionId?: string;
  checkpointId?: string;
  createdAt?: string;
  contactOrChannel: string;
  date: string;
  action: string;
  response: string;
  customerLanguage: string;
  alternativeMentioned: string;
  objection: string;
  commitmentOffered: string;
  commitmentReceived: string;
  revenueCents: number;
  founderMinutes: number;
  variableCostCents: number;
  followUpDate: string;
  evidenceStrength: EvidenceStrength;
  sourceNote: string;
}

export interface CheckpointReviewV21 {
  dayNumber: 7 | 14 | 21 | 30;
  completedAt: string;
  answers: Record<string, string>;
  evidenceSummary: string;
  strongestEvidence: EvidenceStrength | "none";
  primaryConstraint: PrimaryConstraint;
  nextAction: string;
  blueprintVersionId?: string;
}

export interface ReminderPreferencesV21 {
  dailyAction: boolean;
  followUps: boolean;
  checkpoints: boolean;
  preferredHourLocal: number;
}

export interface ScheduledReminderV21 {
  reminderId: string;
  blueprintId: string;
  blueprintVersion: string;
  kind: "daily_action" | "follow_up" | "checkpoint";
  dueAt: string;
  actionId?: string;
  entryId?: string;
  checkpointId?: string;
  status: "pending" | "done" | "dismissed";
}

export type ReminderTargetV21 =
  | { kind: "action"; dayNumber: number }
  | { kind: "entry"; entryId: string }
  | { kind: "checkpoint"; dayNumber: 7 | 14 | 21 | 30 }
  | { kind: "unresolved" };

function actionDayFromId(actionId: string | undefined): number | null {
  const match = actionId?.match(/^day-(\d{1,2})$/);
  const day = match ? Number(match[1]) : 0;
  return Number.isInteger(day) && day >= 1 && day <= 30 ? day : null;
}

function checkpointDayFromId(checkpointId: string | undefined): 7 | 14 | 21 | 30 | null {
  const match = checkpointId?.match(/^day-(7|14|21|30)$/);
  return match ? Number(match[1]) as 7 | 14 | 21 | 30 : null;
}

export function resolveReminderTarget(reminder: ScheduledReminderV21): ReminderTargetV21 {
  if (reminder.kind === "follow_up" && reminder.entryId) return { kind: "entry", entryId: reminder.entryId };
  const checkpointDay = checkpointDayFromId(reminder.checkpointId);
  if (reminder.kind === "checkpoint" && checkpointDay) return { kind: "checkpoint", dayNumber: checkpointDay };
  const actionDay = actionDayFromId(reminder.actionId);
  if (actionDay) return { kind: "action", dayNumber: actionDay };
  if (reminder.entryId) return { kind: "entry", entryId: reminder.entryId };
  if (checkpointDay) return { kind: "checkpoint", dayNumber: checkpointDay };
  return { kind: "unresolved" };
}

export function describeReminderReference(reminder: ScheduledReminderV21, locale: Locale = "en"): string {
  const t = COPY[locale].reminderRef;
  const target = resolveReminderTarget(reminder);
  if (target.kind === "action") return t.action(target.dayNumber);
  if (target.kind === "entry") return t.entry(target.entryId);
  if (target.kind === "checkpoint") return t.checkpoint(target.dayNumber);
  return t.unavailable;
}

export function checkpointReminderDueAt(
  blueprintCreatedAt: string,
  dayNumber: 7 | 14 | 21 | 30,
  preferredHourLocal: number,
  now = new Date()
): string {
  const created = new Date(blueprintCreatedAt);
  if (Number.isNaN(created.getTime())) return new Date(now.getTime() + 5 * 60 * 1000).toISOString();
  const due = new Date(created);
  due.setDate(created.getDate() + dayNumber - 1);
  due.setHours(Math.min(23, Math.max(0, Math.floor(preferredHourLocal))), 0, 0, 0);
  if (due.getTime() <= now.getTime()) return new Date(now.getTime() + 5 * 60 * 1000).toISOString();
  return due.toISOString();
}

export interface BlueprintProgressV21 {
  completedDays: number[];
  evidenceNotes: Record<string, string>;
  evidenceLedger: EvidenceLedgerEntryV21[];
  checkpointReviews: CheckpointReviewV21[];
  reminderPreferences?: ReminderPreferencesV21;
  scheduledReminders?: ScheduledReminderV21[];
  /** Customer working copies only; canonical Blueprint assets are never mutated. */
  assetDrafts?: Array<{ assetId: string; blueprintId: string; blueprintVersion: string; sourceAssetVersion: string; content: string; updatedAt: string }>;
  metrics: {
    outreachSent: number;
    replies: number;
    interviews: number;
    qualifiedConversations: number;
    commitments: number;
    revenueCents: number;
    founderMinutes: number;
    variableCostCents: number;
    leads: number;
  };
  finalDecision?: string;
  updatedAt: string;
}

export interface BlueprintV21Payload {
  blueprint: GhostTownLaunchBlueprintV21;
  progress: BlueprintProgressV21;
  research: {
    provider: string;
    model: string;
    completedAt: string;
    attemptedSourceCount: number;
    successfulSourceCount: number;
    sourceTypeCount: number;
    verifiedChannelCount: number;
    [key: string]: unknown;
  };
}

type Tab = "overview" | "audit" | "research" | "revenue" | "fulfillment" | "today" | "record" | "followups" | "evidence" | "review" | "reminders" | "calendar";

const TAB_ORDER: Tab[] = ["overview", "today", "record", "followups", "evidence", "review", "reminders", "audit", "research", "revenue", "fulfillment", "calendar"];

type FounderConstraintKey = keyof GhostTownLaunchBlueprintV21["startingStateAudit"]["founderConstraints"];
type ReminderKind = ScheduledReminderV21["kind"];
type ReminderStatus = ScheduledReminderV21["status"];
type Effort = GhostTownLaunchBlueprintV21["dailyCalendar"][number]["estimatedEffort"];

interface Copy {
  tabs: Record<Tab, string>;
  reminderRef: { action: (day: number) => string; entry: (id: string) => string; checkpoint: (day: number) => string; unavailable: string };
  // Header and save state
  backToDashboard: string;
  kicker: string;
  daysProgress: (done: number, percent: number) => string;
  saving: string;
  syncNeeded: string;
  savedAt: (when: string) => string;
  sectionLabel: string;
  sectionsNav: string;
  restoredLocal: string;
  saveFailed: string;
  notSynced: string;
  retrySave: string;
  // Shared labels
  truthLabels: Record<TruthLabel, string>;
  truthAria: (label: string) => string;
  dayLabel: (day: number) => string;
  blueprintVersion: (version: string) => string;
  minutes: (count: number) => string;
  efforts: Record<Effort, string>;
  effortChip: (effort: string) => string;
  minutesAndEffort: (count: number, effort: string) => string;
  whyItMatters: string;
  requiredActions: string;
  preparedAssets: string;
  evidenceToRecord: string;
  branchRule: string;
  markComplete: string;
  markIncomplete: string;
  completedCheck: string;
  copy: string;
  edit: string;
  strengthOptions: Record<EvidenceStrength, string>;
  strengthBadge: Record<EvidenceStrength, string>;
  // Overview
  launchCard: string;
  firstCustomer: string;
  firstOffer: string;
  founderTime: string;
  hours: (count: number) => string;
  testCash: string;
  exactFirstMessage: string;
  copyMessage: string;
  firstCommitment: string;
  approach: (n: number) => string;
  openPublicPath: string;
  day30Requirement: string;
  optionalNextStep: string;
  noWebsite: string;
  // Starting state
  existingOffer: string;
  existingSite: string;
  previousOutreach: string;
  existingContacts: string;
  fulfillmentReadiness: string;
  skillsAndAssets: string;
  founderConstraints: string;
  constraintLabels: Record<FounderConstraintKey, string>;
  verifiedRegister: string;
  inferenceRegister: string;
  criticalTests: string;
  criticalTest: (n: number) => string;
  evidenceRequired: string;
  ifFalse: string;
  // Research
  researchKicker: string;
  researchHeading: string;
  researchIntro: string;
  roleLabels: Record<ResearchEvidenceRole, string>;
  roleBoundaries: Record<ResearchEvidenceRole, string>;
  targetCount: (count: number) => string;
  noCustomerAccess: string;
  noTargetForRole: string;
  targetTypes: Record<DistributionTargetType, string>;
  targetFallback: string;
  roleBoundary: string;
  evidenceDated: string;
  unknownDate: string;
  recency: Record<EvidenceRecency, string>;
  researchChecked: string;
  currentActivity: string;
  activityStatus: Record<CurrentActivityStatus, string>;
  verifiedOn: (date: string) => string;
  evidenceConfidence: string;
  confidence: Record<ResearchConfidence, string>;
  currentActivityEvidence: string;
  activityNotVerified: string;
  publicPath: string;
  firstAction: string;
  openSource: string;
  // First revenue
  laneKicker: string;
  lanes: Record<BusinessModelExecutionLane, string>;
  firstOfferFormat: string;
  firstBuyer: string;
  firstChannel: string;
  firstPrice: string;
  commitmentMethod: string;
  targetDay: string;
  minimumAsks: string;
  successThreshold: string;
  firstAsk: string;
  copyAsk: string;
  followUpSequence: string;
  // Pilot brief
  briefKicker: string;
  briefTitle: string;
  copyBrief: string;
  problem: string;
  scope: string;
  timeline: string;
  price: string;
  deliverables: string;
  buyerResponsibilities: string;
  proofBoundary: string;
  nextStep: string;
  // Fulfillment
  deliveryTimeline: string;
  capacityPerWeek: string;
  founderHoursGuardrail: string;
  variableCostField: string;
  grossMarginGuardrail: string;
  onboardingSteps: string;
  customerInputs: string;
  communicationPoints: string;
  founderWork: string;
  qualityChecklist: string;
  intentionallyManual: string;
  // Today
  todayDay: (day: number) => string;
  returnToCurrent: string;
  exactTargets: string;
  targetMinimum: (name: string, count: number) => string;
  completeWhen: string;
  deliverableColon: string;
  successMeasureColon: string;
  failureThreshold: string;
  executionNote: string;
  notePlaceholder: string;
  recordWhatHappened: string;
  remindLater: string;
  // Execution assets
  assetsAria: string;
  finishedAsset: (day: number) => string;
  lineage: (id: string) => string;
  open: string;
  close: string;
  download: string;
  readableAria: (title: string) => string;
  readableView: string;
  workingCopy: string;
  workingCopyNote: string;
  // Record results
  logKicker: string;
  logHeading: string;
  logIntro: (version: string) => string;
  contactOrChannel: string;
  date: string;
  action: string;
  response: string;
  customerLanguage: string;
  alternativeMentioned: string;
  objection: string;
  commitmentOffered: string;
  commitmentReceived: string;
  revenueOrDeposit: string;
  founderMinutes: string;
  variableCostDollars: string;
  followUpDate: string;
  evidenceStrength: string;
  sourceNote: string;
  saveEntry: string;
  cancelEdit: string;
  // Follow-ups
  followUpsKicker: string;
  followUpsHeading: string;
  noFollowUps: string;
  due: (date: string) => string;
  unlabeledContact: string;
  editResult: string;
  remindMe: string;
  // Evidence
  entries: string;
  commitments: string;
  revenue: string;
  variableCost: string;
  noEvidence: string;
  evidenceEntry: string;
  actionColon: string;
  responseColon: string;
  exactLanguage: string;
  commitmentColon: string;
  // Weekly review
  reviewKicker: string;
  reviewHeading: string;
  reviewIntro: string;
  completed: string;
  notCompleted: string;
  reviewQuestions: string;
  metricSummary: string;
  metricLine: (outreach: number, replies: number, interviews: number, commitments: number, revenue: string) => string;
  strongestEvidence: string;
  noneYet: string;
  primaryConstraint: string;
  constraints: Record<PrimaryConstraint, string>;
  evidenceSummary: string;
  nextAction: string;
  saveReview: (day: number) => string;
  reminderScheduled: string;
  remindForDay: (day: number) => string;
  // Reminders
  remindersKicker: string;
  remindersHeading: string;
  remindersIntro: string;
  reminderPreferences: string;
  reminderPreferencesNote: string;
  scheduleUpcoming: string;
  prefDailyAction: string;
  prefFollowUps: string;
  prefCheckpoints: string;
  preferredHour: string;
  preferredHourAria: string;
  scheduledReminders: string;
  noReminders: string;
  reminderKinds: Record<ReminderKind, string>;
  reminderStatuses: Record<ReminderStatus, string>;
  openReferenced: string;
  markDone: string;
  dismiss: string;
  // Calendar
  estimatedEffort: string;
  deliverable: string;
  successMeasure: string;
}

const COPY: Record<Locale, Copy> = {
  en: {
    tabs: {
      overview: "Overview",
      today: "Today",
      record: "Record Results",
      followups: "Follow-ups",
      evidence: "Evidence",
      review: "Weekly Review",
      reminders: "Reminders",
      audit: "Starting State",
      research: "Research & Access",
      revenue: "First Revenue",
      fulfillment: "Fulfillment",
      calendar: "30-Day Calendar",
    },
    reminderRef: {
      action: day => `Day ${day} action`,
      entry: id => `Recorded result ${id}`,
      checkpoint: day => `Day ${day} checkpoint review`,
      unavailable: "Reference unavailable",
    },
    backToDashboard: "← Dashboard",
    kicker: "Executable Blueprint v2.1",
    daysProgress: (done, percent) => `${done}/30 days · ${percent}%`,
    saving: "Saving…",
    syncNeeded: "Sync needed",
    savedAt: when => `Saved ${when}`,
    sectionLabel: "Blueprint section",
    sectionsNav: "Blueprint sections",
    restoredLocal: "Unsaved local changes were restored. Retry to sync them to your account.",
    saveFailed: "Execution progress could not be saved",
    notSynced: "Changes are saved locally but have not synced.",
    retrySave: "Retry save",
    truthLabels: { Verified: "Verified", Inferred: "Inferred", Test: "Test" },
    truthAria: label => `Truth label: ${label}`,
    dayLabel: day => `Day ${day}`,
    blueprintVersion: version => `Blueprint ${version}`,
    minutes: count => `${count} minutes`,
    efforts: { light: "light", moderate: "moderate", heavy: "heavy" },
    effortChip: effort => `${effort} effort`,
    minutesAndEffort: (count, effort) => `${count} minutes · ${effort}`,
    whyItMatters: "Why it matters",
    requiredActions: "Required actions",
    preparedAssets: "Prepared assets",
    evidenceToRecord: "Evidence to record",
    branchRule: "Branch rule",
    markComplete: "Mark complete",
    markIncomplete: "Mark incomplete",
    completedCheck: "Completed ✓",
    copy: "Copy",
    edit: "Edit",
    strengthOptions: { strong: "Strong", moderate: "Moderate", early: "Early", weak: "Weak" },
    strengthBadge: { strong: "strong", moderate: "moderate", early: "early", weak: "weak" },
    launchCard: "48-hour Launch Card",
    firstCustomer: "First customer",
    firstOffer: "First offer",
    founderTime: "Founder time boundary",
    hours: count => `${count} hours`,
    testCash: "Test cash boundary",
    exactFirstMessage: "Exact first message",
    copyMessage: "Copy message",
    firstCommitment: "First measurable commitment",
    approach: n => `Approach ${n}`,
    openPublicPath: "Open public path ↗",
    day30Requirement: "Day-30 evidence requirement",
    optionalNextStep: "Optional next step",
    noWebsite: "A live website is not part of the $97 Sprint. Get Me Live is a separate $297 one-time product available after you review the evidence and decide to launch.",
    existingOffer: "Existing offer",
    existingSite: "Existing site",
    previousOutreach: "Previous outreach",
    existingContacts: "Customers, audience, contacts or partners",
    fulfillmentReadiness: "Manual fulfillment readiness",
    skillsAndAssets: "Skills and assets",
    founderConstraints: "Founder constraints",
    constraintLabels: { hoursPerWeek: "hours Per Week", testBudget: "test Budget", geography: "geography", language: "language", technicalCapability: "technical Capability" },
    verifiedRegister: "Verified-fact register",
    inferenceRegister: "Inference register",
    criticalTests: "Five critical tests",
    criticalTest: n => `Critical test ${n}`,
    evidenceRequired: "Evidence required:",
    ifFalse: "If false:",
    researchKicker: "Research roles",
    researchHeading: "Know which evidence can actually reach a buyer.",
    researchIntro: "Only Direct Customer Access with current activity independently verified can drive first-revenue outreach. Evidence date and research date are shown separately so an old article cannot look current merely because GhostTown checked it today.",
    roleLabels: RESEARCH_EVIDENCE_ROLE_LABELS,
    roleBoundaries: {
      customer_access: "Use only targets marked verified current for direct customer conversations and first-revenue work. Stale or unverified targets stay visible as supporting evidence but are not acquisition routes.",
      market_evidence: "Use these to understand competitors, alternatives, reviews, and category behavior. Do not treat them as sales channels.",
      media_pr: "Use these for interviews, reviews, awareness, guest content, and PR. Do not treat them as direct buyer access.",
      partnership: "Use these for referrals and complementary relationships. Do not treat them as direct buyer access without separate proof.",
    },
    targetCount: count => `${count} target${count === 1 ? "" : "s"}`,
    noCustomerAccess: "No verified direct customer-access target. This Sprint must not release until GhostTown finds at least three.",
    noTargetForRole: "No source-backed target was retained for this role.",
    targetTypes: { podcast: "podcast", youtube_creator: "youtube creator", newsletter_or_publication: "newsletter or publication", event: "event", association: "association", review_site: "review site", complementary_partner: "complementary partner", community: "community" },
    targetFallback: "target",
    roleBoundary: "Role boundary",
    evidenceDated: "Evidence dated",
    unknownDate: "Unknown",
    recency: { current: "current", recent: "recent", stale: "stale", unknown: "unknown" },
    researchChecked: "Research checked",
    currentActivity: "Current activity",
    activityStatus: { verified_current: "verified current", verified_inactive: "verified inactive", unverified: "unverified" },
    verifiedOn: date => ` · verified ${date}`,
    evidenceConfidence: "Evidence confidence",
    confidence: { high: "high", medium: "medium", low: "low", unverified: "unverified" },
    currentActivityEvidence: "Current activity evidence",
    activityNotVerified: "Current activity was not independently verified.",
    publicPath: "Public path",
    firstAction: "First action",
    openSource: "Open source ↗",
    laneKicker: "Selected execution lane",
    lanes: { service_or_consulting: "service or consulting", saas: "saas", digital_product: "digital product", physical_product: "physical product", marketplace: "marketplace", local_business: "local business", creator_or_media: "creator or media" },
    firstOfferFormat: "First offer format",
    firstBuyer: "First buyer",
    firstChannel: "First channel",
    firstPrice: "First price",
    commitmentMethod: "Commitment method",
    targetDay: "Target day",
    minimumAsks: "Minimum qualified asks",
    successThreshold: "Success threshold",
    firstAsk: "First ask",
    copyAsk: "Copy ask",
    followUpSequence: "Follow-up sequence",
    briefKicker: "Commercial one-pager",
    briefTitle: "Founding Customer Pilot Brief",
    copyBrief: "Copy brief",
    problem: "Problem",
    scope: "Scope",
    timeline: "Timeline",
    price: "Price",
    deliverables: "Deliverables",
    buyerResponsibilities: "Buyer responsibilities",
    proofBoundary: "Proof boundary",
    nextStep: "Next step",
    deliveryTimeline: "Delivery timeline",
    capacityPerWeek: "Capacity/week",
    founderHoursGuardrail: "Founder-hours guardrail",
    variableCostField: "Variable-cost field",
    grossMarginGuardrail: "Gross-margin guardrail",
    onboardingSteps: "Onboarding steps",
    customerInputs: "Required customer inputs",
    communicationPoints: "Communication points",
    founderWork: "Founder work",
    qualityChecklist: "Quality checklist",
    intentionallyManual: "Intentionally manual",
    todayDay: day => `Today · Day ${day}`,
    returnToCurrent: "Return to current action",
    exactTargets: "Exact targets",
    targetMinimum: (name, count) => `${name} (${count} minimum)`,
    completeWhen: "Complete when:",
    deliverableColon: "Deliverable:",
    successMeasureColon: "Success measure:",
    failureThreshold: "Failure threshold:",
    executionNote: "Execution note",
    notePlaceholder: "What happened while you worked this action?",
    recordWhatHappened: "Record what happened",
    remindLater: "Remind me later",
    assetsAria: "Finished execution assets",
    finishedAsset: day => `Finished customer asset - Day ${day}`,
    lineage: id => `Canonical lineage: ${id}; working copies never change the Blueprint.`,
    open: "Open",
    close: "Close",
    download: "Download",
    readableAria: title => `${title} readable view`,
    readableView: "Readable asset view",
    workingCopy: "Working copy",
    workingCopyNote: "(your edit; canonical source remains unchanged)",
    logKicker: "GhostTown Daily Execution Log",
    logHeading: "Record results, not impressions.",
    logIntro: version => `This entry becomes evidence attached to Blueprint ${version}. It cannot silently rewrite the plan.`,
    contactOrChannel: "Contact or channel",
    date: "Date",
    action: "Action",
    response: "Response",
    customerLanguage: "Exact customer language",
    alternativeMentioned: "Alternative mentioned",
    objection: "Objection",
    commitmentOffered: "Commitment offered",
    commitmentReceived: "Commitment received",
    revenueOrDeposit: "Revenue or deposit ($)",
    founderMinutes: "Founder minutes",
    variableCostDollars: "Variable cost ($)",
    followUpDate: "Follow-up date",
    evidenceStrength: "Evidence strength",
    sourceNote: "Source note",
    saveEntry: "Save evidence entry",
    cancelEdit: "Cancel edit",
    followUpsKicker: "Follow-ups",
    followUpsHeading: "Every dated next step in one place.",
    noFollowUps: "No follow-ups are scheduled yet.",
    due: date => `Due ${date}`,
    unlabeledContact: "Unlabeled contact",
    editResult: "Edit result",
    remindMe: "Remind me",
    entries: "Entries",
    commitments: "Commitments",
    revenue: "Revenue",
    variableCost: "Variable cost",
    noEvidence: "No evidence recorded yet. Use Record Results after your next action.",
    evidenceEntry: "Evidence entry",
    actionColon: "Action:",
    responseColon: "Response:",
    exactLanguage: "Exact language:",
    commitmentColon: "Commitment:",
    reviewKicker: "Weekly Review",
    reviewHeading: "Review evidence without rewriting the original Blueprint.",
    reviewIntro: "Any future regeneration must create a new Blueprint version and preserve this evidence chain.",
    completed: "Completed",
    notCompleted: "Not completed",
    reviewQuestions: "Canonical review questions",
    metricSummary: "Current metric summary:",
    metricLine: (outreach, replies, interviews, commitments, revenue) => `${outreach} outreach · ${replies} replies · ${interviews} interviews · ${commitments} commitments · ${revenue} revenue`,
    strongestEvidence: "Strongest evidence",
    noneYet: "None yet",
    primaryConstraint: "Primary constraint",
    constraints: { none: "none", customer: "customer", urgency: "urgency", access: "access", trust: "trust", offer: "offer", fulfillment: "fulfillment", price: "price", message: "message", missing_evidence: "missing evidence" },
    evidenceSummary: "Evidence summary",
    nextAction: "Next action",
    saveReview: day => `Save Day ${day} review`,
    reminderScheduled: "Reminder scheduled",
    remindForDay: day => `Remind me for Day ${day}`,
    remindersKicker: "In-app reminders",
    remindersHeading: "Action, follow-up, checkpoint.",
    remindersIntro: "Every reminder opens its exact Blueprint action, recorded result, or checkpoint review. Email, push, SMS, streaks, and calendar integrations remain deliberately deferred.",
    reminderPreferences: "Reminder preferences",
    reminderPreferencesNote: "Checkpoint reminders use your preferred local hour and retain their exact Blueprint reference.",
    scheduleUpcoming: "Schedule upcoming checkpoint reviews",
    prefDailyAction: "Daily action",
    prefFollowUps: "Follow-ups",
    prefCheckpoints: "Checkpoints",
    preferredHour: "Preferred hour",
    preferredHourAria: "Preferred reminder hour",
    scheduledReminders: "Scheduled reminders",
    noReminders: "No reminders scheduled.",
    reminderKinds: { daily_action: "daily action", follow_up: "follow up", checkpoint: "checkpoint" },
    reminderStatuses: { pending: "pending", done: "done", dismissed: "dismissed" },
    openReferenced: "Open referenced item",
    markDone: "Mark done",
    dismiss: "Dismiss",
    estimatedEffort: "Estimated effort",
    deliverable: "Deliverable",
    successMeasure: "Success measure",
  },
  es: {
    tabs: {
      overview: "Resumen",
      today: "Hoy",
      record: "Anotar resultados",
      followups: "Seguimientos",
      evidence: "Evidencia",
      review: "Repaso semanal",
      reminders: "Recordatorios",
      audit: "Punto de partida",
      research: "Investigación y acceso",
      revenue: "Primeros ingresos",
      fulfillment: "Entrega",
      calendar: "Calendario de 30 días",
    },
    reminderRef: {
      action: day => `Acción del día ${day}`,
      entry: id => `Resultado anotado ${id}`,
      checkpoint: day => `Repaso del día ${day}`,
      unavailable: "No encontramos a qué se refiere",
    },
    backToDashboard: "← Panel",
    kicker: "Blueprint ejecutable v2.1",
    daysProgress: (done, percent) => `${done}/30 días · ${percent}%`,
    saving: "Guardando…",
    syncNeeded: "Falta sincronizar",
    savedAt: when => `Guardado ${when}`,
    sectionLabel: "Sección del Blueprint",
    sectionsNav: "Secciones del Blueprint",
    restoredLocal: "Recuperamos cambios que no se habían guardado. Dale a reintentar para guardarlos en tu cuenta.",
    saveFailed: "No pudimos guardar tu progreso",
    notSynced: "Tus cambios están guardados en este equipo, pero todavía no se han sincronizado.",
    retrySave: "Reintentar guardar",
    truthLabels: { Verified: "Verificado", Inferred: "Deducido", Test: "Por probar" },
    truthAria: label => `Qué tan seguro es: ${label}`,
    dayLabel: day => `Día ${day}`,
    blueprintVersion: version => `Blueprint ${version}`,
    minutes: count => `${count} minutos`,
    efforts: { light: "ligero", moderate: "moderado", heavy: "fuerte" },
    effortChip: effort => `Esfuerzo ${effort}`,
    minutesAndEffort: (count, effort) => `${count} minutos · ${effort}`,
    whyItMatters: "Por qué importa",
    requiredActions: "Lo que tienes que hacer",
    preparedAssets: "Materiales listos",
    evidenceToRecord: "Evidencia que debes anotar",
    branchRule: "Qué hacer según lo que pase",
    markComplete: "Marcar como hecho",
    markIncomplete: "Marcar como pendiente",
    completedCheck: "Hecho ✓",
    copy: "Copiar",
    edit: "Editar",
    strengthOptions: { strong: "Fuerte", moderate: "Moderada", early: "Inicial", weak: "Débil" },
    strengthBadge: { strong: "fuerte", moderate: "moderada", early: "inicial", weak: "débil" },
    launchCard: "Tarjeta de lanzamiento de 48 horas",
    firstCustomer: "Primer cliente",
    firstOffer: "Primera oferta",
    founderTime: "Tiempo máximo para la prueba",
    hours: count => `${count} horas`,
    testCash: "Dinero máximo para la prueba",
    exactFirstMessage: "Primer mensaje exacto",
    copyMessage: "Copiar mensaje",
    firstCommitment: "Primer compromiso que puedes medir",
    approach: n => `Vía ${n}`,
    openPublicPath: "Abrir el enlace público ↗",
    day30Requirement: "Evidencia que necesitas para el día 30",
    optionalNextStep: "Próximo paso opcional",
    noWebsite: "El Sprint de $97 no incluye un sitio web en vivo. Get Me Live es un producto separado de $297, pago único, que puedes pedir después de revisar la evidencia y decidir lanzar.",
    existingOffer: "Oferta que ya tienes",
    existingSite: "Sitio que ya tienes",
    previousOutreach: "Contactos que ya hiciste",
    existingContacts: "Clientes, audiencia, contactos o socios",
    fulfillmentReadiness: "Qué tan listo estás para entregar a mano",
    skillsAndAssets: "Destrezas y recursos",
    founderConstraints: "Tus límites",
    constraintLabels: { hoursPerWeek: "Horas por semana", testBudget: "Presupuesto para la prueba", geography: "Lugar", language: "Idioma", technicalCapability: "Destreza técnica" },
    verifiedRegister: "Datos verificados",
    inferenceRegister: "Lo que deducimos",
    criticalTests: "Cinco pruebas clave",
    criticalTest: n => `Prueba clave ${n}`,
    evidenceRequired: "Evidencia que necesitas:",
    ifFalse: "Si no se cumple:",
    researchKicker: "Tipos de investigación",
    researchHeading: "Sabe qué evidencia te lleva de verdad a un comprador.",
    researchIntro: "Solo los lugares de acceso directo a clientes, con actividad reciente que confirmamos por separado, sirven para buscar tus primeras ventas. Verás la fecha de la evidencia y la fecha en que investigamos por separado, para que un artículo viejo no parezca actual solo porque GhostTown lo revisó hoy.",
    roleLabels: { customer_access: "Acceso a clientes", market_evidence: "Evidencia del mercado", media_pr: "Medios / prensa", partnership: "Alianzas" },
    roleBoundaries: {
      customer_access: "Usa solo los lugares marcados como activos y verificados para hablar directo con clientes y buscar tus primeras ventas. Los que están viejos o sin verificar se quedan a la vista como apoyo, pero no son caminos para conseguir clientes.",
      market_evidence: "Úsalos para entender a la competencia, otras opciones, reseñas y cómo se mueve tu categoría. No son canales de venta.",
      media_pr: "Úsalos para entrevistas, reseñas, darte a conocer, contenido como invitado y prensa. No son acceso directo a compradores.",
      partnership: "Úsalos para referidos y alianzas con negocios que te complementan. No son acceso directo a compradores sin otra prueba aparte.",
    },
    targetCount: count => `${count} ${count === 1 ? "lugar" : "lugares"}`,
    noCustomerAccess: "Todavía no hay un lugar verificado para llegar directo a clientes. Este Sprint no se entrega hasta que GhostTown encuentre por lo menos tres.",
    noTargetForRole: "No se guardó ningún lugar con fuentes para este tipo.",
    targetTypes: { podcast: "podcast", youtube_creator: "creador de YouTube", newsletter_or_publication: "boletín o publicación", event: "evento", association: "asociación", review_site: "sitio de reseñas", complementary_partner: "socio complementario", community: "comunidad" },
    targetFallback: "lugar",
    roleBoundary: "Para qué sirve",
    evidenceDated: "Fecha de la evidencia",
    unknownDate: "Desconocida",
    recency: { current: "actual", recent: "reciente", stale: "vieja", unknown: "sin fecha clara" },
    researchChecked: "Fecha de la investigación",
    currentActivity: "Actividad reciente",
    activityStatus: { verified_current: "activo y verificado", verified_inactive: "inactivo (verificado)", unverified: "sin verificar" },
    verifiedOn: date => ` · verificado el ${date}`,
    evidenceConfidence: "Qué tan confiable es",
    confidence: { high: "alta", medium: "media", low: "baja", unverified: "sin verificar" },
    currentActivityEvidence: "Prueba de actividad reciente",
    activityNotVerified: "No pudimos confirmar por separado que haya actividad reciente.",
    publicPath: "Cómo llegar",
    firstAction: "Primer paso",
    openSource: "Abrir la fuente ↗",
    laneKicker: "Tipo de negocio que vas a probar",
    lanes: { service_or_consulting: "servicio o consultoría", saas: "software por suscripción", digital_product: "producto digital", physical_product: "producto físico", marketplace: "mercado en línea", local_business: "negocio local", creator_or_media: "creador o medio" },
    firstOfferFormat: "Formato de la primera oferta",
    firstBuyer: "Primer comprador",
    firstChannel: "Primer canal",
    firstPrice: "Primer precio",
    commitmentMethod: "Cómo pides el compromiso",
    targetDay: "Día meta",
    minimumAsks: "Mínimo de veces que pides la compra a personas que cualifican",
    successThreshold: "Cuándo cuenta como éxito",
    firstAsk: "Cómo pides la compra la primera vez",
    copyAsk: "Copiar el pedido",
    followUpSequence: "Pasos de seguimiento",
    briefKicker: "Resumen comercial de una página",
    briefTitle: "Propuesta de piloto para clientes fundadores",
    copyBrief: "Copiar propuesta",
    problem: "Problema",
    scope: "Alcance",
    timeline: "Tiempo",
    price: "Precio",
    deliverables: "Lo que se entrega",
    buyerResponsibilities: "Lo que le toca al comprador",
    proofBoundary: "Lo que esto prueba y lo que no",
    nextStep: "Próximo paso",
    deliveryTimeline: "Tiempo de entrega",
    capacityPerWeek: "Capacidad por semana",
    founderHoursGuardrail: "Límite de horas tuyas",
    variableCostField: "Costo variable",
    grossMarginGuardrail: "Margen mínimo",
    onboardingSteps: "Pasos para empezar con cada cliente",
    customerInputs: "Lo que necesitas del cliente",
    communicationPoints: "Cuándo comunicarte con el cliente",
    founderWork: "Tu trabajo",
    qualityChecklist: "Lista de calidad",
    intentionallyManual: "Lo que se hace a mano a propósito",
    todayDay: day => `Hoy · Día ${day}`,
    returnToCurrent: "Volver a la acción de hoy",
    exactTargets: "Metas exactas",
    targetMinimum: (name, count) => `${name} (mínimo ${count})`,
    completeWhen: "Está hecho cuando:",
    deliverableColon: "Entregable:",
    successMeasureColon: "Cómo mides el éxito:",
    failureThreshold: "Cuándo no funcionó:",
    executionNote: "Nota del día",
    notePlaceholder: "¿Qué pasó mientras trabajabas en esta acción?",
    recordWhatHappened: "Anotar lo que pasó",
    remindLater: "Recuérdame más tarde",
    assetsAria: "Materiales terminados",
    finishedAsset: day => `Material terminado para clientes - Día ${day}`,
    lineage: id => `Origen: ${id}; tus copias de trabajo nunca cambian el Blueprint.`,
    open: "Abrir",
    close: "Cerrar",
    download: "Descargar",
    readableAria: title => `Vista para leer: ${title}`,
    readableView: "Vista para leer",
    workingCopy: "Copia de trabajo",
    workingCopyNote: "(tu versión; el original no cambia)",
    logKicker: "Registro diario de GhostTown",
    logHeading: "Anota resultados, no impresiones.",
    logIntro: version => `Esta entrada se guarda como evidencia del Blueprint ${version}. No cambia el plan a escondidas.`,
    contactOrChannel: "Contacto o canal",
    date: "Fecha",
    action: "Acción",
    response: "Respuesta",
    customerLanguage: "Palabras exactas del cliente",
    alternativeMentioned: "Otra opción que mencionó",
    objection: "Objeción",
    commitmentOffered: "Compromiso que ofreciste",
    commitmentReceived: "Compromiso que recibiste",
    revenueOrDeposit: "Ingreso o depósito ($)",
    founderMinutes: "Minutos tuyos",
    variableCostDollars: "Costo variable ($)",
    followUpDate: "Fecha de seguimiento",
    evidenceStrength: "Fuerza de la evidencia",
    sourceNote: "Nota sobre la fuente",
    saveEntry: "Guardar evidencia",
    cancelEdit: "Cancelar cambios",
    followUpsKicker: "Seguimientos",
    followUpsHeading: "Todos tus próximos pasos con fecha, en un solo sitio.",
    noFollowUps: "Todavía no tienes seguimientos programados.",
    due: date => `Para el ${date}`,
    unlabeledContact: "Contacto sin nombre",
    editResult: "Editar resultado",
    remindMe: "Recuérdame",
    entries: "Entradas",
    commitments: "Compromisos",
    revenue: "Ingresos",
    variableCost: "Costo variable",
    noEvidence: "Todavía no hay evidencia anotada. Usa Anotar resultados después de tu próxima acción.",
    evidenceEntry: "Entrada de evidencia",
    actionColon: "Acción:",
    responseColon: "Respuesta:",
    exactLanguage: "Palabras exactas:",
    commitmentColon: "Compromiso:",
    reviewKicker: "Repaso semanal",
    reviewHeading: "Repasa la evidencia sin cambiar el Blueprint original.",
    reviewIntro: "Si en algún momento se genera de nuevo, se crea una versión nueva del Blueprint y esta evidencia se queda guardada.",
    completed: "Hecho",
    notCompleted: "Pendiente",
    reviewQuestions: "Preguntas del repaso",
    metricSummary: "Tus números hasta ahora:",
    metricLine: (outreach, replies, interviews, commitments, revenue) => `${outreach} mensajes enviados · ${replies} respuestas · ${interviews} entrevistas · ${commitments} compromisos · ${revenue} en ingresos`,
    strongestEvidence: "Tu evidencia más fuerte",
    noneYet: "Ninguna todavía",
    primaryConstraint: "Lo que más te frena",
    constraints: { none: "nada", customer: "el cliente", urgency: "la urgencia", access: "llegar a la gente", trust: "la confianza", offer: "la oferta", fulfillment: "la entrega", price: "el precio", message: "el mensaje", missing_evidence: "falta evidencia" },
    evidenceSummary: "Resumen de la evidencia",
    nextAction: "Próxima acción",
    saveReview: day => `Guardar repaso del día ${day}`,
    reminderScheduled: "Recordatorio programado",
    remindForDay: day => `Recuérdame el día ${day}`,
    remindersKicker: "Recordatorios en la app",
    remindersHeading: "Acción, seguimiento, repaso.",
    remindersIntro: "Cada recordatorio te lleva directo a su acción del Blueprint, al resultado que anotaste o al repaso. Por ahora no enviamos email, notificaciones, SMS ni eventos de calendario.",
    reminderPreferences: "Tus preferencias de recordatorios",
    reminderPreferencesNote: "Los recordatorios de repaso usan la hora que prefieras y te llevan a la parte exacta del Blueprint.",
    scheduleUpcoming: "Programar los próximos repasos",
    prefDailyAction: "Acción diaria",
    prefFollowUps: "Seguimientos",
    prefCheckpoints: "Repasos",
    preferredHour: "Hora preferida",
    preferredHourAria: "Hora preferida para recordatorios",
    scheduledReminders: "Recordatorios programados",
    noReminders: "No tienes recordatorios programados.",
    reminderKinds: { daily_action: "acción diaria", follow_up: "seguimiento", checkpoint: "repaso" },
    reminderStatuses: { pending: "pendiente", done: "hecho", dismissed: "descartado" },
    openReferenced: "Abrir",
    markDone: "Marcar como hecho",
    dismiss: "Descartar",
    estimatedEffort: "Esfuerzo estimado",
    deliverable: "Entregable",
    successMeasure: "Cómo mides el éxito",
  },
};

function labelFor<K extends string>(labels: Record<K, string>, value: string): string {
  return (labels as Record<string, string>)[value] ?? value.replace(/_/g, " ");
}

function formatDate(value: string, locale: Locale): string {
  const date = new Date(value);
  return locale === "es" ? date.toLocaleDateString("es-PR") : date.toLocaleDateString();
}

function formatDateTime(value: string, locale: Locale): string {
  const date = new Date(value);
  return locale === "es" ? date.toLocaleString("es-PR") : date.toLocaleString();
}

const emptyEntry = (): EvidenceLedgerEntryV21 => ({
  entryId: "",
  contactOrChannel: "",
  date: new Date().toISOString().slice(0, 10),
  action: "",
  response: "",
  customerLanguage: "",
  alternativeMentioned: "",
  objection: "",
  commitmentOffered: "",
  commitmentReceived: "",
  revenueCents: 0,
  founderMinutes: 0,
  variableCostCents: 0,
  followUpDate: "",
  evidenceStrength: "weak",
  sourceNote: "",
});

export function upsertEvidenceEntry(entries: EvidenceLedgerEntryV21[], entry: EvidenceLedgerEntryV21): EvidenceLedgerEntryV21[] {
  const next = entries.filter(item => item.entryId !== entry.entryId);
  next.push(entry);
  return next.sort((a, b) => `${b.date}:${b.createdAt || ""}`.localeCompare(`${a.date}:${a.createdAt || ""}`));
}

export function upsertCheckpointReview(reviews: CheckpointReviewV21[], review: CheckpointReviewV21): CheckpointReviewV21[] {
  return [...reviews.filter(item => item.dayNumber !== review.dayNumber), review].sort((a, b) => a.dayNumber - b.dayNumber);
}

function dollars(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents || 0) / 100);
}

function truthBadge(label: string, locale: Locale = "en") {
  const t = COPY[locale];
  const shown = labelFor(t.truthLabels, label);
  const symbol = label === "Verified" ? "✓" : label === "Inferred" ? "≈" : "?";
  const style = label === "Verified" ? "border-emerald-300 bg-emerald-50 text-emerald-900" : label === "Inferred" ? "border-amber-300 bg-amber-50 text-amber-900" : "border-slate-300 bg-slate-50 text-slate-800";
  return <span aria-label={t.truthAria(shown)} className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-black ${style}`}><span aria-hidden="true">{symbol}</span>{shown}</span>;
}

function FieldList({ title, items }: { title: string; items: string[] }) {
  return <div><h3 className="font-black">{title}</h3><ul className="mt-2 space-y-2 text-sm text-gray-700">{items.map((item, index) => <li key={`${title}-${index}`}>• {item}</li>)}</ul></div>;
}

function BranchLine({ condition, action, locale }: { condition: string; action: string; locale: Locale }) {
  if (locale === "es") return <p className="mt-2 text-sm"><strong>SI</strong> {condition} <strong>ENTONCES</strong> {action}</p>;
  return <p className="mt-2 text-sm"><strong>IF</strong> {condition} <strong>THEN</strong> {action}</p>;
}

function PilotBrief({ blueprint, onCopy, locale = "en" }: { blueprint: GhostTownLaunchBlueprintV21; onCopy: (text: string) => void; locale?: Locale }) {
  const t = COPY[locale];
  const brief = blueprint.foundingCustomerPilotBrief;
  const text = [t.briefTitle, `${t.problem}: ${brief.problem}`, `${t.scope}: ${brief.scope}`, `${t.deliverables}:`, ...brief.deliverables.map(item => `- ${item}`), `${t.timeline}: ${brief.timeline}`, `${t.price}: ${brief.price}`, `${t.buyerResponsibilities}:`, ...brief.buyerResponsibilities.map(item => `- ${item}`), `${t.proofBoundary}: ${brief.proofBoundary}`, `${t.nextStep}: ${brief.nextStep}`].join("\n");
  return <article className="rounded-2xl border border-black/10 bg-white p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-ghost-rust">{t.briefKicker}</p><h2 className="mt-1 text-2xl font-black">{t.briefTitle}</h2></div><button onClick={() => onCopy(text)} className="rounded-lg border border-ghost-rust px-3 py-2 text-sm font-black text-ghost-rust">{t.copyBrief}</button></div><dl className="mt-5 grid gap-4 md:grid-cols-2"><div><dt className="font-black">{t.problem}</dt><dd className="mt-1 text-sm text-gray-700">{brief.problem}</dd></div><div><dt className="font-black">{t.scope}</dt><dd className="mt-1 text-sm text-gray-700">{brief.scope}</dd></div><div><dt className="font-black">{t.timeline}</dt><dd className="mt-1 text-sm text-gray-700">{brief.timeline}</dd></div><div><dt className="font-black">{t.price}</dt><dd className="mt-1 text-sm text-gray-700">{brief.price}</dd></div></dl><div className="mt-5 grid gap-5 md:grid-cols-2"><FieldList title={t.deliverables} items={brief.deliverables} /><FieldList title={t.buyerResponsibilities} items={brief.buyerResponsibilities} /></div><p className="mt-5 rounded-xl bg-[#fff7f2] p-4 text-sm"><strong>{t.proofBoundary}:</strong> {brief.proofBoundary}</p></article>;
}

function assetFilename(title: string, contentType: string) {
  const suffix = contentType === 'text/csv' ? 'csv' : contentType === 'text/plain' ? 'txt' : 'md';
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}.${suffix}`;
}

function downloadAsset(title: string, content: string, contentType: string) {
  const blob = new Blob([content], { type: `${contentType};charset=utf-8` });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = assetFilename(title, contentType);
  anchor.click();
  URL.revokeObjectURL(href);
}

export default function LaunchBlueprintViewV21({ orderId, onBack, initialPayload, initialActionDay, locale = "en" }: { orderId: string; onBack: () => void; initialPayload: BlueprintV21Payload; initialActionDay?: number; locale?: Locale }) {
  const t = COPY[locale];
  const [payload, setPayload] = useState(initialPayload);
  const [tab, setTab] = useState<Tab>("overview");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [saveError, setSaveError] = useState("");
  const [entryDraft, setEntryDraft] = useState<EvidenceLedgerEntryV21>(emptyEntry());
  const [checkpointDrafts, setCheckpointDrafts] = useState<Record<number, Partial<CheckpointReviewV21>>>({});
  // Opened from a specific day, the workspace records evidence and reviews for that day.
  const [selectedActionDay, setSelectedActionDay] = useState<number | null>(initialActionDay ?? null);
  const [openedAssetId, setOpenedAssetId] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);
  // Saves go out one at a time. Each request carries the newest local snapshot plus
  // every explicit day completion change since the last successful save, so an
  // older response can never roll the page (or the server) back.
  const saveQueue = useRef<{ inFlight: boolean; pending: BlueprintProgressV21 | null; dayChanges: Array<{ dayNumber: number; completed: boolean }> }>({ inFlight: false, pending: null, dayChanges: [] });
  const pendingKey = `ghosttown-blueprint-progress-pending:${orderId}`;
  const { blueprint, progress } = payload;

  useEffect(() => {
    const pending = localStorage.getItem(pendingKey);
    if (!pending) return;
    try {
      const parsed = JSON.parse(pending) as BlueprintProgressV21;
      setPayload(current => ({ ...current, progress: parsed }));
      setSaveState("error");
      setSaveError(COPY[locale].restoredLocal);
    } catch {
      localStorage.removeItem(pendingKey);
    }
  }, [pendingKey, locale]);

  const persist = async (next: BlueprintProgressV21, dayChange?: { dayNumber: number; completed: boolean }) => {
    setPayload(current => ({ ...current, progress: next }));
    localStorage.setItem(pendingKey, JSON.stringify(next));
    setSaveState("saving");
    setSaveError("");
    const queue = saveQueue.current;
    queue.pending = next;
    if (dayChange) queue.dayChanges.push(dayChange);
    if (queue.inFlight) return;
    queue.inFlight = true;
    try {
      while (queue.pending) {
        const snapshot = queue.pending;
        const dayChanges = queue.dayChanges;
        queue.pending = null;
        queue.dayChanges = [];
        try {
          const response = await fetch(apiUrl(`/api/paid-test/orders/${encodeURIComponent(orderId)}/blueprint/progress`), {
            method: "POST",
            headers: { ...authHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify(dayChanges.length ? { ...snapshot, completedDayChanges: dayChanges } : snapshot),
          });
          const body = await response.json<{ progress?: BlueprintProgressV21; error?: string }>();
          if (!response.ok || !body.progress) throw new Error(body.error || t.saveFailed);
          if (!queue.pending) {
            localStorage.removeItem(pendingKey);
            setPayload(current => ({ ...current, progress: body.progress! }));
            setSaveState("saved");
          }
        } catch (caught) {
          // Keep unsent completion changes for the retry; the retry resends the current snapshot.
          queue.dayChanges = [...dayChanges, ...queue.dayChanges];
          queue.pending = null;
          setSaveState("error");
          setSaveError(caught instanceof Error ? caught.message : t.saveFailed);
        }
      }
    } finally {
      queue.inFlight = false;
    }
  };

  const debouncedNote = (key: string, value: string) => {
    const next = { ...progress, evidenceNotes: { ...progress.evidenceNotes, [key]: value } };
    setPayload(current => ({ ...current, progress: next }));
    localStorage.setItem(pendingKey, JSON.stringify(next));
    setSaveState("saving");
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => void persist(next), 650);
  };

  const completed = new Set(progress.completedDays || []);
  const nextIncompleteAction = blueprint.dailyCalendar.find(day => !completed.has(day.dayNumber)) || blueprint.dailyCalendar[29];
  const todayAction = (selectedActionDay ? blueprint.dailyCalendar.find(day => day.dayNumber === selectedActionDay) : undefined) || nextIncompleteAction;
  const followUps = useMemo(() => (progress.evidenceLedger || []).filter(item => item.followUpDate && item.commitmentReceived.toLowerCase() !== "closed" ).sort((a, b) => a.followUpDate.localeCompare(b.followUpDate)), [progress.evidenceLedger]);
  const reminders = progress.scheduledReminders || [];
  const prefs = progress.reminderPreferences || { dailyAction: true, followUps: true, checkpoints: true, preferredHourLocal: 9 };
  const completionPercent = Math.round(((progress.completedDays || []).length / 30) * 100);
  const reviewCheckpointDay = (
    selectedActionDay === 7
    || selectedActionDay === 14
    || selectedActionDay === 21
    || selectedActionDay === 30
  ) ? selectedActionDay : undefined;

  const markDay = (dayNumber: number) => {
    const set = new Set(progress.completedDays || []);
    const completed = !set.has(dayNumber);
    completed ? set.add(dayNumber) : set.delete(dayNumber);
    void persist({ ...progress, completedDays: [...set].sort((a, b) => a - b) }, { dayNumber, completed });
  };

  const scheduleReminder = (kind: ScheduledReminderV21["kind"], dueAt: string, refs: Partial<ScheduledReminderV21>) => {
    const item: ScheduledReminderV21 = {
      reminderId: `reminder_${crypto.randomUUID()}`,
      blueprintId: blueprint.blueprintId,
      blueprintVersion: blueprint.blueprintVersion,
      kind,
      dueAt,
      status: "pending",
      ...refs,
    };
    void persist({ ...progress, scheduledReminders: [...reminders, item] });
  };

  const scheduleCheckpointReminder = (checkpointId: string, dayNumber: 7 | 14 | 21 | 30) => {
    if (reminders.some(item => item.kind === "checkpoint" && item.checkpointId === checkpointId && item.status === "pending")) return;
    scheduleReminder("checkpoint", checkpointReminderDueAt(blueprint.createdAt, dayNumber, prefs.preferredHourLocal), { checkpointId });
  };

  const scheduleAllCheckpointReminders = () => {
    const existing = new Set(reminders.filter(item => item.kind === "checkpoint" && item.status === "pending").map(item => item.checkpointId));
    const additions: ScheduledReminderV21[] = blueprint.adaptiveCheckpoints
      .filter(checkpoint => checkpoint.dayNumber >= nextIncompleteAction.dayNumber && !existing.has(checkpoint.checkpointId))
      .map(checkpoint => ({
        reminderId: `reminder_${crypto.randomUUID()}`,
        blueprintId: blueprint.blueprintId,
        blueprintVersion: blueprint.blueprintVersion,
        kind: "checkpoint" as const,
        dueAt: checkpointReminderDueAt(blueprint.createdAt, checkpoint.dayNumber, prefs.preferredHourLocal),
        checkpointId: checkpoint.checkpointId,
        status: "pending" as const,
      }));
    if (additions.length > 0) void persist({ ...progress, scheduledReminders: [...reminders, ...additions] });
  };

  const updateReminderStatus = (reminderId: string, status: ScheduledReminderV21["status"]) => {
    void persist({ ...progress, scheduledReminders: reminders.map(item => item.reminderId === reminderId ? { ...item, status } : item) });
  };

  const openReminder = (reminder: ScheduledReminderV21) => {
    const target = resolveReminderTarget(reminder);
    if (target.kind === "action") {
      setSelectedActionDay(target.dayNumber);
      setTab("today");
      return;
    }
    if (target.kind === "entry") {
      const entry = progress.evidenceLedger.find(item => item.entryId === target.entryId);
      if (entry) {
        setEntryDraft(entry);
        setTab("record");
      } else {
        setTab("evidence");
      }
      return;
    }
    if (target.kind === "checkpoint") {
      setTab("review");
      window.requestAnimationFrame(() => document.getElementById(`checkpoint-${target.dayNumber}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  };

  const saveEntry = () => {
    const now = new Date().toISOString();
    const entry: EvidenceLedgerEntryV21 = {
      ...entryDraft,
      entryId: entryDraft.entryId || `evidence_${crypto.randomUUID()}`,
      blueprintId: blueprint.blueprintId,
      blueprintVersion: blueprint.blueprintVersion,
      actionId: entryDraft.actionId || `day-${todayAction.dayNumber}`,
      checkpointId: entryDraft.checkpointId || undefined,
      createdAt: entryDraft.createdAt || now,
    };
    void persist({ ...progress, evidenceLedger: upsertEvidenceEntry(progress.evidenceLedger || [], entry) });
    setEntryDraft(emptyEntry());
    setTab("evidence");
  };

  const checkpointReview = (day: 7 | 14 | 21 | 30): CheckpointReviewV21 => {
    const existing = progress.checkpointReviews?.find(item => item.dayNumber === day);
    const draft = checkpointDrafts[day] || {};
    return {
      dayNumber: day,
      completedAt: draft.completedAt || existing?.completedAt || "",
      answers: draft.answers || existing?.answers || {},
      evidenceSummary: draft.evidenceSummary ?? existing?.evidenceSummary ?? "",
      strongestEvidence: draft.strongestEvidence ?? existing?.strongestEvidence ?? "none",
      primaryConstraint: draft.primaryConstraint ?? existing?.primaryConstraint ?? "none",
      nextAction: draft.nextAction ?? existing?.nextAction ?? "",
      blueprintVersionId: blueprint.blueprintId,
    };
  };

  const saveCheckpoint = (day: 7 | 14 | 21 | 30) => {
    const review = { ...checkpointReview(day), completedAt: new Date().toISOString() };
    void persist({ ...progress, checkpointReviews: upsertCheckpointReview(progress.checkpointReviews || [], review) });
  };

  const copy = async (text: string) => { await navigator.clipboard.writeText(text); };
  const workingCopy = (assetId: string, canonical: string) => progress.assetDrafts?.find(item => item.assetId === assetId)?.content || canonical;
  const saveWorkingCopy = (assetId: string, sourceAssetVersion: string, content: string) => {
    const draft = { assetId, blueprintId: blueprint.blueprintId, blueprintVersion: blueprint.blueprintVersion, sourceAssetVersion, content, updatedAt: new Date().toISOString() };
    const drafts = [...(progress.assetDrafts || []).filter(item => item.assetId !== assetId), draft].slice(-60);
    void persist({ ...progress, assetDrafts: drafts });
  };
  const openAsset = (assetId: string) => setOpenedAssetId(current => current === assetId ? null : assetId);
  const renderPacketAssets = (packet: NonNullable<typeof todayAction.executionPacket>) => <section className="space-y-4" aria-label={t.assetsAria}>{packet.assets.map(asset => { const draft = workingCopy(asset.assetId, asset.finishedContent); const isOpen = openedAssetId === asset.assetId; return <article id={`execution-asset-${asset.assetId}`} key={asset.assetId} className="rounded-xl border border-black/10 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase text-ghost-rust">{t.finishedAsset(asset.dayNumber)}</p><h3 className="text-lg font-black">{asset.title}</h3><p className="mt-1 text-xs text-gray-500">{t.lineage(asset.lineage.sourceVerdictId)}</p></div><div className="flex flex-wrap gap-2">{asset.capabilities.copyReady && <button onClick={() => void copy(draft)} className="rounded-lg border border-ghost-rust px-3 py-2 text-sm font-black text-ghost-rust">{t.copy}</button>}{asset.capabilities.openable && <button onClick={() => openAsset(asset.assetId)} className="rounded-lg border px-3 py-2 text-sm font-black">{isOpen ? t.close : t.open}</button>}{asset.capabilities.downloadable && <button onClick={() => downloadAsset(asset.title, draft, asset.contentType)} className="rounded-lg border px-3 py-2 text-sm font-black">{t.download}</button>}</div></div><p className="mt-3 text-sm text-gray-600">{asset.usageInstructions}</p>{isOpen && <section aria-label={t.readableAria(asset.title)} className="mt-4 rounded-lg bg-gray-950 p-4 text-xs text-white"><p className="mb-2 font-black">{t.readableView}</p><pre className="whitespace-pre-wrap font-mono">{draft}</pre></section>}{asset.capabilities.editable && <label className="mt-4 block text-sm font-black">{t.workingCopy} <span className="font-normal text-gray-500">{t.workingCopyNote}</span><textarea value={draft} onChange={event => saveWorkingCopy(asset.assetId, asset.version, event.target.value)} className="mt-2 min-h-48 w-full rounded-lg border border-gray-300 p-3 font-mono text-xs font-normal" /></label>}</article>; })}</section>;

  return <div className="min-h-screen bg-[#f6f1e8] text-ghost-ink">
    <header className="sticky top-0 z-30 border-b border-black/10 bg-ghost-ink text-white shadow-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4"><div className="flex items-center gap-3"><button onClick={onBack} className="rounded-lg border border-white/20 px-3 py-2 text-sm font-black">{t.backToDashboard}</button><div><p className="text-xs font-black uppercase tracking-[0.2em] text-ghost-gold">{t.kicker}</p><h1 className="font-black">{blueprint.offer.offerName}</h1></div></div><div className="text-right text-xs"><div>{t.daysProgress(progress.completedDays.length, completionPercent)}</div><div aria-live="polite" className={saveState === "error" ? "text-red-300" : "text-white/70"}>{saveState === "saving" ? t.saving : saveState === "error" ? t.syncNeeded : t.savedAt(formatDateTime(progress.updatedAt, locale))}</div></div></div>
      <div className="mx-auto max-w-7xl px-4 pb-3"><label className="sr-only" htmlFor="blueprint-mobile-nav">{t.sectionLabel}</label><select id="blueprint-mobile-nav" aria-label={t.sectionLabel} value={tab} onChange={event => setTab(event.target.value as Tab)} className="w-full rounded-lg bg-white px-3 py-2 font-black text-ghost-ink md:hidden">{TAB_ORDER.map(id => <option key={id} value={id}>{t.tabs[id]}</option>)}</select><nav aria-label={t.sectionsNav} className="hidden gap-1 overflow-x-auto md:flex">{TAB_ORDER.map(id => <button key={id} onClick={() => setTab(id)} className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-black ${tab === id ? "bg-ghost-rust text-white" : "text-white/70 hover:bg-white/10"}`}>{t.tabs[id]}</button>)}</nav></div>
    </header>

    <main className="mx-auto max-w-7xl space-y-6 p-4 py-7 sm:p-6">
      {saveState === "error" && <div role="alert" className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between"><span>{saveError || t.notSynced}</span><button onClick={() => void persist(progress)} className="rounded-lg bg-red-700 px-4 py-2 font-black text-white">{t.retrySave}</button></div>}

      {tab === "overview" && <div className="space-y-6"><section className="rounded-2xl bg-ghost-ink p-7 text-white"><p className="text-xs font-black uppercase tracking-[0.2em] text-ghost-gold">{t.launchCard}</p><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"><div><p className="text-xs uppercase text-white/60">{t.firstCustomer}</p><p className="mt-1 font-black">{blueprint.launchCard48Hour.firstCustomer}</p></div><div><p className="text-xs uppercase text-white/60">{t.firstOffer}</p><p className="mt-1 font-black">{blueprint.launchCard48Hour.firstOffer}</p></div><div><p className="text-xs uppercase text-white/60">{t.founderTime}</p><p className="mt-1 font-black">{t.hours(blueprint.executiveDecision.founderTimeRiskHours)}</p></div><div><p className="text-xs uppercase text-white/60">{t.testCash}</p><p className="mt-1 font-black">${blueprint.executiveDecision.founderCashRiskMaximum}</p></div></div><div className="mt-6 rounded-xl bg-white/10 p-5"><p className="text-xs font-black uppercase text-ghost-gold">{t.exactFirstMessage}</p><p className="mt-2 whitespace-pre-line text-sm leading-6">{blueprint.launchCard48Hour.exactFirstMessage}</p><button onClick={() => void copy(blueprint.launchCard48Hour.exactFirstMessage)} className="mt-3 rounded-lg border border-white/30 px-3 py-2 text-xs font-black">{t.copyMessage}</button></div><div className="mt-5"><p className="text-xs font-black uppercase text-ghost-gold">{t.firstCommitment}</p><p className="mt-2">{blueprint.launchCard48Hour.firstCommitmentRequest}</p></div></section><section className="grid gap-4 md:grid-cols-3">{blueprint.launchCard48Hour.firstThreeApproaches.map((item, index) => <article key={item.channelId} className="rounded-xl border border-black/10 bg-white p-5"><p className="text-xs font-black uppercase text-ghost-rust">{t.approach(index + 1)}</p><h3 className="mt-1 font-black">{item.name}</h3><p className="mt-2 text-sm text-gray-700">{item.firstAction}</p><a className="mt-3 inline-block text-sm font-black text-ghost-rust" href={item.publicUrl} target="_blank" rel="noreferrer">{t.openPublicPath}</a></article>)}</section><section className="grid gap-4 md:grid-cols-2"><article className="rounded-xl border border-black/10 bg-white p-5"><p className="text-xs font-black uppercase text-ghost-rust">{t.day30Requirement}</p><p className="mt-2 text-sm text-gray-700">{blueprint.adaptiveCheckpoints.find(item => item.dayNumber === 30)?.evidenceRequired.join(" · ")}</p></article><article className="rounded-xl border border-black/10 bg-white p-5"><p className="text-xs font-black uppercase text-ghost-rust">{t.optionalNextStep}</p><p className="mt-2 text-sm text-gray-700">{t.noWebsite}</p></article></section></div>}

      {tab === "overview" && <><GetMeLiveUpsell sourceSprintOrderId={orderId} compact /><SprintShareMoment sourceSprintOrderId={orderId} locale={locale} /></>}

      {tab === "audit" && <div className="space-y-6"><section className="grid gap-4 md:grid-cols-2">{[[t.existingOffer, blueprint.startingStateAudit.existingOffer],[t.existingSite, blueprint.startingStateAudit.existingLandingPage],[t.previousOutreach, blueprint.startingStateAudit.previousOutreach],[t.existingContacts, blueprint.startingStateAudit.existingCustomersAudienceOrPartners],[t.fulfillmentReadiness, blueprint.startingStateAudit.manualFulfillmentReadiness]].map(([title, item]) => { const evidence = item as typeof blueprint.startingStateAudit.existingOffer; return <article key={String(title)} className="rounded-xl border border-black/10 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-black">{String(title)}</h2>{truthBadge(evidence.truthLabel, locale)}</div><p className="mt-3 text-sm text-gray-700">{evidence.statement}</p></article>; })}</section><section className="rounded-xl border border-black/10 bg-white p-6"><h2 className="text-2xl font-black">{t.skillsAndAssets}</h2><div className="mt-4 space-y-3">{blueprint.startingStateAudit.existingSkillsAndAssets.map((item, index) => <div key={index} className="flex flex-col gap-2 rounded-lg bg-gray-50 p-4 sm:flex-row sm:items-start sm:justify-between"><span className="text-sm">{item.statement}</span>{truthBadge(item.truthLabel, locale)}</div>)}</div></section><section className="rounded-xl border border-black/10 bg-white p-6"><h2 className="text-2xl font-black">{t.founderConstraints}</h2><div className="mt-4 grid gap-4 md:grid-cols-2">{Object.entries(blueprint.startingStateAudit.founderConstraints).map(([key, item]) => <div key={key} className="rounded-lg bg-gray-50 p-4"><div className="flex items-center justify-between gap-2"><strong>{(t.constraintLabels as Record<string, string>)[key] ?? key.replace(/([A-Z])/g, " $1")}</strong>{truthBadge(item.truthLabel, locale)}</div><p className="mt-2 text-sm text-gray-700">{item.statement}</p></div>)}</div></section><section className="grid gap-4 lg:grid-cols-2"><article className="rounded-xl border border-black/10 bg-white p-6"><h2 className="text-xl font-black">{t.verifiedRegister}</h2><div className="mt-4 space-y-3">{blueprint.startingStateAudit.verifiedFacts.map((item, index) => <div key={index} className="rounded-lg bg-emerald-50 p-3 text-sm"><div className="mb-2">{truthBadge(item.truthLabel, locale)}</div>{item.statement}</div>)}</div></article><article className="rounded-xl border border-black/10 bg-white p-6"><h2 className="text-xl font-black">{t.inferenceRegister}</h2><div className="mt-4 space-y-3">{blueprint.startingStateAudit.inferences.map((item, index) => <div key={index} className="rounded-lg bg-amber-50 p-3 text-sm"><div className="mb-2">{truthBadge(item.truthLabel, locale)}</div>{item.statement}</div>)}</div></article></section><section className="rounded-xl border border-black/10 bg-white p-6"><h2 className="text-2xl font-black">{t.criticalTests}</h2><div className="mt-4 grid gap-4 md:grid-cols-2">{blueprint.startingStateAudit.criticalTests.map((test, index) => <article key={test.assumptionId} className="rounded-lg border border-black/10 p-4"><p className="text-xs font-black uppercase text-ghost-rust">{t.criticalTest(index + 1)}</p><h3 className="mt-1 font-black">{test.assumption}</h3><p className="mt-2 text-sm"><strong>{t.evidenceRequired}</strong> {test.evidenceRequired}</p><p className="mt-2 text-sm"><strong>{t.ifFalse}</strong> {test.failureConsequence}</p></article>)}</div></section></div>}

      {tab === "research" && <div className="space-y-6">
        <section className="rounded-2xl bg-ghost-ink p-7 text-white">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-ghost-gold">{t.researchKicker}</p>
          <h2 className="mt-2 text-3xl font-black">{t.researchHeading}</h2>
          <p className="mt-3 text-white/75">{t.researchIntro}</p>
        </section>
        <CommunityResearchCards blueprint={blueprint} onCopy={text => void copy(text)} locale={locale} />
        {(["customer_access","market_evidence","media_pr","partnership"] as const).map(role => {
          const channels = blueprint.customerAccessPack.channels.filter(channel => researchEvidenceRole(channel) === role);
          const boundary = t.roleBoundaries[role];
          return <section key={role} className="rounded-xl border border-black/10 bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-xs font-black uppercase text-ghost-rust">{t.roleLabels[role]}</p><p className="mt-2 max-w-3xl text-sm text-gray-700">{boundary}</p></div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-black">{t.targetCount(channels.length)}</span>
            </div>
            {channels.length === 0 ? <p className="mt-4 rounded-lg bg-amber-50 p-4 text-sm font-semibold text-amber-900">{role === "customer_access" ? t.noCustomerAccess : t.noTargetForRole}</p> :
              <div className="mt-4 grid gap-4 lg:grid-cols-2">{channels.map(channel => <article key={channel.channelId} className="rounded-lg border border-black/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-black">{channel.community}</h3><span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-black uppercase">{channel.targetType ? labelFor(t.targetTypes, channel.targetType) : t.targetFallback}</span></div>
                <p className="mt-2 text-sm text-gray-700">{channel.relevance}</p>
                <p className="mt-3 text-xs font-black uppercase text-gray-500">{t.roleBoundary}</p><p className="mt-1 text-sm text-gray-700">{channel.evidenceRoleReason || boundary}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2"><div><p className="text-xs font-black uppercase text-gray-500">{t.evidenceDated}</p><p className="mt-1 text-sm text-gray-700">{channel.evidenceDate ? formatDate(channel.evidenceDate, locale) : t.unknownDate} · {labelFor(t.recency, channel.evidenceRecency || "unknown")}</p></div><div><p className="text-xs font-black uppercase text-gray-500">{t.researchChecked}</p><p className="mt-1 text-sm text-gray-700">{channel.researchDate}</p></div><div><p className="text-xs font-black uppercase text-gray-500">{t.currentActivity}</p><p className="mt-1 text-sm text-gray-700">{labelFor(t.activityStatus, channel.currentActivityStatus || "unverified")}{channel.currentActivityVerifiedAt ? t.verifiedOn(formatDate(channel.currentActivityVerifiedAt, locale)) : ""}</p></div><div><p className="text-xs font-black uppercase text-gray-500">{t.evidenceConfidence}</p><p className="mt-1 text-sm text-gray-700">{labelFor(t.confidence, channel.confidence)}</p></div></div>
                <p className="mt-3 text-xs font-black uppercase text-gray-500">{t.currentActivityEvidence}</p><p className="mt-1 text-sm text-gray-700">{channel.currentActivityEvidence || t.activityNotVerified}</p>
                <p className="mt-3 text-xs font-black uppercase text-gray-500">{t.publicPath}</p><p className="mt-1 text-sm text-gray-700">{channel.accessPath || channel.recommendedApproach}</p>
                <p className="mt-3 text-xs font-black uppercase text-gray-500">{t.firstAction}</p><p className="mt-1 text-sm text-gray-700">{channel.firstAction}</p>
                <a className="mt-3 inline-block text-sm font-black text-ghost-rust" href={channel.publicUrl} target="_blank" rel="noreferrer">{t.openSource}</a>
              </article>)}</div>}
          </section>;
        })}
      </div>}

      {tab === "revenue" && <div className="space-y-6"><section className="rounded-2xl bg-ghost-ink p-7 text-white"><p className="text-xs font-black uppercase tracking-[0.2em] text-ghost-gold">{t.laneKicker}</p><h2 className="mt-2 text-3xl font-black">{labelFor(t.lanes, blueprint.businessModelLane.lane)}</h2><p className="mt-3 text-white/75">{blueprint.businessModelLane.rationale}</p></section><section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[[t.firstOfferFormat, blueprint.firstRevenuePath.firstOfferFormat],[t.firstBuyer, blueprint.firstRevenuePath.firstBuyer],[t.firstChannel, blueprint.firstRevenuePath.firstChannel],[t.firstPrice, blueprint.firstRevenuePath.firstPrice],[t.commitmentMethod, blueprint.firstRevenuePath.commitmentMethod],[t.targetDay, t.dayLabel(blueprint.firstRevenuePath.targetDay)],[t.minimumAsks, String(blueprint.firstRevenuePath.minimumQualifiedAsks)],[t.successThreshold, blueprint.firstRevenuePath.successThreshold]].map(([label, value]) => <article key={label} className="rounded-xl border border-black/10 bg-white p-5"><p className="text-xs font-black uppercase text-ghost-rust">{label}</p><p className="mt-2 text-sm font-semibold text-gray-800">{value}</p></article>)}</section><article className="rounded-xl border border-black/10 bg-white p-6"><div className="flex justify-between gap-4"><div><p className="text-xs font-black uppercase text-ghost-rust">{t.firstAsk}</p><p className="mt-2 whitespace-pre-line text-sm leading-6">{blueprint.firstRevenuePath.firstAsk}</p></div><button onClick={() => void copy(blueprint.firstRevenuePath.firstAsk)} className="h-fit rounded-lg border border-ghost-rust px-3 py-2 text-xs font-black text-ghost-rust">{t.copyAsk}</button></div><FieldList title={t.followUpSequence} items={blueprint.firstRevenuePath.followUpSequence} /></article><PilotBrief blueprint={blueprint} onCopy={text => void copy(text)} locale={locale} /></div>}

      {tab === "fulfillment" && <div className="space-y-6"><section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[[t.deliveryTimeline, blueprint.manualFulfillmentPlan.expectedDeliveryTime],[t.capacityPerWeek, String(blueprint.manualFulfillmentPlan.capacityPerWeek)],[t.founderHoursGuardrail, blueprint.manualFulfillmentPlan.estimatedFounderHours],[t.variableCostField, blueprint.manualFulfillmentPlan.estimatedVariableCost],[t.grossMarginGuardrail, blueprint.manualFulfillmentPlan.grossMarginGuardrail]].map(([label, value]) => <article key={label} className="rounded-xl border border-black/10 bg-white p-5"><p className="text-xs font-black uppercase text-ghost-rust">{label}</p><p className="mt-2 text-sm text-gray-700">{value}</p></article>)}</section><section className="grid gap-6 lg:grid-cols-2"><article className="rounded-xl border border-black/10 bg-white p-6"><FieldList title={t.onboardingSteps} items={blueprint.manualFulfillmentPlan.onboardingSteps} /><div className="mt-6"><FieldList title={t.customerInputs} items={blueprint.manualFulfillmentPlan.customerInputs} /></div><div className="mt-6"><FieldList title={t.communicationPoints} items={blueprint.manualFulfillmentPlan.customerCommunicationPoints} /></div></article><article className="rounded-xl border border-black/10 bg-white p-6"><FieldList title={t.founderWork} items={blueprint.manualFulfillmentPlan.founderWork} /><div className="mt-6"><FieldList title={t.qualityChecklist} items={blueprint.manualFulfillmentPlan.qualityChecklist} /></div><div className="mt-6"><FieldList title={t.intentionallyManual} items={blueprint.manualFulfillmentPlan.intentionallyManual} /></div></article></section></div>}

      {tab === "today" && <div className="space-y-6"><section className="rounded-2xl bg-ghost-ink p-7 text-white"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-ghost-gold">{t.todayDay(todayAction.dayNumber)}</p><h2 className="mt-2 text-3xl font-black">{todayAction.title}</h2></div>{selectedActionDay && selectedActionDay !== nextIncompleteAction.dayNumber && <button onClick={() => setSelectedActionDay(null)} className="rounded-lg border border-white/30 px-3 py-2 text-sm font-black">{t.returnToCurrent}</button>}</div><p className="mt-3 text-white/75">{todayAction.primaryObjective}</p><div className="mt-5 flex flex-wrap gap-2"><span className="rounded-full bg-white/10 px-3 py-2 text-sm">{t.minutes(todayAction.estimatedMinutes)}</span><span className="rounded-full bg-white/10 px-3 py-2 text-sm">{t.effortChip(labelFor(t.efforts, todayAction.estimatedEffort))}</span></div></section><section className="grid gap-5 lg:grid-cols-2"><article className="rounded-xl border border-black/10 bg-white p-6"><h3 className="font-black">{t.whyItMatters}</h3><p className="mt-2 text-sm text-gray-700">{todayAction.whyItMatters}</p><div className="mt-5"><FieldList title={t.requiredActions} items={todayAction.requiredActions} /></div><div className="mt-5"><FieldList title={t.preparedAssets} items={todayAction.preparedAssets} /></div>{todayAction.executionPacket && <><div className="mt-5"><FieldList title={t.exactTargets} items={todayAction.executionPacket.targets.map(target => t.targetMinimum(target.name, target.minimumCount))}/></div><p className="mt-5 text-sm"><strong>{t.completeWhen}</strong> {todayAction.executionPacket.completionDefinition}</p></>}</article><article className="rounded-xl border border-black/10 bg-white p-6"><p><strong>{t.deliverableColon}</strong> {todayAction.expectedDeliverable}</p><p className="mt-3"><strong>{t.successMeasureColon}</strong> {todayAction.successMeasurement}</p>{todayAction.executionPacket && <p className="mt-3"><strong>{t.failureThreshold}</strong> {todayAction.executionPacket.failureThreshold}</p>}<div className="mt-5"><FieldList title={t.evidenceToRecord} items={todayAction.evidenceToRecord} /></div><div className="mt-5 rounded-xl bg-[#fff7f2] p-4"><p className="text-xs font-black uppercase text-ghost-rust">{t.branchRule}</p>{todayAction.ifThenBranches.map((branch, index) => <BranchLine key={index} condition={branch.condition} action={branch.action} locale={locale} />)}</div></article></section>{todayAction.executionPacket ? renderPacketAssets(todayAction.executionPacket) : null}<section className="rounded-xl border border-black/10 bg-white p-6"><label htmlFor="today-note" className="font-black">{t.executionNote}</label><textarea id="today-note" value={progress.evidenceNotes?.[todayAction.completionKey] || ""} onChange={event => debouncedNote(todayAction.completionKey, event.target.value)} className="mt-2 min-h-28 w-full rounded-lg border border-gray-300 p-3" placeholder={t.notePlaceholder} /><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => markDay(todayAction.dayNumber)} className="rounded-lg bg-ghost-rust px-4 py-3 font-black text-white">{completed.has(todayAction.dayNumber) ? t.markIncomplete : t.markComplete}</button><button onClick={() => { setEntryDraft({ ...emptyEntry(), actionId: `day-${todayAction.dayNumber}`, action: todayAction.title }); setTab("record"); }} className="rounded-lg border border-ghost-rust px-4 py-3 font-black text-ghost-rust">{t.recordWhatHappened}</button><button onClick={() => scheduleReminder("daily_action", new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), { actionId: `day-${todayAction.dayNumber}` })} className="rounded-lg border border-gray-300 px-4 py-3 font-black">{t.remindLater}</button></div></section></div>}

      {tab === "record" && <div className="space-y-6"><section className="rounded-2xl bg-ghost-ink p-7 text-white"><p className="text-xs font-black uppercase tracking-[0.2em] text-ghost-gold">{t.logKicker}</p><h2 className="mt-2 text-3xl font-black">{t.logHeading}</h2><p className="mt-3 text-white/75">{t.logIntro(blueprint.blueprintVersion)}</p></section><section className="grid gap-4 rounded-xl border border-black/10 bg-white p-6 md:grid-cols-2"><label className="text-sm font-black">{t.contactOrChannel}<input value={entryDraft.contactOrChannel} onChange={e => setEntryDraft({ ...entryDraft, contactOrChannel: e.target.value })} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label><label className="text-sm font-black">{t.date}<input type="date" value={entryDraft.date} onChange={e => setEntryDraft({ ...entryDraft, date: e.target.value })} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label><label className="text-sm font-black md:col-span-2">{t.action}<textarea value={entryDraft.action} onChange={e => setEntryDraft({ ...entryDraft, action: e.target.value })} className="mt-1 min-h-20 w-full rounded-lg border p-2 font-normal" /></label><label className="text-sm font-black md:col-span-2">{t.response}<textarea value={entryDraft.response} onChange={e => setEntryDraft({ ...entryDraft, response: e.target.value })} className="mt-1 min-h-20 w-full rounded-lg border p-2 font-normal" /></label><label className="text-sm font-black md:col-span-2">{t.customerLanguage}<textarea value={entryDraft.customerLanguage} onChange={e => setEntryDraft({ ...entryDraft, customerLanguage: e.target.value })} className="mt-1 min-h-20 w-full rounded-lg border p-2 font-normal" /></label><label className="text-sm font-black">{t.alternativeMentioned}<input value={entryDraft.alternativeMentioned} onChange={e => setEntryDraft({ ...entryDraft, alternativeMentioned: e.target.value })} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label><label className="text-sm font-black">{t.objection}<input value={entryDraft.objection} onChange={e => setEntryDraft({ ...entryDraft, objection: e.target.value })} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label><label className="text-sm font-black">{t.commitmentOffered}<input value={entryDraft.commitmentOffered} onChange={e => setEntryDraft({ ...entryDraft, commitmentOffered: e.target.value })} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label><label className="text-sm font-black">{t.commitmentReceived}<input value={entryDraft.commitmentReceived} onChange={e => setEntryDraft({ ...entryDraft, commitmentReceived: e.target.value })} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label><label className="text-sm font-black">{t.revenueOrDeposit}<input type="number" min="0" step="0.01" value={entryDraft.revenueCents / 100} onChange={e => setEntryDraft({ ...entryDraft, revenueCents: Math.round(Number(e.target.value || 0) * 100) })} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label><label className="text-sm font-black">{t.founderMinutes}<input type="number" min="0" value={entryDraft.founderMinutes} onChange={e => setEntryDraft({ ...entryDraft, founderMinutes: Number(e.target.value || 0) })} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label><label className="text-sm font-black">{t.variableCostDollars}<input type="number" min="0" step="0.01" value={entryDraft.variableCostCents / 100} onChange={e => setEntryDraft({ ...entryDraft, variableCostCents: Math.round(Number(e.target.value || 0) * 100) })} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label><label className="text-sm font-black">{t.followUpDate}<input type="date" value={entryDraft.followUpDate} onChange={e => setEntryDraft({ ...entryDraft, followUpDate: e.target.value })} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label><label className="text-sm font-black">{t.evidenceStrength}<select value={entryDraft.evidenceStrength} onChange={e => setEntryDraft({ ...entryDraft, evidenceStrength: e.target.value as EvidenceStrength })} className="mt-1 w-full rounded-lg border p-2 font-normal"><option value="strong">{t.strengthOptions.strong}</option><option value="moderate">{t.strengthOptions.moderate}</option><option value="early">{t.strengthOptions.early}</option><option value="weak">{t.strengthOptions.weak}</option></select></label><label className="text-sm font-black md:col-span-2">{t.sourceNote}<textarea value={entryDraft.sourceNote} onChange={e => setEntryDraft({ ...entryDraft, sourceNote: e.target.value })} className="mt-1 min-h-20 w-full rounded-lg border p-2 font-normal" /></label><div className="md:col-span-2 flex flex-wrap gap-2"><button onClick={saveEntry} className="rounded-lg bg-ghost-rust px-5 py-3 font-black text-white">{t.saveEntry}</button>{entryDraft.entryId && <button onClick={() => setEntryDraft(emptyEntry())} className="rounded-lg border px-5 py-3 font-black">{t.cancelEdit}</button>}</div></section></div>}

      {tab === "followups" && <div className="space-y-4"><section className="rounded-2xl bg-ghost-ink p-7 text-white"><p className="text-xs font-black uppercase tracking-[0.2em] text-ghost-gold">{t.followUpsKicker}</p><h2 className="mt-2 text-3xl font-black">{t.followUpsHeading}</h2></section>{followUps.length === 0 ? <p className="rounded-xl bg-white p-6">{t.noFollowUps}</p> : followUps.map(entry => <article key={entry.entryId} className="rounded-xl border border-black/10 bg-white p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase text-ghost-rust">{t.due(entry.followUpDate)}</p><h3 className="font-black">{entry.contactOrChannel || t.unlabeledContact}</h3><p className="mt-1 text-sm text-gray-700">{entry.response || entry.action}</p></div><div className="flex gap-2"><button onClick={() => { setEntryDraft(entry); setTab("record"); }} className="rounded-lg border border-ghost-rust px-3 py-2 text-sm font-black text-ghost-rust">{t.editResult}</button><button onClick={() => scheduleReminder("follow_up", `${entry.followUpDate}T09:00:00`, { entryId: entry.entryId })} className="rounded-lg bg-ghost-rust px-3 py-2 text-sm font-black text-white">{t.remindMe}</button></div></div></article>)}</div>}

      {tab === "evidence" && <div className="space-y-6"><section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[[t.entries, progress.evidenceLedger.length],[t.commitments, progress.metrics.commitments],[t.revenue, dollars(progress.metrics.revenueCents)],[t.founderMinutes, progress.metrics.founderMinutes],[t.variableCost, dollars(progress.metrics.variableCostCents)]].map(([label, value]) => <article key={String(label)} className="rounded-xl border border-black/10 bg-white p-5"><p className="text-xs font-black uppercase text-ghost-rust">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></article>)}</section><section className="space-y-3">{progress.evidenceLedger.length === 0 ? <p className="rounded-xl bg-white p-6">{t.noEvidence}</p> : progress.evidenceLedger.map(entry => <article key={entry.entryId} className="rounded-xl border border-black/10 bg-white p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border px-2 py-1 text-xs font-black uppercase">{labelFor(t.strengthBadge, entry.evidenceStrength)}</span><span className="text-xs text-gray-500">{entry.date}</span><span className="text-xs text-gray-500">{t.blueprintVersion(entry.blueprintVersion || blueprint.blueprintVersion)}</span></div><h3 className="mt-2 font-black">{entry.contactOrChannel || t.evidenceEntry}</h3><p className="mt-2 text-sm"><strong>{t.actionColon}</strong> {entry.action}</p><p className="mt-1 text-sm"><strong>{t.responseColon}</strong> {entry.response}</p>{entry.customerLanguage && <p className="mt-2 rounded-lg bg-gray-50 p-3 text-sm"><strong>{t.exactLanguage}</strong> “{entry.customerLanguage}”</p>}{entry.commitmentReceived && <p className="mt-2 text-sm"><strong>{t.commitmentColon}</strong> {entry.commitmentReceived}</p>}</div><button onClick={() => { setEntryDraft(entry); setTab("record"); }} className="rounded-lg border border-ghost-rust px-3 py-2 text-sm font-black text-ghost-rust">{t.edit}</button></div></article>)}</section></div>}

      {tab === "review" && <div className="space-y-6"><section className="rounded-2xl bg-ghost-ink p-7 text-white"><p className="text-xs font-black uppercase tracking-[0.2em] text-ghost-gold">{t.reviewKicker}</p><h2 className="mt-2 text-3xl font-black">{t.reviewHeading}</h2><p className="mt-3 text-white/75">{t.reviewIntro}</p></section><SprintWebsiteEvidence orderId={orderId} checkpointDay={reviewCheckpointDay} locale={locale} />{blueprint.adaptiveCheckpoints.map(checkpoint => { const day = checkpoint.dayNumber; const review = checkpointReview(day); const done = Boolean(progress.checkpointReviews?.find(item => item.dayNumber === day)?.completedAt); const reminderScheduled = reminders.some(item => item.kind === "checkpoint" && item.checkpointId === checkpoint.checkpointId && item.status === "pending"); return <section id={`checkpoint-${day}`} key={checkpoint.checkpointId} className="scroll-mt-32 rounded-xl border border-black/10 bg-white p-6"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-black uppercase text-ghost-rust">{t.dayLabel(day)}</p><h2 className="text-xl font-black">{checkpoint.title}</h2></div><span className={`rounded-full px-3 py-1 text-xs font-black ${done ? "bg-emerald-100 text-emerald-900" : "bg-gray-100"}`}>{done ? t.completed : t.notCompleted}</span></div><div className="mt-4 grid gap-4 lg:grid-cols-2"><div><FieldList title={t.reviewQuestions} items={checkpoint.questions} /><div className="mt-5 rounded-lg bg-gray-50 p-4 text-sm"><strong>{t.metricSummary}</strong> {t.metricLine(progress.metrics.outreachSent, progress.metrics.replies, progress.metrics.interviews, progress.metrics.commitments, dollars(progress.metrics.revenueCents))}</div></div><div className="space-y-3"><label className="block text-sm font-black">{t.strongestEvidence}<select value={review.strongestEvidence} onChange={e => setCheckpointDrafts(current => ({ ...current, [day]: { ...current[day], strongestEvidence: e.target.value as CheckpointReviewV21["strongestEvidence"] } }))} className="mt-1 w-full rounded-lg border p-2 font-normal"><option value="none">{t.noneYet}</option><option value="strong">{t.strengthOptions.strong}</option><option value="moderate">{t.strengthOptions.moderate}</option><option value="early">{t.strengthOptions.early}</option><option value="weak">{t.strengthOptions.weak}</option></select></label><label className="block text-sm font-black">{t.primaryConstraint}<select value={review.primaryConstraint} onChange={e => setCheckpointDrafts(current => ({ ...current, [day]: { ...current[day], primaryConstraint: e.target.value as PrimaryConstraint } }))} className="mt-1 w-full rounded-lg border p-2 font-normal">{(["none","customer","urgency","access","trust","offer","fulfillment","price","message","missing_evidence"] as const).map(item => <option key={item} value={item}>{t.constraints[item]}</option>)}</select></label><label className="block text-sm font-black">{t.evidenceSummary}<textarea value={review.evidenceSummary} onChange={e => setCheckpointDrafts(current => ({ ...current, [day]: { ...current[day], evidenceSummary: e.target.value } }))} className="mt-1 min-h-24 w-full rounded-lg border p-2 font-normal" /></label><label className="block text-sm font-black">{t.nextAction}<textarea value={review.nextAction} onChange={e => setCheckpointDrafts(current => ({ ...current, [day]: { ...current[day], nextAction: e.target.value } }))} className="mt-1 min-h-20 w-full rounded-lg border p-2 font-normal" /></label><div className="flex flex-wrap gap-2"><button onClick={() => saveCheckpoint(day)} className="rounded-lg bg-ghost-rust px-4 py-3 font-black text-white">{t.saveReview(day)}</button><button onClick={() => scheduleCheckpointReminder(checkpoint.checkpointId, day)} disabled={reminderScheduled} className="rounded-lg border border-ghost-rust px-4 py-3 font-black text-ghost-rust disabled:cursor-not-allowed disabled:opacity-50">{reminderScheduled ? t.reminderScheduled : t.remindForDay(day)}</button></div></div></div></section>; })}</div>}

      {tab === "reminders" && <div className="space-y-6"><section className="rounded-2xl bg-ghost-ink p-7 text-white"><p className="text-xs font-black uppercase tracking-[0.2em] text-ghost-gold">{t.remindersKicker}</p><h2 className="mt-2 text-3xl font-black">{t.remindersHeading}</h2><p className="mt-3 text-white/75">{t.remindersIntro}</p></section><section className="rounded-xl border border-black/10 bg-white p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-black">{t.reminderPreferences}</h2><p className="mt-1 text-sm text-gray-600">{t.reminderPreferencesNote}</p></div><button onClick={scheduleAllCheckpointReminders} className="rounded-lg border border-ghost-rust px-4 py-2 text-sm font-black text-ghost-rust">{t.scheduleUpcoming}</button></div><div className="mt-4 grid gap-3 sm:grid-cols-4">{[["dailyAction",t.prefDailyAction],["followUps",t.prefFollowUps],["checkpoints",t.prefCheckpoints]].map(([key,label]) => <label key={key} className="flex items-center gap-3 rounded-lg border p-4 font-black"><input type="checkbox" checked={Boolean(prefs[key as keyof ReminderPreferencesV21])} onChange={e => void persist({ ...progress, reminderPreferences: { ...prefs, [key]: e.target.checked } })} />{label}</label>)}<label className="rounded-lg border p-4 text-sm font-black">{t.preferredHour}<input aria-label={t.preferredHourAria} type="number" min="0" max="23" value={prefs.preferredHourLocal} onChange={e => void persist({ ...progress, reminderPreferences: { ...prefs, preferredHourLocal: Math.min(23, Math.max(0, Number(e.target.value || 0))) } })} className="mt-2 w-full rounded-md border p-2 font-normal" /></label></div></section><section className="space-y-3"><h2 className="text-xl font-black">{t.scheduledReminders}</h2>{reminders.length === 0 ? <p className="rounded-xl bg-white p-6">{t.noReminders}</p> : reminders.map(item => <article key={item.reminderId} className="flex flex-col gap-3 rounded-xl border border-black/10 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-black uppercase text-ghost-rust">{labelFor(t.reminderKinds, item.kind)}</p><span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-black uppercase text-gray-600">{labelFor(t.reminderStatuses, item.status)}</span></div><p className="mt-1 text-sm">{formatDateTime(item.dueAt, locale)}</p><p className="mt-1 text-sm font-semibold text-gray-800">{describeReminderReference(item, locale)}</p><p className="mt-1 text-xs text-gray-500">{t.blueprintVersion(item.blueprintVersion)}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => openReminder(item)} disabled={resolveReminderTarget(item).kind === "unresolved"} className="rounded-lg bg-ghost-rust px-3 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{t.openReferenced}</button>{item.status === "pending" && <button onClick={() => updateReminderStatus(item.reminderId, "done")} className="rounded-lg border border-emerald-300 px-3 py-2 text-sm font-black text-emerald-800">{t.markDone}</button>}<button onClick={() => updateReminderStatus(item.reminderId, "dismissed")} className="rounded-lg border px-3 py-2 text-sm font-black">{t.dismiss}</button></div></article>)}</section></div>}

      {tab === "calendar" && <div className="space-y-4">{blueprint.dailyCalendar.map(day => <article key={day.dayNumber} className="rounded-xl border border-black/10 bg-white p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-black uppercase text-ghost-rust">{t.dayLabel(day.dayNumber)}</p><h2 className="text-xl font-black">{day.title}</h2><p className="mt-1 text-sm text-gray-700">{day.primaryObjective}</p></div><button onClick={() => markDay(day.dayNumber)} className={`rounded-lg px-3 py-2 text-sm font-black ${completed.has(day.dayNumber) ? "bg-emerald-100 text-emerald-900" : "border border-gray-300"}`}>{completed.has(day.dayNumber) ? t.completedCheck : t.markComplete}</button></div><div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4"><div><strong className="text-sm">{t.whyItMatters}</strong><p className="mt-1 text-sm text-gray-600">{day.whyItMatters}</p></div><div><strong className="text-sm">{t.estimatedEffort}</strong><p className="mt-1 text-sm text-gray-600">{t.minutesAndEffort(day.estimatedMinutes, labelFor(t.efforts, day.estimatedEffort))}</p></div><div><strong className="text-sm">{t.deliverable}</strong><p className="mt-1 text-sm text-gray-600">{day.expectedDeliverable}</p></div><div><strong className="text-sm">{t.successMeasure}</strong><p className="mt-1 text-sm text-gray-600">{day.successMeasurement}</p></div></div><div className="mt-4 grid gap-4 md:grid-cols-3"><FieldList title={t.requiredActions} items={day.requiredActions} /><FieldList title={t.preparedAssets} items={day.preparedAssets} /><FieldList title={t.evidenceToRecord} items={day.evidenceToRecord} /></div><div className="mt-4 rounded-lg bg-[#fff7f2] p-4"><p className="text-xs font-black uppercase text-ghost-rust">{t.branchRule}</p>{day.ifThenBranches.map((branch,index) => <BranchLine key={index} condition={branch.condition} action={branch.action} locale={locale} />)}</div></article>)}</div>}

    </main>
  </div>;
}
