import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { setTimeout as delay } from 'node:timers/promises';
import type { SalonsService } from '../src/salons/salons.service.js';
import { BookingsService } from '../src/bookings/bookings.service.js';

// The service simulates database latency with a 50 ms timer; the mock makes it instant.
vi.mock('node:timers/promises', () => ({ setTimeout: vi.fn().mockResolvedValue(undefined) }));

const NOW = new Date('2026-11-14T10:00:00Z').getTime();
const USER_ID = 1;
const MASTER = { id: 1, salonId: 1, name: 'Master 1A' };
const daysFromNow = (days: number) => new Date(NOW + days * 24 * 60 * 60 * 1000).toISOString();

describe('BookingsService in isolation', { tags: ['unit', 'mock'] }, () => {
    let salons: { findMaster: ReturnType<typeof vi.fn> };
    let service: BookingsService;

    beforeEach(() => {
        vi.spyOn(Date, 'now').mockReturnValue(NOW);

        // Stub: SalonsService returns a canned master instead of reading the real catalog
        salons = { findMaster: vi.fn().mockReturnValue(MASTER) };
        service = new BookingsService(salons as unknown as SalonsService);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.clearAllMocks();
    });

    describe('pay', () => {
        it('marks a CREATED booking as PAID and charges the prepayment', async () => {
            // Arrange
            const booking = await service.create(USER_ID, { masterId: MASTER.id, startsAt: daysFromNow(2) });

            // Act
            const receipt = service.pay(USER_ID, booking.id);

            // Assert
            expect(receipt).toMatchObject({ id: booking.id, status: 'PAID', charged: 2000 });
        });

        it('throws ConflictException when the booking is paid twice', async () => {
            const booking = await service.create(USER_ID, { masterId: MASTER.id, startsAt: daysFromNow(2) });
            service.pay(USER_ID, booking.id);

            expect(() => service.pay(USER_ID, booking.id)).toThrow(ConflictException);
        });

        it('throws ForbiddenException when another user pays', async () => {
            const booking = await service.create(USER_ID, { masterId: MASTER.id, startsAt: daysFromNow(2) });

            expect(() => service.pay(USER_ID + 1, booking.id)).toThrow(ForbiddenException);
        });

        it('throws NotFoundException for an unknown booking id', () => {
            expect(() => service.pay(USER_ID, 999)).toThrow(NotFoundException);
        });
    });

    describe('create with replaced dependencies', () => {
        it('looks up the master through SalonsService exactly once', async () => {
            await service.create(USER_ID, { masterId: MASTER.id, startsAt: daysFromNow(2) });

            expect(salons.findMaster).toHaveBeenCalledExactlyOnceWith(MASTER.id);
        });

        it('waits for the simulated database latency exactly once', async () => {
            await service.create(USER_ID, { masterId: MASTER.id, startsAt: daysFromNow(2) });

            expect(delay).toHaveBeenCalledExactlyOnceWith(50);
        });

        it('creates nothing when the master does not exist', async () => {
            salons.findMaster.mockImplementation(() => {
                throw new NotFoundException('Master 99 not found');
            });

            await expect(service.create(USER_ID, { masterId: 99, startsAt: daysFromNow(2) })).rejects.toBeInstanceOf(
                NotFoundException,
            );

            expect(service.list(USER_ID)).toEqual([]);
            expect(delay).not.toHaveBeenCalled();
        });
    });

    it.skip('sends an SMS confirmation after payment (not implemented yet)', () => {
        expect.unreachable('Enable after the notification feature is added');
    });

    it.todo('refunds 100% only when a paid booking is cancelled 24+ hours before the start');
});