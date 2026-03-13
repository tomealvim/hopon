import { IsString, IsInt, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRecurringBookingDto {
  @ApiProperty({ example: 'uuid-do-schedule-template' })
  @IsString()
  scheduleTemplateId: string;

  @ApiPropertyOptional({ example: 1, minimum: 1, maximum: 8 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  seats?: number;
}
