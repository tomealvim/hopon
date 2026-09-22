import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, Min, Max, IsOptional, IsNumber, IsArray, ArrayMinSize, IsIn, IsBoolean, IsObject, Min as MinNumber } from 'class-validator';

const DAYS_OF_WEEK = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'] as const;

export class CreateScheduleDto {
  @ApiProperty({ example: 'vehicle-uuid-here' })
  @IsString()
  vehicleId: string;

  @ApiProperty({ example: 'Lisboa, Praça do Comércio' })
  @IsString()
  origin: string;

  @ApiProperty({ example: 'Porto, Estação de Campanhã' })
  @IsString()
  destination: string;

  @ApiProperty({ example: '08:00', description: 'Hora de partida em formato HH:mm' })
  @IsString()
  time: string;

  @ApiProperty({ 
    example: ['segunda', 'terca', 'quarta', 'quinta', 'sexta'],
    description: 'Dias da semana em que a boleia ocorre',
    type: [String]
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(DAYS_OF_WEEK, { each: true })
  daysOfWeek: string[];

  @ApiProperty({ example: 3, minimum: 1, maximum: 8 })
  @IsInt()
  @Min(1)
  @Max(8)
  availableSeats: number;

  @ApiPropertyOptional({ example: 1550, minimum: 0, description: 'Preço por lugar em cêntimos' })
  @IsOptional()
  @IsNumber()
  @MinNumber(0)
  priceCents?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  acceptDetours?: boolean;

  @ApiPropertyOptional({ example: 10, minimum: 0, maximum: 60 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  detourMaxMin?: number;

  @ApiPropertyOptional({ example: 'Estação de Cascais, portaria' })
  @IsOptional()
  @IsString()
  meetingPoint?: string;

  @ApiPropertyOptional({ example: 'Trago mochila grande' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Preferências: { musica, falar, bagagem, animais }' })
  @IsOptional()
  @IsObject()
  preferences?: { musica?: boolean; falar?: boolean; bagagem?: boolean; animais?: boolean };
}
