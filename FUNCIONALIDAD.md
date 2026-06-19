# Scaffold Module - Generador de Módulos Go

Aplicación Electron que genera la estructura completa de un módulo Go con arquitectura hexagonal para el microservicio `ns-backoffice-transactional-service`.

## ¿Qué genera?

Por cada módulo crea **12+ archivos Go** organizados en capas:

| Capa | Archivos |
|------|----------|
| Entry point | `{modulo}.mnt.go` — función `Create(router, db)` |
| Domain — Entity | `domain/entity/{modulo}.entity.go` |
| Domain — Repository | `domain/repository/{modulo}.repository.go` |
| Application — Request | `application/request/{modulo}.request.go` |
| Application — Response | `application/response/{modulo}.response.go` |
| Application — Mapping | `application/mapping/{modulo}.mapping.go` |
| Application — Port | `application/usecase/port.go` |
| Application — UseCase | `application/usecase/{modulo}.usecase.go` |
| Infrastructure — Controller | `infrastructure/delivery/http/controller/{modulo}.controller.go` |
| Infrastructure — Routes | `infrastructure/delivery/http/routes/{modulo}.routes.go` |
| Infrastructure — Model | `infrastructure/persistence/mssql_repository/{modulo}.model.go` |
| Infrastructure — MSSQL Repo | `infrastructure/persistence/mssql_repository/{modulo}.mssql.go` |

Además **registra el módulo** en:
- `endpoints.go` — agrega el import y la llamada `Create(router, db[, broker])`
- `component.utils.go` — agrega el campo y el ID del componente

## Funcionalidades

### Configuración del módulo
- **Ruta raíz**: carpeta del proyecto (`ns-backoffice-transactional-service`)
- **Módulo**: nombre del módulo (ej. `motivo-produccion`)
- **Dominio**: dominio funcional (`produccion`, `ventas`, `compartido`, etc.)
- **Servicio**: carpeta del servicio dentro del dominio (default: `{dominio}-service`, permite override como `shared-service`)
- **Tipo**: `mantenedores`, `movimientos`, `procesos`, `reportes`
- **Tabla BD**: nombre de la tabla física
- **Componente**: ID del componente para activity log
- **Usa Broker**: agrega parámetro `broker kafka.Broker` a la función `Create`

### Campos del módulo
- Tabla dinámica con columnas toggle para cada capa (Entity, Request, Response, Listar, Model, Suggest, Import)
- Generación por lotes desde tags (`tag1:string,tag2:int64`)
- Defaults predefinidos según el tipo (`mantenedores` vs `movimientos`)

### Detalle (opcional)
- Múltiples tarjetas de detalle, cada una con sus propios campos
- Campos con columna **Pad** (Padre) — solo un campo puede ser padre a la vez
- Soporte para importación Excel por detalle

### Importación Excel (opcional)
- Genera entidades, requests, responses, mappings para validación e importación por lotes
- Agrega rutas `POST /{modulo}-validate` y `POST /{modulo}-save-import`

## Arquitectura del generador

```
scaffold-module/
├── main.js                # Proceso principal Electron
├── preload.js             # Bridge de comunicación
├── src/
│   ├── generator/
│   │   ├── index.js       # Lógica de generación (16 secciones)
│   │   ├── templates.js   # 22+ templates Go
│   │   └── utils.js       # Utilidades (PascalCase, camelCase, etc.)
│   └── renderer/
│       ├── index.html     # Interfaz de usuario
│       ├── app.js         # Lógica del frontend
│       └── styles.css     # Estilos dark theme
```

## Conexión con el proyecto target

Los archivos generados se escriben en:
```
{basePath}/{dominio}/{servicio}/api/{tipo}/{modulo}/
```

Y se registran en:
```
{basePath}/cmd/service/endpoints.go
{basePath}/utils/component.utils.go
```
