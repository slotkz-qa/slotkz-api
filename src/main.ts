import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { join } from 'node:path';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/all-exceptions.filter.js';
import { FileLogger } from './common/file-logger.js';
import { httpLogger } from './common/http-logger.js';

async function bootstrap() {
  const logger = new FileLogger();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger });

  app.setGlobalPrefix('api');
  app.use(httpLogger(logger));
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter(logger));
  app.useStaticAssets(join(process.cwd(), 'public'));

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`SlotKZ is running on http://localhost:${port}`, 'Bootstrap');
}

await bootstrap();
