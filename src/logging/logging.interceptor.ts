import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { isLevelEnabled, parseLogLevel } from './log-level';
import type { AppLogLevel } from './log-level';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  private readonly level: AppLogLevel;

  constructor(level?: AppLogLevel) {
    this.level = level ?? parseLogLevel(process.env.LOG_LEVEL);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{
      method: string;
      originalUrl: string;
    }>();
    const { method, originalUrl } = req;
    const started = Date.now();

    if (isLevelEnabled(this.level, 'debug')) {
      this.logger.debug(`--> ${method} ${originalUrl}`);
    }

    return next.handle().pipe(
      tap(() => {
        if (!isLevelEnabled(this.level, 'info')) {
          return;
        }
        const res = context.switchToHttp().getResponse<{ statusCode: number }>();
        this.logger.log(
          `${method} ${originalUrl} ${res.statusCode} +${Date.now() - started}ms`,
        );
      }),
      catchError((err: unknown) => {
        if (isLevelEnabled(this.level, 'error')) {
          this.logger.error(
            `${method} ${originalUrl} failed +${Date.now() - started}ms`,
          );
        }
        throw err;
      }),
    );
  }
}
