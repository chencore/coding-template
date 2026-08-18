import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";

export type LlmStatus = "up" | "not_configured" | "unreachable";

export interface LlmProbeResult {
  llm: LlmStatus;
  /** 便于排查的提示文案；不含密钥与模型响应内容 */
  hint?: string;
}

const PROBE_TIMEOUT_MS = 5000;

/**
 * LLM 连通探针：通过 OpenAI 兼容端点调火山方舟（豆包）。
 * 供应商可替换性原则：换供应商只需改 ARK_BASE_URL / ARK_MODEL_ID。
 * 探针只验证连通与鉴权——不记录 prompt/响应内容，不重试。
 */
@Injectable()
export class LlmProbe {
  private readonly logger = new Logger(LlmProbe.name);

  // 显式 @Inject：tsx/esbuild 不保证 emitDecoratorMetadata，不能依赖按类型注入
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  async probe(): Promise<LlmProbeResult> {
    const startedAt = Date.now();
    const apiKey = this.config.get<string>("ARK_API_KEY");
    const model = this.config.get<string>("ARK_MODEL_ID");
    const baseURL = this.config.get<string>(
      "ARK_BASE_URL",
      "https://ark.cn-beijing.volces.com/api/v3",
    );

    if (!apiKey || !model) {
      this.logger.warn("llm probe: ARK_API_KEY 或 ARK_MODEL_ID 未配置");
      return {
        llm: "not_configured",
        hint: "请在 .env 中配置 ARK_API_KEY 与 ARK_MODEL_ID",
      };
    }

    const client = new OpenAI({ apiKey, baseURL, timeout: PROBE_TIMEOUT_MS, maxRetries: 0 });
    try {
      // 最小请求：1 个 token 的补全，仅验证连通与鉴权
      await client.chat.completions.create({
        model,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
      });
      this.logger.log(`llm probe: up (${Date.now() - startedAt}ms)`);
      return { llm: "up" };
    } catch (err) {
      // 只记错误类别与耗时；不记响应体（可能含请求内容）
      this.logger.warn(
        `llm probe: unreachable (${(err as Error).name}, ${Date.now() - startedAt}ms)`,
      );
      return { llm: "unreachable", hint: "LLM 端点不可达或鉴权失败，请检查网络与密钥" };
    }
  }
}
