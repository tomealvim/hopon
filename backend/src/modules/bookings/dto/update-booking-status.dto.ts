import { IsIn } from 'class-validator';

export class UpdateBookingStatusDto {
  @IsIn(['CONFIRMED', 'DECLINED', 'NO_SHOW'])
  status: 'CONFIRMED' | 'DECLINED' | 'NO_SHOW';
}
