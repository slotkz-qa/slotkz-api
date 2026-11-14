import { UnprocessableEntityException } from '@nestjs/common';
import type { SalonsService } from '../src/salons/salons.service.js';
import { BookingsService } from '../src/bookings/bookings.service.js';

const NOW = new Date('2026-11-14T10:00:00Z');
const MASTER = { id: 1, salonId: 1, name: 'Master 1A' };
const daysFromNow = (days: number) => new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

describe('BookingsService booking window', { tags: ['unit', 'tdd'] }, () => {
  let service: BookingsService;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);

    const salons = { findMaster: vi.fn().mockReturnValue(MASTER) } as unknown as SalonsService;
    service = new BookingsService(salons);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects a slot more than 30 days ahead', async () => {
    await expect(service.create(1, { masterId: 1, startsAt: daysFromNow(31) })).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('rejects an invalid date with 422 instead of crashing', async () => {
    await expect(service.create(1, { masterId: 1, startsAt: 'not-a-date' })).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('accepts a slot exactly 30 days ahead (boundary)', async () => {
    const booking = await service.create(1, { masterId: 1, startsAt: daysFromNow(30) });

    expect(booking.status).toBe('CREATED');
  });

  it('applies the same limit when rescheduling', async () => {
    const booking = await service.create(1, { masterId: 1, startsAt: daysFromNow(2) });

    expect(() => service.reschedule(1, booking.id, { startsAt: daysFromNow(31) })).toThrow(
      UnprocessableEntityException,
    );
  });
});