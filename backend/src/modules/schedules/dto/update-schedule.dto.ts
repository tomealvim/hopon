import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, Min, Max, IsOptional, IsNumber, IsArray, ArrayMinSize, IsIn, IsBoolean, IsObject, Min as MinNumber } from 'class-validator';

const DAYS_OF_WEEK = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'] as const;

export class UpdateScheduleDto {
  @ApiPropertyOptional({ example: 'Lisboa, Praça do Comércio' })
  @IsOptional()
  @IsString()
  origin?: string;

  @ApiPropertyOptional({ example: 'Porto, Estação de Campanhã' })
  @IsOptional()
  @IsString()
  destination?: string;

  @ApiPropertyOptional({ example: '08:00', description: 'Hora de partida em formato HH:mm' })
  @IsOptional()
  @IsString()
  time?: string;

  @ApiPropertyOptional({ 
    example: ['segunda', 'terca', 'quarta', 'quinta', 'sexta'],
    description: 'Dias da semana em que a boleia ocorre',
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(DAYS_OF_WEEK, { each: true })
  daysOfWeek?: string[];

  @ApiPropertyOptional({ example: 3, minimum: 1, maximum: 8 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  availableSeats?: number;

  @ApiPropertyOptional({ example: 1550, minimum: 0, description: 'Preço por lugar em cêntimos' })
  @IsOptional()
  @IsNumber()
  @MinNumber(0)
  priceCents?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  acceptDetours?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 60 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  detourMaxMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  meetingPoint?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  preferences?: { musica?: boolean; falar?: boolean; bagagem?: boolean; animais?: boolean };
}
