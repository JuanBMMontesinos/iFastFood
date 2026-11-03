import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { AppModule } from './app.module';

/**
 * Bootstrap da API iFastFood.
 * Segurança base (plano item 7): HSTS/headers via helmet, CORS allowlist,
 * ValidationPipe global (never trust input).
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  const origins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: origins.length > 0 ? origins : false,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      stopAtFirstError: true,
      forbidUnknownValues: true,
    }),
  );

  // Formato único de erro: { error: { code, message, details? } }
  app.useGlobalFilters(new ApiExceptionFilter());

  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[iFastFood API] rodando em http://localhost:${port}`);
}

void bootstrap();
