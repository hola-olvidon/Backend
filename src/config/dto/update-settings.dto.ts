import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSettingsDto {
  @ApiProperty({
    example: 'America/Santiago',
    description: 'Zona horaria IANA del servidor (ej. America/Santiago, Europe/Madrid)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  zonaHoraria: string;
}
