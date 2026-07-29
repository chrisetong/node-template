import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  username!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(72)
  password!: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  roleIds?: number[];

  @IsOptional()
  @IsInt()
  departmentId?: number;
}
