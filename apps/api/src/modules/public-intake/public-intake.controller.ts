import { Body, Controller, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../../common/auth/decorators";
import { InboundMessageDto, PublicLeadDto } from "./dto";
import { PublicIntakeService } from "./public-intake.service";

@ApiTags("public")
@Controller("public")
export class PublicIntakeController {
  constructor(private readonly intake: PublicIntakeService) {}

  @Public()
  @Post(":slug/leads")
  submitLead(@Param("slug") slug: string, @Body() dto: PublicLeadDto) {
    return this.intake.submitLead(slug, dto);
  }

  @Public()
  @Post(":slug/inbound")
  inbound(@Param("slug") slug: string, @Body() dto: InboundMessageDto) {
    return this.intake.inbound(slug, dto);
  }
}
