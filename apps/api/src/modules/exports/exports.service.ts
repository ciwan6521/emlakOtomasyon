import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

function csvCell(value: unknown): string {
  if (value == null) return "";
  const s = value instanceof Date ? value.toISOString() : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(row.map(csvCell).join(","));
  return lines.join("\n");
}

@Injectable()
export class ExportsService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma.scoped;
  }

  async leads(): Promise<string> {
    const rows = await this.db.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: 5000,
    });
    return toCsv(
      [
        "id",
        "fullName",
        "phone",
        "email",
        "kind",
        "source",
        "status",
        "score",
        "region",
        "createdAt",
      ],
      rows.map((l) => [
        l.id,
        l.fullName,
        l.phone,
        l.email,
        l.kind,
        l.source,
        l.status,
        l.score,
        l.region,
        l.createdAt,
      ]),
    );
  }

  async properties(): Promise<string> {
    const rows = await this.db.property.findMany({
      orderBy: { createdAt: "desc" },
      take: 5000,
    });
    return toCsv(
      [
        "id",
        "reference",
        "title",
        "type",
        "purpose",
        "status",
        "region",
        "price",
        "currency",
        "rooms",
        "sizeM2",
        "createdAt",
      ],
      rows.map((p) => [
        p.id,
        p.reference,
        p.title,
        p.type,
        p.purpose,
        p.status,
        p.region,
        p.price,
        p.currency,
        p.rooms,
        p.sizeM2,
        p.createdAt,
      ]),
    );
  }

  async customers(): Promise<string> {
    const rows = await this.db.customer.findMany({
      orderBy: { createdAt: "desc" },
      take: 5000,
    });
    return toCsv(
      [
        "id",
        "fullName",
        "phone",
        "email",
        "kind",
        "intent",
        "segment",
        "budgetMin",
        "budgetMax",
        "createdAt",
      ],
      rows.map((c) => [
        c.id,
        c.fullName,
        c.phone,
        c.email,
        c.kind,
        c.intent,
        c.segment,
        c.budgetMin,
        c.budgetMax,
        c.createdAt,
      ]),
    );
  }

  async deals(): Promise<string> {
    const rows = await this.db.deal.findMany({
      orderBy: { createdAt: "desc" },
      take: 5000,
    });
    return toCsv(
      [
        "id",
        "title",
        "stage",
        "value",
        "currency",
        "probability",
        "closedAt",
        "createdAt",
      ],
      rows.map((d) => [
        d.id,
        d.title,
        d.stage,
        d.value,
        d.currency,
        d.probability,
        d.closedAt,
        d.createdAt,
      ]),
    );
  }
}
