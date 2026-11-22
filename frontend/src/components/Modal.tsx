import { useEffect, useRef, type ReactNode } from 'react';

// <dialog> nativo: foco atrapado, Esc para cerrar y fondo inerte sin librerías.
export default function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal?.(); // jsdom no implementa showModal
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="modal-titulo"
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl border bg-card p-6 text-foreground shadow-lg backdrop:bg-black/35"
    >
      {open && (
        <>
          <h2 id="modal-titulo" className="text-md font-semibold">{title}</h2>
          <div className="mt-4 space-y-4">{children}</div>
        </>
      )}
    </dialog>
  );
}
