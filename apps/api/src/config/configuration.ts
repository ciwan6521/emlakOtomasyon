export interface AppConfig {
  env: string;
  api: { port: number; globalPrefix: string; corsOrigins: string[] };
  database: { url: string };
  redis: { host: string; port: number; password?: string };
  jwt: {
    accessSecret: string;
    accessTtl: number;
    refreshSecret: string;
    refreshTtl: number;
  };
  s3: {
    endpoint: string;
    region: string;
    accessKey: string;
    secretKey: string;
    bucket: string;
    forcePathStyle: boolean;
  };
  rateLimit: { ttl: number; max: number };
  integrations: { mode: string };
  ai: { provider: string };
}

export default (): AppConfig => ({
  env: process.env.NODE_ENV ?? "development",
  api: {
    port: parseInt(process.env.API_PORT ?? "4000", 10),
    globalPrefix: process.env.API_GLOBAL_PREFIX ?? "api/v1",
    corsOrigins: (
      process.env.API_CORS_ORIGINS ?? "http://localhost:3000"
    ).split(","),
  },
  database: {
    url: process.env.DATABASE_URL ?? "",
  },
  redis: {
    host: process.env.REDIS_HOST ?? "localhost",
    port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  jwt: {
    accessSecret:
      process.env.JWT_ACCESS_SECRET ?? "dev_access_secret_change_me_change_me",
    accessTtl: parseInt(process.env.JWT_ACCESS_TTL ?? "900", 10),
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ??
      "dev_refresh_secret_change_me_change_me",
    refreshTtl: parseInt(process.env.JWT_REFRESH_TTL ?? "2592000", 10),
  },
  s3: {
    endpoint: process.env.S3_ENDPOINT ?? "http://localhost:9000",
    region: process.env.S3_REGION ?? "us-east-1",
    accessKey: process.env.S3_ACCESS_KEY ?? "reos-minio",
    secretKey: process.env.S3_SECRET_KEY ?? "reos-minio-secret",
    bucket: process.env.S3_BUCKET ?? "reos-media",
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? "true") === "true",
  },
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL ?? "60", 10),
    max: parseInt(process.env.RATE_LIMIT_MAX ?? "120", 10),
  },
  integrations: { mode: process.env.INTEGRATIONS_MODE ?? "simulated" },
  ai: { provider: process.env.AI_PROVIDER ?? "simulated" },
});
