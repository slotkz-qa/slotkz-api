import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

interface User {
  id: number;
  email: string;
  passwordHash: string;
  failedAttempts: number;
  lockedUntil: number;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly users: User[] = [];
  private nextId = 1;

  constructor(private readonly jwt: JwtService) {}

  register(email: string, password: string) {
    const normalizedEmail = email.toLowerCase();
    if (this.users.some((user) => user.email === normalizedEmail)) {
      throw new ConflictException('Email is already in use');
    }

    const user: User = {
      id: this.nextId++,
      email: normalizedEmail,
      passwordHash: this.hash(password),
      failedAttempts: 0,
      lockedUntil: 0,
    };
    this.users.push(user);
    return { id: user.id, email: user.email };
  }

  async login(email: string, password: string) {
    const user = this.users.find((candidate) => candidate.email === email.toLowerCase());
    if (!user) throw new UnauthorizedException('Invalid email or password');

    if (user.lockedUntil > Date.now()) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: 'Account is locked for 15 minutes',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!this.verify(password, user.passwordHash)) {
      user.failedAttempts += 1;
      if (user.failedAttempts >= MAX_FAILED_ATTEMPTS) {
        user.failedAttempts = 0;
        user.lockedUntil = Date.now() + LOCK_DURATION_MS;
      }
      throw new UnauthorizedException('Invalid email or password');
    }

    user.failedAttempts = 0;
    const token = await this.jwt.signAsync({ sub: user.id, email: user.email });
    return { token, user: { id: user.id, email: user.email } };
  }

  private hash(password: string) {
    const salt = randomBytes(16).toString('hex');
    return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
  }

  private verify(password: string, stored: string) {
    const [salt, hash] = stored.split(':');
    return timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(hash, 'hex'));
  }
}
