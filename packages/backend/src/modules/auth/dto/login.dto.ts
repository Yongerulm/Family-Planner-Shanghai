import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Invalid email address' })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @MinLength(1)
  password: string;

  @ApiProperty({ required: false, example: 'device-uuid-123' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceId?: string;

  @ApiProperty({ required: false, example: 'ios' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  platform?: string;

  @ApiProperty({ required: false, example: '1.0.0' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  appVersion?: string;
}

export class LoginResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty()
  expiresIn: number;

  @ApiProperty()
  user: {
    id: string;
    email: string;
    displayName: string | null;
    role: string;
    familyId: string | null;
    avatarUrl: string | null;
  };
}
