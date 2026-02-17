import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

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
}

