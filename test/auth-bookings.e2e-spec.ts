import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';

const PASSWORD = 'strong-password-1';
const slot = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

describe('Auth → Bookings integration', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const loginAs = async (email: string) => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/auth/register').send({ email, password: PASSWORD }).expect(201);
    await agent.post('/auth/login').send({ email, password: PASSWORD }).expect(200);
    return agent;
  };

  it('rejects a bookings request without the access cookie', async () => {
    await request(app.getHttpServer()).get('/bookings').expect(401);
  });

  it('authenticates /auth/me with the cookie issued at login', async () => {
    const anna = await loginAs('anna@example.com');

    const response = await anna.get('/auth/me').expect(200);

    expect(response.body).toMatchObject({ email: 'anna@example.com' });
  });

  it('creates a booking for the user identified by the cookie', async () => {
    const anna = await loginAs('anna@example.com');
    const me = await anna.get('/auth/me');

    const response = await anna.post('/bookings').send({ masterId: 1, startsAt: slot(48) }).expect(201);

    expect(response.body.userId).toBe(me.body.id);
  });

  it('forbids another user from cancelling the booking', async () => {
    const anna = await loginAs('anna@example.com');
    const boris = await loginAs('boris@example.com');
    const booking = await anna.post('/bookings').send({ masterId: 1, startsAt: slot(48) });

    await boris.delete(`/bookings/${booking.body.id}`).expect(403);
  });
});