import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "./database/database.module";
import { UsersModule } from "./users/users.module";
import { HealthModule } from "./health/health.module";
import { MirrorModule } from "./mirror/mirror.module";
import { DeviceIdMiddleware } from "./mirror/device-id.middleware";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // 仓库根目录的 .env 是唯一配置来源；backend/.env 也允许（本地覆盖）
      envFilePath: ["../.env", ".env"],
    }),
    DatabaseModule,
    UsersModule,
    HealthModule,
    MirrorModule,
  ],
  // 中间件带构造器依赖（UsersRepository），需在本模块上下文可解析
  providers: [DeviceIdMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 业务接口一律要求设备标识（全局前缀 api 不参与中间件路径匹配）
    consumer
      .apply(DeviceIdMiddleware)
      .forRoutes({ path: "mirror/{*splat}", method: RequestMethod.ALL });
  }
}
