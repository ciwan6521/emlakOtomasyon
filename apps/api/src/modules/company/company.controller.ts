import { Body, Controller, Get, Patch } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Permission, Scope } from "@reos/shared";
import { RequirePermissions } from "../../common/auth/decorators";
import { CompanyService } from "./company.service";
import { UpdateCompanyDto } from "./dto";

@ApiTags("company")
@ApiBearerAuth()
@Controller("company")
export class CompanyController {
  constructor(private readonly company: CompanyService) {}

  @Get()
  get() {
    return this.company.get();
  }

  @Patch()
  @RequirePermissions({
    permission: Permission.USER_MANAGE,
    scope: Scope.COMPANY,
  })
  update(@Body() dto: UpdateCompanyDto) {
    return this.company.update(dto);
  }
}
