import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { isLevelEnabled, parseLogLevel } from './log-level';
import type { AppLogLevel } from './log-level';

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  private readonly logger = new Logger('Exception');
  private readonly level: AppLogLevel;

  constructor(level?: AppLogLevel) {
    super();
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

      this.logger.error(
        `${req.method} ${req.originalUrl} -> ${status}: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    super.catch(exception, host);
  }
}
