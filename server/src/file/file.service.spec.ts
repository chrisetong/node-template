import { formatUploadDate } from './file.service';

describe('formatUploadDate', () => {
  it('uses the configured application time zone for the date directory', () => {
    const instant = new Date('2026-07-29T16:30:00.000Z');

    expect(formatUploadDate(instant, 'Asia/Shanghai')).toBe('2026-07-30');
    expect(formatUploadDate(instant, 'UTC')).toBe('2026-07-29');
  });
});
