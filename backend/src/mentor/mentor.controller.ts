import { BadRequestException, Body, Controller, Get, Inject, Put, Req } from "@nestjs/common";
import type { AuthedRequest } from "../common/device-id.middleware";
import { UsersRepository, type MentorStyle } from "../users/users.repository";

const NAME_MAX_LEN = 12;
const STYLES: readonly MentorStyle[] = ["gentle", "socratic", "companion"];

@Controller("mentor")
export class MentorController {
  constructor(@Inject(UsersRepository) private readonly users: UsersRepository) {}

  @Get("profile")
  async getProfile(@Req() req: AuthedRequest) {
    return this.users.getMentorProfile(req.userId);
  }

  /** 改名 / 切风格：至少给一个有效字段；只更新传入字段 */
  @Put("profile")
  async updateProfile(@Req() req: AuthedRequest, @Body() body: unknown) {
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      throw new BadRequestException("empty_profile_update");
    }
    const { name, style } = body as { name?: unknown; style?: unknown };

    const patch: { name?: string; style?: MentorStyle } = {};
    if (name !== undefined) {
      const trimmed = typeof name === "string" ? name.trim() : "";
      if (trimmed.length === 0 || trimmed.length > NAME_MAX_LEN) {
        throw new BadRequestException("invalid_name");
      }
      patch.name = trimmed;
    }
    if (style !== undefined) {
      if (typeof style !== "string" || !STYLES.includes(style as MentorStyle)) {
        throw new BadRequestException("invalid_style");
      }
      patch.style = style as MentorStyle;
    }
    if (patch.name === undefined && patch.style === undefined) {
      throw new BadRequestException("empty_profile_update");
    }
    return this.users.updateMentorProfile(req.userId, patch);
  }
}
