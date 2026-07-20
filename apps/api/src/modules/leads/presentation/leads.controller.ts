import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Permission, Scope } from "@reos/shared";
import { Public, RequirePermissions } from "../../../common/auth/decorators";
import {
  AssignLeadDto,
  CreateLeadDto,
  ListLeadsQuery,
  TransitionLeadDto,
  UpdateLeadDto,
} from "../application/dto";
import { LeadsService } from "../application/leads.service";

@ApiTags("leads")
@ApiBearerAuth()
@Controller("leads")
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  @RequirePermissions({ permission: Permission.LEAD_VIEW, scope: Scope.OWN })
  list(@Query() query: ListLeadsQuery) {
    return this.leads.list(query);
  }

  @Post()
  @RequirePermissions({
    permission: Permission.LEAD_CREATE,
    scope: Scope.BRANCH,
  })
  create(@Body() dto: CreateLeadDto) {
    return this.leads.create(dto);
  }

  @Public()
  @Post("ingest")
  ingest(@Body() dto: CreateLeadDto) {
    return this.leads.ingest(dto);
  }

  @Get(":id/detail")
  @RequirePermissions({ permission: Permission.LEAD_VIEW, scope: Scope.OWN })
  detail(@Param("id") id: string) {
    return this.leads.getDetail(id);
  }

  @Get(":id")
  @RequirePermissions({ permission: Permission.LEAD_VIEW, scope: Scope.OWN })
  get(@Param("id") id: string) {
    return this.leads.getDetail(id);
  }

  @Patch(":id")
  @RequirePermissions({ permission: Permission.LEAD_EDIT, scope: Scope.OWN })
  update(@Param("id") id: string, @Body() dto: UpdateLeadDto) {
    return this.leads.update(id, dto);
  }

  @Post(":id/assign")
  @RequirePermissions({
    permission: Permission.LEAD_ASSIGN,
    scope: Scope.BRANCH,
  })
  assign(@Param("id") id: string, @Body() dto: AssignLeadDto) {
    return this.leads.assign(id, dto);
  }

  @Post(":id/transition")
  @RequirePermissions({
    permission: Permission.LEAD_TRANSITION,
    scope: Scope.OWN,
  })
  transition(@Param("id") id: string, @Body() dto: TransitionLeadDto) {
    return this.leads.transition(id, dto);
  }

  @Get(":id/activities")
  @RequirePermissions({ permission: Permission.LEAD_VIEW, scope: Scope.OWN })
  activities(@Param("id") id: string) {
    return this.leads.activities(id);
  }

  @Post(":id/reveal")
  @RequirePermissions({
    permission: Permission.CONTACT_REVEAL,
    scope: Scope.OWN,
  })
  reveal(@Param("id") id: string) {
    return this.leads.reveal(id);
  }
}
