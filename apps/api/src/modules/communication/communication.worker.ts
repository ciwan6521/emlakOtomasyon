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

      // Channels with a status webhook stay at SENT until the provider calls
      // back; the rest are terminal as soon as the provider accepts them.
      const status = !result.ok
        ? DeliveryStatus.FAILED
        : result.deliveredSynchronously
          ? DeliveryStatus.DELIVERED
          : DeliveryStatus.SENT;

      const delivery = await this.prisma.messageDelivery.update({
        where: { id: deliveryId },
        data: {
          status,
          providerMessageId: result.providerMessageId,
          sentAt: result.ok ? new Date() : undefined,
          deliveredAt:
            status === DeliveryStatus.DELIVERED ? new Date() : undefined,
          errorMessage: result.ok ? null : result.error,
        },
      });

      if (delivery.companyId) {
        this.events.publish(DomainEvent.DELIVERY_UPDATED, {
          companyId: delivery.companyId,
          deliveryId,
          status,
          occurredAt: new Date().toISOString(),
        });
      }

      // Throw after persisting so BullMQ retries the send.
      if (!result.ok) throw new Error(result.error);
    });

    this.logger.log("Communication worker registered");
  }
}
