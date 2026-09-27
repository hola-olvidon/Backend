import { LogLevel } from '@nestjs/common';

export type AppLogLevel = 'debug' | 'info' | 'none';

/**
 * Lee la variable LOG_LEVEL y normaliza su valor.
 * Por defecto es 'info'.
 */
export function parseLogLevel(value: string | undefined): AppLogLevel {
  switch (value) {
    case 'debug':
      return 'debug';
    case 'none':
      return 'none';
    case 'info':
    default:
      return 'info';
  }
}

/**
 * Convierte el nivel de logs de la app a los niveles que entiende el logger
 * interno de NestJS. Devuelve `false` para desactivar el logger por completo.
 */
export function nestLoggerLevels(
  level: AppLogLevel,
): LogLevel[] | false {
  switch (level) {
    case 'debug':
      return ['error', 'warn', 'log', 'debug', 'verbose', 'fatal'];
    case 'none':
      return false;
    case 'info':
    default:
      return ['error', 'warn', 'log', 'fatal'];
  }
}

/**
 * Indica si un nivel concreto de logging está habilitado para el nivel
 * configurado. Se usa para silenciar los loggers propios (interceptor y
 * filtro), ya que esos usan `new Logger()` y no respetan la opción `logger`
 * de NestFactory.
 */
export function isLevelEnabled(
  configured: AppLogLevel,
  level: 'debug' | 'info' | 'error',
): boolean {
  if (configured === 'none') {
    return false;
  }
  if (configured === 'info') {
    return level !== 'debug';
  }
  return true;
}
