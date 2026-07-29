import { IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsString({ message: '用户名必须是字符串' })
  @MinLength(3, { message: '用户名长度不能少于 3 位' })
  @MaxLength(32, { message: '用户名长度不能超过 32 位' })
  username!: string;

  @IsString({ message: '密码必须是字符串' })
  @MinLength(6, { message: '密码长度不能少于 6 位' })
  @MaxLength(72, { message: '密码长度不能超过 72 位' })
  password!: string;

  @IsString({ message: '验证码 Key 必须是字符串' })
  @MinLength(8, { message: '验证码 Key 无效，请刷新验证码后重试' })
  @MaxLength(64, { message: '验证码 Key 无效，请刷新验证码后重试' })
  captchaKey!: string;

  @IsString({ message: '请输入验证码' })
  @MinLength(4, { message: '验证码长度不能少于 4 位' })
  @MaxLength(8, { message: '验证码长度不能超过 8 位' })
  captchaCode!: string;
}
