import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

export interface PresignResult {
  uploadUrl: string;

  key: string;

  publicUrl: string;
  expiresInSeconds: number;
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  /** Signs browser upload URLs against the public HTTPS host, not the internal Docker one. */
  private readonly signClient: S3Client;
  private readonly bucket: string;
  private readonly endpoint: string;
  private readonly forcePathStyle: boolean;
  private readonly publicBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.endpoint = this.config.get<string>("s3.endpoint")!;
    this.bucket = this.config.get<string>("s3.bucket")!;
    this.forcePathStyle = this.config.get<boolean>("s3.forcePathStyle") ?? true;
    this.publicBaseUrl = process.env.S3_PUBLIC_URL ?? this.endpoint;
    const credentials = {
      accessKeyId: this.config.get<string>("s3.accessKey")!,
      secretAccessKey: this.config.get<string>("s3.secretKey")!,
    };
    const region = this.config.get<string>("s3.region")!;
    this.client = new S3Client({
      region,
      endpoint: this.endpoint,
      forcePathStyle: this.forcePathStyle,
      credentials,
    });
    // getSignedUrl embeds the client endpoint in the URL. Signing with
    // http://minio:9000 makes the browser PUT over HTTP (mixed content) to a
    // host it cannot reach. Use the public media origin when it is HTTPS.
    const signEndpoint = this.publicBaseUrl.startsWith("https://")
      ? this.publicBaseUrl
      : this.endpoint;
    this.signClient =
      signEndpoint === this.endpoint
        ? this.client
        : new S3Client({
            region,
            endpoint: signEndpoint,
            forcePathStyle: this.forcePathStyle,
            credentials,
          });
  }

  async onModuleInit(): Promise<void> {
    // Best-effort bucket bootstrap (dev/MinIO). Never block app startup on it.
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.client.send(
          new CreateBucketCommand({ Bucket: this.bucket }),
        );
        this.logger.log(`Created storage bucket "${this.bucket}"`);
      } catch (err) {
        this.logger.warn(
          `Storage bucket not ready ("${this.bucket}"): ${(err as Error).message}`,
        );
        return;
      }
    }
    await this.ensurePublicRead();
    await this.ensureCors();
  }

  private async ensurePublicRead(): Promise<void> {
    const policy = {
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "PublicReadGetObject",
          Effect: "Allow",
          Principal: "*",
          Action: ["s3:GetObject"],
          Resource: [`arn:aws:s3:::${this.bucket}/*`],
        },
      ],
    };
    try {
      await this.client.send(
        new PutBucketPolicyCommand({
          Bucket: this.bucket,
          Policy: JSON.stringify(policy),
        }),
      );
    } catch (err) {
      this.logger.warn(
        `Could not set public-read policy: ${(err as Error).message}`,
      );
    }
  }

  private async ensureCors(): Promise<void> {
    const origins = [
      process.env.APP_URL,
      ...(process.env.API_CORS_ORIGINS ?? "").split(","),
    ]
      .map((o) => o?.trim())
      .filter((o): o is string => !!o && /^https?:\/\//.test(o));
    const unique = [...new Set(origins)];
    if (unique.length === 0) return;
    try {
      await this.client.send(
        new PutBucketCorsCommand({
          Bucket: this.bucket,
          CORSConfiguration: {
            CORSRules: [
              {
                AllowedOrigins: unique,
                AllowedMethods: ["GET", "PUT", "HEAD"],
                AllowedHeaders: ["*"],
                ExposeHeaders: ["ETag", "x-amz-request-id"],
                MaxAgeSeconds: 3600,
              },
            ],
          },
        }),
      );
    } catch (err) {
      this.logger.warn(`Could not set bucket CORS: ${(err as Error).message}`);
    }
  }

  async presignUpload(params: {
    prefix: string;
    filename: string;
    contentType: string;
    expiresInSeconds?: number;
  }): Promise<PresignResult> {
    const ext = sanitizeExt(params.filename);
    const key = `${params.prefix.replace(/(^\/|\/$)/g, "")}/${randomUUID()}${ext}`;
    const expiresIn = params.expiresInSeconds ?? 900;
    const uploadUrl = await getSignedUrl(
      this.signClient,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: params.contentType,
      }),
      { expiresIn },
    );
    return {
      uploadUrl,
      key,
      publicUrl: this.publicUrl(key),
      expiresInSeconds: expiresIn,
    };
  }

  publicUrl(key: string): string {
    const base = this.publicBaseUrl.replace(/\/$/, "");
    return this.forcePathStyle
      ? `${base}/${this.bucket}/${key}`
      : `${base}/${key}`;
  }
}

const ALLOWED_EXT = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".mp4",
  ".mov",
  ".pdf",
]);
function sanitizeExt(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot < 0) return "";
  const ext = filename.slice(dot).toLowerCase();
  return ALLOWED_EXT.has(ext) ? ext : "";
}
