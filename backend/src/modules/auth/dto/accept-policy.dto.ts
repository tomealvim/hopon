import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class AcceptPolicyDto {
  @ApiProperty({ enum: ['passenger', 'driver'] })
  @IsString()
  @IsIn(['passenger', 'driver'])
  role: 'passenger' | 'driver';
}
