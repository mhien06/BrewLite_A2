import { Body, Controller, Inject, Post, ValidationPipe } from '@nestjs/common';
import { Public } from '../common/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  register(
    @Body(new ValidationPipe({ expectedType: RegisterDto, whitelist: true, forbidNonWhitelisted: true, transform: true }))
    body: RegisterDto,
  ) {
    return this.auth.register(body);
  }

  @Public()
  @Post('login')
  login(
    @Body(new ValidationPipe({ expectedType: LoginDto, whitelist: true, forbidNonWhitelisted: true, transform: true }))
    body: LoginDto,
  ) {
    return this.auth.login(body.email, body.password);
  }
}
