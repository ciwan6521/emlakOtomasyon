import {
  AppointmentStatus,
  BuildType,
  CallResult,
  CommChannel,
  CommissionStatus,
  CustomerIntent,
  CustomerKind,
  CustomerSegment,
  DealStage,
  DepositStatus,
  DocumentStatus,
  DocumentType,
  FinancingType,
  InvoiceStatus,
  LeadKind,
  LeadSource,
  LeadStatus,
  LeaseStatus,
  ListingPurpose,
  Locale,
  MaintenancePriority,
  MaintenanceStatus,
  NotificationType,
  OwnerRating,
  PaymentMethod,
  PricePeriod,
  PropertyStatus,
  PropertyType,
  Region,
  RentalPipelineStage,
  RentalTermType,
  Residency,
  RentPaymentStatus,
  SocialChannel,
  TaskPriority,
  TaskStatus,
  TaskType,
} from "../domain/enums";
import { Role } from "../rbac/roles";
import type { ParsedListingQuery } from "../domain/query-parser";

export interface Paginated<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  type: string;
  title: string;
  status: number;
  detail?: string;
  errors?: Record<string, string[]>;
  traceId?: string;
}

// â”€â”€ Auth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface LoginRequest {
  email: string;
  password: string;
}
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  companyId: string;
  branchId: string | null;
  roles: Role[];
  avatarUrl?: string | null;
  /** Personal UI language; null means "follow the company default". */
  locale?: Locale | null;
}
export interface LoginResponse extends AuthTokens {
  user: AuthUser;
}

// â”€â”€ Leads â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface LeadDto {
  id: string;
  kind: LeadKind;
  fullName: string;
  phone: string; // may be masked
  email: string | null; // may be masked
  source: LeadSource;
  status: LeadStatus;
  score: number;
  region: Region | null;
  listingUrl: string | null;
  listingPhotoUrl: string | null;
  listingPrice: number | null;
  listingRooms: string | null;
  lastCallAt: string | null;
  lastCallResult: CallResult | null;
  lastNote: string | null;
  ownerRating: OwnerRating | null;
  assignedToId: string | null;
  assignedToName: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface LeadActivityDto {
  id: string;
  type: string;
  fromValue: string | null;
  toValue: string | null;
  message: string | null;
  createdAt: string;
}
export interface LeadDetailDto extends LeadDto {
  activities: LeadActivityDto[];
  calls: Array<{
    id: string;
    result: CallResult | null;
    notes: string | null;
    followUpAt: string | null;
    createdAt: string;
  }>;
}
export interface CreateLeadRequest {
  kind: LeadKind;
  fullName: string;
  phone: string;
  email?: string;
  source: LeadSource;
  region?: Region;
  listingUrl?: string;
  listingPhotoUrl?: string;
  listingPrice?: number;
  listingRooms?: string;
  notes?: string;
  rawPayload?: Record<string, unknown>;
}

// â”€â”€ Calls â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface CallResultRequest {
  result: CallResult;
  notes?: string;
  followUpAt?: string;
  durationSec?: number;
  ownerRating?: OwnerRating;
}

