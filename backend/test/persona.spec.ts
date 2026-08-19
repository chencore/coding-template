import { describe, expect, it } from "vitest";
import { buildSystemPrompt } from "../src/mentor/persona";

describe("persona.buildSystemPrompt", () => {
  it("含导师名、风格人格段与通用守则", () => {
    const prompt = buildSystemPrompt({ name: "远山", style: "socratic" }, "场景规则X");
    expect(prompt).toContain("远山");
    expect(prompt).toContain("相信答案在用户心里");
    expect(prompt).toContain("不评判、不说教");
    expect(prompt).toContain("场景规则X");
  });

  it("三种风格的人格段互不相同", () => {
    const gentle = buildSystemPrompt({ name: "默", style: "gentle" }, "");
    const socratic = buildSystemPrompt({ name: "默", style: "socratic" }, "");
    const companion = buildSystemPrompt({ name: "默", style: "companion" }, "");
    expect(gentle).toContain("接纳优先");
    expect(socratic).toContain("简洁理性");
    expect(companion).toContain("平辈口吻");
    expect(new Set([gentle, socratic, companion]).size).toBe(3);
  });
});
