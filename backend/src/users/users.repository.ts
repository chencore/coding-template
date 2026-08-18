import { Inject, Injectable } from "@nestjs/common";
import { Database } from "../database/database";

/**
 * 用户数据访问：匿名设备 ID 懒创建（X-Device-Id → users 行）。
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
}
