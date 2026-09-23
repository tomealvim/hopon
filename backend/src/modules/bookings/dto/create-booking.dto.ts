import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({
    example: 1,
    minimum: 1,
    maximum: 8,
    description: 'Número de lugares a reservar',
  })
  @IsInt()
  @Min(1)
  @Max(8)
  seats: number;

  @ApiPropertyOptional({
    description:
      'PaymentIntent Stripe (quando pagamento é feito por cartão/Apple Pay em vez de wallet)',
  })
  @IsOptional()
  @IsString()
  stripePaymentIntentId?: string;

  @ApiPropertyOptional({ description: 'Mensagem para o condutor' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({
    description:
      'Latitude do ponto de embarque do passageiro (para cálculo de desvio de rota)',
  })
  @IsOptional()
  @IsNumber()
  pickupLat?: number;

  @ApiPropertyOptional({
    description: 'Longitude do ponto de embarque do passageiro',
  })
  @IsOptional()
  @IsNumber()
  pickupLng?: number;
}
