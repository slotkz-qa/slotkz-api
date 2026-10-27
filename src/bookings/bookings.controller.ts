import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import type { AuthUser } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { CreateBookingDto, RescheduleBookingDto } from './bookings.dto.js';
import { BookingsService } from './bookings.service.js';

@Controller('bookings')
@UseGuards(AuthGuard)
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBookingDto) {
    return this.bookings.create(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.bookings.list(user.id);
  }

  @Put(':id')
  reschedule(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RescheduleBookingDto,
  ) {
    return this.bookings.reschedule(user.id, id, dto);
  }

  @Post(':id/pay')
  @HttpCode(HttpStatus.OK)
  pay(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.bookings.pay(user.id, id);
  }

  @Delete(':id')
  cancel(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.bookings.cancel(user.id, id);
  }
}
