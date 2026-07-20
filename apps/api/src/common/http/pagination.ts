import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { Paginated } from "@reos/shared";

export class PaginationQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 25;

  @IsOptional()
  @IsString()
  sort?: string; // e.g. "-createdAt"

  get skip(): number {
    return (this.page - 1) * this.pageSize;
  }

  orderBy(fallback = "createdAt"): Record<string, "asc" | "desc"> {
    const raw = this.sort ?? `-${fallback}`;
    const desc = raw.startsWith("-");
    const field = desc ? raw.slice(1) : raw;
    return { [field]: desc ? "desc" : "asc" };
  }
}

export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
): Paginated<T> {
  return {
    data,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}
