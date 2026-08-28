import { Injectable, Logger } from "@nestjs/common";
import { Locale, LOCALE_LABELS } from "@reos/shared";

export interface ListingContext {
  title: string;
  type: string;
  region: string;
  rooms: string;
  sizeM2: number;
  price: number;
  currency: string;
}

@Injectable()
export class AiAdapter {
  private readonly logger = new Logger(AiAdapter.name);

  private get useOpenAi(): boolean {
    return (
      (process.env.AI_PROVIDER ?? "simulated") === "openai" &&
      !!process.env.OPENAI_API_KEY
    );
  }

  async describe(
    ctx: ListingContext,
    locale: Locale,
  ): Promise<{ title: string; description: string }> {
    if (this.useOpenAi) {
      try {
        const langName = LOCALE_NAMES[locale];
        const content = await this.chat([
          {
            role: "system",
            content:
              "You are a senior real-estate copywriter for a premium agency on the Montenegrin coast. " +
              "Write a vivid but factual listing description in 2-3 sentences. Return plain text only.",
          },
          {
            role: "user",
            content:
              `Write the description in ${langName}. Property: ${ctx.title}, type ${ctx.type}, ` +
              `${ctx.rooms} rooms, ${ctx.sizeM2} m², in ${cap(ctx.region)}, priced ${fmt(ctx.price, ctx.currency)}.`,
          },
        ]);
        if (content) return { title: ctx.title, description: content.trim() };
      } catch (err) {
        this.logger.warn(
          `OpenAI describe() failed, falling back to template: ${(err as Error).message}`,
        );
      }
    }
    return { title: ctx.title, description: SIM_TEMPLATES[locale](ctx) };
  }

  /** Short social caption with hashtags for an Instagram/Facebook post. */
  async caption(
    ctx: ListingContext,
    locale: Locale,
  ): Promise<{ caption: string }> {
    if (this.useOpenAi) {
      try {
        const content = await this.chat([
          {
            role: "system",
            content:
              "You write short social media captions for a premium Montenegrin real-estate agency. " +
              "Two sentences maximum, then 3-5 relevant hashtags on a new line. Return plain text only.",
          },
          {
            role: "user",
            content:
              `Write the caption in ${LOCALE_NAMES[locale]}. Property: ${ctx.title}, type ${ctx.type}, ` +
              `${ctx.rooms} rooms, ${ctx.sizeM2} m², in ${cap(ctx.region)}, priced ${fmt(ctx.price, ctx.currency)}.`,
          },
        ]);
        if (content) return { caption: content.trim() };
      } catch (err) {
        this.logger.warn(
          `OpenAI caption() failed, falling back to template: ${(err as Error).message}`,
        );
      }
    }
    return {
      caption: `${SIM_TEMPLATES[locale](ctx)}\n${hashtags(ctx)}`,
    };
  }

  async suggestPrice(ctx: {
    region: string;
    type: string;
    sizeM2: number;
  }): Promise<{ suggested: number; rationale: string }> {
    const base: Record<string, number> = {
      BUDVA: 3200,
      KOTOR: 3000,
      TIVAT: 3500,
      BAR: 2200,
      HERCEG_NOVI: 2400,
      PODGORICA: 1800,
    };
    const perM2 = base[ctx.region] ?? 2000;
    const suggested = Math.round(perM2 * ctx.sizeM2);
    return {
      suggested,
      rationale: `Based on ~${perM2} EUR/m² for ${ctx.type} in ${cap(ctx.region)}.`,
    };
  }

  async insight(
    question: string,
    metrics: Record<string, unknown>,
  ): Promise<{ answer: string }> {
    if (this.useOpenAi) {
      try {
        const content = await this.chat([
          {
            role: "system",
            content:
              "You are a real-estate operations analyst. Given JSON metrics, answer the question concisely " +
              "with concrete, actionable recommendations. Max 4 sentences.",
          },
          {
            role: "user",
            content: `Question: ${question}\nMetrics: ${JSON.stringify(metrics)}`,
          },
        ]);
        if (content) return { answer: content.trim() };
      } catch (err) {
        this.logger.warn(
          `OpenAI insight() failed, falling back: ${(err as Error).message}`,
        );
      }
    }
    return {
      answer:
        `Analysis for "${question}":\n` +
        `Based on current metrics (${JSON.stringify(metrics)}), the main drivers are lead volume and call conversion. ` +
        `Regions with declining activity should be prioritized for outbound campaigns; agents below the conversion median need coaching.`,
    };
  }

  private async chat(
    messages: Array<{ role: string; content: string }>,
  ): Promise<string | null> {
    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 400,
      }),
    });
    if (!res.ok)
      throw new Error(`OpenAI HTTP ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return json.choices?.[0]?.message?.content ?? null;
  }
}

const LOCALE_NAMES: Record<Locale, string> = LOCALE_LABELS;

const SIM_TEMPLATES: Record<Locale, (c: ListingContext) => string> = {
  [Locale.EN]: (c) =>
    `Bright ${c.rooms} ${c.type.toLowerCase()} of ${c.sizeM2} m² in ${cap(c.region)}. Excellent location, ready to move in. Priced at ${fmt(c.price, c.currency)}.`,
  [Locale.TR]: (c) =>
    `${cap(c.region)} bölgesinde ${c.sizeM2} m² ${c.rooms} ${typeTr(c.type)}. Merkezi konum, hemen taşınmaya hazır. Fiyat: ${fmt(c.price, c.currency)}.`,
  [Locale.RU]: (c) =>
    `Светлая ${c.type.toLowerCase()} ${c.rooms}, ${c.sizeM2} м² в районе ${cap(c.region)}. Отличное расположение. Цена: ${fmt(c.price, c.currency)}.`,
  [Locale.ME]: (c) =>
    `Svijetao ${c.type.toLowerCase()} ${c.rooms}, ${c.sizeM2} m² u ${cap(c.region)}. Odlična lokacija, useljivo odmah. Cijena: ${fmt(c.price, c.currency)}.`,
};

const cap = (s: string) =>
  s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
const hashtags = (c: ListingContext) =>
  [
    "#montenegro",
    `#${c.region.toLowerCase().replace(/_/g, "")}`,
    `#${c.type.toLowerCase()}`,
    "#realestate",
    "#nekretnine",
  ].join(" ");
const fmt = (n: number, c: string) => `${n.toLocaleString("en-US")} ${c}`;
const typeTr = (t: string) =>
  (
    ({
      APARTMENT: "daire",
      HOUSE: "ev",
      VILLA: "villa",
      LAND: "arsa",
      COMMERCIAL: "ticari",
      OFFICE: "ofis",
    }) as Record<string, string>
  )[t] ?? t;
