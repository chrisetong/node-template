import { Transform } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateMenuDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  path?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  component?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  icon?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value === '' ? null : value))
  parentId?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}
