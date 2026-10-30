import { Injectable, Logger } from "@nestjs/common";
import { Locale, LOCALE_LABELS, Region, regionLabel } from "@reos/shared";

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
    // Indicative asking prices per m² across Podgorica; central districts
    // command a premium, outlying villages trade well below the city average.
    const base: Partial<Record<Region, number>> = {
      [Region.CENTAR]: 2600,
      [Region.PREKO_MORACE]: 2500,
      [Region.CITY_KVART]: 2400,
      [Region.NOVA_VAROS]: 2300,
      [Region.GORICA]: 2300,
      [Region.LJUBOVIC]: 2200,
      [Region.KRUSEVAC]: 2200,
      [Region.STARA_VAROS]: 2000,
      [Region.BLOK_V]: 2000,
      [Region.BLOK_VI]: 1950,
      [Region.BLOK_IX]: 1900,
      [Region.STARI_AERODROM]: 1900,
      [Region.MOMISICI]: 1900,
      [Region.DAHNA]: 1850,
      [Region.MALO_BRDO]: 1800,
      [Region.ZABJELO]: 1750,
      [Region.TOLOSI]: 1700,
      [Region.ZAGORIC]: 1650,
      [Region.MASLINE]: 1650,
      [Region.DRAC]: 1600,
      [Region.ZLATICA]: 1550,
      [Region.POBREZJE]: 1500,
      [Region.DONJA_GORICA]: 1500,
      [Region.KONIK]: 1300,
      [Region.VRELA_RIBNICKA]: 1300,
      [Region.TUZI]: 1200,
      [Region.GOLUBOVCI]: 1150,
    };
    const perM2 = base[ctx.region as Region] ?? 1400;
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

const cap = (s: string) => regionLabel(s) || s;
const hashtags = (c: ListingContext) =>
  [
    "#podgorica",
    "#montenegro",
    `#${regionLabel(c.region)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/gi, "d")
      .replace(/[^a-z0-9]/gi, "")
      .toLowerCase()}`,
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
