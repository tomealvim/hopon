import { IsString } from 'class-validator';

export class SuspendUserDto {
  @IsString()
  reason: string;
}
