export enum LeadStatus {
  NEW = "NEW",
  TO_CALL = "TO_CALL",
  CALLING = "CALLING",
  FOLLOW_UP = "FOLLOW_UP",
  POTENTIAL = "POTENTIAL",
  AGREED = "AGREED",
  IN_PORTFOLIO = "IN_PORTFOLIO",
  PASSIVE = "PASSIVE",
  BLACKLIST = "BLACKLIST",
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  [LeadStatus.NEW]: "New",
  [LeadStatus.TO_CALL]: "To call",
  [LeadStatus.CALLING]: "Calling",
  [LeadStatus.FOLLOW_UP]: "Follow-up",
  [LeadStatus.POTENTIAL]: "Potential",
  [LeadStatus.AGREED]: "Agreed",
  [LeadStatus.IN_PORTFOLIO]: "In portfolio",
  [LeadStatus.PASSIVE]: "Passive",
  [LeadStatus.BLACKLIST]: "Blacklist",
};

export const LEAD_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  [LeadStatus.NEW]: [LeadStatus.TO_CALL, LeadStatus.BLACKLIST],
  [LeadStatus.TO_CALL]: [
    LeadStatus.CALLING,
    LeadStatus.FOLLOW_UP,
    LeadStatus.PASSIVE,
    LeadStatus.BLACKLIST,
  ],
  [LeadStatus.CALLING]: [
    LeadStatus.POTENTIAL,
    LeadStatus.FOLLOW_UP,
    LeadStatus.PASSIVE,
    LeadStatus.BLACKLIST,
  ],
  [LeadStatus.FOLLOW_UP]: [
    LeadStatus.CALLING,
    LeadStatus.POTENTIAL,
    LeadStatus.PASSIVE,
  ],
  [LeadStatus.POTENTIAL]: [
    LeadStatus.AGREED,
    LeadStatus.FOLLOW_UP,
    LeadStatus.PASSIVE,
  ],
  [LeadStatus.AGREED]: [LeadStatus.IN_PORTFOLIO, LeadStatus.FOLLOW_UP],
  [LeadStatus.IN_PORTFOLIO]: [],
  [LeadStatus.PASSIVE]: [LeadStatus.TO_CALL, LeadStatus.FOLLOW_UP],
  [LeadStatus.BLACKLIST]: [],
};

export enum LeadSource {
  FACEBOOK = "FACEBOOK",
  INSTAGRAM = "INSTAGRAM",
  TELEGRAM = "TELEGRAM",
  PORTAL = "PORTAL",
  BOT = "BOT",
  REFERRAL = "REFERRAL",
  WALK_IN = "WALK_IN",
  MANUAL = "MANUAL",
}

export enum LeadKind {
  OWNER = "OWNER",
  BUYER = "BUYER",
  TENANT_SEEKER = "TENANT_SEEKER",
}

export const LEAD_KIND_LABELS: Record<LeadKind, string> = {
  [LeadKind.OWNER]: "Owner",
  [LeadKind.BUYER]: "Buyer",
  [LeadKind.TENANT_SEEKER]: "Tenant seeker",
};

export enum CallResult {
  UNREACHABLE = "UNREACHABLE",
  BUSY = "BUSY",
  FOLLOW_UP = "FOLLOW_UP",
  SELLING_OWN = "SELLING_OWN",
  WITH_COMPETITOR = "WITH_COMPETITOR",
  HOT_LEAD = "HOT_LEAD",
  AGREED = "AGREED",
  NOT_INTERESTED = "NOT_INTERESTED",
  DEAL_IN_PROGRESS = "DEAL_IN_PROGRESS",
  CONVERTED = "CONVERTED",
}

export const CALL_RESULT_LABELS: Record<CallResult, string> = {
  [CallResult.UNREACHABLE]: "Unreachable",
  [CallResult.BUSY]: "Busy",
  [CallResult.FOLLOW_UP]: "Call back later",
  [CallResult.SELLING_OWN]: "Selling own",
  [CallResult.WITH_COMPETITOR]: "With competitor",
  [CallResult.HOT_LEAD]: "Hot lead",
  [CallResult.AGREED]: "Agreed",
  [CallResult.NOT_INTERESTED]: "Not interested",
  [CallResult.DEAL_IN_PROGRESS]: "In progress",
  [CallResult.CONVERTED]: "Converted",
};

export enum CallDirection {
  OUTBOUND = "OUTBOUND",
  INBOUND = "INBOUND",
}

