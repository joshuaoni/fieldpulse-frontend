export interface ActivityActor {
  id: string;
  firstName: string;
  lastName: string;
}

export interface ActivityEvent {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  subject: string | null;
  actor: ActivityActor | null;
  comments: string | null;
  occurredAt: string;
}

export interface ActivityPage {
  events: ActivityEvent[];
  actions: string[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
}

export interface ActivityFilters {
  actions: string[];
  entityTypes: string[];
  search?: string;
}

export const NO_ACTIVITY_FILTERS: ActivityFilters = { actions: [], entityTypes: [] };

export const ENTITY_TYPES = [
  "Lead",
  "LeadSearchTarget",
  "SalesPair",
  "UserFieldRole",
  "Visit",
  "VisitPlan",
] as const;

export const ENTITY_LABEL: Record<string, string> = {
  Lead: "Leads",
  LeadSearchTarget: "Search targets",
  SalesPair: "Pairs",
  UserFieldRole: "Roles",
  Visit: "Visits",
  VisitPlan: "Plans",
};

export const ACTION_LABEL: Record<string, string> = {
  FIELD_ROLE_ASSIGNED: "Field role assigned",
  FIELD_ROLE_CHANGED: "Field role changed",
  FIELD_ROLE_REMOVED: "Field role removed",
  LEAD_CREATED: "Lead created",
  LEAD_ENRICHED: "Lead enriched",
  LEAD_ENRICHMENT_RUN: "Enrichment run",
  LEAD_GEOCODING_RUN: "Geocoding run",
  LEAD_DISCOVERY_RUN: "Discovery run",
  LEAD_SEARCH_TARGET_CREATED: "Search target created",
  LEAD_SEARCH_TARGET_EXHAUSTED: "Search target exhausted",
  LEAD_SEED_IMPORTED: "Leads imported",
  SALES_PAIR_CREATED: "Pair created",
  SALES_PAIR_DISABLED: "Pair retired",
  SALES_PAIR_MEMBER_ADDED: "Rep added to pair",
  SALES_PAIR_MEMBER_REMOVED: "Rep removed from pair",
  VISIT_CHECKED_IN: "Checked in",
  VISIT_CHECKED_OUT: "Checked out",
  VISIT_CREATED: "Visit created",
  VISIT_PLAN_ADJUSTED: "Plan adjusted",
  VISIT_PLAN_GENERATED: "Plan generated",
  VISIT_PLAN_PUBLISHED: "Plan published",
  VISIT_PLAN_STOP_REMOVED: "Stop removed from plan",
  VISIT_REPORT_SUBMITTED: "Report submitted",
  VISIT_VIEWED: "Visit opened",
  VISITS_MARKED_MISSED: "Visits marked missed",
};

export function actionLabel(action: string): string {
  if (ACTION_LABEL[action]) return ACTION_LABEL[action];

  const words = action.toLowerCase().replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export const actorName = (actor: ActivityActor | null): string =>
  actor ? `${actor.firstName} ${actor.lastName}`.trim() : "Scheduler";

export const activityFilterCount = (filters: ActivityFilters): number =>
  filters.actions.length + filters.entityTypes.length;
