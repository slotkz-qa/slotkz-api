import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { LoggerService } from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();

    if (exception instanceof HttpException) {
      response.status(exception.getStatus()).json(exception.getResponse());
      return;
    }

    const error = exception instanceof Error ? exception : new Error(String(exception));
    this.logger.error(`${request.method} ${request.originalUrl} - ${error.message}`, error.stack, 'ExceptionsFilter');
    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' });
  }
}
