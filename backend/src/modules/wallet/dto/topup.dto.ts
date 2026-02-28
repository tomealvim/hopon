import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class TopupDto {
  @ApiProperty({ example: 25.0, minimum: 0.01, maximum: 500 })
  @IsNumber()
  @Min(0.01)
  @Max(500)
  amount: number;

  @ApiPropertyOptional({ example: 'Carregamento MB Way' })
  @IsOptional()
  @IsString()
  description?: string;
}
