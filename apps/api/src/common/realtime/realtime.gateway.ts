import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { OnEvent } from "@nestjs/event-emitter";
import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { DomainEvent } from "@reos/shared";
import { JwtPayload } from "../auth/jwt.strategy";

@WebSocketGateway({
  namespace: "/realtime",
  cors: { origin: true, credentials: true },
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  afterInit(): void {
    this.logger.log("Realtime gateway initialized on /realtime");
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        (client.handshake.auth?.token as string) ??
        (client.handshake.headers?.authorization as string)?.replace(
          "Bearer ",
          "",
        );
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.get<string>("jwt.accessSecret"),
      });
      client.join(`company:${payload.companyId}`);
      if (payload.branchId) client.join(`branch:${payload.branchId}`);
      client.data.user = payload;
    } catch {
      client.disconnect(true);
    }
  }

  private relay(
    event: DomainEvent,
    payload: { companyId: string; branchId?: string | null },
  ): void {
    if (!payload?.companyId) return;
    this.server.to(`company:${payload.companyId}`).emit(event, payload);
  }

  @OnEvent(DomainEvent.LEAD_CREATED)
  onLeadCreated(p: { companyId: string }) {
    this.relay(DomainEvent.LEAD_CREATED, p);
  }

  @OnEvent(DomainEvent.LEAD_ASSIGNED)
  onLeadAssigned(p: { companyId: string }) {
    this.relay(DomainEvent.LEAD_ASSIGNED, p);
  }

  @OnEvent(DomainEvent.LEAD_STATUS_CHANGED)
  onLeadStatus(p: { companyId: string }) {
    this.relay(DomainEvent.LEAD_STATUS_CHANGED, p);
  }

  @OnEvent(DomainEvent.CALL_COMPLETED)
  onCall(p: { companyId: string }) {
    this.relay(DomainEvent.CALL_COMPLETED, p);
  }

  @OnEvent(DomainEvent.PROPERTY_CREATED)
  onProperty(p: { companyId: string }) {
    this.relay(DomainEvent.PROPERTY_CREATED, p);
  }

  @OnEvent(DomainEvent.PROPERTY_PUBLISHED)
  onPropertyPublished(p: { companyId: string }) {
    this.relay(DomainEvent.PROPERTY_PUBLISHED, p);
  }

  @OnEvent(DomainEvent.CUSTOMER_CREATED)
  onCustomerCreated(p: { companyId: string }) {
    this.relay(DomainEvent.CUSTOMER_CREATED, p);
  }

  @OnEvent(DomainEvent.MATCH_GENERATED)
  onMatch(p: { companyId: string }) {
    this.relay(DomainEvent.MATCH_GENERATED, p);
  }

  @OnEvent(DomainEvent.DEAL_STAGE_CHANGED)
  onDeal(p: { companyId: string }) {
    this.relay(DomainEvent.DEAL_STAGE_CHANGED, p);
  }

  @OnEvent(DomainEvent.ASSIGNMENT_CHANGED)
  onAssignment(p: { companyId: string }) {
    this.relay(DomainEvent.ASSIGNMENT_CHANGED, p);
  }

  @OnEvent(DomainEvent.NOTIFICATION_CREATED)
  onNotification(p: { companyId: string }) {
    this.relay(DomainEvent.NOTIFICATION_CREATED, p);
  }

  @OnEvent(DomainEvent.APPOINTMENT_CREATED)
  onAppointment(p: { companyId: string }) {
    this.relay(DomainEvent.APPOINTMENT_CREATED, p);
  }

  @OnEvent(DomainEvent.COMMISSION_CREATED)
  onCommission(p: { companyId: string }) {
    this.relay(DomainEvent.COMMISSION_CREATED, p);
  }
}
