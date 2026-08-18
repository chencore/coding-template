import { Controller, Get, Inject, Res } from "@nestjs/common";
import type { Response } from "express";
import { HealthService } from "./health.service";
import { LlmProbe } from "./llm.probe";

@Controller("health")
export class HealthController {
  // 显式 @Inject：tsx/esbuild 不保证 emitDecoratorMetadata，不能依赖按类型注入
  constructor(
    @Inject(HealthService) private readonly health: HealthService,
    @Inject(LlmProbe) private readonly llm: LlmProbe,
  ) {}

  /** 服务 + 数据库健康检查；db 断开时降级为 503，进程不崩溃 */
  @Get()
  async check(@Res() res: Response) {
    const db = await this.health.checkDb();
    const ok = db === "up";
    res.status(ok ? 200 : 503).json({
      status: ok ? "ok" : "degraded",
      db,
    });
  }

  /** LLM（火山方舟）连通探针：up / not_configured / unreachable 三态 */
  @Get("llm")
  async checkLlm(@Res() res: Response) {
    const result = await this.llm.probe();
    res.status(result.llm === "up" ? 200 : 503).json(result);
  }
}
