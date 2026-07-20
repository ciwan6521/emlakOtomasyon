import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { Type } from "class-transformer";
import { CallResult, Permission, Scope } from "@reos/shared";
import { RequirePermissions } from "../../common/auth/decorators";
import { CallCenterService } from "./call-center.service";

class CallResultDto {
  @IsEnum(CallResult) result!: CallResult;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() followUpAt?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) durationSec?: number;
}

class QueueQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 20;
}

class AuditQuery {
  @IsOptional() @IsString() agentId?: string;
  @IsOptional() @IsEnum(CallResult) result?: CallResult;
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
}

@ApiTags("call-center")
@ApiBearerAuth()
@Controller("calls")
export class CallCenterController {
  constructor(private readonly calls: CallCenterService) {}

  @Get("queue")
  @RequirePermissions({
    permission: Permission.CALL_RUN_QUEUE,
    scope: Scope.OWN,
  })
  queue(@Query() q: QueueQuery) {
    return this.calls.queue(q.limit);
  }

  @Post("lead/:leadId/result")
  @RequirePermissions({ permission: Permission.CALL_LOG, scope: Scope.OWN })
  logResult(@Param("leadId") leadId: string, @Body() dto: CallResultDto) {
    return this.calls.logResult(leadId, dto);
  }

  @Get("audit")
  @RequirePermissions({
    permission: Permission.CALL_AUDIT,
    scope: Scope.BRANCH,
  })
  audit(@Query() q: AuditQuery) {
    return this.calls.audit(q);
  }
}
