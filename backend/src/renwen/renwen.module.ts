import { Module } from "@nestjs/common";
import { MentorModule } from "../mentor/mentor.module";
import { RenwenController } from "./renwen.controller";
import { RenwenRepository } from "./renwen.repository";
import { RenwenService } from "./renwen.service";

// 人文导师团：召唤编排 + 出处库 + 落库回看；LLM 出口仍统一走 MentorService（renwen_reply 场景）
@Module({
  imports: [MentorModule],
  controllers: [RenwenController],
  providers: [RenwenService, RenwenRepository],
})
export class RenwenModule {}
