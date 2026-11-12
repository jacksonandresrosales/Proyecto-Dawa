import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Punto de partida. Las rutas y pantallas se agregan según docs/ux/02-sitemap.md (semana 3).
export default function App() {
  return (
    <main className="mx-auto max-w-md p-8">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1>ServiGest</h1>
          </CardTitle>
          <CardDescription>Gestión de solicitudes de servicio técnico.</CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}
