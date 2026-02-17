import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, Max } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ example: 1, minimum: 1, maximum: 8, description: 'Número de lugares a reservar' })
  @IsInt()
  @Min(1)
  @Max(8)
  seats: number;
}

