import { Body, Controller, Delete, Get, Headers, Param, Post, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { BookingsService } from "./bookings.service";

@Controller("bookings")
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post()
  async create(
    @Body() body: unknown,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.bookings.create(body, idempotencyKey === "" ? undefined : idempotencyKey);
    for (const [name, value] of Object.entries(result.headers ?? {})) {
      res.setHeader(name, value);
    }
    res.status(result.status).json(result.body);
  }

  @Get()
  list(@Query("email") email: unknown, @Query("limit") limit: unknown, @Query("cursor") cursor: unknown) {
    return this.bookings.list({ email, limit, cursor });
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.bookings.findOne(id);
  }

  @Delete(":id")
  cancel(@Param("id") id: string) {
    return this.bookings.cancel(id);
  }
}
