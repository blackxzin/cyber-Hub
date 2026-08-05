import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RefreshTokenService } from './refresh-token.service';
import { UsersModule } from '../users/users.module';
import { config } from '@cyberhub/shared';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: config().JWT_ACCESS_SECRET,
      signOptions: { expiresIn: config().JWT_ACCESS_TTL },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, RefreshTokenService],
  exports: [AuthService],
})
export class AuthModule {}
