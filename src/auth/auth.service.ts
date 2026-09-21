import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto) {
    const adminUser = this.configService.get<string>('ADMIN_USERNAME');
    const adminPass = this.configService.get<string>('ADMIN_PASSWORD');

    // Validación de credenciales del Administrador
    if (loginDto.username !== adminUser || loginDto.password !== adminPass) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = { username: adminUser, role: 'ADMIN' };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        username: adminUser,
        role: 'ADMIN',
      },
    };
  }
}
