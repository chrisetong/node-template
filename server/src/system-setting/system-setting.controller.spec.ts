import { AUDIT_METADATA } from '../audit/audit.decorator';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import {
  matchesImageMagicBytes,
  SystemSettingController,
} from './system-setting.controller';

describe('SystemSettingController security contract', () => {
  it('requires the dedicated update permission and audit metadata', () => {
    const uploadHandler = Object.getOwnPropertyDescriptor(
      SystemSettingController.prototype,
      'uploadImage',
    )?.value as object;
    const updateHandler = Object.getOwnPropertyDescriptor(
      SystemSettingController.prototype,
      'update',
    )?.value as object;

    expect(Reflect.getMetadata(PERMISSIONS_KEY, uploadHandler)).toEqual([
      'systemSetting:update',
    ]);
    expect(Reflect.getMetadata(AUDIT_METADATA, updateHandler)).toEqual({
      action: 'SYSTEM_SETTING_UPDATE',
      resource: 'systemSetting',
    });
  });

  it('accepts matching image signatures and rejects spoofed content', () => {
    expect(
      matchesImageMagicBytes(
        'image/png',
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBe(true);
    expect(matchesImageMagicBytes('image/png', Buffer.from('not a png'))).toBe(
      false,
    );
    expect(
      matchesImageMagicBytes(
        'image/webp',
        Buffer.from('RIFF0000WEBP', 'ascii'),
      ),
    ).toBe(true);
  });
});
