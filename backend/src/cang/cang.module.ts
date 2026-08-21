import { Module } from "@nestjs/common";
import { MentorModule } from "../mentor/mentor.module";
import { CangController } from "./cang.controller";
import { CangRepository } from "./cang.repository";
import { CangService } from "./cang.service";

// 藏（个人知识库）：收藏 + 思想地图（主题聚类）；LLM 打标统一走 MentorService（cang_tag 场景）
@Module({
  imports: [MentorModule],
  controllers: [CangController],
  providers: [CangService, CangRepository],
})
export class CangModule {}
