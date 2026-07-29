import { IsArray, IsInt } from 'class-validator';

export class UpdateRoleMenusDto {
  @IsArray()
  @IsInt({ each: true })
  menuIds!: number[];
}
