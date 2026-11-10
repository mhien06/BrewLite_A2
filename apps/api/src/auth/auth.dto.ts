import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString() @MinLength(1) fullName!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
  @IsString() @MinLength(8) confirmPassword!: string;
}

export class LoginDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
}
