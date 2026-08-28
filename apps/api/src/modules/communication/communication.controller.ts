import { Body, Controller, Get, Param, Post, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { Permission, Scope } from "@reos/shared";
import { Public, RequirePermissions } from "../../common/auth/decorators";
import { CreateCampaignDto, CreateTemplateDto } from "./dto";
import { CommunicationService } from "./communication.service";
import { MessagingAdapter } from "../integrations/messaging.adapter";

@ApiTags("communication")
@Controller()
export class CommunicationController {
  constructor(
    private readonly comms: CommunicationService,
    private readonly messaging: MessagingAdapter,
  ) {}

  @ApiBearerAuth()
  @Get("templates")
  @RequirePermissions({
    permission: Permission.COMMS_SEND,
    scope: Scope.BRANCH,
  })
  listTemplates() {
    return this.comms.listTemplates();
  }

  @ApiBearerAuth()
  @Post("templates")
  @RequirePermissions({
    permission: Permission.COMMS_TEMPLATE_MANAGE,
    scope: Scope.COMPANY,
  })
  createTemplate(@Body() dto: CreateTemplateDto) {
    return this.comms.createTemplate(dto);
  }

  @ApiBearerAuth()
  @Get("campaigns")
  @RequirePermissions({
    permission: Permission.COMMS_SEND,
    scope: Scope.BRANCH,
  })
  listCampaigns() {
    return this.comms.listCampaigns();
  }

  @ApiBearerAuth()
  @Post("campaigns")
  @RequirePermissions({
    permission: Permission.COMMS_SEND,
    scope: Scope.BRANCH,
  })
  createCampaign(@Body() dto: CreateCampaignDto) {
    return this.comms.createCampaign(dto);
  }

  @ApiBearerAuth()
  @Post("campaigns/:id/dispatch")
  @RequirePermissions({
    permission: Permission.COMMS_SEND,
    scope: Scope.BRANCH,
  })
  dispatch(@Param("id") id: string) {
    return this.comms.dispatch(id);
  }

  @ApiBearerAuth()
  @Get("campaigns/:id/deliveries")
  @RequirePermissions({
    permission: Permission.COMMS_SEND,
    scope: Scope.BRANCH,
  })
  deliveries(@Param("id") id: string) {
    return this.comms.deliveries(id);
  }

  @ApiBearerAuth()
  @Get("integrations/status")
  @RequirePermissions({
    permission: Permission.COMMS_SEND,
    scope: Scope.BRANCH,
  })
  integrationStatus() {
    return {
      mode: process.env.INTEGRATIONS_MODE ?? "simulated",
      channels: this.messaging.status(),
    };
  }

  @Public()
  @Get("t/:trackingId")
  async track(@Param("trackingId") trackingId: string, @Res() res: Response) {
    await this.comms.trackClick(trackingId);
    res.redirect(302, process.env.APP_URL ?? "http://localhost:3000");
  }
}