export enum PropertyStatus {
  NEW = "NEW",
  CONTACTED = "CONTACTED",
  NEGOTIATION = "NEGOTIATION",
  ACCEPTED = "ACCEPTED",
  ONBOARDING_PENDING = "ONBOARDING_PENDING",
  ACTIVE_LISTING = "ACTIVE_LISTING",
  SOLD = "SOLD",
  RENTED = "RENTED",
}

export const PROPERTY_TRANSITIONS: Record<PropertyStatus, PropertyStatus[]> = {
  [PropertyStatus.NEW]: [PropertyStatus.CONTACTED],
  [PropertyStatus.CONTACTED]: [PropertyStatus.NEGOTIATION],
  [PropertyStatus.NEGOTIATION]: [PropertyStatus.ACCEPTED],
  [PropertyStatus.ACCEPTED]: [PropertyStatus.ONBOARDING_PENDING],
  [PropertyStatus.ONBOARDING_PENDING]: [PropertyStatus.ACTIVE_LISTING],
  [PropertyStatus.ACTIVE_LISTING]: [PropertyStatus.SOLD, PropertyStatus.RENTED],
  [PropertyStatus.SOLD]: [],
  [PropertyStatus.RENTED]: [PropertyStatus.ACTIVE_LISTING],
};

export enum PropertyType {
  APARTMENT = "APARTMENT",
  HOUSE = "HOUSE",
  VILLA = "VILLA",
  LAND = "LAND",
  COMMERCIAL = "COMMERCIAL",
  OFFICE = "OFFICE",
}

export enum ListingPurpose {
  SALE = "SALE",
  RENT = "RENT",
}

/**
 * Podgorica neighbourhoods (naselja). The business operates inside the capital,
 * so listings, customer preferences and branches are located by district
 * rather than by Montenegrin town. Ordered roughly centre → outskirts.
 */
export enum Region {
  CENTAR = "CENTAR",
  NOVA_VAROS = "NOVA_VAROS",
  STARA_VAROS = "STARA_VAROS",
  PREKO_MORACE = "PREKO_MORACE",
  CITY_KVART = "CITY_KVART",
  BLOK_V = "BLOK_V",
  BLOK_VI = "BLOK_VI",
  BLOK_IX = "BLOK_IX",
  STARI_AERODROM = "STARI_AERODROM",
  ZABJELO = "ZABJELO",
  CVIJETIN_BRIJEG = "CVIJETIN_BRIJEG",
  SADINE = "SADINE",
  KONIK = "KONIK",
  VRELA_RIBNICKA = "VRELA_RIBNICKA",
  DRAC = "DRAC",
  MOMISICI = "MOMISICI",
  KRUSEVAC = "KRUSEVAC",
  GORICA = "GORICA",
  LJUBOVIC = "LJUBOVIC",
  DAHNA = "DAHNA",
  TOLOSI = "TOLOSI",
  ZAGORIC = "ZAGORIC",
  MASLINE = "MASLINE",
  POBREZJE = "POBREZJE",
  ZLATICA = "ZLATICA",
  MALO_BRDO = "MALO_BRDO",
  KAKARICKA_GORA = "KAKARICKA_GORA",
  TUSKI_PUT = "TUSKI_PUT",
  MURTOVINA = "MURTOVINA",
  CEPURCI = "CEPURCI",
  DONJA_GORICA = "DONJA_GORICA",
  GORNJA_GORICA = "GORNJA_GORICA",
  DONJI_KOKOTI = "DONJI_KOKOTI",
  GORNJI_KOKOTI = "GORNJI_KOKOTI",
  LJESKOPOLJE = "LJESKOPOLJE",
  DAJBABE = "DAJBABE",
  FARMACI = "FARMACI",
  MAREZA = "MAREZA",
  ROGAMI = "ROGAMI",
  DOLJANI = "DOLJANI",
  BERI = "BERI",
  BOTUN = "BOTUN",
  CIJEVNA = "CIJEVNA",
  KUCE_RAKICA = "KUCE_RAKICA",
  TUZI = "TUZI",
  GOLUBOVCI = "GOLUBOVCI",
  ZETA = "ZETA",
  OTHER = "OTHER",
}

