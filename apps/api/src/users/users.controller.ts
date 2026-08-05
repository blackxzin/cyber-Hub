import { Controller, Get, Patch, Body, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../shared/pipes/zod-validation.pipe';
import { updateUserSchema } from '@cyberhub/types';
import type { AuthedRequest } from '../auth/auth.types';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@Req() req: AuthedRequest) {
    return this.users.getMe(req.user.id);
  }

  @Patch('me')
  updateMe(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(updateUserSchema)) dto: ReturnType<typeof updateUserSchema.parse>,
  ) {
    return this.users.updateMe(req.user.id, dto);
  }
}
