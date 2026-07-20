import { Global, Module } from "@nestjs/common";
import { AuditService } from "./audit/audit.service";
import { ContactMaskingService } from "./security/contact-masking.service";

@Global()
@Module({
  providers: [AuditService, ContactMaskingService],
  exports: [AuditService, ContactMaskingService],
})
export class CommonModule {}
