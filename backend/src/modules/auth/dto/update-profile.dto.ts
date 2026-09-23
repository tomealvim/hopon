import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  Length,
  IsEmail,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { IsValidPhoneNumber } from '../../../common/decorators/is-valid-phone-number.decorator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'João Silva' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @ApiPropertyOptional({ example: 'joaosilva' })
  @IsOptional()
  @IsString()
  @Length(2, 50)
  username?: string;

  @ApiPropertyOptional({ example: '+351912345678' })
  @IsOptional()
  @IsValidPhoneNumber()
  phone?: string;

  @ApiPropertyOptional({ example: 'https://cdn.hopon.app/avatar.png' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'Condutor experiente, adoro música chill.' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: 'user@alternative.com' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({ description: 'Weekly schedule object' })
  @IsOptional()
  schedule?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'True when user has finished the 3-step profile setup',
  })
  @IsOptional()
  @IsBoolean()
  setupCompleted?: boolean;

  @ApiPropertyOptional({ example: 'Amadora, Quinta da Fonte' })
  @IsOptional()
  @IsString()
  homeAddress?: string;

  @ApiPropertyOptional({ example: 38.7169 })
  @IsOptional()
  @IsNumber()
  homeLat?: number;

  @ApiPropertyOptional({ example: -9.1399 })
  @IsOptional()
  @IsNumber()
  homeLng?: number;

  @ApiPropertyOptional({
    description: 'Push notification preferences per category',
  })
  @IsOptional()
  pushPreferences?: {
    messages?: boolean;
    bookings?: boolean;
    rides?: boolean;
    matches?: boolean;
  };
}
