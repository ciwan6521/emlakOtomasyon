export const AutomationEvent = {
  MAINTENANCE_CREATED: "automation.maintenance.created",
  HANDOVER_CREATED: "automation.handover.created",
  LEASE_ACTIVATED: "automation.lease.activated",
} as const;

export interface MaintenanceCreatedPayload {
  companyId: string;
  branchId?: string | null;
  maintenanceId: string;
  propertyId: string;
  title: string;
  priority: string;
  assignedToId?: string | null;
}

export interface HandoverCreatedPayload {
  companyId: string;
  branchId?: string | null;
  leaseId: string;
  propertyId: string;
  type: string;
  agentId?: string | null;
}

export interface LeaseActivatedPayload {
  companyId: string;
  branchId?: string | null;
  leaseId: string;
  propertyId: string;
  agentId?: string | null;
}
