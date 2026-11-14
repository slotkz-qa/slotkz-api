import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    ConflictException,
    ForbiddenException,
    NotFoundException,
    UnprocessableEntityException,
} from '@nestjs/common';
import type { SalonsService } from '../src/salons/salons.service.js';
import { BookingsService } from '../src/bookings/bookings.service.js';

const NOW = new Date('2026-11-09T10:00:00.000Z').getTime();
const HOUR = 60 * 60 * 1000;
const inHours = (hours: number) => new Date(NOW + hours * HOUR).toISOString();

// Stub: the only thing BookingsService needs from SalonsService
const salonsStub = { findMaster: (id: number) => ({ id }) } as unknown as SalonsService;

describe('BookingsService', () => {
    let service: BookingsService;

    beforeEach(() => {
        vi.spyOn(Date, 'now').mockReturnValue(NOW);
        service = new BookingsService(salonsStub);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('create', () => {
        it('creates a CREATED booking with the fixed prepayment', async () => {
            const booking = await service.create(1, { masterId: 1, startsAt: inHours(48) });

            expect(booking).toMatchObject({ userId: 1, masterId: 1, status: 'CREATED', prepayAmount: 2000 });
        });

        it('rejects a slot that starts in less than 60 minutes', async () => {
            await expect(service.create(1, { masterId: 1, startsAt: inHours(0.5) })).rejects.toBeInstanceOf(
                UnprocessableEntityException,
            );
        });

        it('rejects an already booked slot', async () => {
            await service.create(1, { masterId: 1, startsAt: inHours(48) });

            await expect(service.create(2, { masterId: 1, startsAt: inHours(48) })).rejects.toBeInstanceOf(
                ConflictException,
            );
        });

        it('lets only one of two parallel requests take the same slot', async () => {
            const dto = { masterId: 1, startsAt: inHours(48) };

            const results = await Promise.allSettled([service.create(1, dto), service.create(2, dto)]);

            expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
        });
    });

    describe('cancel', () => {
        const createPaidBooking = async (startsAt: string) => {
            const { id } = await service.create(1, { masterId: 1, startsAt });
            service.pay(1, id);
            return id;
        };

        it('refunds 100% when a paid booking is cancelled 48 hours before the start', async () => {
            const id = await createPaidBooking(inHours(48));

            expect(service.cancel(1, id)).toMatchObject({ refundPercent: 100, refundAmount: 2000 });
        });

        it('refunds nothing when a paid booking is cancelled 2 hours before the start', async () => {
            const id = await createPaidBooking(inHours(2));

            expect(service.cancel(1, id)).toMatchObject({ refundPercent: 0, refundAmount: 0 });
        });

        it('refunds nothing for an unpaid booking', async () => {
            const { id } = await service.create(1, { masterId: 1, startsAt: inHours(48) });

            expect(service.cancel(1, id)).toMatchObject({ status: 'CANCELLED', refundPercent: 0 });
        });

        it('rejects cancelling an already cancelled booking', async () => {
            const { id } = await service.create(1, { masterId: 1, startsAt: inHours(48) });
            service.cancel(1, id);

            expect(() => service.cancel(1, id)).toThrow(ConflictException);
        });

        it('forbids cancelling a booking that belongs to another user', async () => {
            const { id } = await service.create(1, { masterId: 1, startsAt: inHours(48) });

            expect(() => service.cancel(2, id)).toThrow(ForbiddenException);
        });

        it('throws NotFound for an unknown booking id', () => {
            expect(() => service.cancel(1, 999)).toThrow(NotFoundException);
        });
    });

    describe('reschedule', () => {
        it('moves a booking to a free slot', async () => {
            const { id } = await service.create(1, { masterId: 1, startsAt: inHours(48) });

            expect(service.reschedule(1, id, { startsAt: inHours(72) }).startsAt).toBe(inHours(72));
        });

        it('rejects rescheduling a cancelled booking', async () => {
            const { id } = await service.create(1, { masterId: 1, startsAt: inHours(48) });
            service.cancel(1, id);

            expect(() => service.reschedule(1, id, { startsAt: inHours(72) })).toThrow(ConflictException);
        });

        it('rejects rescheduling to a slot that is already taken', async () => {
            const { id } = await service.create(1, { masterId: 1, startsAt: inHours(48) });
            await service.create(2, { masterId: 1, startsAt: inHours(72) });

            expect(() => service.reschedule(1, id, { startsAt: inHours(72) })).toThrow(ConflictException);
        });
    });

    describe('pay', () => {
        it('charges the prepayment and marks the booking as PAID', async () => {
            const { id } = await service.create(1, { masterId: 1, startsAt: inHours(48) });

            expect(service.pay(1, id)).toMatchObject({ status: 'PAID', charged: 2000 });
        });

        it('rejects paying twice', async () => {
            const { id } = await service.create(1, { masterId: 1, startsAt: inHours(48) });
            service.pay(1, id);

            expect(() => service.pay(1, id)).toThrow(ConflictException);
        });
    });

    describe('list', () => {
        it('returns only the bookings of the requested user', async () => {
            await service.create(1, { masterId: 1, startsAt: inHours(48) });
            await service.create(2, { masterId: 2, startsAt: inHours(48) });

            expect(service.list(1)).toHaveLength(1);
        });
    });
});