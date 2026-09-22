import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString, IsInt, IsNumber, Min, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class SearchRidesDto {
  @ApiPropertyOptional({ example: 'Lisboa' })
  @IsOptional()
  @IsString()
  origin?: string;

  @ApiPropertyOptional({ example: 'Porto' })
  @IsOptional()
  @IsString()
  destination?: string;

  @ApiPropertyOptional({ example: '2024-03-15T08:00:00Z' })
  @IsOptional()
  @IsDateString()
  departureTimeFrom?: string;

  @ApiPropertyOptional({ example: '2024-03-15T20:00:00Z' })
  @IsOptional()
  @IsDateString()
  departureTimeTo?: string;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minSeats?: number;

  // Pesquisa por proximidade geográfica
  @ApiPropertyOptional({ example: 38.7071, description: 'Latitude do ponto de origem (requer lng e radius)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ example: -9.1366, description: 'Longitude do ponto de origem (requer lat e radius)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional({ example: 10, description: 'Raio de pesquisa em km (padrão: 10km)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  radius?: number;

  @ApiPropertyOptional({ example: 500, description: 'Preço máximo por lugar em cêntimos' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPriceCents?: number;

  @ApiPropertyOptional({ description: 'Filtrar só boleias de condutores na mesma comunidade' })
  @IsOptional()
  @IsString()
  communityId?: string;

  @ApiPropertyOptional({ description: 'Filtrar apenas condutores com identidade verificada' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  verified?: boolean;

  @ApiPropertyOptional({ enum: ['recommended', 'earliest', 'rating'], default: 'recommended' })
  @IsOptional()
  @IsString()
  sort?: string;
}

