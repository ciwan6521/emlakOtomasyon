import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory, Reflector } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { JwtAuthGuard } from "./common/auth/jwt-auth.guard";
import { RbacGuard } from "./common/auth/rbac.guard";
import { AuditInterceptor } from "./common/audit/audit.interceptor";
import { AuditService } from "./common/audit/audit.service";
import { PrismaService } from "./common/prisma/prisma.service";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { TenantInterceptor } from "./common/tenant/tenant.interceptor";

async function bootstrap(): Promise<void> {
  process.on("unhandledRejection", (reason) => {
    // eslint-disable-next-line no-console
    console.error("[unhandledRejection]", reason);
  });

  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);
  const reflector = app.get(Reflector);

  const globalPrefix = config.get<string>("api.globalPrefix")!;
  app.setGlobalPrefix(globalPrefix);

  app.use(helmet());
  app.enableCors({
    origin: config.get<string[]>("api.corsOrigins"),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalGuards(new JwtAuthGuard(reflector), new RbacGuard(reflector));
  app.useGlobalInterceptors(
    new TenantInterceptor(),
    new AuditInterceptor(app.get(AuditService), app.get(PrismaService)),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const isProd = config.get<string>("env") === "production";
  if (isProd) {
    const accessSecret = config.get<string>("jwt.accessSecret") ?? "";
    const refreshSecret = config.get<string>("jwt.refreshSecret") ?? "";
    const weak = (s: string) =>
      s.length < 32 || /change_me|dev_.*_secret/i.test(s);
    if (weak(accessSecret) || weak(refreshSecret)) {
      throw new Error(
        "Set strong JWT_ACCESS_SECRET and JWT_REFRESH_SECRET (32+ chars) in production",
      );
    }
  } else {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("REOS API")
      .setDescription("REOS REST API")
      .setVersion("1.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${globalPrefix}/docs`, app, document);
  }

  const port = config.get<number>("api.port")!;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`REOS API running on http://localhost:${port}/${globalPrefix}`);
}

void bootstrap();
