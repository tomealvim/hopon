import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ example: 1, minimum: 1, maximum: 8, description: 'Número de lugares a reservar' })
  @IsInt()
  @Min(1)
  @Max(8)
  seats: number;

  @ApiPropertyOptional({ description: 'PaymentIntent Stripe (quando pagamento é feito por cartão/Apple Pay em vez de wallet)' })
  @IsOptional()
  @IsString()
  stripePaymentIntentId?: string;

  @ApiPropertyOptional({ description: 'Mensagem para o condutor' })
  @IsOptional()
  @IsString()
  message?: string;
}

