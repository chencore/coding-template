import { Module } from "@nestjs/common";
import { LlmClient } from "./llm.client";
import { MentorController } from "./mentor.controller";
import { MentorService } from "./mentor.service";

/**
 * 导师模块：所有 AI 出口的统一网关。
 * 不 import MirrorModule——记忆经全局 MemoryModule 的 MEMORY_PROVIDER 令牌注入，
 * 避免与 MirrorModule（import 本模块取 MentorService）成环。
 */
@Module({
  controllers: [MentorController],
  providers: [MentorService, LlmClient],
  exports: [MentorService],
})
export class MentorModule {}
