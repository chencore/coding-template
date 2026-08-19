import { Inject, Injectable } from "@nestjs/common";
import { Database } from "../database/database";

/** 导师风格枚举（存储层定义允许值；人格文案见 mentor/persona.ts） */
export type MentorStyle = "gentle" | "socratic" | "companion";

export interface MentorProfile {
  name: string;
  style: MentorStyle;
}

/**
 * 用户数据访问：匿名设备 ID 懒创建（X-Device-Id → users 行）+ 导师人格配置读写。
 */
@Injectable()
export class UsersRepository {
  constructor(@Inject(Database) private readonly db: Database) {}

  async findByDeviceId(deviceId: string): Promise<{ id: number } | null> {
    const { rows } = await this.db.pool.query<{ id: number }>(
      "SELECT id FROM users WHERE device_id = $1",
      [deviceId],
    );
    return rows[0] ?? null;
  }

  async create(deviceId: string): Promise<{ id: number }> {
    // 并发首访兜底：冲突时取已存在的行
    const { rows } = await this.db.pool.query<{ id: number }>(
      `INSERT INTO users(device_id) VALUES ($1)
       ON CONFLICT (device_id) DO UPDATE SET device_id = EXCLUDED.device_id
       RETURNING id`,
      [deviceId],
    );
    return rows[0];
  }

  /** 懒创建：存在则返回，不存在则插入 */
  async ensureByDeviceId(deviceId: string): Promise<{ id: number }> {
    const existing = await this.findByDeviceId(deviceId);
    return existing ?? this.create(deviceId);
  }

  /** 导师人格（0002 起 users 自带默认值，正常不会查不到） */
  async getMentorProfile(userId: number): Promise<MentorProfile> {
    const { rows } = await this.db.pool.query<{
      mentor_name: string;
      mentor_style: MentorStyle;
    }>("SELECT mentor_name, mentor_style FROM users WHERE id = $1", [userId]);
    if (!rows[0]) throw new Error("getMentorProfile: user not found");
    return { name: rows[0].mentor_name, style: rows[0].mentor_style };
  }

  /** 只更新传入的字段；返回更新后的人格 */
  async updateMentorProfile(
    userId: number,
    patch: { name?: string; style?: MentorStyle },
  ): Promise<MentorProfile> {
    const sets: string[] = [];
    const params: unknown[] = [];
    if (patch.name !== undefined) {
      params.push(patch.name);
      sets.push(`mentor_name = $${params.length}`);
    }
    if (patch.style !== undefined) {
      params.push(patch.style);
      sets.push(`mentor_style = $${params.length}`);
    }
    if (sets.length === 0) return this.getMentorProfile(userId);
    params.push(userId);
    await this.db.pool.query(
      `UPDATE users SET ${sets.join(", ")} WHERE id = $${params.length}`,
      params,
    );
    return this.getMentorProfile(userId);
  }
}
