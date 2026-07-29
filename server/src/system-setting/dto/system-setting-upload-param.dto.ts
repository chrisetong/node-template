import { IsEnum } from 'class-validator';

export enum SystemSettingImageKind {
  LOGO = 'logo',
  BACKGROUND = 'background',
}

export class SystemSettingUploadParamDto {
  @IsEnum(SystemSettingImageKind)
  kind!: SystemSettingImageKind;
}
