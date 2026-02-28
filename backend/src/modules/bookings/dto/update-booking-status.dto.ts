import { IsIn } from 'class-validator';

export class UpdateBookingStatusDto {
  @IsIn(['CONFIRMED', 'DECLINED'])
  status: 'CONFIRMED' | 'DECLINED';
}
