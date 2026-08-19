import { Global, Module } from "@nestjs/common";
import { MirrorModule } from "../mirror/mirror.module";
import { MEMORY_PROVIDER, RawHistoryMemoryProvider } from "./memory";

/**
 * 记忆提供者装配：全局注册 MEMORY_PROVIDER 令牌。
 * 依赖方向 MirrorModule → MentorModule（提问收口），因此记忆不能由 MentorModule
 * 反向 import MirrorModule（成环）；全局模块让 MentorService 无需 import 即可注入。
 */
@Global()
@Module({
  imports: [MirrorModule],
  providers: [{ provide: MEMORY_PROVIDER, useClass: RawHistoryMemoryProvider }],
  exports: [MEMORY_PROVIDER],
})
export class MemoryModule {}