// â”€â”€ Properties â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface PropertyDto {
  id: string;
  reference: string;
  title: string;
  type: PropertyType;
  purpose: ListingPurpose;
  status: PropertyStatus;
  region: Region;
  address: string;
  latitude: number | null;
  longitude: number | null;
  price: number;
  pricePeriod: PricePeriod;
  rentalTermType: RentalTermType | null;
  availableFrom: string | null;
  minLeaseMonths: number | null;
  minStayNights: number | null;
  nightlyRate: number | null;
  depositAmount: number | null;
  managementFeePct: number | null;
  currency: string;
  rooms: string; // "1+1", "2+1"
  sizeM2: number;
  neighborhood: string | null;
  floor: number | null;
  buildType: BuildType | null;
  monthlyDues: number | null;
  hasElevator: boolean;
  hasParking: boolean;
  hasBalcony: boolean;
  isFurnished: boolean;
  hasSeaView: boolean;
  hasPool: boolean;
  hasGarden: boolean;
  viewCount: number;
  sentCount: number;
  favoriteCount: number;
  publicUrl: string | null;
  createdByName: string | null;
  updatedByName: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  ownerName: string;
  ownerPhone: string; // may be masked
  description: string | null;
  publishedAt: string | null;
  mediaCount: number;
  coverUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface PropertyFilter {
  region?: Region;
  status?: PropertyStatus;
  type?: PropertyType;
  purpose?: ListingPurpose;
  minPrice?: number;
  maxPrice?: number;
  minSizeM2?: number;
  maxSizeM2?: number;
  rooms?: string;
  buildType?: BuildType;
  floor?: number;
  neighborhood?: string;
  hasElevator?: boolean;
  hasParking?: boolean;
  hasBalcony?: boolean;
  isFurnished?: boolean;
  hasSeaView?: boolean;
  hasPool?: boolean;
  hasGarden?: boolean;
  search?: string;
  bbox?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  page?: number;
  pageSize?: number;
  sort?: string;
}

// â”€â”€ Customers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface CustomerDto {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  whatsapp: string | null;
  viberId: string | null;
  kind: CustomerKind;
  intent: CustomerIntent;
  segment: CustomerSegment;
  budgetMin: number;
  budgetMax: number;
  preferredRegions: Region[];
  propertyType: PropertyType | null;
  roomRequirement: string | null;
  financing: FinancingType | null;
  residency: Residency | null;
  preferredPurpose: ListingPurpose | null;
  moveInDate: string | null;
  leaseMonths: number | null;
  petsAllowed: boolean | null;
  occupants: number | null;
  assignedToId: string | null;
  assignedToName?: string | null;
  lastContactAt: string | null;
  notes?: string | null;
  createdAt: string;
}
export interface CustomerDetailDto extends CustomerDto {
  matchCount: number;
  matches: MatchDto[];
  sentDeliveries: Array<{
    id: string;
    channel: CommChannel;
    body: string | null;
    createdAt: string;
    propertyTitle?: string;
  }>;
  appointments: AppointmentDto[];
}

// â”€â”€ Matching â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface MatchDto {
  id: string;
  propertyId: string;
  customerId: string;
  score: number;
  reasons: string[];
  createdAt: string;
}

// â”€â”€ Tasks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface TaskDto {
  id: string;
  title: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  assigneeName: string | null;
  dueAt: string | null;
  relatedEntity: string | null;
  relatedEntityId: string | null;
  createdAt: string;
}

// â”€â”€ Pipeline â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface DealDto {
  id: string;
  title: string;
  stage: DealStage;
  value: number;
  currency: string;
  propertyId: string | null;
  customerId: string | null;
  ownerId: string | null;
  probability: number;
  createdAt: string;
}

// â”€â”€ Communication â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface CampaignDto {
  id: string;
  name: string;
  channel: CommChannel;
  templateId: string;
  audienceSize: number;
  sentCount: number;
  deliveredCount: number;
  clickedCount: number;
  createdAt: string;
}

// â”€â”€ Analytics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface OverviewKpis {
  dailyLeads: number;
  callsMade: number;
  conversionRate: number;
  activeListings: number;
  salesClosed: number;
  revenue: number;
  // Portfolio breakdown
  forSale: number;
  forRent: number;
  newListingsThisWeek: number;
  // Today's operations
  callbacksPending: number;
  appointmentsToday: number;
  // This month
  soldThisMonth: number;
  rentedThisMonth: number;
  commissionThisMonth: number;
  trend: {
    leads: number[];
    calls: number[];
    revenue: number[];
  };
}

export interface RecentListing {
  id: string;
  title: string;
  region: Region;
  price: number;
  status: PropertyStatus;
  coverUrl: string | null;
  createdAt: string;
}

