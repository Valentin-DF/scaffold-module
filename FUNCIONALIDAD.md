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
- **Tipo**: `mantenedores`, `movimientos`, `procesos`
- **Tabla BD**: nombre de la tabla física
- **Componente**: ID del componente para activity log
- **Usa Broker**: agrega parámetro `broker kafka.Broker` a la función `Create`
- **Ventana**: nombre de la ventana para el controlador (permite string vacío)

### Campos del módulo
- Tabla dinámica con columnas toggle para cada capa:
  - **Ent** — incluir en entidad
  - **Req** — incluir en request
  - **Res** — incluir en response
  - **Lis** — incluir en listar (response de paginación)
  - **Mod** — incluir en modelo MSSQL (row/rowToEntity)
  - **Sug** — marcar como campo suggest (ver sección Suggest Fields)
  - **Imp** — incluir en importación Excel
- Generación por lotes desde tags (`tag1:string,tag2:int64`)
- Defaults predefinidos según el tipo:
  - `movimientos`: `IdEmpresa`, `IdUsuario`, `IdModulo`, `IdDocumento`, `Documento`, `IdSerie`, `Serie`, `Numero`, `DocumentoSerie`, `IdEstado`, `Estado`, `CodigoEstado`, `FechaCreacion`, `FechaActualizado`, `ValidacionFormulario`, `Ventana`, `IdComponente`, `Habilitado`, `Field`
  - `mantenedores`: `IdEmpresa`, `IdUsuario`, `IdModulo`, `Codigo`, `Descripcion`, `Abreviatura`, `Habilitado`, `FechaCreacion`, `FechaActualizado`, `IdComponente`

### Suggest Fields

La columna **Sug** (Suggest) permite generar automáticamente un campo variante `NombreXxx` junto al campo original en todas las capas.

#### Regla de nomenclatura

| Campo original | Suggest field name | Struct Go | Tag JSON |
|---------------|-------------------|-----------|----------|
| `IdProducto` | `NombreProducto` | `NombreProducto` | `nombre_producto` |
| `IdAfectacion` | `NombreAfectacion` | `NombreAfectacion` | `nombre_afectacion` |
| `Documento` | `NombreDocumento` | `NombreDocumento` | `nombre_documento` |

- Se elimina el prefijo `Id`/`id` y se antepone `Nombre`/`nombre_`.
- Si el campo no comienza con `Id`, se antepone `Nombre` igualmente.

#### Comportamiento por capa

| Capa / Template | Campo original | Campo suggest | Tipo suggest |
|---------------|---------------|---------------|-------------|
| **Entity** | Se mantiene | Se agrega | `string` (sin tag db) |
| **Request** | Se mantiene | Se agrega | `string` (sin tag json) |
| **Response** | Se mantiene | Se agrega | `interface{}` |
| **ListarResponse** | Se **reemplaza** por el suggest | Solo `NombreXxx` | `interface{}` |
| **Model (Row/rowToEntity)** | Se mantiene | Se agrega | `string` (con tag db `nombre_xxx`) |
| **Mapping DTO→Entity** | Se mapea | Se mapea | `req.NombreXxx` |
| **Mapping Entity→VO** | Se mantiene | Se agrega | `cons.ToJson(e.NombreXxxx)` |
| **Mapping Paginación** | Se **reemplaza** por el suggest | Solo `NombreXxx` | `cons.ToJson(models[i].NombreXxx)` |

**Reglas clave:**
- En `ListarResponse` y `MapPaginacionVo`, el campo original **no aparece** — solo el suggest variant. Esto evita enviar IDs internos al frontend cuando se usa suggest.
- En `Entity→VO`, aparecen **ambos**: el original y el suggest.
- El tipo del suggest es `interface{}` en response (porque `cons.ToJson` puede devolver cualquier tipo) y `string` en entity/request/model.
- El mapping usa `cons.ToJson` (no `fmt.Sprint`) para convertir el campo a JSON string en la capa de mapping.
- La columna Sug en el UI es **la única fuente** que controla `inSuggest` — no hay auto-detección por nombre de campo.

#### Estructura flatMap

Los templates usan `flatMap` para emitir tanto el campo original como el suggest variant sin modificar el modelo de datos:

```js
p.fields.filter(f => f.inResponse).flatMap(f => {
    const orig = structField(f.name, f.type, f.tagName, 'json');
    if (!f.inSuggest) return [orig];
    return [orig, structField(suggestFieldName(f.name), 'interface{}', suggestFieldTag(f.tagName), 'json')];
}).join('\n');
```

### DocumentoSerieResponse

El campo `DocumentoSerie` es un tipo especial (`DocumentoSerieResponse`) que agrupa 5 campos relacionados.

#### Definición

```go
type DocumentoSerieResponse struct {
    IdDocumento *int64
    Documento   *string
    IdSerie     *int64
    Serie       *string
    Numero      *int64
}
```

#### Dónde se define

El struct `DocumentoSerieResponse` se genera en **dos paquetes**:
- **Entity** (`domain/entity/{modulo}.entity.go`) — para uso en la entidad y en rowToEntity (se mapea desde columna JSON)
- **Response** (`application/response/{modulo}.response.go`) — para uso en el response del controlador

