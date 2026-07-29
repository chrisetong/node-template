export type UserRoleDto = {
  id: number;
  code: string;
  name: string;
  enabled: boolean;
  isSuper: boolean;
};

export class UserDto {
  id!: number;
  username!: string;
  enabled!: boolean;
  department!: { id: number; code: string; name: string } | null;
  roles!: UserRoleDto[];
  createdAt!: Date;
}
