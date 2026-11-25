import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { parse } from 'yaml';
import { app } from '../../src/app.js';

function expectReferencesToResolve(document) {
  const pending = [document];
  while (pending.length) {
    const current = pending.pop();
    if (Array.isArray(current)) {
      pending.push(...current);
      continue;
    }
    if (!current || typeof current !== 'object') continue;

    if (typeof current.$ref === 'string') {
      expect(current.$ref.startsWith('#/')).toBe(true);
      const target = current.$ref.slice(2).split('/').reduce(
        (value, part) => value?.[part.replace(/~1/g, '/').replace(/~0/g, '~')],
        document,
      );
      expect(target, current.$ref).toBeDefined();
    }
    pending.push(...Object.values(current));
  }
}

describe('OpenAPI docs', () => {
  it('serves Swagger UI configured with the project document', async () => {
    const docs = await request(app).get('/api/docs/');
    const initializer = await request(app).get('/api/docs/swagger-ui-init.js');

    expect(docs.status).toBe(200);
    expect(docs.text).toContain('Swagger UI');
    expect(docs.headers['content-security-policy']).toContain("script-src 'self' 'unsafe-inline'");
    expect(initializer.status).toBe(200);
    expect(initializer.text).toContain('ServiGest API');
    expect(initializer.text).toContain('/health');
    expect(initializer.text).not.toContain('petstore.swagger.io');
  });

  it('exposes the OpenAPI YAML document', async () => {
    const response = await request(app).get('/api/openapi.yaml');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('yaml');
    const document = parse(response.text);

    expect(document.openapi).toBe('3.0.3');
    expect(document.components.securitySchemes.bearerAuth).toMatchObject({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    });
    expect(document.components.schemas).toHaveProperty('ErrorResponse');
    expect(document.components.schemas).toHaveProperty('ApiList');
    expect(document.components.schemas.DeadlineState.enum).toEqual([
      'a_tiempo',
      'por_vencer',
      'vencida',
      'cumplida',
      'incumplida',
    ]);

    for (const [path, methods] of Object.entries({
      '/health': ['get'],
      '/auth/setup-status': ['get'],
      '/auth/setup': ['post'],
      '/auth/login': ['post'],
      '/auth/logout': ['post'],
      '/auth/me': ['get', 'patch'],
      '/auth/forgot': ['post'],
      '/auth/reset': ['post'],
      '/usuarios': ['get', 'post'],
      '/usuarios/{id}': ['get', 'patch', 'delete'],
      '/usuarios/{id}/restablecer-password': ['post'],
      '/clientes': ['get', 'post'],
      '/clientes/{id}': ['get', 'patch', 'delete'],
      '/clientes/{id}/sedes': ['get'],
      '/tecnicos': ['get', 'post'],
      '/tecnicos/carga': ['get'],
      '/tecnicos/{id}': ['get', 'patch', 'delete'],
      '/especialidades': ['get', 'post'],
      '/especialidades/{id}': ['get', 'patch', 'delete'],
      '/categorias': ['get', 'post'],
      '/categorias/{id}': ['get', 'patch', 'delete'],
      '/prioridades': ['get', 'post'],
      '/prioridades/{id}': ['get', 'patch', 'delete'],
      '/solicitudes': ['get', 'post'],
      '/solicitudes/{id}': ['get'],
      '/solicitudes/{id}/estado': ['patch'],
      '/solicitudes/{id}/asignaciones': ['post'],
      '/solicitudes/{id}/historial': ['get'],
      '/solicitudes/{id}/adjuntos': ['get', 'post'],
      '/solicitudes/{id}/adjuntos/{adjuntoId}': ['get'],
      '/notificaciones': ['get'],
      '/notificaciones/stream': ['get'],
      '/notificaciones/leidas': ['patch'],
      '/notificaciones/{id}/leida': ['patch'],
      '/dashboard/indicadores': ['get'],
      '/openapi.yaml': ['get'],
      '/docs/': ['get'],
    })) {
      expect(document.paths[path], `missing path ${path}`).toBeDefined();
      for (const method of methods) {
        expect(document.paths[path][method], `missing ${method.toUpperCase()} ${path}`).toBeDefined();
      }
    }

    const requestList = document.paths['/solicitudes'].get;
    expect(requestList.parameters.find((parameter) => parameter.name === 'plazo').schema.$ref)
      .toBe('#/components/schemas/DeadlineState');
    expectReferencesToResolve(document);
  });
});
