import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { VehicleFeaturesDto } from './vehicle-features.dto';
import { Type } from 'class-transformer';

export class CreateVehicleDto {
  @ApiProperty({ example: 'Tesla' })
  @IsString()
  @Length(2, 60)
  brand: string;

  @ApiProperty({ example: 'Model 3' })
  @IsString()
  @Length(1, 60)
  model: string;

  @ApiPropertyOptional({ example: '12-AB-34' })
  @IsOptional()
  @IsString()
  @Length(2, 32)
  plate?: string;

  @ApiPropertyOptional({ example: 'Branco Pérola' })
  @IsOptional()
  @IsString()
  @Length(2, 40)
  color?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.hopon.app/vehicles/model-3.png',
    description: 'Pode ser uma URL ou data URI temporária',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ example: 4, minimum: 1, maximum: 8 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  seats?: number;

  @ApiPropertyOptional({
    type: VehicleFeaturesDto,
    default: { airConditioning: true, heater: true },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => VehicleFeaturesDto)
  features?: VehicleFeaturesDto;
}

