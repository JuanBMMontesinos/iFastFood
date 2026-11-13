import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';

async function exportOpenApi() {
  const app = await NestFactory.create(AppModule, { logger: false });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('iFastFood API')
    .setDescription('API Marketplace Delivery iFastFood — Especificação OpenAPI para SDKs nativos e web')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  const targetDir = path.resolve(__dirname, '../../../packages/contracts/generators/openapi');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const targetFile = path.join(targetDir, 'openapi.json');
  fs.writeFileSync(targetFile, JSON.stringify(document, null, 2), 'utf-8');

  // eslint-disable-next-line no-console
  console.log(`[OpenAPI] Especificação exportada com sucesso em: ${targetFile}`);
  await app.close();
  process.exit(0);
}

exportOpenApi().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[OpenAPI] Erro ao exportar:', err);
  process.exit(1);
});
