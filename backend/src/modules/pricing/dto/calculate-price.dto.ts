import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CalculatePriceDto {
  @ApiProperty({ example: 38.7071 })
  @IsNumber()
  originLat: number;

  @ApiProperty({ example: -9.1366 })
  @IsNumber()
  originLng: number;

  @ApiProperty({ example: 41.1496 })
  @IsNumber()
  destLat: number;

  @ApiProperty({ example: -8.5815 })
  @IsNumber()
  destLng: number;

  @ApiProperty({ example: '2024-03-15T08:00:00Z' })
  @IsDateString()
  departureTime: string;

  @ApiProperty({ example: 'vehicle-uuid' })
  @IsString()
  vehicleId: string;

  @ApiProperty({ example: 3, minimum: 1 })
  @IsInt()
  @Min(1)
  seats: number;

  @ApiPropertyOptional({
    example: 'AA',
    description: 'Código de país para portagens (default: PT)',
  })
  @IsOptional()
  @IsString()
  countryCode?: string;
}
