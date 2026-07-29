import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]*$/)
  @MinLength(2)
  @MaxLength(50)
  code!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;
}
