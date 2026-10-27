import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export interface AuthUser {
  id: number;
  email: string;
}

export type AuthenticatedRequest = Request & { user: AuthUser };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token: string | undefined = request.cookies?.access_token;
    if (!token) throw new UnauthorizedException('Authentication required');

    try {
      const payload = await this.jwt.verifyAsync<{ sub: number; email: string }>(token);
      request.user = { id: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
