import { describe, expect, it, vi } from "vitest";
import { UsersRepository } from "../src/users/users.repository";
import type { Database } from "../src/database/database";

// vitest 已沉淀约束：不用 beforeEach + mockReset；工厂函数建全新 mock，Once 变体串联行为。

function makeRepo() {
  const query = vi.fn();
  const repo = new UsersRepository({ pool: { query } } as unknown as Database);
  return { repo, query };
}

describe("UsersRepository.getMentorProfile", () => {
  it("返回导师名与风格", async () => {
    const { repo, query } = makeRepo();
    query.mockResolvedValueOnce({ rows: [{ mentor_name: "默", mentor_style: "gentle" }] });
    expect(await repo.getMentorProfile(7)).toEqual({ name: "默", style: "gentle" });
  });

  it("用户不存在时抛错（正常不会发生：中间件已懒建）", async () => {
    const { repo, query } = makeRepo();
    query.mockResolvedValueOnce({ rows: [] });
    await expect(repo.getMentorProfile(7)).rejects.toThrow("user not found");
  });
});

describe("UsersRepository.updateMentorProfile", () => {
  it("只改名字：SET 仅含 mentor_name，返回更新后人格", async () => {
    const { repo, query } = makeRepo();
    query.mockResolvedValueOnce({ rows: [] }); // UPDATE
    query.mockResolvedValueOnce({ rows: [{ mentor_name: "远山", mentor_style: "gentle" }] });
    const profile = await repo.updateMentorProfile(7, { name: "远山" });
    const updateSql = String(query.mock.calls[0][0]);
    expect(updateSql).toContain("mentor_name = $1");
    expect(updateSql).not.toContain("mentor_style");
    expect(query.mock.calls[0][1]).toEqual(["远山", 7]);
    expect(profile).toEqual({ name: "远山", style: "gentle" });
  });

  it("只改风格：SET 仅含 mentor_style", async () => {
    const { repo, query } = makeRepo();
    query.mockResolvedValueOnce({ rows: [] });
    query.mockResolvedValueOnce({ rows: [{ mentor_name: "默", mentor_style: "socratic" }] });
    const profile = await repo.updateMentorProfile(7, { style: "socratic" });
    const updateSql = String(query.mock.calls[0][0]);
    expect(updateSql).toContain("mentor_style = $1");
    expect(updateSql).not.toContain("mentor_name");
    expect(profile.style).toBe("socratic");
  });

  it("两个字段一起改：参数序正确", async () => {
    const { repo, query } = makeRepo();
    query.mockResolvedValueOnce({ rows: [] });
    query.mockResolvedValueOnce({ rows: [{ mentor_name: "远山", mentor_style: "companion" }] });
    await repo.updateMentorProfile(7, { name: "远山", style: "companion" });
    expect(String(query.mock.calls[0][0])).toContain("mentor_name = $1, mentor_style = $2");
    expect(query.mock.calls[0][1]).toEqual(["远山", "companion", 7]);
  });

  it("空 patch：不发 UPDATE，直接读当前值", async () => {
    const { repo, query } = makeRepo();
    query.mockResolvedValueOnce({ rows: [{ mentor_name: "默", mentor_style: "gentle" }] });
    const profile = await repo.updateMentorProfile(7, {});
    expect(query).toHaveBeenCalledTimes(1);
    expect(String(query.mock.calls[0][0])).toContain("SELECT");
    expect(profile.name).toBe("默");
  });
});