/** Display names with proper Montenegrin diacritics. */
export const REGION_LABELS: Record<Region, string> = {
  [Region.CENTAR]: "Centar",
  [Region.NOVA_VAROS]: "Nova Varoš",
  [Region.STARA_VAROS]: "Stara Varoš",
  [Region.PREKO_MORACE]: "Preko Morače",
  [Region.CITY_KVART]: "City Kvart",
  [Region.BLOK_V]: "Blok V",
  [Region.BLOK_VI]: "Blok VI",
  [Region.BLOK_IX]: "Blok IX",
  [Region.STARI_AERODROM]: "Stari Aerodrom",
  [Region.ZABJELO]: "Zabjelo",
  [Region.CVIJETIN_BRIJEG]: "Cvijetin Brijeg",
  [Region.SADINE]: "Sadine",
  [Region.KONIK]: "Konik",
  [Region.VRELA_RIBNICKA]: "Vrela Ribnička",
  [Region.DRAC]: "Drač",
  [Region.MOMISICI]: "Momišići",
  [Region.KRUSEVAC]: "Kruševac",
  [Region.GORICA]: "Gorica",
  [Region.LJUBOVIC]: "Ljubović",
  [Region.DAHNA]: "Dahna",
  [Region.TOLOSI]: "Tološi",
  [Region.ZAGORIC]: "Zagorič",
  [Region.MASLINE]: "Masline",
  [Region.POBREZJE]: "Pobrežje",
  [Region.ZLATICA]: "Zlatica",
  [Region.MALO_BRDO]: "Malo Brdo",
  [Region.KAKARICKA_GORA]: "Kakaricka Gora",
  [Region.TUSKI_PUT]: "Tuški Put",
  [Region.MURTOVINA]: "Murtovina",
  [Region.CEPURCI]: "Čepurci",
  [Region.DONJA_GORICA]: "Donja Gorica",
  [Region.GORNJA_GORICA]: "Gornja Gorica",
  [Region.DONJI_KOKOTI]: "Donji Kokoti",
  [Region.GORNJI_KOKOTI]: "Gornji Kokoti",
  [Region.LJESKOPOLJE]: "Lješkopolje",
  [Region.DAJBABE]: "Dajbabe",
  [Region.FARMACI]: "Farmaci",
  [Region.MAREZA]: "Mareza",
  [Region.ROGAMI]: "Rogami",
  [Region.DOLJANI]: "Doljani",
  [Region.BERI]: "Beri",
  [Region.BOTUN]: "Botun",
  [Region.CIJEVNA]: "Cijevna",
  [Region.KUCE_RAKICA]: "Kuće Rakića",
  [Region.TUZI]: "Tuzi",
  [Region.GOLUBOVCI]: "Golubovci",
  [Region.ZETA]: "Zeta",
  [Region.OTHER]: "Other",
};

export function regionLabel(region: string | null | undefined): string {
  if (!region) return "";
  return REGION_LABELS[region as Region] ?? region;
}

export enum MediaType {
  PHOTO = "PHOTO",
  VIDEO = "VIDEO",
  DRONE = "DRONE",
  FLOORPLAN = "FLOORPLAN",
}

export enum Locale {
  EN = "EN",
  TR = "TR",
  RU = "RU",
  ME = "ME",
}

export const LOCALE_LABELS: Record<Locale, string> = {
  [Locale.EN]: "English",
  [Locale.TR]: "Turkish",
  [Locale.RU]: "Russian",
  [Locale.ME]: "Montenegrin (Crnogorski)",
};

export enum OnboardingStatus {
  PENDING = "PENDING",
  SUBMITTED = "SUBMITTED",
  CHANGES_REQUESTED = "CHANGES_REQUESTED",
  MISSING_INFO = "MISSING_INFO",
  READY_TO_PUBLISH = "READY_TO_PUBLISH",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  EXPIRED = "EXPIRED",
}

export enum OnboardingDecision {
  APPROVE = "APPROVE",
  REQUEST_CHANGES = "REQUEST_CHANGES",
  REJECT = "REJECT",
}

export enum CustomerSegment {
  HOT = "HOT",
  WARM = "WARM",
  COLD = "COLD",
}

export enum CustomerIntent {
  INVESTMENT = "INVESTMENT",
  LIVING = "LIVING",
}

export enum CustomerKind {
  BUYER = "BUYER",
  TENANT = "TENANT",
}

export enum FinancingType {
  CASH = "CASH",
  MORTGAGE = "MORTGAGE",
}

export enum Residency {
  CITIZEN = "CITIZEN",
  FOREIGN = "FOREIGN",
}

export enum BuildType {
  NEW = "NEW",
  OLD = "OLD",
}

