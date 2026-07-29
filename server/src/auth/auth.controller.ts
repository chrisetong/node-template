import { Body, Controller, Get, Req, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { UserDto } from '../user/dto/user.dto';
import type { MenuNode } from '../menu/menu.service';
import { getTrustedClientIp } from '../common/security/client-ip';
import { Audit } from '../audit/audit.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('captcha')
  @ApiOperation({ summary: '获取登录图形验证码（SVG）' })
  captcha(): Promise<{ key: string; svg: string }> {
    return this.authService.createCaptcha();
  }

  @Post('login')
  @ApiOperation({ summary: '用户登录并签发 JWT Token' })
  @Audit('LOGIN', 'auth')
  login(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ): Promise<{ accessToken: string }> {
    return this.authService.login(dto, getTrustedClientIp(req));
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '退出登录并使当前会话失效' })
  @Audit('LOGOUT', 'auth')
  async logout(
    @Req() req: Request & { user: AuthenticatedUser },
  ): Promise<{ ok: true }> {
    await this.authService.logout(req.user.userId);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前登录用户信息（需要登录）' })
  me(
    @Req() req: Request & { user: AuthenticatedUser },
  ): Promise<{ user: UserDto; menuTree: MenuNode[]; permissions: string[] }> {
    return this.authService.getCurrentUserWithPermissions(req.user.userId);
  }
}
