import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

export const getSwaggerSpec = (baseUrl: string) => {
  const options: swaggerJsdoc.Options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'API File Uploader',
        version: '1.0.0',
        description: "Documentation de l'API pour l'upload de fichiers avec authentification",
      },
      servers: [
        { url: baseUrl },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
        schemas: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              username: { type: 'string', example: 'johndoe' },
              email: { type: 'string', example: 'john@example.com' },
            },
          },
        },
      },
      security: [
        {
          bearerAuth: [],
        },
      ],
    },
    apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
  };

  return swaggerJsdoc(options);
};

export { swaggerUi };
