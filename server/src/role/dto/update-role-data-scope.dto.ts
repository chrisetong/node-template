import { DataScope } from '@prisma/client';
import { IsArray, IsEnum, IsInt, IsOptional } from 'class-validator';

export class UpdateRoleDataScopeDto {
  @IsEnum(DataScope)
  dataScope!: DataScope;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  departmentIds?: number[];
}
