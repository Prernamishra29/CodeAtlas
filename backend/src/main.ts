import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { assertRuntimeSecrets, corsOrigins } from "./common/env";
import { log } from "./common/logger";

async function bootstrap() {
  (BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function toJSON() {
    return Number(this);
  };
  assertRuntimeSecrets();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: ["error", "warn"] });
  app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      hidePoweredBy: true,
    }),
  );
  app.enableCors({
    origin: corsOrigins(),
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  const port = Number(process.env.PORT ?? 3333);
  await app.listen(port);
  log("info", "api.started", { port });
}

void bootstrap();
