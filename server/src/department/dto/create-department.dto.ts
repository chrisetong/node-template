import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]*$/)
  @MinLength(2)
  @MaxLength(50)
  code!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  parentId?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;
}
