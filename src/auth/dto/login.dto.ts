import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'admin',
    description: 'Nombre de usuario del administrador',
  })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({
    example: 'admin_password_seguro',
    description: 'Contraseña del administrador',
  })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
