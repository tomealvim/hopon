import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class ResolveDisputeDto {
  @ApiProperty({ enum: ['REFUND', 'DISMISS'] })
  @IsIn(['REFUND', 'DISMISS'])
  action: 'REFUND' | 'DISMISS';

  @ApiPropertyOptional({ example: 5.0 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(500)
  refundAmount?: number;

  @ApiProperty({ example: 'Valor incorreto confirmado. Reembolso processado.' })
  @IsString()
  @MinLength(5)
  resolution: string;
}
