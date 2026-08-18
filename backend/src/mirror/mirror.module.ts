import { Module } from "@nestjs/common";
import { MirrorController } from "./mirror.controller";
import { MirrorRepository } from "./mirror.repository";
import { MirrorService } from "./mirror.service";
import { QuestionGenerator } from "./question-generator";

@Module({
  controllers: [MirrorController],
  providers: [MirrorService, MirrorRepository, QuestionGenerator],
})
export class MirrorModule {}
