import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";
import { DbProbe } from "./db.probe";
import { LlmProbe } from "./llm.probe";

@Module({
  controllers: [HealthController],
  providers: [HealthService, DbProbe, LlmProbe],
})
export class HealthModule {}
