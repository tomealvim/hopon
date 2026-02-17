import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, IsEmail, IsBoolean } from 'class-validator';
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

  @ApiPropertyOptional({ description: 'JSON string of weekly schedule' })
  @IsOptional()
  @IsString()
  schedule?: string;

  @ApiPropertyOptional({ description: 'True when user has finished the 3-step profile setup' })
  @IsOptional()
  @IsBoolean()
  setupCompleted?: boolean;
}

