import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsUUID,
  IsUrl,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAlarmDto {
  @ApiProperty({
    example: 'uuid-del-tenant',
    description: 'ID del tenant al que pertenece',
  })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({ example: 'Despertar', description: 'Título de la alarma' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'El título debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El título no puede exceder los 100 caracteres' })
  titulo: string;

  @ApiProperty({
    example: '2026-08-25T07:00:00.000Z',
    description: 'Fecha y hora en formato ISO 8601 string',
  })
  @IsDateString()
  @IsNotEmpty()
  horaProgramada: string;

  @ApiPropertyOptional({
    example: 'https://ejemplo.com/audio.mp3',
    description: 'URL del audio de la alarma',
  })
  @IsString()
  @IsOptional()
  @IsUrl(
    { require_tld: false },
    { message: 'La URL del audio debe ser una dirección web válida' },
  )
  urlAudio?: string;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Estado de la alarma (activa/inactiva)',
  })
  @IsBoolean({ message: 'El campo activa debe ser un booleano (true/false)' })
  @IsOptional()
  activa?: boolean;
}
