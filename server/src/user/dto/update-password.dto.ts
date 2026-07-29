import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdatePasswordDto {
  @IsString()
  @MinLength(10)
  @MaxLength(72)
  oldPassword!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(72)
  newPassword!: string;
}
