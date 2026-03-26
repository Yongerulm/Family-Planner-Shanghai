import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
  timestamp: string;
  path: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as { message?: string | string[]; error?: string };
        message = resp.message ?? message;
        error = resp.error;
      }
    } else if (exception instanceof Error) {
      // Unbekannte Fehler: nur loggen, niemals Stack-Trace an Client
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
    }

    const errorBody: ErrorResponse = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // 5xx Fehler loggen (nicht 4xx, die sind normal)
    if (status >= 500) {
      this.logger.error(`${request.method} ${request.url} → ${status}`, {
        error: exception instanceof Error ? exception.message : 'Unknown error',
      });
    }

    response.status(status).json(errorBody);
  }
}
