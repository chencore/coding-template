import { Global, Module } from "@nestjs/common";
import { UsersRepository } from "./users.repository";

/**
 * 用户模块：全局提供 UsersRepository（懒创建匿名设备用户）。
 */
@Global()
@Module({
  providers: [UsersRepository],
  exports: [UsersRepository],
})
export class UsersModule {}
