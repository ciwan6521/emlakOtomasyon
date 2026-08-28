import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { CommChannel } from "@reos/shared";

export interface SendMessageInput {
  channel: CommChannel;
  to: string;
  body: string;
  subject?: string;
  trackingId: string;
}

export interface SendMessageResult {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
  /**
   * True when the provider acknowledges delivery synchronously, so no status
   * webhook will ever arrive for this message.
   */
  deliveredSynchronously?: boolean;
}

export interface ChannelStatus {
  channel: CommChannel;
  provider: string;
  configured: boolean;
  live: boolean;
  missingEnv: string[];
}

@Injectable()
export class MessagingAdapter {
  private readonly logger = new Logger(MessagingAdapter.name);
  private mailer?: Transporter;

  private get live(): boolean {
    return (process.env.INTEGRATIONS_MODE ?? "simulated") === "live";
  }

  async send(input: SendMessageInput): Promise<SendMessageResult> {
    if (!this.live) return this.simulate(input);
    try {
      switch (input.channel) {
        case CommChannel.WHATSAPP:
          return await this.sendWhatsApp(input);
        case CommChannel.VIBER:
          return await this.sendViber(input);
        case CommChannel.TELEGRAM:
          return await this.sendTelegram(input);
        case CommChannel.SMS:
          return await this.sendSms(input);
        case CommChannel.EMAIL:
          return await this.sendEmail(input);
        default:
          return this.simulate(input);
      }
    } catch (err) {
      this.logger.error(
        `Live send failed (${input.channel}): ${(err as Error).message}`,
      );
      return { ok: false, error: (err as Error).message };
    }
  }

  /**
   * Per-channel configuration report, surfaced in Settings so operators can see
   * which channels really send and which ones only simulate.
   */
  status(): ChannelStatus[] {
    const live = this.live;
    const report = (
      channel: CommChannel,
      provider: string,
      required: string[],
    ): ChannelStatus => {
      const missingEnv = required.filter((key) => !process.env[key]);
      return {
        channel,
        provider,
        configured: missingEnv.length === 0,
        live: live && missingEnv.length === 0,
        missingEnv,
      };
    };

    return [
      report(CommChannel.WHATSAPP, "WhatsApp Cloud API", [
        "WHATSAPP_API_KEY",
        "WHATSAPP_PHONE_NUMBER_ID",
      ]),
      report(CommChannel.VIBER, "Viber Business Messages", [
        "VIBER_AUTH_TOKEN",
      ]),
      report(CommChannel.TELEGRAM, "Telegram Bot API", ["TELEGRAM_BOT_TOKEN"]),
      report(CommChannel.SMS, "Twilio", [
        "TWILIO_ACCOUNT_SID",
        "TWILIO_AUTH_TOKEN",
        "TWILIO_FROM_NUMBER",
      ]),
      report(CommChannel.EMAIL, "SMTP", ["SMTP_URL", "SMTP_FROM"]),
    ];
  }

  private simulate(input: SendMessageInput): SendMessageResult {
    this.logger.debug(
      `[sim:${input.channel}] → ${input.to}: ${input.body.slice(0, 60)}…`,
    );
    if (Math.random() < 0.03) return { ok: false, error: "Delivery failed" };
    return {
      ok: true,
      providerMessageId: `sim_${input.trackingId}`,
      deliveredSynchronously: true,
    };
  }

  private async sendWhatsApp(
    input: SendMessageInput,
  ): Promise<SendMessageResult> {
    const token = process.env.WHATSAPP_API_KEY;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneId) return this.simulate(input);
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: input.to,
          type: "text",
          text: { body: input.body },
        }),
      },
    );
    if (!res.ok)
      throw new Error(`WhatsApp HTTP ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { messages?: Array<{ id?: string }> };
    return {
      ok: true,
      providerMessageId: json.messages?.[0]?.id ?? `wa_${input.trackingId}`,
    };
  }

  /**
   * Viber Business Messages (Public Account) transactional send.
   * `to` must be the subscriber id the user obtained by messaging the account.
   */
  private async sendViber(input: SendMessageInput): Promise<SendMessageResult> {
    const token = process.env.VIBER_AUTH_TOKEN;
    if (!token) return this.simulate(input);
    const res = await fetch("https://chatapi.viber.com/pa/send_message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Viber-Auth-Token": token,
      },
      body: JSON.stringify({
        receiver: input.to,
        min_api_version: 7,
        sender: {
          name: process.env.VIBER_SENDER_NAME ?? "REOS",
          avatar: process.env.VIBER_SENDER_AVATAR || undefined,
        },
        type: "text",
        text: input.body,
        tracking_data: input.trackingId,
      }),
    });
    if (!res.ok)
      throw new Error(`Viber HTTP ${res.status}: ${await res.text()}`);
    // Viber always answers 200; the real outcome is in the payload status field.
    const json = (await res.json()) as {
      status?: number;
      status_message?: string;
      message_token?: number;
    };
    if (json.status !== 0)
      throw new Error(
        `Viber error ${json.status}: ${json.status_message ?? "unknown"}`,
      );
    return {
      ok: true,
      providerMessageId: String(
        json.message_token ?? `vb_${input.trackingId}`,
      ),
    };
  }

  private async sendTelegram(
    input: SendMessageInput,
  ): Promise<SendMessageResult> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return this.simulate(input);
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: input.to, text: input.body }),
      },
    );
    if (!res.ok)
      throw new Error(`Telegram HTTP ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { result?: { message_id?: number } };
    return {
      ok: true,
      providerMessageId: String(
        json.result?.message_id ?? `tg_${input.trackingId}`,
      ),
      // Telegram has no delivery-receipt webhook for outbound bot messages.
      deliveredSynchronously: true,
    };
  }

  private async sendSms(input: SendMessageInput): Promise<SendMessageResult> {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_NUMBER;
    if (!sid || !token || !from) return this.simulate(input);
    const body = new URLSearchParams({
      To: input.to,
      From: from,
      Body: input.body,
    });
    const statusCallback = this.callbackUrl("twilio");
    if (statusCallback) body.set("StatusCallback", statusCallback);
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        },
        body,
      },
    );
    if (!res.ok)
      throw new Error(`Twilio HTTP ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { sid?: string };
    return {
      ok: true,
      providerMessageId: json.sid ?? `sms_${input.trackingId}`,
    };
  }

  private async sendEmail(input: SendMessageInput): Promise<SendMessageResult> {
    const url = process.env.SMTP_URL;
    const from = process.env.SMTP_FROM;
    if (!url || !from) return this.simulate(input);
    this.mailer ??= nodemailer.createTransport(url);
    const info = await this.mailer.sendMail({
      from,
      to: input.to,
      subject: input.subject ?? "Message from REOS",
      text: input.body,
    });
    if (info.rejected?.length)
      throw new Error(`SMTP rejected recipient ${input.to}`);
    return {
      ok: true,
      providerMessageId: info.messageId ?? `em_${input.trackingId}`,
      // SMTP acceptance is the only signal available without an ESP webhook.
      deliveredSynchronously: true,
    };
  }

  private callbackUrl(provider: string): string | undefined {
    const base = process.env.API_PUBLIC_URL;
    if (!base) return undefined;
    const prefix = process.env.API_GLOBAL_PREFIX ?? "api/v1";
    return `${base.replace(/\/$/, "")}/${prefix}/webhooks/${provider}`;
  }
}
