import { IsString, IsOptional, IsBoolean, MinLength, MaxLength } from 'class-validator';

export class CreateCommunityDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @IsOptional()
  @IsString()
  domain?: string;
}
