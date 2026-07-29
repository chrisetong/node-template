import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateUserDepartmentDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  departmentId!: number | null;
}
