import { Transform } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateMenuDto {
  @IsString()
  @MaxLength(64)
  name!: string;

  @IsString()
  @MaxLength(255)
  path!: string;

  @IsString()
  @MaxLength(255)
  component!: string;

  @IsString()
  @MaxLength(64)
  icon!: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === '' || value === null ? undefined : value,
  )
  @IsInt()
  parentId?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}
