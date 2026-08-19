import { Inject, Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { UsersRepository } from "../users/users.repository";

const DEVICE_ID_MAX_LEN = 64;

/** 挂到 request 上的已识别用户 id（DeviceIdMiddleware 保证存在） */
export interface AuthedRequest extends Request {
  userId: number;
}

/**
 * 设备标识中间件（design.md §1）：
 * 读 X-Device-Id → 懒创建 users 行 → 挂 userId 上 request。
 * 缺头/超长 → 直接写 400 missing_device_id（不建用户）。
 * 中间件异常不经 Nest 异常过滤器，故直接写响应。
 */
@Injectable()
export class DeviceIdMiddleware implements NestMiddleware {
  constructor(@Inject(UsersRepository) private readonly users: UsersRepository) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const deviceId = req.header("x-device-id")?.trim();
    if (!deviceId || deviceId.length > DEVICE_ID_MAX_LEN) {
      res.status(400).json({ message: "missing_device_id" });
      return;
    }
    try {
      const user = await this.users.ensureByDeviceId(deviceId);
      (req as AuthedRequest).userId = user.id;
      next();
    } catch {
      res.status(503).json({ message: "service_unavailable" });
    }
  }
}
