import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";

const LLM_TIMEOUT_MS = 8000;

/** 方舟密钥/模型未配置：各场景按自己的降级策略处理（bank 兜底 / 回应缺省） */
export class LlmNotConfigured extends Error {
  constructor() {
    super("llm_not_configured");
    this.name = "LlmNotConfigured";
  }
}

/**
 * 唯一 LLM 出口（design.md 决策 2）：所有 chat completion 经此发出。
 * glm 推理模型不显式关思考会耗尽 max_tokens 输出空 content（finish_reason=length），
 * thinking: {"type":"disabled"}（方舟扩展字段）只在这里出现一次，场景方不碰 HTTP。
 */
@Injectable()
export class LlmClient {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  /** 返回 completion content；未配置抛 LlmNotConfigured，超时/网络错原样抛出 */
  async chat(system: string, user: string, maxTokens: number): Promise<string> {
    const apiKey = this.config.get<string>("ARK_API_KEY");
    const model = this.config.get<string>("ARK_MODEL_ID");
    if (!apiKey || !model) throw new LlmNotConfigured();

    const client = new OpenAI({
      apiKey,
      baseURL: this.config.get<string>("ARK_BASE_URL", "https://ark.cn-beijing.volces.com/api/v3"),
      timeout: LLM_TIMEOUT_MS,
      maxRetries: 0,
    });
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: maxTokens,
      // SDK 类型无 thinking 定义，用展开绕过多余属性检查（见 mirror-moment 踩坑记录）
      ...({ thinking: { type: "disabled" } } as object),
    });
    return completion.choices[0]?.message?.content ?? "";
  }
}
