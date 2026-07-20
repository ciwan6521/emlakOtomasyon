import { Injectable, NotFoundException } from "@nestjs/common";

import { OnEvent } from "@nestjs/event-emitter";

import {
  DomainEvent,
  LeadAssignedPayload,
  OnboardingApprovedPayload,
  OnboardingSubmittedPayload,
  PropertyEventPayload,
  TaskDto,
  TaskStatus,
  TaskType,
} from "@reos/shared";

import { PrismaService } from "../../common/prisma/prisma.service";

import { TenantStore } from "../../common/tenant/tenant-context";

import { CreateTaskDto, ListTasksQuery, UpdateTaskDto } from "./dto";

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma.scoped;
  }

  private toDto(t: any): TaskDto {
    return {
      id: t.id,

      title: t.title,

      type: t.type,

      status: t.status,

      priority: t.priority,

      assigneeId: t.assigneeId,

      assigneeName: t.assignee?.fullName ?? null,

      dueAt: t.dueAt ? t.dueAt.toISOString() : null,

      relatedEntity: t.relatedEntity,

      relatedEntityId: t.relatedEntityId,

      createdAt: t.createdAt.toISOString(),
    };
  }

  async create(dto: CreateTaskDto): Promise<TaskDto> {
    const { companyId, branchId } = TenantStore.require();

    const t = await this.db.task.create({
      data: {
        companyId: companyId!,

        title: dto.title,

        description: dto.description,

        type: dto.type,

        priority: dto.priority ?? "MEDIUM",

        assigneeId: dto.assigneeId,

        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,

        relatedEntity: dto.relatedEntity,

        relatedEntityId: dto.relatedEntityId,

        branchId,
      },

      include: { assignee: { select: { fullName: true } } },
    });

    return this.toDto(t);
  }

  async board(query: ListTasksQuery): Promise<Record<TaskStatus, TaskDto[]>> {
    const where: Record<string, unknown> = {};

    if (query.assigneeId) where.assigneeId = query.assigneeId;

    if (query.type) where.type = query.type;

    const tasks = await this.db.task.findMany({
      where,

      orderBy: [{ position: "asc" }, { createdAt: "desc" }],

      include: { assignee: { select: { fullName: true } } },
    });

    const board: Record<TaskStatus, TaskDto[]> = {
      [TaskStatus.BACKLOG]: [],
      [TaskStatus.IN_PROGRESS]: [],
      [TaskStatus.DONE]: [],
    };

    for (const t of tasks) board[t.status as TaskStatus].push(this.toDto(t));

    return board;
  }

  async update(id: string, dto: UpdateTaskDto): Promise<TaskDto> {
    const exists = await this.db.task.findFirst({
      where: { id },
      select: { id: true },
    });

    if (!exists) throw new NotFoundException("Task not found");

    const t = await this.db.task.update({
      where: { id },

      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),

        ...(dto.status !== undefined ? { status: dto.status } : {}),

        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),

        ...(dto.assigneeId !== undefined ? { assigneeId: dto.assigneeId } : {}),

        ...(dto.position !== undefined ? { position: dto.position } : {}),

        ...(dto.dueAt !== undefined
          ? { dueAt: dto.dueAt ? new Date(dto.dueAt) : null }
          : {}),
      },

      include: { assignee: { select: { fullName: true } } },
    });

    return this.toDto(t);
  }

  @OnEvent(DomainEvent.LEAD_ASSIGNED)
  async onLeadAssigned(payload: LeadAssignedPayload): Promise<void> {
    const lead = await this.prisma.lead.findFirst({
      where: { id: payload.leadId, companyId: payload.companyId },
    });

    if (!lead) return;

    await this.prisma.task.create({
      data: {
        companyId: payload.companyId,

        branchId: payload.branchId,

        title: `Call: ${lead.fullName}`,

        type: TaskType.CALL,

        priority: lead.score >= 70 ? "HIGH" : "MEDIUM",

        assigneeId: payload.agentId,

        relatedEntity: "lead",

        relatedEntityId: lead.id,
      },
    });
  }

  @OnEvent(DomainEvent.ONBOARDING_SUBMITTED)
  async onOnboardingSubmitted(
    payload: OnboardingSubmittedPayload,
  ): Promise<void> {
    const session = await this.prisma.onboardingSession.findFirst({
      where: { id: payload.sessionId, companyId: payload.companyId },
    });

    if (!session) return;

    const contentManagers = await this.prisma.user.findMany({
      where: {
        companyId: payload.companyId,
        deletedAt: null,
        roles: { has: "CONTENT_MANAGER" },
      },

      select: { id: true },
      take: 3,
    });

    for (const u of contentManagers) {
      await this.prisma.task.create({
        data: {
          companyId: payload.companyId,

          title: `Review: ${session.ownerName ?? "New listing"}`,

          type: TaskType.CONTENT,

          priority: "HIGH",

          assigneeId: u.id,

          relatedEntity: "onboarding",

          relatedEntityId: session.id,
        },
      });
    }
  }

  @OnEvent(DomainEvent.ONBOARDING_APPROVED)
  async onOnboardingApproved(
    payload: OnboardingApprovedPayload,
  ): Promise<void> {
    const photographers = await this.prisma.user.findMany({
      where: {
        companyId: payload.companyId,
        deletedAt: null,
        roles: { has: "PHOTOGRAPHER" },
      },

      select: { id: true },
      take: 2,
    });

    for (const u of photographers) {
      await this.prisma.task.create({
        data: {
          companyId: payload.companyId,

          branchId: payload.branchId,

          title: "Schedule photo shoot",

          type: TaskType.PHOTO_SHOOT,

          priority: "MEDIUM",

          assigneeId: u.id,

          relatedEntity: "property",

          relatedEntityId: payload.propertyId,
        },
      });
    }

    await this.prisma.task.create({
      data: {
        companyId: payload.companyId,

        branchId: payload.branchId,

        title: "Publish listing and verify price",

        type: TaskType.LISTING,

        priority: "HIGH",

        relatedEntity: "property",

        relatedEntityId: payload.propertyId,
      },
    });
  }

  @OnEvent(DomainEvent.PROPERTY_PUBLISHED)
  async onPropertyPublished(payload: PropertyEventPayload): Promise<void> {
    const property = await this.prisma.property.findFirst({
      where: { id: payload.propertyId, companyId: payload.companyId },
    });

    if (!property?.leadId) return;

    const lead = await this.prisma.lead.findFirst({
      where: { id: property.leadId },
    });

    if (!lead?.assignedToId) return;

    await this.prisma.task.create({
      data: {
        companyId: payload.companyId,

        branchId: payload.branchId,

        title: `Follow-up call: ${lead.fullName}`,

        type: TaskType.FOLLOW_UP,

        priority: "MEDIUM",

        assigneeId: lead.assignedToId,

        dueAt: new Date(Date.now() + 3 * 86400_000),

        relatedEntity: "lead",

        relatedEntityId: lead.id,
      },
    });
  }
}
