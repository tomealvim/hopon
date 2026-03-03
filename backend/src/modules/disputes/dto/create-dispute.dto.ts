import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MinLength } from 'class-validator';

export const DISPUTE_REASONS = [
  'WRONG_AMOUNT',
  'NO_SHOW',
  'SAFETY',
  'SERVICE_QUALITY',
  'OTHER',
] as const;

export class CreateDisputeDto {
  @ApiProperty({ example: 'booking-uuid' })
  @IsString()
  bookingId: string;

  @ApiProperty({ enum: DISPUTE_REASONS })
  @IsIn(DISPUTE_REASONS)
  reason: string;

  @ApiProperty({ example: 'O valor cobrado foi diferente do acordado.' })
  @IsString()
  @MinLength(10)
  description: string;
}
