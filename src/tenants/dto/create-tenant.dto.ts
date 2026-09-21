import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({ example: 'Familia', description: 'Nombre del tenant' })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre del tenant es obligatorio' })
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder los 100 caracteres' })
  nombre: string;

  @ApiPropertyOptional({
    description: 'Contraseña opcional',
    example: 'sk_live_abc123xyz456',
  })
  @IsOptional()
  @IsString({ message: 'La Contraseña debe ser un texto válido' })
  @MinLength(6, { message: 'La Contraseña debe tener al menos 6 caracteres' })
  password?: string;
}