export interface DashboardAlarm {
  id: string;
  kind:
    | "OVERDUE_CALLBACK"
    | "OVERDUE_TASK"
    | "STALE_LEAD"
    | "PENDING_MODERATION";
  title: string;
  detail: string;
  severity: "high" | "medium" | "low";
  link: string;
  at: string;
}

export interface TopPerformer {
  agentId: string;
  agentName: string;
  value: number;
}

export interface DashboardData {
  kpis: OverviewKpis;
  regions: RegionPerformance[];
  topSellers: TopPerformer[];
  topPortfolioBuilders: TopPerformer[];
  recentListings: RecentListing[];
  alarms: DashboardAlarm[];
  pendingTasks: TaskDto[];
  callCenterConversion: number;
}
export interface AuditLogDto {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  actorEmail: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
}
export interface CompanySettingsDto {
  notifications?: {
    newLead?: boolean;
    newCustomer?: boolean;
    newMessage?: boolean;
    callback?: boolean;
    newPortfolio?: boolean;
    priceUpdated?: boolean;
  };
  social?: {
    instagramAccountId?: string;
    facebookPageId?: string;
  };
  integrations?: Record<string, string>;
}
export interface PropertyBroadcastAudience {
  propertyId: string;
  matchCount: number;
  customers: Array<{
    id: string;
    fullName: string;
    phone: string;
    score: number;
  }>;
}
export interface AgentPerformance {
  agentId: string;
  agentName: string;
  callsMade: number;
  leadsConverted: number;
  conversionRate: number;
  dealsValue: number;
}
export interface RegionPerformance {
  region: Region;
  activeListings: number;
  sold: number;
  avgPrice: number;
  revenue: number;
}

// â”€â”€ Live Call Assist â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface SocialLink {
  channel: SocialChannel;
  url: string;
}

export interface CallAssistCard extends PropertyDto {
  relevance: number;
  matchReasons: string[];
  socialLinks: SocialLink[];
  shareText: string;
}

export interface CallAssistSearchRequest {
  q?: string;
  region?: Region;
  rooms?: string;
  type?: PropertyType;
  purpose?: ListingPurpose;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
}

export interface CallAssistSearchResponse {
  parsed: ParsedListingQuery;
  results: CallAssistCard[];
  suggestedMessage: string;
}

export interface CallAssistSendRequest {
  propertyIds: string[];
  channel: CommChannel;
  recipient: string;
  message?: string;
  customerId?: string;
  leadId?: string;
}

export interface CallAssistSendResult {
  sent: number;
  channel: CommChannel;
  recipient: string;
  deliveryIds: string[];
}

// â”€â”€ Appointments / Viewings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface AppointmentDto {
  id: string;
  title: string;
  status: AppointmentStatus;
  startAt: string;
  endAt?: string | null;
  location?: string | null;
  notes?: string | null;
  propertyId?: string | null;
  customerId?: string | null;
  leadId?: string | null;
  agentId?: string | null;
  propertyTitle?: string | null;
  customerName?: string | null;
  agentName?: string | null;
  createdAt: string;
}
export interface CreateAppointmentRequest {
  title: string;
  startAt: string;
  endAt?: string;
  location?: string;
  notes?: string;
  propertyId?: string;
  customerId?: string;
  leadId?: string;
  agentId?: string;
}

// â”€â”€ Documents â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface DocumentDto {
  id: string;
  type: DocumentType;
  status: DocumentStatus;
  name: string;
  url: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  propertyId?: string | null;
  dealId?: string | null;
  customerId?: string | null;
  signerName?: string | null;
  signedAt?: string | null;
  createdAt: string;
}
export interface CreateDocumentRequest {
  name: string;
  url: string;
  type?: DocumentType;
  mimeType?: string;
  sizeBytes?: number;
  propertyId?: string;
  dealId?: string;
  customerId?: string;
}

