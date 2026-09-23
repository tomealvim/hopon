import {
  IsString,
  IsArray,
  IsOptional,
  IsNumber,
  Matches,
  ArrayMinSize,
} from 'class-validator';

export class CreateUserRouteDto {
  @IsString()
  origin: string;

  @IsOptional()
  @IsNumber()
  originLat?: number;

  @IsOptional()
  @IsNumber()
  originLng?: number;

  @IsString()
  destination: string;

  @IsOptional()
  @IsNumber()
  destinationLat?: number;

  @IsOptional()
  @IsNumber()
  destinationLng?: number;

  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'departTime deve estar no formato HH:mm',
  })
  departTime: string;

  @IsArray()
  @ArrayMinSize(1)
  daysOfWeek: string[];
}
