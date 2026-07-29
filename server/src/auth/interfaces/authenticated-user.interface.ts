export type AuthenticatedRole = {
  id: number;
  code: string;
  name: string;
  isSuper: boolean;
};

export interface AuthenticatedUser {
  userId: number;
  username: string;
  roles: AuthenticatedRole[];
  roleIds: number[];
  isSuper: boolean;
  tokenVersion: number;
  passwordVersion: number;
}
