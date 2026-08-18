import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // 仓库根目录的 .env 是唯一配置来源；backend/.env 也允许（本地覆盖）
      envFilePath: ["../.env", ".env"],
    }),
    HealthModule,
  ],
})
export class AppModule {}
