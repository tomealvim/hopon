import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/nestjs';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[];
    if (isHttpException) {
      const res = exception.getResponse();
      message = typeof res === 'object' && res !== null && 'message' in res
        ? (res as { message: string | string[] }).message
        : exception.message;
    } else {
      message = exception instanceof Error ? exception.message : 'Internal server error';
      this.logger.error(
        `Unhandled exception: ${message}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
      // Reportar ao Sentry (só se DSN estiver configurado)
      Sentry.captureException(exception);
    }

    const body: Record<string, unknown> = {
      statusCode: status,
      message,
    };

    // Em desenvolvimento, incluir detalhe do erro quando for 500
    if (status === 500 && !isHttpException && exception instanceof Error && process.env.NODE_ENV !== 'production') {
      body.error = exception.message;
      body.stack = exception.stack;
    }

    response.status(status).json(body);
  }
}
