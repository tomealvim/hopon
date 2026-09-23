import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class ResolveDisputeDto {
  @ApiProperty({ enum: ['REFUND', 'DISMISS'] })
  @IsIn(['REFUND', 'DISMISS'])
  action: 'REFUND' | 'DISMISS';

  @ApiPropertyOptional({ example: 500, description: 'Reembolso em cêntimos' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50000)
  refundAmountCents?: number;

  @ApiProperty({ example: 'Valor incorreto confirmado. Reembolso processado.' })
  @IsString()
  @MinLength(5)
  resolution: string;
}
