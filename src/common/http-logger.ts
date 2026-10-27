import type { LoggerService } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

export function httpLogger(logger: LoggerService) {
  return (request: Request, response: Response, next: NextFunction) => {
    const startedAt = Date.now();
    response.on('finish', () => {
      const elapsed = Date.now() - startedAt;
      logger.log(`${request.method} ${request.originalUrl} ${response.statusCode} ${elapsed}ms`, 'HTTP');
    });
    next();
  };
}
