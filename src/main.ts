import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors(); // Habilita CORS si es necesario

  await app.listen(3000, '0.0.0.0');
  console.log('Hola:Aplicación en ejecución en http://localhost:3000');
}

bootstrap();
