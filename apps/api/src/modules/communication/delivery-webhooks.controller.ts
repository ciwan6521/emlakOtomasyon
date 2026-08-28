import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";
import { DeliveryStatus } from "@reos/shared";
import { Public } from "../../common/auth/decorators";
import { CommunicationService } from "./communication.service";

interface WhatsAppStatusPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        statuses?: Array<{
          id?: string;
          status?: string;
          errors?: Array<{ title?: string; message?: string }>;
        }>;
      };
    }>;
  }>;
}

interface ViberCallbackPayload {
  event?: string;
  message_token?: number | string;
  desc?: string;
}

interface TwilioStatusPayload extends Record<string, unknown> {
  MessageSid?: string;
  MessageStatus?: string;
  ErrorMessage?: string;
}

/**
 * Inbound delivery-receipt webhooks. Every route is unauthenticated by design,
 * so each provider's signature must be verified before the payload is trusted.
 */
@ApiExcludeController()
@Controller("webhooks")
export class DeliveryWebhooksController {
  constructor(private readonly comms: CommunicationService) {}

  @Public()
  @Get("whatsapp")
  verifyWhatsApp(
    @Query("hub.mode") mode?: string,
    @Query("hub.verify_token") token?: string,
    @Query("hub.challenge") challenge?: string,
  ): string {
    const expected = process.env.WHATSAPP_VERIFY_TOKEN;
    if (!expected || mode !== "subscribe" || token !== expected)
      throw new ForbiddenException("Invalid verify token");
    return challenge ?? "";
  }

  @Public()
  @Post("whatsapp")
  @HttpCode(200)
  async whatsapp(
    @Req() req: RawBodyRequest<Request>,
    @Body() payload: WhatsAppStatusPayload,
    @Headers("x-hub-signature-256") signature?: string,
  ): Promise<{ received: true }> {
    this.assertHmac({
      secret: process.env.WHATSAPP_APP_SECRET,
      raw: req.rawBody,
      provided: signature?.replace(/^sha256=/, ""),
      encoding: "hex",
    });

    const statuses =
      payload.entry?.flatMap(
        (entry) =>
          entry.changes?.flatMap((change) => change.value?.statuses ?? []) ??
          [],
      ) ?? [];

    for (const status of statuses) {
      if (!status.id) continue;
      await this.comms.applyProviderStatus(
        status.id,
        this.mapWhatsAppStatus(status.status),
        status.errors?.[0]?.message ?? status.errors?.[0]?.title,
      );
    }
    return { received: true };
  }

  @Public()
  @Post("viber")
  @HttpCode(200)
  async viber(
    @Req() req: RawBodyRequest<Request>,
    @Body() payload: ViberCallbackPayload,
    @Headers("x-viber-content-signature") signature?: string,
  ): Promise<{ status: 0 }> {
    this.assertHmac({
      secret: process.env.VIBER_AUTH_TOKEN,
      raw: req.rawBody,
      provided: signature,
      encoding: "hex",
    });

    if (payload.message_token) {
      await this.comms.applyProviderStatus(
        String(payload.message_token),
        this.mapViberEvent(payload.event),
        payload.desc,
      );
    }
    // Viber requires a 200 with this exact shape to keep the webhook active.
    return { status: 0 };
  }

  @Public()
  @Post("twilio")
  @HttpCode(204)
  async twilio(
    @Body() payload: TwilioStatusPayload,
    @Headers("x-twilio-signature") signature?: string,
    @Headers("host") host?: string,
  ): Promise<void> {
    this.assertTwilioSignature(payload, signature, host);
    if (!payload.MessageSid) return;
    await this.comms.applyProviderStatus(
      payload.MessageSid,
      this.mapTwilioStatus(payload.MessageStatus),
      payload.ErrorMessage,
    );
  }

  private mapWhatsAppStatus(status?: string): DeliveryStatus | undefined {
    switch (status) {
      case "sent":
        return DeliveryStatus.SENT;
      case "delivered":
      case "read":
        return DeliveryStatus.DELIVERED;
      case "failed":
        return DeliveryStatus.FAILED;
      default:
        return undefined;
    }
  }

  private mapViberEvent(event?: string): DeliveryStatus | undefined {
    switch (event) {
      case "delivered":
      case "seen":
        return DeliveryStatus.DELIVERED;
      case "failed":
        return DeliveryStatus.FAILED;
      default:
        return undefined;
    }
  }

  private mapTwilioStatus(status?: string): DeliveryStatus | undefined {
    switch (status) {
      case "sent":
        return DeliveryStatus.SENT;
      case "delivered":
        return DeliveryStatus.DELIVERED;
      case "undelivered":
      case "failed":
        return DeliveryStatus.FAILED;
      default:
        return undefined;
    }
  }

  private assertHmac(args: {
    secret?: string;
    raw?: Buffer;
    provided?: string;
    encoding: "hex" | "base64";
  }): void {
    const { secret, raw, provided, encoding } = args;
    if (!secret)
      throw new ForbiddenException("Webhook secret is not configured");
    if (!raw || !provided) throw new ForbiddenException("Missing signature");
    const expected = createHmac("sha256", secret).update(raw).digest(encoding);
    if (!this.safeEqual(expected, provided))
      throw new ForbiddenException("Invalid signature");
  }

  /**
   * Twilio signs the full request URL concatenated with the sorted POST params.
   */
  private assertTwilioSignature(
    payload: Record<string, unknown>,
    provided?: string,
    host?: string,
  ): void {
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!token)
      throw new ForbiddenException("Webhook secret is not configured");
    if (!provided) throw new ForbiddenException("Missing signature");

    const prefix = process.env.API_GLOBAL_PREFIX ?? "api/v1";
    const base =
      process.env.API_PUBLIC_URL?.replace(/\/$/, "") ??
      (host ? `https://${host}` : "");
    const url = `${base}/${prefix}/webhooks/twilio`;

    const payloadString = Object.keys(payload)
      .sort()
      .reduce((acc, key) => acc + key + String(payload[key] ?? ""), url);

    const expected = createHmac("sha1", token)
      .update(Buffer.from(payloadString, "utf-8"))
      .digest("base64");

    if (!this.safeEqual(expected, provided))
      throw new ForbiddenException("Invalid signature");
  }

  private safeEqual(expected: string, provided: string): boolean {
    const a = Buffer.from(expected);
    const b = Buffer.from(provided);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
