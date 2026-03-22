import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ArrivingByDto {
  @ApiProperty({ example: 38.7371, description: 'Latitude do destino final do utilizador' })
  @Type(() => Number)
  @IsNumber()
  destinationLat: number;

  @ApiProperty({ example: -9.1394, description: 'Longitude do destino final do utilizador' })
  @Type(() => Number)
  @IsNumber()
  destinationLng: number;

  @ApiProperty({ example: '2024-03-15T09:00:00Z', description: 'Hora limite de chegada (ISO 8601)' })
  @IsString()
  arriveBy: string;

  @ApiProperty({ example: '2024-03-15', description: 'Data da boleia (YYYY-MM-DD)' })
  @IsString()
  date: string;

  @ApiPropertyOptional({ example: 5, description: 'Margem mínima em minutos (padrão: 5)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  marginMin?: number;

  @ApiPropertyOptional({ example: 3, description: 'Distância máxima a pé em km (padrão: 3)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  maxWalkKm?: number;
}
