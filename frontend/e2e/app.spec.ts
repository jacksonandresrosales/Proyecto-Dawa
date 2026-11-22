import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';

// Los dos flujos de extremo a extremo del enunciado (sección 8), sobre la app real (frontend + API + base).
// Requisitos: backend en :3000 con `npm run seed:demo` cargado. Cada rol entra en su propio navegador aislado.
const PASSWORD = process.env.DEMO_PASSWORD ?? 'ServiGest2026';
const CLIENTE = 'cliente1@servigest.test';
const COORDINADOR = 'coordinador1@servigest.test';
// Técnicos del seed con la especialidad Redes, que pide la categoría Conectividad.
const TECNICOS_REDES = [{ nombre: 'Pedro Salazar', email: 'tecnico1@servigest.test' }, { nombre: 'Ana Quiñónez', email: 'tecnico4@servigest.test' }];

const contextos: BrowserContext[] = [];
test.afterEach(async () => { await Promise.all(contextos.splice(0).map((c) => c.close())); });

async function entrar(browser: Browser, email: string) {
  const contexto = await browser.newContext();
  contextos.push(contexto);
  const page = await contexto.newPage();
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña').fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL('**/inicio');
  return page;
}

async function registrar(cliente: Page, equipo: string) {
  await cliente.goto('/solicitudes/nueva');
  await cliente.getByLabel('Sede').selectOption({ index: 1 });
  await cliente.getByLabel('Categoría').selectOption({ label: 'Conectividad' });
  await cliente.getByLabel('Prioridad').selectOption({ label: 'Media · 24 h' });
  await cliente.getByLabel('Equipo o recurso afectado').fill(equipo);
  await cliente.getByLabel('Descripción').fill('Sin conexión a internet desde la mañana.');
  await cliente.getByRole('button', { name: 'Registrar solicitud' }).click();
  await cliente.waitForURL(/\/solicitudes\/\d+$/);
  await expect(cliente.getByRole('status').filter({ hasText: 'registrada' })).toBeVisible();
  return cliente.url().split('/').pop()!;
}

const estado = (page: Page, nombre: string) => expect(page.locator('header').getByText(nombre, { exact: true })).toBeVisible();

// Aprueba y asigna al primer técnico de Redes con cupo; devuelve su correo.
async function aprobarYAsignar(coordinador: Page, id: string) {
  await coordinador.goto(`/solicitudes/${id}`);
  await coordinador.getByRole('button', { name: 'Aprobar' }).click();
  await estado(coordinador, 'Aprobada');
  await coordinador.getByRole('button', { name: 'Asignar técnico' }).click();
  const modal = coordinador.getByRole('dialog');
  await expect(modal.getByRole('radio').first()).toBeVisible();
  for (const tecnico of TECNICOS_REDES) {
    const opcion = modal.getByRole('radio', { name: new RegExp(tecnico.nombre) });
    if (await opcion.isEnabled()) {
      await opcion.check();
      await modal.getByRole('button', { name: 'Confirmar' }).click();
      await estado(coordinador, 'Asignada');
      return tecnico.email;
    }
  }
  throw new Error('Ningún técnico de Redes tiene cupo: vuelve a cargar los datos demo');
}

async function conTexto(page: Page, accion: string, campo: 'Comentario' | 'Resolución', texto: string) {
  await page.getByRole('button', { name: accion }).first().click();
  const modal = page.getByRole('dialog');
  await modal.getByLabel(campo).fill(texto);
  await modal.getByRole('button', { name: accion }).click();
}

test('registro → asignación → atención', async ({ browser }) => {
  const cliente = await entrar(browser, CLIENTE);
  const id = await registrar(cliente, `Router E2E ${Date.now()}`);
  await estado(cliente, 'Registrada');

  const coordinador = await entrar(browser, COORDINADOR);
  const tecnicoEmail = await aprobarYAsignar(coordinador, id);

  const tecnico = await entrar(browser, tecnicoEmail);
  await tecnico.goto(`/solicitudes/${id}`);
  await tecnico.getByRole('button', { name: 'Iniciar atención' }).click();
  await estado(tecnico, 'En proceso');
  await conTexto(tecnico, 'Marcar como resuelta', 'Resolución', 'Se reinició el router y se verificó la conexión.');
  await estado(tecnico, 'Resuelta');
  await expect(tecnico.getByText('Se reinició el router y se verificó la conexión.').first()).toBeVisible();
});

test('consulta → seguimiento → cierre', async ({ browser }) => {
  const equipo = `Switch E2E ${Date.now()}`;
  const cliente = await entrar(browser, CLIENTE);
  const id = await registrar(cliente, equipo);
  const coordinador = await entrar(browser, COORDINADOR);
  const tecnico = await entrar(browser, await aprobarYAsignar(coordinador, id));

  await tecnico.goto(`/solicitudes/${id}`);
  await tecnico.getByRole('button', { name: 'Iniciar atención' }).click();
  await estado(tecnico, 'En proceso');
  await conTexto(tecnico, 'Pedir información', 'Comentario', '¿Qué modelo de switch es?');
  await estado(tecnico, 'Pendiente de información');

  // Consulta: el cliente encuentra su solicitud filtrando y ve qué le piden en el historial.
  await cliente.goto('/solicitudes');
  await cliente.getByLabel('Buscar').fill(equipo);
  await cliente.getByRole('button', { name: 'Filtrar' }).click();
  await cliente.getByRole('link', { name: new RegExp(`SOL-\\d{4}-0*${id}`) }).first().click();
  await expect(cliente.getByText('¿Qué modelo de switch es?')).toBeVisible();

  // Seguimiento: responde, el técnico resuelve y el coordinador cierra.
  await conTexto(cliente, 'Responder', 'Comentario', 'Es un TP-Link de 24 puertos.');
  await estado(cliente, 'En proceso');
  await tecnico.reload();
  await conTexto(tecnico, 'Marcar como resuelta', 'Resolución', 'Se cambió el puerto dañado.');
  await estado(tecnico, 'Resuelta');
  await coordinador.reload();
  await coordinador.getByRole('button', { name: 'Cerrar solicitud' }).click();
  await estado(coordinador, 'Cerrada');

  // Cierre: el cliente ve la solicitud cerrada y el historial completo.
  await cliente.reload();
  await estado(cliente, 'Cerrada');
  for (const paso of ['En proceso → Pendiente de información', 'Pendiente de información → En proceso', 'Resuelta → Cerrada']) {
    await expect(cliente.getByText(paso)).toBeVisible();
  }
});