export enum OwnerRating {
  EXCELLENT = "EXCELLENT",
  GOOD = "GOOD",
  AVERAGE = "AVERAGE",
  DIFFICULT = "DIFFICULT",
  PROBLEM = "PROBLEM",
  BLACKLIST = "BLACKLIST",
}

export enum TaskType {
  CALL = "CALL",
  FOLLOW_UP = "FOLLOW_UP",
  PHOTO_SHOOT = "PHOTO_SHOOT",
  LISTING = "LISTING",
  CONTENT = "CONTENT",
  MAINTENANCE = "MAINTENANCE",
  KEY_HANDOVER = "KEY_HANDOVER",
}

export enum TaskStatus {
  BACKLOG = "BACKLOG",
  IN_PROGRESS = "IN_PROGRESS",
  DONE = "DONE",
}

export enum TaskPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT",
}

export enum DealStage {
  LEAD = "LEAD",
  CONTACTED = "CONTACTED",
  QUALIFIED = "QUALIFIED",
  OWNER_ACCEPTED = "OWNER_ACCEPTED",
  LISTING_CREATED = "LISTING_CREATED",
  PUBLISHED = "PUBLISHED",
  BUYER_INTERESTED = "BUYER_INTERESTED",
  OFFER = "OFFER",
  DEAL_CLOSED = "DEAL_CLOSED",
  LOST = "LOST",
}

export enum CommChannel {
  WHATSAPP = "WHATSAPP",
  VIBER = "VIBER",
  TELEGRAM = "TELEGRAM",
  SMS = "SMS",
  EMAIL = "EMAIL",
}

export const COMM_CHANNEL_LABELS: Record<CommChannel, string> = {
  [CommChannel.WHATSAPP]: "WhatsApp",
  [CommChannel.VIBER]: "Viber",
  [CommChannel.TELEGRAM]: "Telegram",
  [CommChannel.SMS]: "SMS",
  [CommChannel.EMAIL]: "Email",
};

export enum DeliveryStatus {
  QUEUED = "QUEUED",
  SENT = "SENT",
  DELIVERED = "DELIVERED",
  CLICKED = "CLICKED",
  FAILED = "FAILED",
}

export enum SocialChannel {
  INSTAGRAM = "INSTAGRAM",
  FACEBOOK = "FACEBOOK",
}

export enum SocialPostStatus {
  DRAFT = "DRAFT",
  SCHEDULED = "SCHEDULED",
  PUBLISHED = "PUBLISHED",
  FAILED = "FAILED",
}

export enum RepostStrategy {
  D1 = "D1",
  D7 = "D7",
  PRICE_UPDATE = "PRICE_UPDATE",
}

export enum AppointmentStatus {
  SCHEDULED = "SCHEDULED",
  CONFIRMED = "CONFIRMED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  NO_SHOW = "NO_SHOW",
}

export enum DocumentType {
  CONTRACT = "CONTRACT",
  TITLE_DEED = "TITLE_DEED",
  ID_DOCUMENT = "ID_DOCUMENT",
  FLOORPLAN = "FLOORPLAN",
  INVOICE = "INVOICE",
  LEASE = "LEASE",
  INVENTORY = "INVENTORY",
  HANDOVER = "HANDOVER",
  OTHER = "OTHER",
}

export enum DocumentStatus {
  DRAFT = "DRAFT",
  PENDING_SIGNATURE = "PENDING_SIGNATURE",
  SIGNED = "SIGNED",
  ARCHIVED = "ARCHIVED",
}

export enum CommissionStatus {
  PENDING = "PENDING",
  INVOICED = "INVOICED",
  PAID = "PAID",
  CANCELLED = "CANCELLED",
}

export enum InvoiceStatus {
  DRAFT = "DRAFT",
  SENT = "SENT",
  PAID = "PAID",
  OVERDUE = "OVERDUE",
  CANCELLED = "CANCELLED",
}

export enum NotificationType {
  NEW_LEAD = "NEW_LEAD",
  NEW_CUSTOMER = "NEW_CUSTOMER",
  NEW_MESSAGE = "NEW_MESSAGE",
  LEAD_ASSIGNED = "LEAD_ASSIGNED",
  APPOINTMENT = "APPOINTMENT",
  MATCH = "MATCH",
  DEAL = "DEAL",
  TASK = "TASK",
  CALLBACK = "CALLBACK",
  NEW_PORTFOLIO = "NEW_PORTFOLIO",
  PRICE_UPDATED = "PRICE_UPDATED",
  RENT_DUE = "RENT_DUE",
  RENT_OVERDUE = "RENT_OVERDUE",
  LEASE_EXPIRING = "LEASE_EXPIRING",
  MAINTENANCE = "MAINTENANCE",
  DOCUMENT = "DOCUMENT",
  SYSTEM = "SYSTEM",
}

