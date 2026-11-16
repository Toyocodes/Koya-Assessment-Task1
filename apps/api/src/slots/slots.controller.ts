import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from "@nestjs/common";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { resetSchema, type ResetInput } from "../lib/validation";
import { SlotsService } from "./slots.service";

@Controller()
export class SlotsController {
  constructor(private readonly slots: SlotsService) {}

  @Get("slots")
  list(@Query("provider") provider: unknown) {
    return this.slots.list(provider);
  }

  @Post("reset")
  @HttpCode(HttpStatus.OK)
  reset(@Body(new ZodValidationPipe(resetSchema)) body: ResetInput) {
    return this.slots.reset(body);
  }
}
