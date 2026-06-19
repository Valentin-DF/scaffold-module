# Ejecución del Proyecto

## Requisitos

- **Node.js** >= 18
- **npm** >= 9

## Instalación

```bash
cd scaffold-module
npm install
```

Esto instala:
- `electron` — runtime de escritorio
- `electron-builder` — empaquetado para distribución
- `electron-reload` — recarga automática en desarrollo

## Ejecutar en desarrollo

```bash
npm start
```

Abre una ventana Electron con el formulario de generación.  
`electron-reload` vigila cambios en `src/`, `main.js` y `preload.js` y recarga automáticamente.

## Uso

1. **Ruta raíz**: Seleccionar o escribir la ruta del proyecto target (`D:\NISIRA\ERPWEB\ns-backoffice-transactional-service`)
2. **Módulo**: Nombre del módulo en kebab-case (ej. `motivo-produccion`)
3. **Dominio**: Seleccionar el dominio funcional
4. **Servicio**: Carpeta del servicio (default: `{dominio}-service`). Para `compartido` cambiar a `shared-service`
5. **Tipo**: `mantenedores`, `movimientos`, `procesos` o `reportes`
6. **Tabla BD**: Nombre de la tabla física (ej. `TMMOTIVO_PRODUCCION`)
7. **Componente**: Se autocompleta desde el nombre del módulo
8. **Usa Broker**: Marcar si el módulo necesita Kafka/notificaciones
9. **Campos**: Usar la tabla dinámica para definir campos, o generar desde tags
10. **Detalle** (opcional): Marcar "Tiene Detalle" y configurar cards
11. **Generar**: Click en "Generar Modulo"

## Build para distribución

```bash
# Windows (NSIS installer)
npm run build:win

# macOS (DMG)
npm run build:mac

# Linux (AppImage)
npm run build:linux

# Todos los targets
npm run build
```

El instalador se genera en `release/`.

## Estructura de archivos generados

```
{basePath}/{dominio}/{servicio}/api/{tipo}/{modulo}/
├── {modulo}.mnt.go
├── domain/
│   ├── entity/{modulo}.entity.go
│   └── repository/{modulo}.repository.go
├── application/
│   ├── request/{modulo}.request.go
│   ├── response/{modulo}.response.go
│   ├── mapping/{modulo}.mapping.go
│   └── usecase/
│       ├── port.go
│       └── {modulo}.usecase.go
└── infrastructure/
    ├── delivery/http/
    │   ├── controller/{modulo}.controller.go
    │   └── routes/{modulo}.routes.go
    └── persistence/mssql_repository/
        ├── {modulo}.model.go
        └── {modulo}.mssql.go
```

## Notas

- El proyecto usa `electron-reload` en desarrollo; si da error (ej. `electron` no encontrado), la app igual funciona sin recarga automática
- Los campos `fecha_actualizado` se generan automáticamente en los UPDATEs con `DATEADD(HOUR, -5, GETUTCDATE())`
- El checkbox "Pad" en detalle es de selección única (radio behavior)
