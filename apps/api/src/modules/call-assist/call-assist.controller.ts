import { Body, Controller, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Permission, Scope } from "@reos/shared";
import { RequirePermissions } from "../../common/auth/decorators";
import { CallAssistSearchDto, CallAssistSendDto } from "./dto";
import { CallAssistService } from "./call-assist.service";

@ApiTags("call-assist")
@ApiBearerAuth()
@Controller("call-assist")
export class CallAssistController {
  constructor(private readonly callAssist: CallAssistService) {}

  @Post("search")
  @RequirePermissions({
    permission: Permission.COMMS_SEND,
    scope: Scope.BRANCH,
  })
  search(@Body() dto: CallAssistSearchDto) {
    return this.callAssist.search(dto);
  }

  @Post("send")
  @RequirePermissions({
    permission: Permission.COMMS_SEND,
    scope: Scope.BRANCH,
  })
  send(@Body() dto: CallAssistSendDto) {
    return this.callAssist.send(dto);
  }
}
