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
import { PaginationQuery } from "../../common/http/pagination";
import {
  CreateAvailabilityDto,
  CreateHandoverDto,
  CreateLeaseDto,
  CreateMaintenanceDto,
  CreatePayoutDto,
  ListLeasesQuery,
  ListMaintenanceQuery,
  ListPaymentsQuery,
  RecordPaymentDto,
  UpdateLeaseDto,
  UpdateMaintenanceDto,
} from "./dto";
import { RentalsService } from "./rentals.service";

@ApiTags("rentals")
@ApiBearerAuth()
@Controller("rentals")
export class RentalsController {
  constructor(private readonly rentals: RentalsService) {}

  @Get("overview")
  @RequirePermissions({
    permission: Permission.RENTAL_VIEW,
    scope: Scope.BRANCH,
  })
  overview() {
    return this.rentals.overview();
  }

  @Get("leases")
  @RequirePermissions({
    permission: Permission.RENTAL_VIEW,
    scope: Scope.BRANCH,
  })
  listLeases(@Query() q: ListLeasesQuery) {
    return this.rentals.listLeases(q);
  }

  @Post("leases")
  @RequirePermissions({
    permission: Permission.RENTAL_MANAGE,
    scope: Scope.BRANCH,
  })
  createLease(@Body() dto: CreateLeaseDto) {
    return this.rentals.createLease(dto);
  }

  @Get("leases/:id")
  @RequirePermissions({
    permission: Permission.RENTAL_VIEW,
    scope: Scope.BRANCH,
  })
  getLease(@Param("id") id: string) {
    return this.rentals.getLease(id);
  }

  @Patch("leases/:id")
  @RequirePermissions({
    permission: Permission.RENTAL_MANAGE,
    scope: Scope.BRANCH,
  })
  updateLease(@Param("id") id: string, @Body() dto: UpdateLeaseDto) {
    return this.rentals.updateLease(id, dto);
  }

  @Post("leases/:id/activate")
  @RequirePermissions({
    permission: Permission.RENTAL_MANAGE,
    scope: Scope.BRANCH,
  })
  activateLease(@Param("id") id: string) {
    return this.rentals.activateLease(id);
  }

  @Post("leases/:id/terminate")
  @RequirePermissions({
    permission: Permission.RENTAL_MANAGE,
    scope: Scope.BRANCH,
  })
  terminateLease(@Param("id") id: string, @Body("notes") notes?: string) {
    return this.rentals.terminateLease(id, notes);
  }

  @Get("payments")
  @RequirePermissions({
    permission: Permission.RENTAL_VIEW,
    scope: Scope.BRANCH,
  })
  listPayments(@Query() q: ListPaymentsQuery) {
    return this.rentals.listPayments(q);
  }

  @Patch("payments/:id/record")
  @RequirePermissions({
    permission: Permission.RENTAL_MANAGE,
    scope: Scope.BRANCH,
  })
  recordPayment(@Param("id") id: string, @Body() dto: RecordPaymentDto) {
    return this.rentals.recordPayment(id, dto);
  }

  @Get("payouts")
  @RequirePermissions({
    permission: Permission.RENTAL_VIEW,
    scope: Scope.BRANCH,
  })
  listPayouts(@Query() q: PaginationQuery) {
    return this.rentals.listPayouts(q);
  }

  @Post("payouts")
  @RequirePermissions({
    permission: Permission.RENTAL_MANAGE,
    scope: Scope.BRANCH,
  })
  createPayout(@Body() dto: CreatePayoutDto) {
    return this.rentals.createPayout(dto);
  }

  @Post("payouts/:id/mark-paid")
  @RequirePermissions({
    permission: Permission.RENTAL_MANAGE,
    scope: Scope.BRANCH,
  })
  markPayoutPaid(@Param("id") id: string) {
    return this.rentals.markPayoutPaid(id);
  }

  @Get("maintenance")
  @RequirePermissions({
    permission: Permission.RENTAL_VIEW,
    scope: Scope.BRANCH,
  })
  listMaintenance(@Query() q: ListMaintenanceQuery) {
    return this.rentals.listMaintenance(q);
  }

  @Post("maintenance")
  @RequirePermissions({
    permission: Permission.RENTAL_MANAGE,
    scope: Scope.BRANCH,
  })
  createMaintenance(@Body() dto: CreateMaintenanceDto) {
    return this.rentals.createMaintenance(dto);
  }

  @Patch("maintenance/:id")
  @RequirePermissions({
    permission: Permission.RENTAL_MANAGE,
    scope: Scope.BRANCH,
  })
  updateMaintenance(
    @Param("id") id: string,
    @Body() dto: UpdateMaintenanceDto,
  ) {
    return this.rentals.updateMaintenance(id, dto);
  }

  @Post("handovers")
  @RequirePermissions({
    permission: Permission.RENTAL_MANAGE,
    scope: Scope.BRANCH,
  })
  createHandover(@Body() dto: CreateHandoverDto) {
    return this.rentals.createHandover(dto);
  }

  @Get("leases/:id/handovers")
  @RequirePermissions({
    permission: Permission.RENTAL_VIEW,
    scope: Scope.BRANCH,
  })
  listHandovers(@Param("id") id: string) {
    return this.rentals.listHandovers(id);
  }

  @Get("availability/:propertyId")
  @RequirePermissions({
    permission: Permission.RENTAL_VIEW,
    scope: Scope.BRANCH,
  })
  listAvailability(
    @Param("propertyId") propertyId: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.rentals.listAvailability(propertyId, from, to);
  }

  @Post("availability")
  @RequirePermissions({
    permission: Permission.RENTAL_MANAGE,
    scope: Scope.BRANCH,
  })
  createAvailability(@Body() dto: CreateAvailabilityDto) {
    return this.rentals.createAvailability(dto);
  }

  @Delete("availability/:id")
  @RequirePermissions({
    permission: Permission.RENTAL_MANAGE,
    scope: Scope.BRANCH,
  })
  deleteAvailability(@Param("id") id: string) {
    return this.rentals.deleteAvailability(id);
  }
}
