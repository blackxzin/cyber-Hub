import { Controller, Post, Body, Req, Res } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import { ZodValidationPipe } from '../shared/pipes/zod-validation.pipe';
import { registerSchema, loginSchema } from '@cyberhub/types';
import type { RegisterDto, LoginDto } from '@cyberhub/types';
import { Public } from '../shared/decorators/decorators';
import { config } from '@cyberhub/shared';
import type { AuthedRequest } from './auth.types';

const ACCESS_COOKIE = 'cyhub_access';
const REFRESH_COOKIE = 'cyhub_refresh';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  async register(
    @Body(new ZodValidationPipe(registerSchema)) dto: RegisterDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const { user, accessToken, refreshToken } = await this.auth.register(dto);
    this.setCookies(res, accessToken, refreshToken);
    return { user };
  }

  @Public()
  @Post('login')
  async login(
    @Body(new ZodValidationPipe(loginSchema)) dto: LoginDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const { user, accessToken, refreshToken } = await this.auth.login(dto);
    this.setCookies(res, accessToken, refreshToken);
    return { user };
  }

  @Public()
  @Post('refresh')
  async refresh(@Req() req: AuthedRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    if (!refreshToken) return { user: null };
    const { user, accessToken, refreshToken: newRefresh } = await this.auth.refresh(refreshToken);
    this.setCookies(res, accessToken, newRefresh);
    return { user };
  }

  @Post('logout')
  async logout(@Req() req: AuthedRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    await this.auth.logout(req.user.id, refreshToken);
    this.clearCookies(res);
    return { ok: true };
  }

  private setCookies(res: FastifyReply, access: string, refresh: string): void {
    const secure = config().NODE_ENV === 'production';
    res.setCookie(ACCESS_COOKIE, access, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: this.toSeconds(config().JWT_ACCESS_TTL),
    });
    res.setCookie(REFRESH_COOKIE, refresh, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/auth',
      maxAge: this.toSeconds(config().JWT_REFRESH_TTL),
    });
  }

  private clearCookies(res: FastifyReply): void {
    res.clearCookie(ACCESS_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_COOKIE, { path: '/auth' });
  }

  private toSeconds(human: string): number {
    const m = /^(\d+)([smhd])?$/.exec(human.trim());
    if (!m) return 900;
    const mult: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return Number(m[1]) * (mult[m[2] ?? 's'] ?? 1);
  }
}
