import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';

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
    expect(response.text).toContain('openapi: 3.0.3');
    expect(response.text).toContain('/health:');
  });
});
