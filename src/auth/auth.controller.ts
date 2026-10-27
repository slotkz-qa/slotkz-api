import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { LoginDto, RegisterDto } from './auth.dto.js';
import { AuthGuard } from './auth.guard.js';
import type { AuthUser } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './current-user.decorator.js';

const COOKIE_NAME = 'access_token';
const COOKIE_MAX_AGE_MS = 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email, dto.password);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const { token, user } = await this.auth.login(dto.email, dto.password);
    response.cookie(COOKIE_NAME, token, { httpOnly: true, sameSite: 'lax', maxAge: COOKIE_MAX_AGE_MS });
    return user;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(COOKIE_NAME);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