export enum PricePeriod {
  TOTAL = "TOTAL",
  MONTHLY = "MONTHLY",
  NIGHTLY = "NIGHTLY",
  WEEKLY = "WEEKLY",
}

export const PRICE_PERIOD_SUFFIX: Record<PricePeriod, string> = {
  [PricePeriod.TOTAL]: "",
  [PricePeriod.MONTHLY]: "/mo",
  [PricePeriod.NIGHTLY]: "/night",
  [PricePeriod.WEEKLY]: "/week",
};

export enum RentalTermType {
  LONG_TERM = "LONG_TERM",
  SHORT_TERM = "SHORT_TERM",
  SEASONAL = "SEASONAL",
}

export enum LeaseStatus {
  DRAFT = "DRAFT",
  APPLICATION = "APPLICATION",
  APPROVED = "APPROVED",
  ACTIVE = "ACTIVE",
  NOTICE_GIVEN = "NOTICE_GIVEN",
  EXPIRED = "EXPIRED",
  TERMINATED = "TERMINATED",
}

export const LEASE_STATUS_LABELS: Record<LeaseStatus, string> = {
  [LeaseStatus.DRAFT]: "Draft",
  [LeaseStatus.APPLICATION]: "Application",
  [LeaseStatus.APPROVED]: "Approved",
  [LeaseStatus.ACTIVE]: "Active",
  [LeaseStatus.NOTICE_GIVEN]: "Notice given",
  [LeaseStatus.EXPIRED]: "Expired",
  [LeaseStatus.TERMINATED]: "Terminated",
};

export enum RentalPipelineStage {
  APPLICATION = "APPLICATION",
  SCREENING = "SCREENING",
  LEASE_SIGNED = "LEASE_SIGNED",
  MOVE_IN = "MOVE_IN",
  ACTIVE = "ACTIVE",
  NOTICE = "NOTICE",
  VACATED = "VACATED",
}

export const RENTAL_PIPELINE_LABELS: Record<RentalPipelineStage, string> = {
  [RentalPipelineStage.APPLICATION]: "Application",
  [RentalPipelineStage.SCREENING]: "Screening",
  [RentalPipelineStage.LEASE_SIGNED]: "Lease signed",
  [RentalPipelineStage.MOVE_IN]: "Move-in",
  [RentalPipelineStage.ACTIVE]: "Active tenancy",
  [RentalPipelineStage.NOTICE]: "Notice period",
  [RentalPipelineStage.VACATED]: "Vacated",
};

export enum RentPaymentStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  OVERDUE = "OVERDUE",
  PARTIAL = "PARTIAL",
  WAIVED = "WAIVED",
}

export enum DepositStatus {
  HELD = "HELD",
  PARTIALLY_RETURNED = "PARTIALLY_RETURNED",
  RETURNED = "RETURNED",
  FORFEITED = "FORFEITED",
}

export enum PayoutStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  CANCELLED = "CANCELLED",
}

export enum MaintenanceStatus {
  OPEN = "OPEN",
  IN_PROGRESS = "IN_PROGRESS",
  SCHEDULED = "SCHEDULED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum MaintenancePriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT",
}

export enum HandoverType {
  CHECK_IN = "CHECK_IN",
  CHECK_OUT = "CHECK_OUT",
  KEY_HANDOVER = "KEY_HANDOVER",
}

export enum AvailabilityKind {
  BOOKED = "BOOKED",
  BLOCKED = "BLOCKED",
  OWNER_USE = "OWNER_USE",
  LEASE = "LEASE",
}

export enum AppointmentKind {
  VIEWING = "VIEWING",
  CHECK_IN = "CHECK_IN",
  CHECK_OUT = "CHECK_OUT",
  KEY_HANDOVER = "KEY_HANDOVER",
  INSPECTION = "INSPECTION",
}

export enum PaymentMethod {
  CASH = "CASH",
  BANK_TRANSFER = "BANK_TRANSFER",
  CARD = "CARD",
  OTHER = "OTHER",
}
