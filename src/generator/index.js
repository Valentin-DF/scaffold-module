const path = require('path');
const fs = require('fs');
const { generateComponentId, toPascalCase, toCamelCase, toGoPackageName } = require('./utils');
const T = require('./templates');

async function generate(config) {
  const logs = [];
  const log = (msg) => { logs.push(msg); };

  const ruta = config.ruta.trim();
  const dominio = config.dominio;
  const servicio = config.servicio || `${dominio}-service`;
  const tipo = config.tipo;
  const tabla = config.tabla.trim();
  const usesBroker = config.broker;
  const usesPorSP = config.porSP;
  const suggestCode = config.suggestCode || '';
  const suggestLabel = config.suggestLabel || '';
  const basePath = config.basePath.trim();
  const tieneImport = config.importHeader;
  const campos = config.campos || [];
  const detalles = config.detalles || [];

  const pascal = toPascalCase(ruta);
  const camel = toCamelCase(ruta);
  const packageName = toGoPackageName(ruta);
  const componentId =config.componente;
  const componentField =  pascal;

  const moduleDir = path.join(basePath, dominio, servicio, 'api', tipo, ruta);
  const importPath = `ns-backoffice-transactional-service/${dominio}/${servicio}/api/${tipo}/${ruta}`;

  // Parse fields
  const fields = campos.map((c) => ({
    name: c.nombre,
    tagName: c.campo,
    type: c.tipo || 'string',
    inEntity: c.entity !== false,
    inRequest: c.request !== false,
    inResponse: c.response !== false,
    inListar: c.listar !== false,
    inModel: c.model !== false,
  }));

  const importFields = (config.importFields || []).map(c => ({
    name: c.nombre,
    tagName: c.campo,
    type: c.tipo || 'string',
    inImport: true,
  }));

  const p = {
    ruta, dominio, tipo, tabla, pascal, camel, packageName, componentId, componentField,
    moduleDir, importPath, fields, importFields, logs, usesBroker, usesPorSP,
    suggestCode, suggestLabel,
  };

  log(`=== Generando modulo: ${ruta} ===`);
  log(`  PascalCase: ${pascal}`);
  log(`  camelCase: ${camel}`);
  log(`  Package: ${packageName}`);
  log(`  Tabla: ${tabla}`);
  log(`  ComponentId: ${componentId}`);
  log(`  ComponentField: ${componentField}`);
  log(`  Directorio: ${moduleDir}`);

  // Create directories
  const dirs = [
    moduleDir,
    path.join(moduleDir, 'domain', 'entity'),
    path.join(moduleDir, 'domain', 'repository'),
    path.join(moduleDir, 'application', 'request'),
    path.join(moduleDir, 'application', 'response'),
    path.join(moduleDir, 'application', 'mapping'),
    path.join(moduleDir, 'application', 'usecase'),
    path.join(moduleDir, 'infrastructure', 'delivery', 'http', 'controller'),
    path.join(moduleDir, 'infrastructure', 'delivery', 'http', 'routes'),
    path.join(moduleDir, 'infrastructure', 'persistence', 'mssql_repository'),
  ];
  dirs.forEach((d) => fs.mkdirSync(d, { recursive: true }));

  // Helper to write file
  const write = (relPath, content) => {
    const fullPath = path.join(moduleDir, relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf-8');
    log(`  [+] ${relPath}`);
  };

  // 1. .mnt.go
  write(`${ruta}.mnt.go`, T.mntGo(p));

  // 2. Entity
  write(`domain/entity/${ruta}.entity.go`, T.entityGo(p));

  // 3. Repository
  write(`domain/repository/${ruta}.repository.go`, T.repositoryGo(p));

  // 4. Request
  write(`application/request/${ruta}.request.go`, T.requestGo(p));

  // 5. Response
  write(`application/response/${ruta}.response.go`, T.responseGo(p));

  // 6. Mapping
  write(`application/mapping/${ruta}.mapping.go`, T.mappingGo(p));

  // 7. Port
  write(`application/usecase/port.go`, T.portGo(p));

  // 8. Usecase
  write(`application/usecase/${ruta}.usecase.go`, T.usecaseGo(p));

  // 9. Controller
  write(`infrastructure/delivery/http/controller/${ruta}.controller.go`, T.controllerGo(p));

  // 10. Routes
  write(`infrastructure/delivery/http/routes/${ruta}.routes.go`, T.routesGo(p));

  // 11. Model
  write(`infrastructure/persistence/mssql_repository/${ruta}.model.go`, T.modelGo(p));

  // 12. MSSQL repository
  write(`infrastructure/persistence/mssql_repository/${ruta}.mssql.go`, T.mssqlGo(p));

  // ── 13. Import files (optional) ──
  if (tieneImport && importFields.length > 0) {
    write(`domain/entity/${ruta}-import.entity.go`, T.importEntityGo(p));
    write(`application/request/${ruta}-import.request.go`, T.importRequestGo(p));
    write(`application/response/${ruta}-import.response.go`, T.importResponseGo());
    write(`application/mapping/${ruta}-import.mapping.go`, T.importMappingGo(p));

    // Append to routes
    const routesFile = path.join(moduleDir, 'infrastructure/delivery/http/routes', `${ruta}.routes.go`);
    let routesContent = fs.readFileSync(routesFile, 'utf-8');
    if (!routesContent.includes('IMPORTAR')) {
      const importRoutes = T.importRouteMethods(p);
      const lastBrace = routesContent.lastIndexOf('}');
      routesContent = routesContent.slice(0, lastBrace) + importRoutes + routesContent.slice(lastBrace);
      fs.writeFileSync(routesFile, routesContent, 'utf-8');
      log(`  [~] infrastructure/delivery/http/routes/${ruta}.routes.go (import agregado)`);
    }

    // Append to controller
    const controllerFile = path.join(moduleDir, 'infrastructure/delivery/http/controller', `${ruta}.controller.go`);
    let controllerContent = fs.readFileSync(controllerFile, 'utf-8');
    if (!controllerContent.includes('ValidateImport')) {
      if (!controllerContent.includes('"strconv"')) {
        controllerContent = controllerContent.replace(/\n\)/, '\n\t"strconv"\n)');
      }
      controllerContent += T.importControllerMethods(p);
      fs.writeFileSync(controllerFile, controllerContent, 'utf-8');
      log(`  [~] infrastructure/delivery/http/controller/${ruta}.controller.go (import agregado)`);
    }

    // Append to port
    const portFile = path.join(moduleDir, 'application/usecase', 'port.go');
    let portContent = fs.readFileSync(portFile, 'utf-8');
    if (!portContent.includes('IMPORTAR')) {
      const closingBrace = portContent.lastIndexOf('}');
      portContent = portContent.slice(0, closingBrace) + T.importPortMethods(p) + portContent.slice(closingBrace);
      fs.writeFileSync(portFile, portContent, 'utf-8');
      log(`  [~] application/usecase/port.go (import agregado)`);
    }

    // Append to usecase
    const usecaseFile = path.join(moduleDir, 'application/usecase', `${ruta}.usecase.go`);
    let usecaseContent = fs.readFileSync(usecaseFile, 'utf-8');
    if (!usecaseContent.includes('func.*ValidateImport')) {
      usecaseContent += T.importUseCaseMethods(p);
      fs.writeFileSync(usecaseFile, usecaseContent, 'utf-8');
      log(`  [~] application/usecase/${ruta}.usecase.go (import agregado)`);
    }

    // Append to repository
    const repoFile = path.join(moduleDir, 'domain/repository', `${ruta}.repository.go`);
    let repoContent = fs.readFileSync(repoFile, 'utf-8');
    if (!repoContent.includes('IMPORTAR')) {
      const closingBrace = repoContent.lastIndexOf('}');
      repoContent = repoContent.slice(0, closingBrace) + T.importRepoMethods(p) + repoContent.slice(closingBrace);
      // Add response import if not present
      if (!repoContent.includes(`${importPath}/application/response`)) {
        repoContent = repoContent.replace(/\n\)/, `\n\t"${importPath}/application/response"\n)`);
      }
      fs.writeFileSync(repoFile, repoContent, 'utf-8');
      log(`  [~] domain/repository/${ruta}.repository.go (import agregado)`);
    }

    // Append to mssql
    const mssqlFile = path.join(moduleDir, 'infrastructure/persistence/mssql_repository', `${ruta}.mssql.go`);
    let mssqlContent = fs.readFileSync(mssqlFile, 'utf-8');
    if (!mssqlContent.includes('//IMPORTAR')) {
      if (!mssqlContent.includes(`${importPath}/application/response`)) {
        mssqlContent = mssqlContent.replace(/\n\)/, `\n\t"${importPath}/application/response"\n)`);
      }
      mssqlContent += T.importMssqlMethods(p);
      fs.writeFileSync(mssqlFile, mssqlContent, 'utf-8');
      log(`  [~] infrastructure/persistence/mssql_repository/${ruta}.mssql.go (import agregado)`);
    }
  }

  // ── 14. Detail files (optional) ──
  for (const det of detalles) {
    if (!det.nombre) continue;
    const detPascal = toPascalCase(det.nombre);
    const detCamel = toCamelCase(det.nombre);
    const detPath = `${ruta}-${det.nombre}`;

    const detFields = (det.campos || []).map((c) => ({
      name: c.nombre,
      tagName: c.campo,
      type: c.tipo || 'string',
      inEntity: c.entity !== false,
      inRequest: c.request !== false,
      inResponse: c.response !== false,
      inListar: c.listar !== false,
      inModel: c.model !== false,
      inSuggest: c.suggest === true,
      inImport: c.import === true,
    }));

    const detP = { ...p, pascal: p.pascal, importPath: p.importPath, ruta: p.ruta, tabla: p.tabla, componentField: p.componentField };
    const detConfig = { ...det, pascal: detPascal, camel: detCamel, fields: detFields, path: detPath };

    // Entity
    write(`domain/entity/${detPath}.entity.go`, T.detailEntityGo(detP, detConfig));

    // Request
    write(`application/request/${detPath}.request.go`, T.detailRequestGo(detP, detConfig));

    // Response
    write(`application/response/${detPath}.response.go`, T.detailResponseGo(detP, detConfig));

    // Mapping
    write(`application/mapping/${detPath}.mapping.go`, T.detailMappingGo(detP, detConfig));

    // Append to repository
    let repoContent2 = fs.readFileSync(path.join(moduleDir, 'domain/repository', `${ruta}.repository.go`), 'utf-8');
    if (!repoContent2.includes(`//DETALLE`)) {
      const repoDetMethods = `\n\n\t//DETALLE\n\tListar${detPascal}(ctx context.Context, start int, length int, search string, id int64) (res []entity.${p.pascal}${detPascal}Entity, total int64, filtered int64, err error)\n\tCrear${detPascal}(ctx context.Context, ent entity.${p.pascal}${detPascal}Entity, id int64) error\n\tActualizar${detPascal}(ctx context.Context, ent entity.${p.pascal}${detPascal}Entity, id int64) error\n\tEliminar${detPascal}(ctx context.Context, id int64) error\n\tValidacion${detPascal}(ctx context.Context, id int64) (res []entity.Validacion${p.pascal}${detPascal}Entity, err error)`;
      const closingBrace2 = repoContent2.lastIndexOf('}');
      repoContent2 = repoContent2.slice(0, closingBrace2) + repoDetMethods + repoContent2.slice(closingBrace2);
      fs.writeFileSync(path.join(moduleDir, 'domain/repository', `${ruta}.repository.go`), repoContent2, 'utf-8');
      log(`  [~] domain/repository/${ruta}.repository.go (detalle agregado)`);
    }

    // Append to port
    let portContent2 = fs.readFileSync(path.join(moduleDir, 'application/usecase', 'port.go'), 'utf-8');
    if (!portContent2.includes('//DETALLE')) {
      const detPortMethods = `\n\n\t//DETALLE\n\tListar${detPascal}(ctx context.Context, start int, length int, search string, id int64) (interface{}, error)\n\tCrear${detPascal}(ctx context.Context, request *request.${p.pascal}${detPascal}Request, id int64) error\n\tActualizar${detPascal}(ctx context.Context, request *request.${p.pascal}${detPascal}Request, id int64) error\n\tEliminar${detPascal}(ctx context.Context, id int64) error`;
      const closingBrace2 = portContent2.lastIndexOf('}');
      portContent2 = portContent2.slice(0, closingBrace2) + detPortMethods + portContent2.slice(closingBrace2);
      fs.writeFileSync(path.join(moduleDir, 'application/usecase', 'port.go'), portContent2, 'utf-8');
      log(`  [~] application/usecase/port.go (detalle agregado)`);
    }

    // Append to usecase
    let ucContent = fs.readFileSync(path.join(moduleDir, 'application/usecase', `${ruta}.usecase.go`), 'utf-8');
    if (!ucContent.includes('// DETALLE')) {
      const detUcMethods = `
// DETALLE

func (a *${camel}UseCase) Listar${detPascal}(ctx context.Context, start int, length int, search string, id int64) (interface{}, error) {
	rs, total, filtered, err := a.repo.Listar${detPascal}(ctx, start, length, search, id)
	if err != nil {
		return nil, err
	}
	validacion, err := a.repo.Validacion${detPascal}(ctx, id)
	if err != nil {
		return nil, err
	}
	return mapping.Map${detPascal}PaginacionVo(rs, validacion, total, filtered), nil
}

func (a *${camel}UseCase) Crear${detPascal}(ctx context.Context, request *request.${p.pascal}${detPascal}Request, id int64) error {
	mod := mapping.MapDTOto${detPascal}Entity(request)
	return a.repo.Crear${detPascal}(ctx, mod, id)
}

func (a *${camel}UseCase) Actualizar${detPascal}(ctx context.Context, request *request.${p.pascal}${detPascal}Request, id int64) error {
	mod := mapping.MapDTOto${detPascal}Entity(request)
	return a.repo.Actualizar${detPascal}(ctx, mod, id)
}

func (a *${camel}UseCase) Eliminar${detPascal}(ctx context.Context, id int64) error {
	return a.repo.Eliminar${detPascal}(ctx, id)
}
`;
      ucContent += detUcMethods;
      if (!ucContent.includes(`${importPath}/domain/entity`)) {
        ucContent = ucContent.replace(/\n\)/, `\n\t"${importPath}/domain/entity"\n)`);
      }
      fs.writeFileSync(path.join(moduleDir, 'application/usecase', `${ruta}.usecase.go`), ucContent, 'utf-8');
      log(`  [~] application/usecase/${ruta}.usecase.go (detalle agregado)`);
    }

    // Append to controller
    let ctrlContent = fs.readFileSync(path.join(moduleDir, 'infrastructure/delivery/http/controller', `${ruta}.controller.go`), 'utf-8');
    if (!ctrlContent.includes(`Listar${detPascal}`)) {
      const detCtrlMethods = `

//DETALLE

func (a *${pascal}Controller) Listar${detPascal}(ctx *ns.Client) {
	p := ctx.GetPagination()
	id := ctx.GetIdParam()
	rs, err := a.${camel}UseCase.Listar${detPascal}(ctx.GetContext(), p.Start, p.Length, p.Search, id)
	if err != nil {
		ctx.Fail(err)
		return
	}
	ctx.Ok(rs)
}

func (a *${pascal}Controller) Crear${detPascal}(ctx *ns.Client) {
	var req request.${p.pascal}${detPascal}Request
	err := ctx.UnmarshalDTO(&req)
	if err != nil {
		ctx.Fail(err)
		return
	}
	err = a.${camel}UseCase.Crear${detPascal}(ctx.GetContext(), &req, req.IdHeader)
	if err != nil {
		ctx.Fail(err)
		return
	}
	ctx.Ok()
}

func (a *${pascal}Controller) Actualizar${detPascal}(ctx *ns.Client) {
	var req request.${p.pascal}${detPascal}Request
	err := ctx.UnmarshalDTO(&req)
	if err != nil {
		ctx.Fail(err)
		return
	}
	err = a.${camel}UseCase.Actualizar${detPascal}(ctx.GetContext(), &req, req.IdHeader)
	if err != nil {
		ctx.Fail(err)
		return
	}
	ctx.Ok()
}

func (a *${pascal}Controller) Eliminar${detPascal}(ctx *ns.Client) {
	err := a.${camel}UseCase.Eliminar${detPascal}(ctx.GetContext(), ctx.GetIdParam())
	if err != nil {
		ctx.Fail(err)
		return
	}
	ctx.Ok()
}
`;
      ctrlContent += detCtrlMethods;
      fs.writeFileSync(path.join(moduleDir, 'infrastructure/delivery/http/controller', `${ruta}.controller.go`), ctrlContent, 'utf-8');
      log(`  [~] infrastructure/delivery/http/controller/${ruta}.controller.go (detalle agregado)`);
    }

    // Append to routes
    let rtContent = fs.readFileSync(path.join(moduleDir, 'infrastructure/delivery/http/routes', `${ruta}.routes.go`), 'utf-8');
    if (!rtContent.includes(`Listar${detPascal}`)) {
      const detRouteMethods = `\n\n\t/*  ${detPascal} */\n\trouter.GET("/${detPath}/:id", c.Listar${detPascal})\n\trouter.POST("/${detPath}", c.Crear${detPascal})\n\trouter.PUT("/${detPath}/:id", c.Actualizar${detPascal})\n\trouter.DELETE("/${detPath}/:id", c.Eliminar${detPascal})`;
      const lastBrace3 = rtContent.lastIndexOf('}');
      rtContent = rtContent.slice(0, lastBrace3) + detRouteMethods + rtContent.slice(lastBrace3);
      fs.writeFileSync(path.join(moduleDir, 'infrastructure/delivery/http/routes', `${ruta}.routes.go`), rtContent, 'utf-8');
      log(`  [~] infrastructure/delivery/http/routes/${ruta}.routes.go (detalle agregado)`);
    }

    // Append to mssql
    let mssqlContent2 = fs.readFileSync(path.join(moduleDir, 'infrastructure/persistence/mssql_repository', `${ruta}.mssql.go`), 'utf-8');
    if (!mssqlContent2.includes(`//DETALLE ${detPascal}`)) {
      const detMssqlTable = det.tabla;
      const detMssqlCols = detFields.filter(f => f.inModel).map(f => f.tagName).join(',');
      const detRowFields = detFields.filter(f => f.inModel).map(f => structField(f.name, f.type, f.tagName, 'db')).join('\n');
      const detRowToEntityFields = detFields.filter(f => f.inModel && f.inEntity).map(f => `\t\t${f.name}: row.${f.name},`).join('\n');

      function structField(name, type, tag, kind) {
        const t = tag ? ` \`${kind}:"${tag}"\`` : '';
        return `\t${name}\t\t\t\t${type}${t}`;
      }

      const detRowStruct = `${camel}${detPascal}Row`;

      const detModelBlock = `
type ${detRowStruct} struct {
${detRowFields}
}

func det${detPascal}RowsToEntities(rows []${detRowStruct}) []entity.${p.pascal}${detPascal}Entity {
	entities := make([]entity.${p.pascal}${detPascal}Entity, len(rows))
	for i, row := range rows {
		entities[i] = det${detPascal}RowToEntity(row)
	}
	return entities
}

func det${detPascal}RowToEntity(row ${detRowStruct}) entity.${p.pascal}${detPascal}Entity {
	return entity.${p.pascal}${detPascal}Entity{
${detRowToEntityFields}
	}
}
`;

      const fkSnake = pascal.replace(/([A-Z])/g, '_$1').replace(/^_/, '').toLowerCase();
      const fkTag = `id${fkSnake}`;

      const detMssqlMethods = `
//DETALLE ${detPascal}

func (a *${pascal}MssqlRepository) Listar${detPascal}(ctx context.Context, start int, length int, search string, id int64) (res []entity.${p.pascal}${detPascal}Entity, total int64, filtered int64, err error) {
	meta := ns.MetaFromContext(ctx)
	if meta == nil {
		err = fmt.Errorf("no meta found in context")
		return
	}
	var rows []${detRowStruct}
	rs, err := a.db.Run(ctx, \`
		EXEC [NS_DETAIL_LIST]
			@idempresa = @p1,
			@table = '',
			@key = '${fkTag}',
			@columns = '${detMssqlCols}',
			@id = @p2,
			@start = @p3,
			@length = @p4,
			@search = @p5,
			@order = '',
			@advanced_filter = '',
			@default_filter = 'id',
			@alternateFunc = '${detMssqlTable}',\`, meta.Client.CompanyId, id, start, length, search)
	if err != nil {
		return
	}
	err = rs.Unmarshal(&rows)
	if err != nil {
		return
	}
	return det${detPascal}RowsToEntities(rows), rs.TotalRows, rs.TotalFiltered, nil
}

func (a *${pascal}MssqlRepository) Crear${detPascal}(ctx context.Context, ent entity.${p.pascal}${detPascal}Entity, id int64) error {
	json, err := db.Marshal(ent)
	if err != nil {
		return err
	}
	_, err = a.db.Query(ctx, \`EXEC NS_${detMssqlTable}_I @id = @p1, @json = @p2\`, id, string(json))
	return err
}

func (a *${pascal}MssqlRepository) Actualizar${detPascal}(ctx context.Context, ent entity.${p.pascal}${detPascal}Entity, id int64) error {
	json, err := db.Marshal(ent)
	if err != nil {
		return err
	}
	_, err = a.db.Query(ctx, \`EXEC NS_${detMssqlTable}_U @id = @p1, @json = @p2\`, id, string(json))
	return err
}

func (a *${pascal}MssqlRepository) Eliminar${detPascal}(ctx context.Context, id int64) error {
	_, err := a.db.Query(ctx, \`EXEC NS_${detMssqlTable}_D @id = @p1\`, id)
	return err
}

func (a *${pascal}MssqlRepository) Validacion${detPascal}(ctx context.Context, id int64) (res []entity.Validacion${p.pascal}${detPascal}Entity, err error) {
	return nil, nil
}
`;
      mssqlContent2 += detModelBlock + detMssqlMethods;
      fs.writeFileSync(path.join(moduleDir, 'infrastructure/persistence/mssql_repository', `${ruta}.mssql.go`), mssqlContent2, 'utf-8');
      log(`  [~] infrastructure/persistence/mssql_repository/${ruta}.mssql.go (detalle agregado)`);

      // Add entity import to usecase if needed
      let ucContent2 = fs.readFileSync(path.join(moduleDir, 'application/usecase', `${ruta}.usecase.go`), 'utf-8');
      if (!ucContent2.includes(`${importPath}/domain/entity`)) {
        ucContent2 = ucContent2.replace(/\n\)/, `\n\t"${importPath}/domain/entity"\n)`);
        fs.writeFileSync(path.join(moduleDir, 'application/usecase', `${ruta}.usecase.go`), ucContent2, 'utf-8');
      }

      // Detail import generation
      if (det.importar) {
        const detImportFields = detFields.filter(f => f.inImport);
        if (detImportFields.length > 0) {
          const detImportEntityBlock = detImportFields.map(f => `\t${f.name}\t\t\t\t${f.type}\t\t\t\`db:"${f.tagName}"\``).join('\n');
          const detImportRequestBlock = detImportFields.map(f => `\t${f.name}\t\t\t\t${f.type}\t\t\t\`json:"${f.tagName}"\``).join('\n');
          const detImportMappingDtoBlock = detImportFields.map(f => `\t\t\t${f.name}: r.${f.name},`).join('\n');

          // Import entity
          write(`domain/entity/${detPath}-import.entity.go`, `package entity\n\ntype ${pascal}ImportExceldbEntity struct {\n${detImportEntityBlock}\n}\n\ntype ${pascal}ImportExcelEntity struct {\n\tValidado      bool                        \`db:"validado"\`\n\tErrores       []${pascal}ImportExcelFilaEntity  \`db:"errores"\`\n\tObservaciones []${pascal}ImportExcelFilaEntity  \`db:"observaciones"\`\n}\n\ntype ${pascal}ImportExcelFilaEntity struct {\n\tFila     int64    \`db:"fila"\`\n\tCampo    string   \`db:"campo"\`\n\tMensajes []string \`db:"mensajes"\`\n}\n`);

          // Import request
          write(`application/request/${detPath}-import.request.go`, `package request\n\ntype ${pascal}ImportExcelRequest struct {\n${detImportRequestBlock}\n}\n`);

          // Import response
          write(`application/response/${detPath}-import.response.go`, `package response\n\ntype ${pascal}ImportExcelResponse struct {\n\tValidado      bool\n\tErrores       []${pascal}ImportExcelFilaResponse\n\tObservaciones []${pascal}ImportExcelFilaResponse\n}\n\ntype ${pascal}ImportExcelFilaResponse struct {\n\tFila     int64\n\tCampo    string\n\tMensajes []string\n}\n`);

          // Import mapping
          write(`application/mapping/${detPath}-import.mapping.go`, `package mapping\n\nimport (\n\t"${importPath}/application/request"\n\t"${importPath}/application/response"\n\t"${importPath}/domain/entity"\n)\n\nfunc Map${pascal}ValidateImportParaDBToDTO(req []request.${pascal}ImportExcelRequest) []entity.${pascal}ImportExceldbEntity {\n\tentities := make([]entity.${pascal}ImportExceldbEntity, len(req))\n\tfor i, r := range req {\n\t\tentities[i] = entity.${pascal}ImportExceldbEntity{\n${detImportMappingDtoBlock}\n\t\t}\n\t}\n\treturn entities\n}\n\nfunc Map${pascal}ValidateImportParaVistaToDTO(ent entity.${pascal}ImportExcelEntity) response.${pascal}ImportExcelResponse {\n\terrores := make([]response.${pascal}ImportExcelFilaResponse, len(ent.Errores))\n\tfor i, e := range ent.Errores {\n\t\terrores[i] = response.${pascal}ImportExcelFilaResponse{Fila: e.Fila, Campo: e.Campo, Mensajes: e.Mensajes}\n\t}\n\tobservaciones := make([]response.${pascal}ImportExcelFilaResponse, len(ent.Observaciones))\n\tfor i, o := range ent.Observaciones {\n\t\tobservaciones[i] = response.${pascal}ImportExcelFilaResponse{Fila: o.Fila, Campo: o.Campo, Mensajes: o.Mensajes}\n\t}\n\treturn response.${pascal}ImportExcelResponse{\n\t\tValidado: ent.Validado, Errores: errores, Observaciones: observaciones,\n\t}\n}\n`);

          // Append routes
          let rtContent2 = fs.readFileSync(path.join(moduleDir, 'infrastructure/delivery/http/routes', `${ruta}.routes.go`), 'utf-8');
          if (!rtContent2.includes(`${detPath}-validate`)) {
            const lastBrace4 = rtContent2.lastIndexOf('}');
            rtContent2 = rtContent2.slice(0, lastBrace4) + `\n\n\t/*IMPORTAR ${detPascal}*/\n\trouter.POST("/${detPath}-validate", c.Validate${detPascal}Import)\n\trouter.POST("/${detPath}-save-import", c.Save${detPascal}Import)` + rtContent2.slice(lastBrace4);
            fs.writeFileSync(path.join(moduleDir, 'infrastructure/delivery/http/routes', `${ruta}.routes.go`), rtContent2, 'utf-8');
            log(`  [~] infrastructure/delivery/http/routes/${ruta}.routes.go (import ${det.nombre} agregado)`);
          }

          // Append controller
          let ctrlContent2 = fs.readFileSync(path.join(moduleDir, 'infrastructure/delivery/http/controller', `${ruta}.controller.go`), 'utf-8');
          if (!ctrlContent2.includes(`Validate${detPascal}Import`)) {
            if (!ctrlContent2.includes('"strconv"')) {
              ctrlContent2 = ctrlContent2.replace(/\n\)/, '\n\t"strconv"\n)');
            }
            ctrlContent2 += `
/*IMPORTAR ${detPascal}*/

func (a *${pascal}Controller) Validate${detPascal}Import(ctx *ns.Client) {
	var req []request.${pascal}ImportExcelRequest
	err := ctx.UnmarshalDTO(&req)
	if err != nil {
		ctx.Fail(err)
		return
	}
	id, err := strconv.ParseInt(ctx.Query("id"), 10, 64)
	if err != nil {
		ctx.Fail(err)
		return
	}
	res, err := a.${camel}UseCase.Validate${detPascal}Import(ctx.GetContext(), id, req)
	if err != nil {
		ctx.Fail(err)
		return
	}
	ctx.Ok(res)
}

func (a *${pascal}Controller) Save${detPascal}Import(ctx *ns.Client) {
	var req []request.${pascal}ImportExcelRequest
	err := ctx.UnmarshalDTO(&req)
	if err != nil {
		ctx.Fail(err)
		return
	}
	id, err := strconv.ParseInt(ctx.Query("id"), 10, 64)
	if err != nil {
		ctx.Fail(err)
		return
	}
	res, err := a.${camel}UseCase.Save${detPascal}Import(ctx.GetContext(), id, req)
	if err != nil {
		ctx.Fail(err)
		return
	}
	ctx.Ok(res)
}
`;
            fs.writeFileSync(path.join(moduleDir, 'infrastructure/delivery/http/controller', `${ruta}.controller.go`), ctrlContent2, 'utf-8');
            log(`  [~] infrastructure/delivery/http/controller/${ruta}.controller.go (import ${det.nombre} agregado)`);
          }

          // Append port, usecase, repo, mssql (simplified - same pattern as header import)
        }
      }
    }
  }

  // ── 15. Register in endpoints.go ──
  const endpointsFile = path.join(basePath, 'cmd', 'service', 'endpoints.go');
  if (fs.existsSync(endpointsFile)) {
    let endpointsContent = fs.readFileSync(endpointsFile, 'utf-8');
    const domainUpper = dominio.toUpperCase();
    const importQuote = `"${importPath}"`;

    if (!endpointsContent.includes(importQuote)) {
      const closingImportParen = endpointsContent.lastIndexOf('\n)');
      endpointsContent = endpointsContent.slice(0, closingImportParen) + `\n\t// ${domainUpper}\n\t${packageName} "${importPath}"` + endpointsContent.slice(closingImportParen);
      log(`  [+] Import agregado a endpoints.go`);
    } else {
      log(`  [!] Import ya existe en endpoints.go`);
    }

    const createCallRegex = new RegExp(`\\b${packageName}\\.Create\\(router`);
    if (!createCallRegex.test(endpointsContent)) {
      const lineToAdd = usesBroker ? `${packageName}.Create(router, db, broker)` : `${packageName}.Create(router, db)`;
      const closingInitBrace = endpointsContent.lastIndexOf('\n}');
      endpointsContent = endpointsContent.slice(0, closingInitBrace) + `\n\t// ${domainUpper}\n\t${lineToAdd}` + endpointsContent.slice(closingInitBrace);
      log(`  [+] Create() agregado a initEndpoints`);
    } else {
      log(`  [!] Create() ya existe en initEndpoints`);
    }
    fs.writeFileSync(endpointsFile, endpointsContent, 'utf-8');
  }

  // ── 16. Register component ID ──
  const componentFile = path.join(basePath, 'utils', 'component.utils.go');
  if (fs.existsSync(componentFile)) {
    let componentContent = fs.readFileSync(componentFile, 'utf-8');

    // Add field to struct type definition
    if (!componentContent.includes(`${componentField} string`)) {
      const structTypePos = componentContent.indexOf('type Componentes struct {');
      if (structTypePos !== -1) {
        const structBodyStart = structTypePos + 'type Componentes struct {'.length;
        const structClosePos = componentContent.indexOf('\n}', structBodyStart);
        if (structClosePos !== -1) {
          componentContent = componentContent.slice(0, structClosePos) + `\n\t${componentField} string` + componentContent.slice(structClosePos);
          log(`  [+] Campo ${componentField} agregado a type Componentes struct`);
        }
      }
    }

    // Add value to var initialization
    if (!componentContent.includes(`${componentField}:`)) {
      const closingStructBrace = componentContent.lastIndexOf('\n}');
      if (closingStructBrace !== -1) {
        componentContent = componentContent.slice(0, closingStructBrace) + `\n\t${componentField}: "${componentId}",` + componentContent.slice(closingStructBrace);
        log(`  [+] ComponentId agregado a component.utils.go`);
      }
    } else {
      log(`  [!] ComponentId ${componentField} ya existe en component.utils.go`);
    }

    fs.writeFileSync(componentFile, componentContent, 'utf-8');
  }

  log(`\n=== Modulo '${ruta}' generado exitosamente ===`);
  log(`  Directorio: ${moduleDir}`);
  log(`  ComponentId: ${componentId}`);
  log(`\nEjecuta 'go build -o ns-service ./cmd' para compilar.`);

  return { logs };
}

module.exports = { generate };
