import { Module } from "@nestjs/common";
import { OwnersController } from "./owners.controller";
import { OwnersService } from "./owners.service";

@Module({
  controllers: [OwnersController],
  providers: [OwnersService],
  exports: [OwnersService],
})
export class OwnersModule {}
