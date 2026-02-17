import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsDateString, IsInt, Min, Max, IsOptional, IsNumber, Min as MinNumber } from 'class-validator';

export class CreateRideDto {
  @ApiProperty({ example: 'Toyota' })
  @IsString()
  vehicleId: string;

  @ApiProperty({ example: 'Lisboa, Praça do Comércio' })
  @IsString()
  origin: string;

  @ApiProperty({ example: 'Porto, Estação de Campanhã' })
  @IsString()
  destination: string;

  @ApiProperty({ example: '2024-03-15T08:00:00Z' })
  @IsDateString()
  departureTime: string;

  @ApiProperty({ example: 3, minimum: 1, maximum: 8 })
  @IsInt()
  @Min(1)
  @Max(8)
  availableSeats: number;

  @ApiPropertyOptional({ example: 15.50, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @MinNumber(0)
  price?: number;
}

