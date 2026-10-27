import { Module } from '@nestjs/common';
import { SalonsModule } from '../salons/salons.module.js';
import { BookingsController } from './bookings.controller.js';
import { BookingsService } from './bookings.service.js';

@Module({
  imports: [SalonsModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
