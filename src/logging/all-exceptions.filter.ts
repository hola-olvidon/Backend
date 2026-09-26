import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';
import { isLevelEnabled, parseLogLevel } from './log-level';
import type { AppLogLevel } from './log-level';

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  private readonly logger = new Logger('Exception');
  private readonly level: AppLogLevel;

  constructor(httpAdapterHost: HttpAdapterHost, level?: AppLogLevel) {
    super(httpAdapterHost.httpAdapter);
    this.level = level ?? parseLogLevel(process.env.LOG_LEVEL);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    if (isLevelEnabled(this.level, 'error')) {
      const ctx = host.switchToHttp();
      const req = ctx.getRequest<{ method: string; originalUrl: string }>();

      const status =
        exception instanceof HttpException
          ? exception.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;
      const message =
        exception instanceof Error ? exception.message : String(exception);

      // Para HttpException incluimos el detalle del body (ej: mensajes de validación)
      const detail =
        exception instanceof HttpException
          ? JSON.stringify(exception.getResponse())
          : undefined;

      this.logger.error(
        `${req.method} ${req.originalUrl} -> ${status}: ${message}${detail ? ` — ${detail}` : ''}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    super.catch(exception, host);
  }
}
