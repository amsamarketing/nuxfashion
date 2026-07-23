import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: '2mb' }));
  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: ['http://localhost:5173', 'https://nuxfashion-api.vercel.app', process.env.FRONTEND_URL].filter(Boolean),
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const config = new DocumentBuilder()
    .setTitle('NuxFashion ERP API')
    .setDescription('Fashion Retail ERP & POS System')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  const port = process.env.PORT || 3000;
  app.getHttpAdapter().get('/', (req, res) => {
    res.json({ status: 'ok', api: '/api/v1', version: '1.0.0' });
  });
  await app.listen(port);
  console.log(`NuxFashion API running on port ${port}`);
  console.log(`API docs: http://localhost:${port}/api/docs`);
}
bootstrap();
