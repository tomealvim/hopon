import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class TopupDto {
  @ApiProperty({
    example: 2500,
    minimum: 1,
    maximum: 50000,
    description: 'Valor em cêntimos',
  })
  @IsInt()
  @Min(1)
  @Max(50000)
  amountCents: number;

  @ApiPropertyOptional({ example: 'Carregamento MB Way' })
  @IsOptional()
  @IsString()
  description?: string;
}
