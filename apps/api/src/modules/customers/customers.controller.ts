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
import { RequirePermissions } from "../../common/auth/decorators";
import {
  CreateCustomerDto,
  ListCustomersQuery,
  UpdateCustomerDto,
} from "./dto";
import { CustomersService } from "./customers.service";

@ApiTags("customers")
@ApiBearerAuth()
@Controller("customers")
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @RequirePermissions({
    permission: Permission.CUSTOMER_VIEW,
    scope: Scope.OWN,
  })
  list(@Query() query: ListCustomersQuery) {
    return this.customers.list(query);
  }

  @Post()
  @RequirePermissions({
    permission: Permission.CUSTOMER_MANAGE,
    scope: Scope.OWN,
  })
  create(@Body() dto: CreateCustomerDto) {
    return this.customers.create(dto);
  }

  @Get(":id/detail")
  @RequirePermissions({
    permission: Permission.CUSTOMER_VIEW,
    scope: Scope.OWN,
  })
  detail(@Param("id") id: string) {
    return this.customers.getDetail(id);
  }

  @Get(":id")
  @RequirePermissions({
    permission: Permission.CUSTOMER_VIEW,
    scope: Scope.OWN,
  })
  get(@Param("id") id: string) {
    return this.customers.getDetail(id);
  }

  @Patch(":id")
  @RequirePermissions({
    permission: Permission.CUSTOMER_MANAGE,
    scope: Scope.OWN,
  })
  update(@Param("id") id: string, @Body() dto: UpdateCustomerDto) {
    return this.customers.update(id, dto);
  }
}
