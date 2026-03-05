import { IsString } from 'class-validator';

export class ScanImageDto {
  @IsString()
  imageDataUrl: string;
}
