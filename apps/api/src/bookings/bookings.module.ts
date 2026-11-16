import { Module } from "@nestjs/common";
import { BookingsController } from "./bookings.controller";
import { BookingsService } from "./bookings.service";
import { RateLimitService } from "./rate-limit.service";

@Module({
  controllers: [BookingsController],
  providers: [BookingsService, RateLimitService],
})
export class BookingsModule {}
