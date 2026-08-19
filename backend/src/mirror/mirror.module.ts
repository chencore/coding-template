import { Module } from "@nestjs/common";
import { MentorModule } from "../mentor/mentor.module";
import { MirrorController } from "./mirror.controller";
import { MirrorRepository } from "./mirror.repository";
import { MirrorService } from "./mirror.service";

@Module({
  // 提问/回应经导师人格发出（ai-mentor-core 收口，散装出口已删）
  imports: [MentorModule],
  controllers: [MirrorController],
  providers: [MirrorService, MirrorRepository],
  // 导出 repository 供全局 MemoryModule 装配记忆实现（读镜子回答历史）
  exports: [MirrorRepository],
})
export class MirrorModule {}
