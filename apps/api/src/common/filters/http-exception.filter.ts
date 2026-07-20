import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { ApiError } from "@reos/shared";
import { randomUUID } from "node:crypto";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();
    const traceId = randomUUID();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let title = "Internal Server Error";
    let detail: string | undefined;
    let errors: Record<string, string[]> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === "string") {
        title = response;
      } else if (typeof response === "object" && response) {
        const r = response as Record<string, unknown>;
        title = (r.error as string) ?? exception.name;
        detail = Array.isArray(r.message) ? undefined : (r.message as string);
        if (Array.isArray(r.message)) {
          errors = { _: r.message as string[] };
        }
      }
    } else if (exception instanceof Error) {
      detail = exception.message;
    }

    if (status >= 500) {
      this.logger.error(
        `[${traceId}] ${req.method} ${req.url}`,
        (exception as Error)?.stack,
      );
    }

    const body: ApiError = {
      type: `https://reos.dev/errors/${status}`,
      title,
      status,
      detail,
      errors,
      traceId,
    };
    res.status(status).json(body);
  }
}
