function mssqlGo(p) {
  const isMov = p.tipo === 'movimientos';
  const defaultFilter = isMov ? 'documento, serie' : 'codigo, descripcion';
  const mssqlCols = p.fields.filter(f => f.inModel).map(f => f.tagName).join(',');
  const excluded = ['field', 'idempresa', 'idusuario', 'idmodulo', 'fecha_actualizado', 'validacion_formulario', 'ventana', 'idcomponente'];
  const mssqlListCols = p.fields.filter(f => f.inModel && !excluded.includes(f.tagName)).map(f => f.tagName).join(',');

  const extraImports = '';

  const mapEntries = !p.usesPorSP ? p.fields
    .filter(f => f.inEntity && f.name !== 'Id')
    .map(f => {
      if (f.name === 'IdEmpresa') return `\t\t"${f.tagName}": meta.Client.CompanyId,`;
      if (f.name === 'IdUsuario') return `\t\t"${f.tagName}": meta.Client.Auth.UserId,`;
      return `\t\t"${f.tagName}": modelo.${f.name},`;
    })
    .join('\n') : '';

  const updateMapEntries = !p.usesPorSP ? p.fields
    .filter(f => f.inEntity && f.name !== 'Id' && f.name !== 'IdEmpresa' && f.name !== 'IdUsuario')
    .map(f => `\t\t"${f.tagName}": modelo.${f.name},`)
    .join('\n') : '';

  const crearImpl = p.usesPorSP
    ? `func (a *${p.pascal}MssqlRepository) Crear(ctx context.Context, modelo entity.${p.pascal}Entity) (info entity.InfoRetornoEntity, err error) {
	meta := ns.MetaFromContext(ctx)
	if meta == nil {
		err = fmt.Errorf("no meta found in context")
		return
	}
	json, err := db.Marshal(modelo)
	if err != nil {
		return
	}
	err = a.db.RunUnmarshal(ctx, &info, "EXEC NS_${p.tabla}_I @JSON = @p1, @idempresa=@p2 ", string(json), meta.Client.CompanyId)
	if err != nil {
		return
	}
	return
}`
    : `func (a *${p.pascal}MssqlRepository) Crear(ctx context.Context, modelo entity.${p.pascal}Entity) (info entity.InfoRetornoEntity, err error) {
	meta := ns.MetaFromContext(ctx)
	if meta == nil {
		err = fmt.Errorf("no meta found in context")
		return
	}
	var id int64
	id, err = db.InsertWithAudit(ctx, a.db, "${p.tabla}", map[string]interface{}{
${mapEntries}
	}, meta.Client.Auth.UserId, ns.AuditJSONFromContext(ctx))
	if err != nil {
		return
	}
	info = entity.InfoRetornoEntity{Id: id}
	return
}`;

  const actualizarImpl = p.usesPorSP
    ? `func (a *${p.pascal}MssqlRepository) Actualizar(ctx context.Context, id int64, modelo entity.${p.pascal}Entity) (info entity.InfoRetornoEntity, err error) {
	meta := ns.MetaFromContext(ctx)
	if meta == nil {
		err = fmt.Errorf("no meta found in context")
		return
	}
	json, err := db.Marshal(modelo)
	if err != nil {
		return
	}
	err = a.db.RunUnmarshal(ctx, &info, "EXEC NS_${p.tabla}_U @id = @p1, @JSON = @p2", id, string(json))
	if err != nil {
		return
	}
	return
}`
    : `func (a *${p.pascal}MssqlRepository) Actualizar(ctx context.Context, id int64, modelo entity.${p.pascal}Entity) (info entity.InfoRetornoEntity, err error) {
	meta := ns.MetaFromContext(ctx)
	if meta == nil {
		err = fmt.Errorf("no meta found in context")
		return
	}
	_, err = db.UpdateWithAudit(ctx, a.db, "${p.tabla}", "id", id,
		map[string]interface{}{
${updateMapEntries}
		},
		map[string]interface{}{
			"idempresa": meta.Client.CompanyId,
		}, meta.Client.Auth.UserId, ns.AuditJSONFromContext(ctx))
	if err != nil {
		return
	}
	info = entity.InfoRetornoEntity{Id: id}
	return
}`;

  const eliminarImpl = p.usesPorSP
    ? `func (a *${p.pascal}MssqlRepository) Eliminar(ctx context.Context, id int64) (info entity.InfoRetornoEntity, err error) {
	meta := ns.MetaFromContext(ctx)
	if meta == nil {
		err = fmt.Errorf("no meta found in context")
		return
	}
	err = a.db.RunUnmarshal(ctx, &info, "EXEC NS_${p.tabla}_D @id = @p1", id)
	if err != nil {
		return
	}
	return
}`
    : `func (a *${p.pascal}MssqlRepository) Eliminar(ctx context.Context, id int64) (info entity.InfoRetornoEntity, err error) {
	meta := ns.MetaFromContext(ctx)
	if meta == nil {
		err = fmt.Errorf("no meta found in context")
		return
	}
	_, err = db.UpdateWithAudit(ctx, a.db, "${p.tabla}", "id", id,
		map[string]interface{}{
			"estado": "E",
		},
		map[string]interface{}{
			"idempresa": meta.Client.CompanyId,
		}, meta.Client.Auth.UserId, ns.AuditJSONFromContext(ctx))
	if err != nil {
		return
	}
	info = entity.InfoRetornoEntity{Id: id}
	return
}`;

  return `package mssql_repository

import (
	"context"
	"fmt"${extraImports}
	"${p.importPath}/domain/entity"
	"${p.importPath}/domain/repository"

	"gitlab.com/ns-desarrollo-web/erp/ns-core-service"
	db "gitlab.com/ns-desarrollo-web/erp/ns-core-service/pkg/database"
)

type ${p.pascal}MssqlRepository struct {
	db db.Sql
}

//CABECERA

func (a *${p.pascal}MssqlRepository) Listar(ctx context.Context, start int, length int, search string) (res []entity.${p.pascal}Entity, total int64, filtered int64, err error) {
	meta := ns.MetaFromContext(ctx)
	if meta == nil {
		err = fmt.Errorf("no meta found in context")
		return
	}
	var rows []${p.camel}Row
	rs, err := a.db.Run(ctx, \`
		EXEC [NS_MAINTAINER_LIST]
				@idempresa = @p1,
				@columns = '${mssqlListCols}',
				@table = '${p.tabla}',
				@start = @p2,
				@length = @p3,
				@search = @p4,
				@order = '',
				@advanced_filter = '',
				@default_filter = '${defaultFilter}'\`, meta.Client.CompanyId, start, length, search)
	if err != nil {
		return
	}
	err = rs.Unmarshal(&rows)
	if err != nil {
		return
	}
	return rowsToEntities(rows), rs.TotalRows, rs.TotalFiltered, nil
}

${crearImpl}

${actualizarImpl}

${eliminarImpl}

func (a *${p.pascal}MssqlRepository) HabilitarDeshabilitar(ctx context.Context, id int64, status bool) (err error) {
	meta := ns.MetaFromContext(ctx)
	if meta == nil {
		err = fmt.Errorf("no meta found in context")
		return
	}
	_, err = db.UpdateWithAudit(ctx, a.db, "${p.tabla}", "id", id,
		map[string]interface{}{
			"habilitado": status,
		},
		map[string]interface{}{
			"idempresa": meta.Client.CompanyId,
		}, meta.Client.Auth.UserId, ns.AuditJSONFromContext(ctx))
	return
}

//BUSCAR

func (a *${p.pascal}MssqlRepository) Buscar(ctx context.Context, search, advancedSearch string, id int, idEmpresa int64, IsColumns bool) (res []entity.${p.pascal}Entity, err error) {
	var rows []${p.camel}Row
	columns := \`${mssqlListCols}\`

	var idFilter *int
	if id != 0 {
		idFilter = &id
	}

	rs, err := a.db.Run(ctx, \`
		EXEC NS_GETDATA_F_PAGINATE
			@idempresa = @p1,
			@columns = @p2,
			@table = '${p.tabla}',
			@search = @p3,
			@limit = @p4,
			@id_filter = @p5,
			@default_filter = '${defaultFilter}',
			@advanced_filter = @p6\`, idEmpresa, columns, search, 10, idFilter, advancedSearch)
	if err != nil {
		return
	}
	err = rs.Unmarshal(&rows)
	if err != nil {
		return
	}
	return rowsToEntities(rows), nil
}

func (a *${p.pascal}MssqlRepository) BuscarPorID(ctx context.Context, id int64) (res entity.${p.pascal}Entity, err error) {
	var rows []${p.camel}Row
	meta := ns.MetaFromContext(ctx)
	if meta == nil {
		err = fmt.Errorf("no meta found in context")
		return
	}
	err = a.db.RunUnmarshal(ctx, &rows, "SELECT ${mssqlListCols} FROM ${p.tabla} WHERE id=@p1 AND idempresa=@p2", id, meta.Client.CompanyId)
	if err != nil {
		return
	}
	if len(rows) == 0 {
		return res, entity.Err${p.pascal}NoEncontrado
	}
	return rowsToEntities(rows)[0], nil
}

//OTROS

func (a *${p.pascal}MssqlRepository) VerificarCodigo(ctx context.Context, code string) (existe bool, err error) {
	meta := ns.MetaFromContext(ctx)
	if meta == nil {
		err = fmt.Errorf("no meta found in context")
		return
	}
	rs, err := a.db.Run(ctx, "SELECT CODIGO FROM ${p.tabla} WHERE CODIGO = @p1 AND idempresa=@p2", code, meta.Client.CompanyId)
	if err != nil {
		return
	}
	existe = rs.Length > 0
	return
}

func New${p.pascal}Repository(db db.Sql) repository.${p.pascal}Repository {
	return &${p.pascal}MssqlRepository{db: db}
}
`;
}

function importMssqlMethods(p) {
  return `
//IMPORTAR

func (a *${p.pascal}MssqlRepository) SaveImport(ctx context.Context, id int64, entity []entity.ImportExceldbEntity) (data response.DetalleResponse, err error) {
	res, err := db.Marshal(entity)
	if err != nil { return }
	err = a.db.RunUnmarshal(ctx, &data, \`EXEC NS_${p.tabla}_D_SAVE_IMPORT @id = @p1 , @json = @p2\`, id, string(res))
	if err != nil { return }
	return
}

func (a *${p.pascal}MssqlRepository) ValidateImport(ctx context.Context, id int64, entitys []entity.ImportExceldbEntity) (ent entity.ImportExcelEntity, err error) {
	var entInterno []entity.ImportExcelEntity
	jsonObject, err := db.Marshal(entitys)
	if err != nil { return }
	rs, err := a.db.Run(ctx, \`EXEC NS_${p.tabla}_D_IMPORT @json = @p1\`, string(jsonObject))
	if err != nil { return }
	err = rs.Unmarshal(&entInterno)
	if err != nil { return }
	ent = entInterno[0]
	return
}
`;
}

module.exports = { mssqlGo, importMssqlMethods };
