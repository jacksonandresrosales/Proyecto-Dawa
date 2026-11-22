import type { Tono } from '@/lib/solicitudes';

// Píldora de estado: fondo tenue, texto del mismo tono y punto. Siempre con texto.
export default function Pildora({ tono, children }: { tono: Tono; children: string }) {
  return (
    <span
      className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-xs font-medium"
      style={{ background: `var(--tone-${tono}-bg)`, color: `var(--tone-${tono}-fg)` }}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full" style={{ background: `var(--tone-${tono}-dot)` }} />
      {children}
    </span>
  );
}
