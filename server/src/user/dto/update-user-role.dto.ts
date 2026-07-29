import { ArrayNotEmpty, IsArray, IsInt } from 'class-validator';

export class UpdateUserRoleDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  roleIds!: number[];
}
