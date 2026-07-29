import { lastValueFrom, of } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';

describe('AuditInterceptor', () => {
  it('records operation metadata without persisting sensitive request bodies', async () => {
    const record = jest.fn(
      (value: Record<string, unknown>): Promise<unknown> => {
        void value;
        return Promise.resolve({});
      },
    );
    const audit = { record };
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue({
        action: 'USER_CREATE',
        resource: 'user',
      }),
    };
    const request = {
      user: { userId: 1, username: 'admin' },
      params: { id: '9' },
      method: 'PATCH',
      originalUrl: '/user/9?debug=true',
      url: '/user/9',
      ip: '127.0.0.1',
      socket: {},
      headers: { 'user-agent': 'jest' },
      body: { password: 'must-not-be-stored', accessToken: 'secret' },
    };
    const response = { statusCode: 200 };
    const context = {
      getType: jest.fn().mockReturnValue('http'),
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => request,
        getResponse: () => response,
      }),
    };
    const interceptor = new AuditInterceptor(
      reflector as never,
      audit as never,
    );

    await lastValueFrom(
      interceptor.intercept(context as never, {
        handle: () => of({ ok: true }),
      }),
    );

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 1,
        actorName: 'admin',
        action: 'USER_CREATE',
        resource: 'user',
        resourceId: '9',
        path: '/user/9',
        success: true,
        statusCode: 200,
      }),
    );
    expect(record.mock.calls[0]?.[0]).not.toHaveProperty('body');
  });
});
