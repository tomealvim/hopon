import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class CreateRideFromTemplateDto {
  @ApiProperty({ 
    example: '2024-03-15T08:00:00Z',
    description: 'Data e hora específica para criar a boleia (deve corresponder a um dos dias da semana do template)'
  })
  @IsDateString()
  departureTime: string;

  @ApiPropertyOptional({ example: 3, minimum: 1, maximum: 8 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  availableSeats?: number;

  @ApiPropertyOptional({ example: 1550, description: 'Preço por lugar em cêntimos' })
  @IsOptional()
  @IsInt()
  @Min(0)
  priceCents?: number;
}
