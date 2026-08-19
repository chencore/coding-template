import { describe, expect, it } from "vitest";
import { FIGURES, getFigure, pickFigure, pickSource } from "../src/renwen/canon";

// 场景 2：出处库完整性——内容是产品的一部分，测试替「真实」把关

describe("canon 出处库完整性", () => {
  it("四位人物齐全", () => {
    expect(FIGURES.map((f) => f.id)).toEqual([
      "socrates",
      "aurelius",
      "wangyangming",
      "zengguofan",
    ]);
    for (const f of FIGURES) {
      expect(f.name.length).toBeGreaterThan(0);
      expect(f.epithet.length).toBeGreaterThan(0);
      expect(f.styleHint.length).toBeGreaterThan(0);
      expect(f.persona).toContain("你是");
    }
  });

  it("每位人物 ≥3 条出处，条目含真实篇名与原文", () => {
    for (const f of FIGURES) {
      expect(f.sources.length).toBeGreaterThanOrEqual(3);
      for (const s of f.sources) {
        expect(s.title.startsWith("《")).toBe(true);
        expect(s.text.length).toBeGreaterThan(0);
      }
    }
  });

  it("出处 id 全局唯一", () => {
    const ids = FIGURES.flatMap((f) => f.sources.map((s) => s.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("人物 id 唯一且 getFigure 命中", () => {
    expect(getFigure("wangyangming")?.name).toBe("王阳明");
    expect(getFigure("nobody")).toBeNull();
  });
});

describe("canon 轮转（决策 3：确定性，可测试）", () => {
  it("导师代选：按累计召唤数轮转四位，第 5 次回到第一位", () => {
    expect(pickFigure(0).id).toBe("socrates");
    expect(pickFigure(3).id).toBe("zengguofan");
    expect(pickFigure(4).id).toBe("socrates");
  });

  it("出处轮转：同人物按累计数取条目，不重复直到取完一轮", () => {
    const wym = getFigure("wangyangming")!;
    const picked = wym.sources.map((_, i) => pickSource(wym, i).id);
    expect(new Set(picked).size).toBe(wym.sources.length);
    expect(pickSource(wym, wym.sources.length).id).toBe(pickSource(wym, 0).id);
  });

  it("相邻条目的展示篇名不重复（轮转时用户看到的出处一定换）", () => {
    for (const f of FIGURES) {
      for (let i = 1; i < f.sources.length; i++) {
        expect(
          f.sources[i].title,
          `${f.id} 第 ${i} 条与上一条篇名重复`,
        ).not.toBe(f.sources[i - 1].title);
      }
    }
  });
});
