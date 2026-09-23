import { IsIn, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OtpVerifyDto {
  @ApiProperty({
    enum: ['email', 'phone'],
    description: 'Canal que está a ser verificado',
  })
  @IsIn(['email', 'phone'])
  purpose: 'email' | 'phone';

  @ApiProperty({
    description: 'Código de 6 dígitos recebido por email/SMS',
    example: '123456',
  })
  @IsString()
  @Length(6, 6, { message: 'O código deve ter 6 dígitos' })
  code: string;
}
