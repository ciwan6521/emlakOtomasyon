import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Permission, Scope } from "@reos/shared";
import { RequirePermissions } from "../../common/auth/decorators";
import { AppointmentsService } from "./appointments.service";
import {
  ChangeAppointmentStatusDto,
  CreateAppointmentDto,
  ListAppointmentsQuery,
  UpdateAppointmentDto,
} from "./dto";

@ApiTags("appointments")
@ApiBearerAuth()
@Controller("appointments")
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Get()
  @RequirePermissions({
    permission: Permission.APPOINTMENT_VIEW,
    scope: Scope.OWN,
  })
  list(@Query() query: ListAppointmentsQuery) {
    return this.appointments.list(query);
  }

  @Post()
  @RequirePermissions({
    permission: Permission.APPOINTMENT_MANAGE,
    scope: Scope.OWN,
  })
  create(@Body() dto: CreateAppointmentDto) {
    return this.appointments.create(dto);
  }

  @Get(":id")
  @RequirePermissions({
    permission: Permission.APPOINTMENT_VIEW,
    scope: Scope.OWN,
  })
  get(@Param("id") id: string) {
    return this.appointments.get(id);
  }

  @Patch(":id")
  @RequirePermissions({
    permission: Permission.APPOINTMENT_MANAGE,
    scope: Scope.OWN,
  })
  update(@Param("id") id: string, @Body() dto: UpdateAppointmentDto) {
    return this.appointments.update(id, dto);
  }

  @Post(":id/status")
  @RequirePermissions({
    permission: Permission.APPOINTMENT_MANAGE,
    scope: Scope.OWN,
  })
  changeStatus(
    @Param("id") id: string,
    @Body() dto: ChangeAppointmentStatusDto,
  ) {
    return this.appointments.changeStatus(id, dto);
  }

  @Delete(":id")
  @RequirePermissions({
    permission: Permission.APPOINTMENT_MANAGE,
    scope: Scope.OWN,
  })
  remove(@Param("id") id: string) {
    return this.appointments.remove(id);
  }
}