Esto evita errores de compilación "undefined" cuando el response referencia el tipo.

#### Expansión en Entity→VO

En `MapEntityToVO`, el campo `DocumentoSerie` **no se copia directamente** (`e.DocumentoSerie`) sino que se **expande** construyendo el struct a partir de los campos individuales de la entidad:

```go
DocumentoSerie: response.DocumentoSerieResponse{
    IdDocumento: &e.IdDocumento,
    Documento:   &e.Documento,
    IdSerie:     &e.IdSerie,
    Serie:       &e.Serie,
    Numero:      &e.Numero,
},
```

Esto ocurre automáticamente cuando el tipo del campo es `DocumentoSerieResponse` (revisado en `template-helpers.js:mapField`).

### Detalle (opcional)
- Múltiples tarjetas de detalle, cada una con sus propios campos
- Campos con columna **Pad** (Padre) — solo un campo puede ser padre a la vez
- Soporte para importación Excel por detalle
- Las columnas toggle de detalle incluyen: Ent, Req, Res, Lis, Mod, Sug, Pad
- Suggest fields en detalle siguen las mismas reglas que en header

### Importación Excel (opcional)
- Genera entidades, requests, responses, mappings para validación e importación por lotes
- Agrega rutas `POST /{modulo}-validate` y `POST /{modulo}-save-import`

### Por SP (movimientos)
- Cuando el tipo es `movimientos`, el checkbox **Por SP** se marca y deshabilita automáticamente
- Los SPs de movimientos siempre requieren ejecución por stored procedure

## Arquitectura del generador

```
scaffold-module/
├── main.js                # Proceso principal Electron
├── preload.js             # Bridge de comunicación
├── src/
│   ├── generator/
│   │   ├── index.js       # Lógica de generación (16 secciones)
│   │   ├── templates.js   # 22+ templates Go (agrega todos los template-*.js)
│   │   ├── template-entity.js      # Entity template
│   │   ├── template-request.js     # Request template
│   │   ├── template-response.js    # Response template
│   │   ├── template-mapping.js     # Mapping template
│   │   ├── template-model.js       # MSSQL model template
│   │   ├── template-controller.js  # Controller template
│   │   ├── template-helpers.js     # Helpers (structField, mapField, suggestFieldName, etc.)
│   │   ├── template-mssql.js       # MSSQL repository template
│   │   ├── template-routes.js      # Routes template
│   │   ├── template-usecase.js     # UseCase template
│   │   ├── template-port.js        # Port template
│   │   ├── template-repository.js  # Repository template
│   │   ├── template-mnt.js         # Entry point (mnt) template
│   │   └── utils.js       # Utilidades (PascalCase, camelCase, etc.)
│   └── renderer/
│       ├── index.html     # Interfaz de usuario
│       ├── app.js         # Lógica del frontend
│       └── styles.css     # Estilos dark theme
```

### Templates individuales

Cada template se implementa en un archivo separado bajo `src/generator/`:

| Archivo | Exporta | Propósito |
|---------|---------|-----------|
| `template-entity.js` | `entityGo`, `importEntityGo`, `detailEntityGo` | Structs de entidad + `DocumentoSerieResponse` |
| `template-request.js` | `requestGo`, `detailRequestGo` | Structs de request |
| `template-response.js` | `responseGo`, `importResponseGo`, `detailResponseGo` | Structs de response + `DocumentoSerieResponse` + paginación |
| `template-mapping.js` | `mappingGo`, `importMappingGo`, `detailMappingGo` | Funciones de mapping DTO↔Entity↔VO |
| `template-model.js` | `modelGo`, `detailModelGo` | Row struct + rowToEntity |
| `template-helpers.js` | helpers | Funciones compartidas (structField, mapField, suggestFieldName, etc.) |
| `template-controller.js` | `controllerGo`, `detailControllerGo` | Handlers HTTP |
| `template-mssql.js` | `mssqlGo`, `detailMssqlGo` | Queries MSSQL |
| `template-routes.js` | `routesGo` | Definición de rutas |
| `template-usecase.js` | `usecaseGo`, `detailUsecaseGo` | Lógica de negocio |
| `template-port.js` | `portGo` | Interface del usecase |
| `template-repository.js` | `repositoryGo` | Interface del repositorio |
| `template-mnt.js` | `mntGo` | Función Create del módulo |

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

## Consideraciones importantes

- El import de cons en mapping usa `cons "gitlab.com/ns-desarrollo-web/erp/ns-core-service/shared/constants"` (no `pkg/cons`).
- El import de entity **no** se inyecta en archivos usecase.
- `detRowToEntityFields` mapea todos los campos con `inModel = true`, sin filtrar por `inEntity`.
- `FechaCreacion` se agrega como campo default tanto en `movimientos` como en `mantenedores`.
- El valor de `Ventana` se toma del input del usuario; si está vacío se envía `""` en el controlador.
- Las tablas de campos tienen scroll vertical con max-height para evitar desbordamiento.
- La card de detalle tiene padding-top extra (`36px`) para que el botón de cerrar no solape el contenido.
