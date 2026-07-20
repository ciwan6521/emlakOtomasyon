import { Module } from "@nestjs/common";
import { LeadsModule } from "../leads/leads.module";
import { PublicIntakeController } from "./public-intake.controller";
import { PublicIntakeService } from "./public-intake.service";

@Module({
  imports: [LeadsModule],
  controllers: [PublicIntakeController],
  providers: [PublicIntakeService],
})
export class PublicIntakeModule {}
