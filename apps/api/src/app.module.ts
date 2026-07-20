import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import configuration from "./config/configuration";
import { CommonModule } from "./common/common.module";
import { EventsModule } from "./common/events/events.module";
import { PrismaModule } from "./common/prisma/prisma.module";
import { QueueModule } from "./common/queue/queue.module";
import { RealtimeModule } from "./common/realtime/realtime.module";
import { StorageModule } from "./common/storage/storage.module";
import { HealthController } from "./health.controller";
import { AiModule } from "./modules/ai/ai.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { AppointmentsModule } from "./modules/appointments/appointments.module";
import { AuditModule } from "./modules/audit/audit.module";
import { AuthModule } from "./modules/auth/auth.module";
import { BranchesModule } from "./modules/branches/branches.module";
import { CallAssistModule } from "./modules/call-assist/call-assist.module";
import { CallCenterModule } from "./modules/call-center/call-center.module";
import { CommunicationModule } from "./modules/communication/communication.module";
import { CompanyModule } from "./modules/company/company.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { DocumentsModule } from "./modules/documents/documents.module";
import { ExportsModule } from "./modules/exports/exports.module";
import { FinanceModule } from "./modules/finance/finance.module";
import { IntegrationsModule } from "./modules/integrations/integrations.module";
import { LeadsModule } from "./modules/leads/leads.module";
import { MatchingModule } from "./modules/matching/matching.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { OnboardingModule } from "./modules/onboarding/onboarding.module";
import { OwnersModule } from "./modules/owners/owners.module";
import { PipelineModule } from "./modules/pipeline/pipeline.module";
import { PropertiesModule } from "./modules/properties/properties.module";
import { PublicIntakeModule } from "./modules/public-intake/public-intake.module";
import { RentalsModule } from "./modules/rentals/rentals.module";
import { AutomationModule } from "./modules/automation/automation.module";
import { WorkersModule } from "./modules/workers/workers.module";
import { SocialModule } from "./modules/social/social.module";
import { TasksModule } from "./modules/tasks/tasks.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ["../../.env", ".env"],
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>("rateLimit.ttl")! * 1000,
            limit: config.get<number>("rateLimit.max")!,
          },
        ],
      }),
    }),

    // Cross-cutting infrastructure
    PrismaModule,
    EventsModule,
    QueueModule,
    CommonModule,
    IntegrationsModule,
    RealtimeModule,
    StorageModule,

    // Domain modules (bounded contexts)
    NotificationsModule,
    AuthModule,
    UsersModule,
    LeadsModule,
    CallCenterModule,
    CallAssistModule,
    PropertiesModule,
    OnboardingModule,
    CustomersModule,
    MatchingModule,
    TasksModule,
    PipelineModule,
    CommunicationModule,
    SocialModule,
    AnalyticsModule,
    AiModule,
    AuditModule,
    AppointmentsModule,
    DocumentsModule,
    FinanceModule,
    ExportsModule,
    PublicIntakeModule,
    OwnersModule,
    RentalsModule,
    AutomationModule,
    WorkersModule,
    BranchesModule,
    CompanyModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
