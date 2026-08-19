import { describe, expect, it, vi } from "vitest";
import type { ConfigService } from "@nestjs/config";

// vi.hoisted 保证 mock 变量在 hoisted 的 vi.mock 工厂执行前可用
const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));

// mock openai 模块：不触网，验证三态分支。
// 两个 vitest 坑（均已实测复现）：
// 1. 工厂里写 class + 参数属性会把已 catch 的 rejection 误报为 unhandled——用 vi.fn() 构造器形式
// 2. mockResolvedValue 之后再 mockReset 会让后续 rejection 被误报——用 Once 变体，不用 beforeEach reset
vi.mock("openai", () => ({
  // 注意：不能用箭头函数——vitest 4 对 new 调用会把 new.target 传给实现，
  // 箭头函数不可作为构造器（"is not a constructor"）
  default: vi.fn().mockImplementation(function () {
    return { chat: { completions: { create: createMock } } };
  }),
}));

import { LlmProbe } from "../src/health/llm.probe";

function makeConfig(values: Record<string, string | undefined>): ConfigService {
  return {
    get: (key: string, fallback?: string) => values[key] ?? fallback,
  } as unknown as ConfigService;
}

describe("LlmProbe.probe", () => {
  it("密钥缺失时返回 not_configured，且不发起请求", async () => {
    const probe = new LlmProbe(makeConfig({}));
    const result = await probe.probe();
    expect(result.llm).toBe("not_configured");
    expect(result.hint).toContain("ARK_API_KEY");
    expect(createMock).not.toHaveBeenCalled();
  });

  it("请求成功时返回 up", async () => {
    createMock.mockResolvedValueOnce({ id: "ok" });
    const probe = new LlmProbe(
      makeConfig({ ARK_API_KEY: "k", ARK_MODEL_ID: "m" }),
    );
    expect((await probe.probe()).llm).toBe("up");
  });

  it("请求失败时返回 unreachable", async () => {
    createMock.mockImplementationOnce(() => Promise.reject(new Error("timeout")));
    const probe = new LlmProbe(
      makeConfig({ ARK_API_KEY: "k", ARK_MODEL_ID: "m" }),
    );
    const result = await probe.probe();
    expect(result.llm).toBe("unreachable");
  });
});
