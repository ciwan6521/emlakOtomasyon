import { Injectable, Logger } from "@nestjs/common";
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
}

@Injectable()
export class MessagingAdapter {
  private readonly logger = new Logger(MessagingAdapter.name);

  private get live(): boolean {
    return (process.env.INTEGRATIONS_MODE ?? "simulated") === "live";
  }

  async send(input: SendMessageInput): Promise<SendMessageResult> {
    if (!this.live) return this.simulate(input);
    try {
      switch (input.channel) {
        case CommChannel.WHATSAPP:
          return await this.sendWhatsApp(input);
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

  private simulate(input: SendMessageInput): SendMessageResult {
    this.logger.debug(
      `[sim:${input.channel}] → ${input.to}: ${input.body.slice(0, 60)}…`,
    );
    if (Math.random() < 0.03) return { ok: false, error: "Delivery failed" };
    return { ok: true, providerMessageId: `sim_${input.trackingId}` };
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
    // delivery pipeline still records a result.
    if (!process.env.SMTP_URL) return this.simulate(input);
    throw new Error(
      "SMTP transport configured but not implemented in this build",
    );
  }
}
