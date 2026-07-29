import { ForbiddenException } from '@nestjs/common';
import { DataScope } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { DataScopeService } from './data-scope.service';

const actor: AuthenticatedUser = {
  userId: 7,
  username: 'manager',
  roles: [],
  roleIds: [2],
  isSuper: false,
  tokenVersion: 1,
  passwordVersion: 1,
};

describe('DataScopeService', () => {
  it('combines department descendants, custom departments and self scopes', async () => {
    const prisma = {
      user: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          departmentId: 10,
          roles: [
            {
              role: {
                dataScope: DataScope.DEPARTMENT_AND_CHILDREN,
                dataDepartments: [],
              },
            },
            {
              role: {
                dataScope: DataScope.CUSTOM,
                dataDepartments: [{ departmentId: 30 }],
              },
            },
            {
              role: {
                dataScope: DataScope.SELF,
                dataDepartments: [],
              },
            },
          ],
        }),
      },
      department: {
        findMany: jest.fn().mockResolvedValue([
          { id: 10, parentId: null },
          { id: 11, parentId: 10 },
          { id: 12, parentId: 11 },
          { id: 20, parentId: null },
        ]),
      },
    };
    const service = new DataScopeService(prisma as never);
    await expect(service.userWhere(actor)).resolves.toEqual({
      OR: [{ departmentId: { in: [10, 11, 12, 30] } }, { id: 7 }],
    });
  });

  it('fails closed to the current user when no active scope is available', async () => {
    const prisma = {
      user: {
        findUniqueOrThrow: jest
          .fn()
          .mockResolvedValue({ departmentId: null, roles: [] }),
      },
    };
    const service = new DataScopeService(prisma as never);
    await expect(service.userWhere(actor)).resolves.toEqual({
      OR: [{ id: 7 }],
    });
  });

  it('rejects access to a target outside the calculated scope', async () => {
    const prisma = {
      user: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          departmentId: null,
          roles: [
            {
              role: {
                dataScope: DataScope.SELF,
                dataDepartments: [],
              },
            },
          ],
        }),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new DataScopeService(prisma as never);
    await expect(service.assertCanAccessUser(actor, 99)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows a super administrator to query all users', async () => {
    const service = new DataScopeService({} as never);
    await expect(
      service.userWhere({ ...actor, isSuper: true }),
    ).resolves.toEqual({});
  });

  it('does not let a self-only role create users in its own department', async () => {
    const prisma = {
      user: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          departmentId: 10,
          roles: [
            {
              role: {
                dataScope: DataScope.SELF,
                dataDepartments: [],
              },
            },
          ],
        }),
      },
    };
    const service = new DataScopeService(prisma as never);
    await expect(
      service.assertCanAssignDepartment(actor, 10),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
