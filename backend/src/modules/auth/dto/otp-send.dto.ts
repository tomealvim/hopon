import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OtpSendDto {
  @ApiProperty({ enum: ['email', 'phone'], description: 'Canal a verificar' })
  @IsIn(['email', 'phone'])
  purpose: 'email' | 'phone';
}
