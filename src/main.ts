import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LoggingInterceptor } from './logging/logging.interceptor';
import { AllExceptionsFilter } from './logging/all-exceptions.filter';
import { nestLoggerLevels, parseLogLevel } from './logging/log-level';

async function bootstrap() {
  const logLevel = parseLogLevel(process.env.LOG_LEVEL);

  const app = await NestFactory.create(AppModule, {
    logger: nestLoggerLevels(logLevel),
  });

  app.useGlobalInterceptors(new LoggingInterceptor(logLevel));
  app.useGlobalFilters(new AllExceptionsFilter(logLevel));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Ignora los campos que NO estén definidos en el DTO
      forbidNonWhitelisted: true, // Lanza error si envían campos no permitidos
    }),
  );

  // Configuración de opciones de Swagger
  const config = new DocumentBuilder()
    .setTitle('API de Tenants y Alarmas')
    .setDescription('Documentación y prueba de endpoints')
    .setVersion('1.0')
    .addTag('tenants')
    .addTag('alarms')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Ingresa tu JWT token',
        in: 'header',
      },
      'access-token',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-KEY',
        in: 'header',
        description: 'Clave de API para la aplicación móvil',
      },
      'api-key',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); // La ruta será /api

  app.enableCors({
    origin: true,
    credentials: true,
  });

  await app.listen(3000);
}
bootstrap();
