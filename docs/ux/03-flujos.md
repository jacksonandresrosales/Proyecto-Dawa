# Flujos de usuario

Los flujos 2 y 3 son los dos recorridos de extremo a extremo que exige el enunciado; cada uno tendrá su prueba E2E.

## 1. Inicio de sesión y recuperación

```mermaid
flowchart TD
  A([Abre la app]) --> B{¿Tiene sesión?}
  B -- Sí --> I[/inicio según rol/]
  B -- No --> L[/login/]
  L --> C{¿Credenciales válidas<br/>y usuario activo?}
  C -- No --> E[Mensaje genérico de error] --> L
  C -- Sí --> P{¿Contraseña temporal?}
  P -- Sí --> PA[/primer-acceso/] --> I
  P -- No --> I
  L -- Olvidé mi contraseña --> R[/recuperar: ingresa correo/]
  R --> M[Mensaje: si el correo existe, se generó un enlace]
  M --> T[/restablecer/:token/]
  T --> V{¿Token válido,<br/>sin usar y vigente?}
  V -- No --> X[Enlace inválido o vencido] --> R
  V -- Sí --> N[Nueva contraseña] --> L
```

## 2. Registro → asignación → atención

```mermaid
flowchart TD
  subgraph Cliente o Coordinador
    A([Nueva solicitud]) --> B[Completa formulario<br/>categoría, prioridad, sede, equipo, descripción, adjuntos]
    B --> C{¿Datos válidos?}
    C -- No --> B
  end
  C -- Sí --> D[(registrada<br/>código SOL-AAAA-NNNNNN<br/>fecha límite calculada)]
  subgraph Coordinador
    D --> E{¿Aprueba?}
    E -- No, con motivo --> Z[(cancelada)]
    E -- Sí --> F[(aprobada)]
    F --> G[Abre modal Asignar técnico<br/>lista con especialidad, disponibilidad y carga]
    G --> H{¿Técnico cumple<br/>especialidad, disponible,<br/>carga menor al máximo?}
    H -- No --> G
  end
  H -- Sí --> J[(asignada)]
  subgraph Técnico
    J --> K[Inicia atención] --> L[(en proceso)]
    L --> M{¿Necesita información?}
    M -- Sí, con mensaje --> N[(pendiente de información)]
    M -- No --> P[Documenta la resolución] --> Q[(resuelta)]
  end
  N -- Cliente responde --> L
```

Cada cambio de estado genera un registro en el historial y una notificación a los interesados.

## 3. Consulta → seguimiento → cierre

```mermaid
flowchart TD
  A([Cliente abre Mis solicitudes]) --> B[Filtra por estado o fecha]
  B --> C[Abre el detalle]
  C --> D[Ve estado, técnico, plazo e historial<br/>actualizados en vivo]
  D --> E{¿Le pidieron información?}
  E -- Sí --> F[Responde] --> D
  E -- No --> G[(resuelta)]
  G --> H[Coordinador revisa la resolución]
  H --> I{¿Tiene resolución<br/>documentada?}
  I -- No --> J[El sistema bloquea el cierre]
  I -- Sí --> K{¿Conforme?}
  K -- No, con motivo --> L[(en proceso)]
  K -- Sí --> M[(cerrada)]
  M --> N{¿Reapertura?}
  N -- Coordinador o admin,<br/>con justificación --> L
  N -- No --> O([Fin])
```

## 4. Reasignación justificada

```mermaid
flowchart TD
  A([Coordinador ve solicitud por vencer<br/>o técnico sobrecargado]) --> B[Abre el detalle]
  B --> C[Reasignar]
  C --> D[Elige nuevo técnico y escribe la justificación]
  D --> E{¿Justificación presente<br/>y técnico válido?}
  E -- No --> D
  E -- Sí --> F[Asignación anterior queda inactiva<br/>nueva asignación activa<br/>historial + avisos a ambos técnicos]
```

## 5. Administración de catálogos

```mermaid
flowchart TD
  A([Admin abre un catálogo]) --> B[Lista con búsqueda y paginación]
  B --> C[Crear o editar en modal]
  C --> D{¿Nombre duplicado<br/>o datos inválidos?}
  D -- Sí --> C
  D -- No --> B
  B --> E[Eliminar]
  E --> F{¿Tiene registros relacionados?}
  F -- Sí --> G[No se elimina: se ofrece Desactivar]
  F -- No --> H[Confirmar y eliminar]
```

## Estados de la solicitud vistos desde la interfaz

```mermaid
stateDiagram-v2
  [*] --> registrada
  registrada --> aprobada: Coordinador aprueba
  registrada --> cancelada: Cliente o coordinador (motivo)
  aprobada --> asignada: Coordinador asigna
  aprobada --> cancelada: Cliente o coordinador (motivo)
  asignada --> asignada: Coordinador reasigna (justificación)
  asignada --> en_proceso: Técnico inicia
  en_proceso --> pendiente_info: Técnico pide información
  pendiente_info --> en_proceso: Cliente responde
  en_proceso --> resuelta: Técnico resuelve (resolución)
  resuelta --> cerrada: Coordinador cierra
  resuelta --> en_proceso: Coordinador rechaza (motivo)
  cerrada --> en_proceso: Reapertura (justificación)
  cerrada --> [*]
  cancelada --> [*]
```

Los botones de acción del detalle se calculan a partir de este diagrama y del rol; el servidor vuelve a validar cada transición.
