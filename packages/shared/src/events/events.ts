export enum DomainEvent {
  LEAD_CREATED = "lead.created",
  LEAD_ASSIGNED = "lead.assigned",
  LEAD_STATUS_CHANGED = "lead.status.changed",

  CALL_COMPLETED = "call.completed",
  OWNER_ACCEPTED = "owner.accepted",

  ONBOARDING_SUBMITTED = "onboarding.submitted",
  ONBOARDING_APPROVED = "onboarding.approved",

  PROPERTY_CREATED = "property.created",
  PROPERTY_PUBLISHED = "property.published",
  PROPERTY_STATUS_CHANGED = "property.status.changed",

  CUSTOMER_CREATED = "customer.created",

  MATCH_GENERATED = "match.generated",

  CAMPAIGN_DISPATCHED = "campaign.dispatched",
  DELIVERY_UPDATED = "delivery.updated",

  DEAL_STAGE_CHANGED = "deal.stage.changed",
  DEAL_CLOSED = "deal.closed",

  ASSIGNMENT_CHANGED = "assignment.changed",

  APPOINTMENT_CREATED = "appointment.created",
  APPOINTMENT_STATUS_CHANGED = "appointment.status.changed",
  DOCUMENT_CREATED = "document.created",
  COMMISSION_CREATED = "commission.created",
  NOTIFICATION_CREATED = "notification.created",
}

export interface BaseEventPayload {
  companyId: string;
  branchId?: string | null;
  actorId?: string | null;
  occurredAt: string; // ISO timestamp
}

export interface LeadCreatedPayload extends BaseEventPayload {
  leadId: string;
}
export interface LeadAssignedPayload extends BaseEventPayload {
  leadId: string;
  agentId: string;
}
export interface LeadStatusChangedPayload extends BaseEventPayload {
  leadId: string;
  from: string;
  to: string;
}
export interface CallCompletedPayload extends BaseEventPayload {
  callId: string;
  leadId: string;
  result: string;
}
export interface OwnerAcceptedPayload extends BaseEventPayload {
  leadId: string;
  propertyId?: string;
}
export interface OnboardingSubmittedPayload extends BaseEventPayload {
  sessionId: string;
}
export interface OnboardingApprovedPayload extends BaseEventPayload {
  sessionId: string;
  propertyId: string;
}
export interface PropertyEventPayload extends BaseEventPayload {
  propertyId: string;
}
export interface CustomerCreatedPayload extends BaseEventPayload {
  customerId: string;
}
export interface MatchGeneratedPayload extends BaseEventPayload {
  source: "PROPERTY" | "CUSTOMER";
  sourceId: string;
  matchCount: number;
}
export interface DealStageChangedPayload extends BaseEventPayload {
  dealId: string;
  from: string;
  to: string;
}

export interface DomainEventPayloadMap {
  [DomainEvent.LEAD_CREATED]: LeadCreatedPayload;
  [DomainEvent.LEAD_ASSIGNED]: LeadAssignedPayload;
  [DomainEvent.LEAD_STATUS_CHANGED]: LeadStatusChangedPayload;
  [DomainEvent.CALL_COMPLETED]: CallCompletedPayload;
  [DomainEvent.OWNER_ACCEPTED]: OwnerAcceptedPayload;
  [DomainEvent.ONBOARDING_SUBMITTED]: OnboardingSubmittedPayload;
  [DomainEvent.ONBOARDING_APPROVED]: OnboardingApprovedPayload;
  [DomainEvent.PROPERTY_CREATED]: PropertyEventPayload;
  [DomainEvent.PROPERTY_PUBLISHED]: PropertyEventPayload;
  [DomainEvent.PROPERTY_STATUS_CHANGED]: PropertyEventPayload;
  [DomainEvent.CUSTOMER_CREATED]: CustomerCreatedPayload;
  [DomainEvent.MATCH_GENERATED]: MatchGeneratedPayload;
  [DomainEvent.CAMPAIGN_DISPATCHED]: BaseEventPayload & { campaignId: string };
  [DomainEvent.DELIVERY_UPDATED]: BaseEventPayload & {
    deliveryId: string;
    status: string;
  };
  [DomainEvent.DEAL_STAGE_CHANGED]: DealStageChangedPayload;
  [DomainEvent.DEAL_CLOSED]: DealStageChangedPayload & { value: number };
  [DomainEvent.ASSIGNMENT_CHANGED]: BaseEventPayload & {
    entity: string;
    entityId: string;
    assigneeId: string;
  };
  [DomainEvent.APPOINTMENT_CREATED]: BaseEventPayload & {
    appointmentId: string;
    agentId?: string | null;
  };
  [DomainEvent.APPOINTMENT_STATUS_CHANGED]: BaseEventPayload & {
    appointmentId: string;
    from: string;
    to: string;
  };
  [DomainEvent.DOCUMENT_CREATED]: BaseEventPayload & { documentId: string };
  [DomainEvent.COMMISSION_CREATED]: BaseEventPayload & {
    commissionId: string;
    dealId: string;
  };
  [DomainEvent.NOTIFICATION_CREATED]: BaseEventPayload & {
    notificationId: string;
    userId: string;
  };
}

export enum QueueName {
  SCORING = "scoring",
  DEDUP = "dedup",
  MATCHING = "matching",
  NOTIFICATIONS = "notifications",
  COMMUNICATION = "communication",
  SOCIAL = "social",
  AI = "ai",
  ANALYTICS_ROLLUP = "analytics-rollup",
  MEDIA_PROCESSING = "media-processing",
}
