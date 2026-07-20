import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, from } from "rxjs";
import { switchMap, tap } from "rxjs/operators";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "./audit.service";

const MUTATING_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

const PRISMA_MODEL: Record<string, string> = {
  lead: "lead",
  property: "property",
  customer: "customer",
  task: "task",
  deal: "deal",
  appointment: "appointment",
  document: "document",
  user: "user",
  branch: "branch",
  company: "company",
  owner: "ownerProfile",
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly audit: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const method: string = req.method;
    if (!MUTATING_METHODS.has(method)) return next.handle();

    const controller = context.getClass().name.replace(/Controller$/, "");
    const entity = controller.toLowerCase();
    const entityId = req.params?.id ?? null;
    const action =
      method === "POST" ? "CREATE" : method === "DELETE" ? "DELETE" : "UPDATE";

    const beforePromise =
      (method === "PATCH" || method === "PUT" || method === "DELETE") &&
      entityId
        ? this.fetchBefore(entity, entityId)
        : Promise.resolve(undefined);

    return from(beforePromise).pipe(
      switchMap((before) =>
        next.handle().pipe(
          tap((result) => {
            void this.audit.record({
              action,
              entity,
              entityId: entityId ?? (result as { id?: string })?.id ?? null,
              before,
              after: method !== "DELETE" ? result : undefined,
            });
          }),
        ),
      ),
    );
  }

  private async fetchBefore(entity: string, id: string): Promise<unknown> {
    const key = PRISMA_MODEL[entity];
    if (!key) return undefined;
    const delegate = (
      this.prisma as unknown as Record<
        string,
        { findFirst?: (args: unknown) => Promise<unknown> }
      >
    )[key];
    if (!delegate?.findFirst) return undefined;
    try {
      return await delegate.findFirst({ where: { id } });
    } catch {
      return undefined;
    }
  }
}
