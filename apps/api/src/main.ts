import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { useJsonBody } from "./common/json-body";
import type { Env } from "./config/env";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.disable("x-powered-by");
  useJsonBody(app.getHttpAdapter().getInstance(), config.get("API_KEY", { infer: true }));
  app.enableShutdownHooks();

  const port = config.get("PORT", { infer: true });
  await app.listen(port, "0.0.0.0");
  new Logger("Bootstrap").log(`API listening on port ${port}`);
}

void bootstrap();
