import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateRideDto } from './create-ride.dto';
import {
  IsString,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsOptional,
} from 'class-validator';

export class UpdateRideDto extends PartialType(CreateRideDto) {
  @ApiPropertyOptional({ example: 'Lisboa, Praça do Comércio' })
  @IsOptional()
  @IsString()
  origin?: string;

  @ApiPropertyOptional({ example: 'Porto, Estação de Campanhã' })
  @IsOptional()
  @IsString()
  destination?: string;

  @ApiPropertyOptional({ example: '2024-03-15T08:00:00Z' })
  @IsOptional()
  @IsDateString()
  departureTime?: string;

  @ApiPropertyOptional({ example: 3, minimum: 1, maximum: 8 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  availableSeats?: number;

  @ApiPropertyOptional({
    example: 1550,
    minimum: 0,
    description: 'Preço por lugar em cêntimos',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  priceCents?: number;

  @ApiPropertyOptional({
    example: 'SCHEDULED',
    enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  })
  @IsOptional()
  @IsString()
  status?: string;
}
