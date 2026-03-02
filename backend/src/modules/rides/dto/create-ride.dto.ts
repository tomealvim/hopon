import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsDateString, IsInt, Min, Max, IsOptional, IsNumber, Min as MinNumber } from 'class-validator';

export class CreateRideDto {
  @ApiProperty({ example: 'Toyota' })
  @IsString()
  vehicleId: string;

  @ApiProperty({ example: 'Lisboa, Praça do Comércio' })
  @IsString()
  origin: string;

  @ApiPropertyOptional({ example: 38.7071 })
  @IsOptional()
  @IsNumber()
  originLat?: number;

  @ApiPropertyOptional({ example: -9.1366 })
  @IsOptional()
  @IsNumber()
  originLng?: number;

  @ApiProperty({ example: 'Porto, Estação de Campanhã' })
  @IsString()
  destination: string;

  @ApiPropertyOptional({ example: 41.1496 })
  @IsOptional()
  @IsNumber()
  destinationLat?: number;

  @ApiPropertyOptional({ example: -8.5815 })
  @IsOptional()
  @IsNumber()
  destinationLng?: number;

  @ApiPropertyOptional({ example: 'Lisboa' })
  @IsOptional()
  @IsString()
  city?: string;

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

  @ApiPropertyOptional({ example: 312.5, description: 'Distância da rota em km (da API de pricing)' })
  @IsOptional()
  @IsNumber()
  @MinNumber(0)
  routeDistanceKm?: number;

  @ApiPropertyOptional({ example: 165, description: 'Duração da rota em minutos (com tráfego)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  routeDurationMin?: number;

  @ApiPropertyOptional({ example: 23.35, description: 'Custo de portagens da rota selecionada' })
  @IsOptional()
  @IsNumber()
  @MinNumber(0)
  routeTollCost?: number;

  @ApiPropertyOptional({ example: 1.40, description: 'Taxa de plataforma (10% do preço por lugar)' })
  @IsOptional()
  @IsNumber()
  @MinNumber(0)
  platformFee?: number;
}

