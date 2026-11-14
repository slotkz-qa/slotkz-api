import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { setTimeout as delay } from 'node:timers/promises';
import { SalonsService } from '../salons/salons.service.js';
import type { CreateBookingDto, RescheduleBookingDto } from './bookings.dto.js';

export type BookingStatus = 'CREATED' | 'PAID' | 'CANCELLED';

export interface Booking {
  id: number;
  userId: number;
  masterId: number;
  startsAt: string;
  status: BookingStatus;
  prepayAmount: number;
  createdAt: string;
}

const MIN_LEAD_TIME_MS = 60 * 60 * 1000;
const PREPAY_AMOUNT = 2000;
const DB_LATENCY_MS = 50;
const MS_PER_HOUR = 60 * 60 * 1000;

@Injectable()
export class BookingsService {
  private readonly bookings: Booking[] = [];
  private nextId = 1;

  constructor(private readonly salons: SalonsService) {}

  async create(userId: number, dto: CreateBookingDto) {
  const master = this.salons.findMaster(dto.masterId);
  const startsAt = this.parseSlot(dto.startsAt);

  // simulated database latency
  await delay(DB_LATENCY_MS);

  // the check and the write run in one synchronous block, so no other request can slip in between
  this.assertSlotFree(master.id, startsAt);

  const booking: Booking = {
    id: this.nextId++,
    userId,
    masterId: master.id,
    startsAt,
    status: 'CREATED',
    prepayAmount: PREPAY_AMOUNT,
    createdAt: new Date().toISOString(),
  };
  this.bookings.push(booking);
  return booking;
}

  list(userId: number) {
    return this.bookings.filter((booking) => booking.userId === userId);
  }

  reschedule(userId: number, id: number, dto: RescheduleBookingDto) {
    const booking = this.findOwned(userId, id);
    if (booking.status === 'CANCELLED') throw new ConflictException('Booking is already cancelled');

    const startsAt = this.parseSlot(dto.startsAt);
    this.assertSlotFree(booking.masterId, startsAt, booking.id);
    booking.startsAt = startsAt;
    return booking;
  }

  pay(userId: number, id: number) {
    const booking = this.findOwned(userId, id);
    if (booking.status !== 'CREATED') {
      throw new ConflictException(`Booking is already ${booking.status.toLowerCase()}`);
    }

    booking.status = 'PAID';
    return { ...booking, charged: booking.prepayAmount };
  }

  cancel(userId: number, id: number) {
    const booking = this.findOwned(userId, id);
    if (booking.status === 'CANCELLED') throw new ConflictException('Booking is already cancelled');

    const refundPercent = booking.status === 'PAID' ? this.refundPercent(booking) : 0;
    booking.status = 'CANCELLED';
    return {
      id: booking.id,
      status: booking.status,
      refundPercent,
      refundAmount: (booking.prepayAmount * refundPercent) / 100,
    };
  }

  private refundPercent(booking: Booking) {
    const hoursBeforeStart = (new Date(booking.startsAt).getTime() - Date.now()) / MS_PER_HOUR;
    return hoursBeforeStart >= 24 ? 100 : 0;
  }

  private parseSlot(value: string) {
    const startsAt = new Date(value);
    if (startsAt.getTime() - Date.now() < MIN_LEAD_TIME_MS) {
      throw new UnprocessableEntityException('Booking is possible no later than 60 minutes before the start');
    }
    return startsAt.toISOString();
  }

  private assertSlotFree(masterId: number, startsAt: string, ignoreId?: number) {
    const taken = this.bookings.some(
      (booking) =>
        booking.id !== ignoreId &&
        booking.masterId === masterId &&
        booking.startsAt === startsAt &&
        booking.status !== 'CANCELLED',
    );
    if (taken) throw new ConflictException('This slot is already booked');
  }

  private findOwned(userId: number, id: number) {
    const booking = this.bookings.find((candidate) => candidate.id === id);
    if (!booking) throw new NotFoundException(`Booking ${id} not found`);
    if (booking.userId !== userId) throw new ForbiddenException('This booking belongs to another user');
    return booking;
  }
}
