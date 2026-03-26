import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User } from '../users/entities/user.entity';
import { Family } from '../families/entities/family.entity';
import { RefreshToken } from '../users/entities/refresh-token.entity';
import { UserFamilyRole } from '../users/entities/user-family-role.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Family, RefreshToken, UserFamilyRole]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        privateKey: configService.get<string>('app.jwt.privateKey'),
        publicKey: configService.get<string>('app.jwt.publicKey'),
        signOptions: {
          algorithm: 'RS256',
          expiresIn: configService.get<string>('app.jwt.accessTokenExpiry', '15m'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
