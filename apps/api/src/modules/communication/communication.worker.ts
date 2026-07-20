import { Injectable, Logger, OnModuleInit } from "@nestjs/common";

import {
  CommChannel,
  DeliveryStatus,
  DomainEvent,
  QueueName,
} from "@reos/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { EventBus } from "../../common/events/event-bus";
import { QueueService } from "../../common/queue/queue.service";

import { MessagingAdapter } from "../integrations/messaging.adapter";

import { CommunicationService } from "./communication.service";

interface SendJob {
  companyId?: string;

  deliveryId?: string;

  trackingId?: string;

  channel?: CommChannel;

  recipient?: string;

  body?: string;

  subject?: string;

  propertyId?: string;
}

@Injectable()
export class CommunicationWorker implements OnModuleInit {
  private readonly logger = new Logger(CommunicationWorker.name);

  constructor(
    private readonly queue: QueueService,

    private readonly prisma: PrismaService,

    private readonly messaging: MessagingAdapter,

    private readonly comms: CommunicationService,

    private readonly events: EventBus,
  ) {}

  onModuleInit(): void {
    this.queue.registerWorker<SendJob>(QueueName.COMMUNICATION, async (job) => {
      if (
        job.name === "property-broadcast" &&
        job.data.companyId &&
        job.data.propertyId
      ) {
        await this.comms.createPropertyBroadcastCampaign(
          job.data.companyId,
          job.data.propertyId,
        );

        return;
      }

      const { deliveryId, trackingId, channel, recipient, body, subject } =
        job.data;

      if (!deliveryId || !trackingId || !channel || !recipient || !body) return;

      const result = await this.messaging.send({
        channel,
        to: recipient,
        body,
        subject,
        trackingId,
      });

      await this.prisma.messageDelivery.update({
        where: { id: deliveryId },

        data: result.ok
          ? { status: DeliveryStatus.SENT, sentAt: new Date() }
          : { status: DeliveryStatus.FAILED, errorMessage: result.error },
      });

      const delivery = await this.prisma.messageDelivery.findFirst({
        where: { id: deliveryId },
      });
      const companyId = delivery?.companyId;

      if (!result.ok) throw new Error(result.error);

      await this.prisma.messageDelivery.update({
        where: { id: deliveryId },

        data: { status: DeliveryStatus.DELIVERED, deliveredAt: new Date() },
      });

      if (companyId) {
        this.events.publish(DomainEvent.DELIVERY_UPDATED, {
          companyId,
          deliveryId,
          status: DeliveryStatus.DELIVERED,
          occurredAt: new Date().toISOString(),
        });
      }
    });

    this.logger.log("Communication worker registered");
  }
}
