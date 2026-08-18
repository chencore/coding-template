import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api");

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  logger.log(`server listening on port ${port}`);
}

void bootstrap();
