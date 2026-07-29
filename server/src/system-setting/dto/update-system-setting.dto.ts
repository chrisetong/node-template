import { IsString, IsUrl, MaxLength, ValidateIf } from 'class-validator';

const isPresent = (_object: unknown, value: unknown) =>
  value !== null && value !== undefined;
const isNonEmpty = (_object: unknown, value: unknown) =>
  value !== null && value !== undefined && value !== '';

export class UpdateSystemSettingDto {
  @ValidateIf(isPresent)
  @IsString()
  @MaxLength(100)
  siteName?: string | null;

  @ValidateIf(isPresent)
  @IsString()
  @MaxLength(255)
  loginLogoPath?: string | null;

  @ValidateIf(isPresent)
  @IsString()
  @MaxLength(500)
  loginDescription?: string | null;

  @ValidateIf(isPresent)
  @IsString()
  @MaxLength(255)
  loginBackgroundPath?: string | null;

  @ValidateIf(isPresent)
  @IsString()
  @MaxLength(200)
  filingText?: string | null;

  @ValidateIf(isNonEmpty)
  @IsString()
  @MaxLength(500)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  filingUrl?: string | null;
}