// â”€â”€ Finance: Commissions / Invoices â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface CommissionDto {
  id: string;
  dealId: string;
  dealTitle?: string | null;
  agentId?: string | null;
  agentName?: string | null;
  baseAmount: number;
  ratePct: number;
  amount: number;
  currency: string;
  status: CommissionStatus;
  note?: string | null;
  paidAt?: string | null;
  createdAt: string;
}
export interface InvoiceDto {
  id: string;
  number: string;
  customerId?: string | null;
  dealId?: string | null;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  issuedAt?: string | null;
  dueAt?: string | null;
  paidAt?: string | null;
  notes?: string | null;
  createdAt: string;
}
export interface FinanceSummary {
  commissionPending: number;
  commissionPaid: number;
  invoiceOutstanding: number;
  invoicePaid: number;
  currency: string;
}

// â”€â”€ Notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
  read: boolean;
  createdAt: string;
}

// â”€â”€ Owner CRM â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface OwnerDto {
  id: string;
  name: string;
  phone: string; // may be masked
  email: string | null;
  whatsapp: string | null;
  telegram: string | null;
  address: string | null;
  rating: OwnerRating;
  notes: string | null;
  propertyCount: number;
  activeListings: number;
  soldCount: number;
  rentedCount: number;
  createdAt: string;
  updatedAt: string;
}
export interface UpsertOwnerRequest {
  name: string;
  phone: string;
  email?: string;
  whatsapp?: string;
  telegram?: string;
  address?: string;
  rating?: OwnerRating;
  notes?: string;
}

// â”€â”€ Branches â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface BranchDto {
  id: string;
  name: string;
  region: Region;
  address: string | null;
  userCount: number;
  activeListings: number;
  createdAt: string;
}
export interface UpsertBranchRequest {
  name: string;
  region: Region;
  address?: string;
}

// â”€â”€ Reporting â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export type ReportRange = "daily" | "weekly" | "monthly" | "yearly";
export interface ReportSummary {
  range: ReportRange;
  from: string;
  to: string;
  newLeads: number;
  callsMade: number;
  newListings: number;
  sold: number;
  rented: number;
  revenue: number;
  conversionRate: number;
  topAgentsByDeals: TopPerformer[];
  topAgentsByLeads: TopPerformer[];
  topRegions: RegionPerformance[];
}

export const LOCALES: Locale[] = [Locale.EN, Locale.TR, Locale.RU, Locale.ME];

// â”€â”€ Rentals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface RentalOverview {
  activeLeases: number;
  pendingApplications: number;
  overduePayments: number;
  expiringLeases: number;
  openMaintenance: number;
  occupiedRentals: number;
  monthlyRentCollected: number;
  pendingPayouts: number;
}

export interface LeaseDto {
  id: string;
  propertyId: string;
  customerId: string;
  propertyTitle: string | null;
  propertyReference: string | null;
  ownerName: string | null;
  ownerPhone: string | null;
  tenantName: string | null;
  tenantPhone: string | null;
  status: LeaseStatus;
  pipelineStage: RentalPipelineStage;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  depositAmount: number;
  depositStatus: DepositStatus;
  managementFeePct: number | null;
  rentDueDay: number;
  notes: string | null;
  signedAt: string | null;
  moveInAt: string | null;
  moveOutAt: string | null;
  createdAt: string;
}

export interface RentPaymentDto {
  id: string;
  leaseId: string;
  propertyId: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: RentPaymentStatus;
  paidAt: string | null;
  method: PaymentMethod | null;
  notes: string | null;
}

export interface MaintenanceDto {
  id: string;
  propertyId: string;
  propertyTitle: string | null;
  leaseId: string | null;
  title: string;
  description: string | null;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  reportedBy: string | null;
  assignedToId: string | null;
  completedAt: string | null;
  createdAt: string;
}
