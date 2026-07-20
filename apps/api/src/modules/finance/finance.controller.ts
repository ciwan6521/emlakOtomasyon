import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Permission, Scope } from "@reos/shared";
import { RequirePermissions } from "../../common/auth/decorators";
import { FinanceService } from "./finance.service";
import {
  ChangeCommissionStatusDto,
  ChangeInvoiceStatusDto,
  CreateCommissionDto,
  CreateInvoiceDto,
  ListCommissionsQuery,
  ListInvoicesQuery,
} from "./dto";

@ApiTags("finance")
@ApiBearerAuth()
@Controller("finance")
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get("summary")
  @RequirePermissions({
    permission: Permission.COMMISSION_VIEW,
    scope: Scope.OWN,
  })
  summary() {
    return this.finance.summary();
  }

  // Commissions
  @Get("commissions")
  @RequirePermissions({
    permission: Permission.COMMISSION_VIEW,
    scope: Scope.OWN,
  })
  listCommissions(@Query() query: ListCommissionsQuery) {
    return this.finance.listCommissions(query);
  }

  @Post("commissions")
  @RequirePermissions({
    permission: Permission.COMMISSION_MANAGE,
    scope: Scope.BRANCH,
  })
  createCommission(@Body() dto: CreateCommissionDto) {
    return this.finance.createCommission(dto);
  }

  @Post("commissions/:id/status")
  @RequirePermissions({
    permission: Permission.COMMISSION_MANAGE,
    scope: Scope.BRANCH,
  })
  changeCommissionStatus(
    @Param("id") id: string,
    @Body() dto: ChangeCommissionStatusDto,
  ) {
    return this.finance.changeCommissionStatus(id, dto);
  }

  // Invoices
  @Get("invoices")
  @RequirePermissions({ permission: Permission.INVOICE_VIEW, scope: Scope.OWN })
  listInvoices(@Query() query: ListInvoicesQuery) {
    return this.finance.listInvoices(query);
  }

  @Post("invoices")
  @RequirePermissions({
    permission: Permission.INVOICE_MANAGE,
    scope: Scope.BRANCH,
  })
  createInvoice(@Body() dto: CreateInvoiceDto) {
    return this.finance.createInvoice(dto);
  }

  @Post("invoices/:id/status")
  @RequirePermissions({
    permission: Permission.INVOICE_MANAGE,
    scope: Scope.BRANCH,
  })
  changeInvoiceStatus(
    @Param("id") id: string,
    @Body() dto: ChangeInvoiceStatusDto,
  ) {
    return this.finance.changeInvoiceStatus(id, dto);
  }
}
