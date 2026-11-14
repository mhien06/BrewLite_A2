import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @IsNotEmpty() @MaxLength(120) fullName!: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsEmail() @MaxLength(254) email!: string;
  @IsString() @MinLength(8) password!: string;
  @IsString() @MinLength(8) confirmPassword!: string;
}

export class LoginDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
}
