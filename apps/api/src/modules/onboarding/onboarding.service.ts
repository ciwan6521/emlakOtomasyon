import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { customAlphabet } from "nanoid";
import {
  DomainEvent,
  OnboardingDecision,
  OnboardingStatus,
  OwnerAcceptedPayload,
  PropertyStatus,
} from "@reos/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { EventBus } from "../../common/events/event-bus";
import { StorageService } from "../../common/storage/storage.service";
import { TenantStore } from "../../common/tenant/tenant-context";
import { ReviewDto, SubmitOnboardingDto } from "./dto";

const tokenGen = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 32);
const ONBOARDING_TTL_DAYS = 14;

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventBus,
    private readonly storage: StorageService,
  ) {}

  private get db() {
    return this.prisma.scoped;
  }

  @OnEvent(DomainEvent.OWNER_ACCEPTED)
  async onOwnerAccepted(payload: OwnerAcceptedPayload): Promise<void> {
    const lead = await this.prisma.lead.findFirst({
      where: { id: payload.leadId, companyId: payload.companyId },
    });
    const existing = await this.prisma.onboardingSession.findFirst({
      where: {
        companyId: payload.companyId,
        leadId: payload.leadId,
        status: { in: ["PENDING", "SUBMITTED", "CHANGES_REQUESTED"] },
      },
    });
    if (existing) return;

    await this.prisma.onboardingSession.create({
      data: {
        companyId: payload.companyId,
        leadId: payload.leadId,
        token: tokenGen(),
        ownerName: lead?.fullName,
        ownerPhone: lead?.phone,
        status: OnboardingStatus.PENDING,
        expiresAt: new Date(Date.now() + ONBOARDING_TTL_DAYS * 86400_000),
      },
    });
  }

  async createSession(
    leadId?: string,
  ): Promise<{ token: string; url: string }> {
    const { companyId } = TenantStore.require();
    const session = await this.db.onboardingSession.create({
      data: {
        companyId: companyId!,
        leadId,
        token: tokenGen(),
        status: OnboardingStatus.PENDING,
        expiresAt: new Date(Date.now() + ONBOARDING_TTL_DAYS * 86400_000),
      },
    });
    return { token: session.token, url: `/onboard/${session.token}` };
  }

  async getByToken(token: string) {
    const session = await this.prisma.onboardingSession.findUnique({
      where: { token },
    });
    if (!session || session.deletedAt)
      throw new NotFoundException("Invalid link");
    if (session.expiresAt < new Date()) {
      throw new BadRequestException("This onboarding link has expired");
    }
    return {
      status: session.status,
      ownerName: session.ownerName,
      payload: session.payload,
      reviewNotes: session.reviewNotes,
    };
  }

  async presignUpload(
    token: string,
    dto: { filename: string; contentType: string },
  ) {
    const session = await this.prisma.onboardingSession.findUnique({
      where: { token },
    });
    if (!session || session.deletedAt)
      throw new NotFoundException("Invalid link");
    if (session.expiresAt < new Date())
      throw new BadRequestException("This onboarding link has expired");
    return this.storage.presignUpload({
      prefix: `onboarding/${session.companyId}/${session.id}`,
      filename: dto.filename,
      contentType: dto.contentType,
    });
  }

  async submit(token: string, dto: SubmitOnboardingDto) {
    const session = await this.prisma.onboardingSession.findUnique({
      where: { token },
    });
    if (!session) throw new NotFoundException("Invalid link");
    if (
      ![OnboardingStatus.PENDING, OnboardingStatus.CHANGES_REQUESTED].includes(
        session.status as OnboardingStatus,
      )
    ) {
      throw new BadRequestException("This submission is no longer editable");
    }
    const updated = await this.prisma.onboardingSession.update({
      where: { token },
      data: {
        status: OnboardingStatus.SUBMITTED,
        ownerName: dto.ownerName,
        ownerPhone: dto.ownerPhone,
        payload: dto as unknown as object,
        submittedAt: new Date(),
      },
    });
    this.events.publish(DomainEvent.ONBOARDING_SUBMITTED, {
      companyId: session.companyId,
      sessionId: session.id,
      occurredAt: new Date().toISOString(),
    });
    return { status: updated.status };
  }

  async reviewQueue(status?: string) {
    const statuses = status
      ? [status]
      : ["SUBMITTED", "CHANGES_REQUESTED", "MISSING_INFO", "READY_TO_PUBLISH"];
    return this.db.onboardingSession.findMany({
      where: { status: { in: statuses as any } },
      orderBy: { submittedAt: "asc" },
    });
  }

  async review(id: string, dto: ReviewDto) {
    const { companyId, branchId, userId } = TenantStore.require();
    const session = await this.db.onboardingSession.findFirst({
      where: { id },
    });
    if (!session) throw new NotFoundException("Session not found");
    if (session.status !== OnboardingStatus.SUBMITTED) {
      throw new BadRequestException("Only submitted sessions can be reviewed");
    }

    if (dto.decision === OnboardingDecision.REQUEST_CHANGES) {
      await this.db.onboardingSession.update({
        where: { id },
        data: {
          status: OnboardingStatus.CHANGES_REQUESTED,
          reviewNotes: dto.notes,
          reviewerId: userId,
          reviewedAt: new Date(),
        },
      });
      return { status: OnboardingStatus.CHANGES_REQUESTED };
    }
    if (dto.decision === OnboardingDecision.REJECT) {
      await this.db.onboardingSession.update({
        where: { id },
        data: {
          status: OnboardingStatus.REJECTED,
          reviewNotes: dto.notes,
          reviewerId: userId,
          reviewedAt: new Date(),
        },
      });
      return { status: OnboardingStatus.REJECTED };
    }

    // APPROVE → materialize a Property from the submitted payload.
    const p = (session.payload ?? {}) as any;
    const property = await this.prisma.property.create({
      data: {
        companyId,
        branchId,
        leadId: session.leadId ?? undefined,
        reference: `OWN-${tokenGen().slice(0, 6).toUpperCase()}`,
        title: p.title ?? `${session.ownerName ?? "Owner"} property`,
        type: p.type ?? "APARTMENT",
        purpose: p.purpose ?? "SALE",
        status: PropertyStatus.ONBOARDING_PENDING,
        region: p.region ?? "OTHER",
        address: p.address ?? "",
        latitude: p.latitude,
        longitude: p.longitude,
        price: p.price ?? 0,
        rooms: p.rooms ?? "1+1",
        sizeM2: p.sizeM2 ?? 0,
        floor: p.floor,
        monthlyDues: p.monthlyDues,
        description: p.notes,
        ownerName: session.ownerName ?? p.ownerName ?? "",
        ownerPhone: session.ownerPhone ?? p.ownerPhone ?? "",
        media: {
          create: (p.mediaUrls ?? []).map((url: string, i: number) => ({
            companyId,
            type: "PHOTO",
            url,
            position: i,
            isCover: i === 0,
          })),
        },
      },
    });

    await this.db.onboardingSession.update({
      where: { id },
      data: {
        status: OnboardingStatus.APPROVED,
        propertyId: property.id,
        reviewerId: userId,
        reviewedAt: new Date(),
      },
    });

    this.events.publish(DomainEvent.ONBOARDING_APPROVED, {
      companyId,
      branchId,
      sessionId: id,
      propertyId: property.id,
      occurredAt: new Date().toISOString(),
    });
    return { status: OnboardingStatus.APPROVED, propertyId: property.id };
  }
}
