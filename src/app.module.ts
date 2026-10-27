import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { BookingsModule } from './bookings/bookings.module.js';
import { HealthController } from './health.controller.js';
import { SalonsModule } from './salons/salons.module.js';

@Module({
  imports: [AuthModule, SalonsModule, BookingsModule],
  controllers: [HealthController],
})
export class AppModule {}
