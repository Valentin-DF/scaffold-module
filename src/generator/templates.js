const { toGoPackageName } = require('./utils');

// ── Helper: format field for struct ──
function structField(name, type, tag, kind) {
  const t = tag ? ` \`${kind}:"${tag}"\`` : '';
  return `\t${name}\t\t\t\t${type}${t}`;
}

function mapField(f) {
  return `\t\t${f.name}: e.${f.name},`;
}

function listarField(f) {
  return `\t\t\t${f.name}: models[i].${f.name},`;
}

function rowField(f) {
  return `\t\t${f.name}: row.${f.name},`;
}

function dtoField(name) {
  return `\t\t${name}: req.${name},`;
}

// ── 1. Module entry point (.mnt.go) ──
function mntGo(p) {
  const brokerImport = p.usesBroker ? '\n\t"gitlab.com/ns-desarrollo-web/erp/ns-core-service/pkg/kafka"' : '';
  const brokerParam = p.usesBroker ? ', broker kafka.Broker' : '';
  const brokerArg = p.usesBroker ? ', broker' : '';
  return `package ${p.packageName}

import (
	"${p.importPath}/application/usecase"
	"${p.importPath}/infrastructure/delivery/http/routes"
	"${p.importPath}/infrastructure/persistence/mssql_repository"

	"gitlab.com/ns-desarrollo-web/erp/ns-core-service"
	db "gitlab.com/ns-desarrollo-web/erp/ns-core-service/pkg/database"${brokerImport}
)

func Create(router *ns.Router, db db.Sql${brokerParam}) {
	repository := mssql_repository.New${p.pascal}Repository(db)
	useCase := usecase.New${p.pascal}UseCase(repository)
	routes.New${p.pascal}Routes(router, useCase${brokerArg})
}
`;
}

// ── 2. Entity ──
function entityGo(p) {
  const fields = p.fields.filter(f => f.inEntity).map(f => structField(f.name, f.type, f.tagName, 'db')).join('\n');
  return `package entity

import (
	"errors"
)

var (
	Err${p.pascal}YaHabilitado    = errors.New("el ${p.ruta} ya se encuentra habilitado")
	Err${p.pascal}YaDeshabilitado = errors.New("el ${p.ruta} ya se encuentra deshabilitado")
	Err${p.pascal}NoEncontrado    = errors.New("${p.ruta} no encontrado")
)

type DocumentoSerieResponse struct {
	IdDocumento *int64
	Documento   *string
	IdSerie     *int64
	Serie       *string
	Numero      *int64
}

type ${p.pascal}Entity struct {
${fields}
}

func (e *${p.pascal}Entity) Habilitar() error {
	if e.Habilitado {
		return Err${p.pascal}YaHabilitado
	}
	e.Habilitado = true
	return nil
}

func (e *${p.pascal}Entity) Deshabilitar() error {
	if !e.Habilitado {
		return Err${p.pascal}YaDeshabilitado
	}
	e.Habilitado = false
	return nil
}

type InfoRetornoEntity struct {
	Id     int64  \`db:"id"\`
	Extras string \`db:"extras"\`
}
`;
}

// ── 3. Repository interface ──
function repositoryGo(p) {
  return `package repository

import (
	"context"
	"${p.importPath}/domain/entity"
)

type ${p.pascal}Repository interface {
	//CABECERA
	Listar(ctx context.Context, start int, length int, search string) (res []entity.${p.pascal}Entity, total int64, filtered int64, err error)
	Crear(ctx context.Context, modelo entity.${p.pascal}Entity) (entity.InfoRetornoEntity, error)
	Actualizar(ctx context.Context, id int64, modelo entity.${p.pascal}Entity) (entity.InfoRetornoEntity, error)
	Eliminar(ctx context.Context, id int64) (entity.InfoRetornoEntity, error)
	HabilitarDeshabilitar(ctx context.Context, id int64, status bool) (err error)

	//BUSCAR
	Buscar(ctx context.Context, search, advancedSearch string, id int, idEmpresa int64, columns bool) (res []entity.${p.pascal}Entity, err error)
	BuscarPorID(ctx context.Context, id int64) (res entity.${p.pascal}Entity, err error)

	//OTROS
	VerificarCodigo(ctx context.Context, code string) (existe bool, err error)
}
`;
}

// ── 4. Request ──
function requestGo(p) {
  const fields = p.fields.filter(f => f.inRequest).map(f => structField(f.name, f.type, f.tagName, 'json')).join('\n');
  return `package request

type ${p.pascal}Request struct {
${fields}
}
`;
}

// ── 5. Response ──
function responseGo(p) {
  const listarFields = p.fields.filter(f => f.inListar).map(f => structField(f.name, f.type, f.tagName, 'json')).join('\n');
  const responseFields = p.fields.filter(f => f.inResponse).map(f => structField(f.name, f.type, f.tagName, 'json')).join('\n');
  return `package response

type ${p.pascal}ListarResponse struct {
${listarFields}
}

type ${p.pascal}Response struct {
${responseFields}
}

type DetalleResponse struct {
	Estado string \`json:"estado"\`
	Id     int64  \`json:"id"\`
}

type ValidacionExterna struct {
	Id         int64       \`json:"id"\`
	Index      int         \`json:"index"\`
	Campo      string      \`json:"campo"\`
	Descripcion string     \`json:"descripcion"\`
	Valor      interface{} \`json:"valor"\`
}

type Paginacion struct {
	Data []${p.pascal}ListarResponse \`json:"data"\`
	Meta MetaPaginacion      \`json:"meta"\`
}

type MetaPaginacion struct {
	RecordsFiltered int64 \`json:"recordsFiltered"\`
	RecordsTotal    int64 \`json:"recordsTotal"\`
}

type SuggestV0 struct {
	Id          int64       \`json:"id"\`
	Code        string      \`json:"code"\`
	Label       string      \`json:"label"\`
	Description string      \`json:"description"\`
	Data        interface{} \`json:"data"\`
	Url         *string     \`json:"url"\`
}
`;
}

// ── 6. Mapping ──
function mappingGo(p) {
  const dtoFields = p.fields.filter(f => f.inRequest && f.inEntity).map(f => `\t\t${f.name}: req.${f.name},`).join('\n');
  const voFields = p.fields.filter(f => f.inResponse && f.inEntity).map(mapField).join('\n');
  const pagFields = p.fields.filter(f => f.inListar).map(listarField).join('\n');

  const codeField = p.suggestCode || (p.fields.find(f => f.name === 'Codigo' && f.inEntity) ? 'Codigo' : 'Id');
  const labelField = p.suggestLabel || (p.fields.find(f => f.name === 'Descripcion' && f.inEntity) ? 'Descripcion' : codeField);

  return `package mapping

import (
	"${p.importPath}/application/request"
	"${p.importPath}/application/response"
	"${p.importPath}/domain/entity"
)

func MapDTOtoEntity(req *request.${p.pascal}Request) entity.${p.pascal}Entity {
	return entity.${p.pascal}Entity{
${dtoFields}
	}
}

func MapEntityToVO(e entity.${p.pascal}Entity) *response.${p.pascal}Response {
	return &response.${p.pascal}Response{
${voFields}
	}
}

func MapPaginacionVo(models []entity.${p.pascal}Entity, total int64, filtered int64) *response.Paginacion {
	res := make([]response.${p.pascal}ListarResponse, 0)
	for i := range models {
		res = append(res, response.${p.pascal}ListarResponse{
${pagFields}
		})
	}
	return &response.Paginacion{
		Data: res,
		Meta: response.MetaPaginacion{
			RecordsFiltered: filtered,
			RecordsTotal:    total,
		},
	}
}

func MapSuggestV0(entityList []entity.${p.pascal}Entity) (res []*response.SuggestV0) {
	for i := range entityList {
		res = append(res, &response.SuggestV0{
			Id:          entityList[i].Id,
			Code:        entityList[i].${codeField},
			Label:       entityList[i].${labelField},
			Description: entityList[i].${labelField},
			Data:        &entityList[i],
		})
	}
	return
}
`;
}

// ── 7. Usecase port ──
function portGo(p) {
  return `package usecase

import (
	"context"
	"${p.importPath}/application/request"
	"${p.importPath}/application/response"
)

type ${p.pascal}UseCase interface {
	//CABECERA
	Listar(ctx context.Context, start int, length int, search string) (res *response.Paginacion, err error)
	Crear(ctx context.Context, request *request.${p.pascal}Request) (res *response.${p.pascal}Response, err error)
	Actualizar(ctx context.Context, id int64, request *request.${p.pascal}Request) (res *response.${p.pascal}Response, err error)
	Eliminar(ctx context.Context, id int64) (err error)
	Habilitar(ctx context.Context, id int64) (res *response.${p.pascal}Response, err error)
	Deshabilitar(ctx context.Context, id int64) (res *response.${p.pascal}Response, err error)

	//BUSCAR
	Buscar(ctx context.Context, search, advancedSearch string, columns bool, id int, idEmpresa int64) (res []*response.SuggestV0, err error)
	BuscarPorID(ctx context.Context, id int64) (res *response.${p.pascal}Response, err error)

	//OTROS
	VerificarCodigo(ctx context.Context, code string) (existe bool, err error)
}
`;
}

// ── 8. Usecase implementation ──
function usecaseGo(p) {
  return `package usecase

import (
	"context"
	"${p.importPath}/application/mapping"
	"${p.importPath}/application/request"
	"${p.importPath}/application/response"
	"${p.importPath}/domain/repository"
)

type ${p.camel}UseCase struct {
	repo repository.${p.pascal}Repository
}

// CABECERA

func (a *${p.camel}UseCase) Listar(ctx context.Context, start int, length int, search string) (res *response.Paginacion, err error) {
	rs, total, filtered, err := a.repo.Listar(ctx, start, length, search)
	if err != nil {
		return
	}
	res = mapping.MapPaginacionVo(rs, total, filtered)
	return
}

func (a *${p.camel}UseCase) Crear(ctx context.Context, request *request.${p.pascal}Request) (res *response.${p.pascal}Response, err error) {
	mod := mapping.MapDTOtoEntity(request)
	info, err := a.repo.Crear(ctx, mod)
	if err != nil {
		return
	}
	rs, err := a.repo.BuscarPorID(ctx, info.Id)
	if err != nil {
		return
	}
	res = mapping.MapEntityToVO(rs)
	return
}

func (a *${p.camel}UseCase) Actualizar(ctx context.Context, id int64, request *request.${p.pascal}Request) (res *response.${p.pascal}Response, err error) {
	mod := mapping.MapDTOtoEntity(request)
	info, err := a.repo.Actualizar(ctx, id, mod)
	if err != nil {
		return
	}
	rs, err := a.repo.BuscarPorID(ctx, info.Id)
	if err != nil {
		return
	}
	res = mapping.MapEntityToVO(rs)
	return
}

func (a *${p.camel}UseCase) Eliminar(ctx context.Context, id int64) (err error) {
	_, err = a.repo.Eliminar(ctx, id)
	if err != nil {
		return
	}
	return
}

func (a *${p.camel}UseCase) Habilitar(ctx context.Context, id int64) (res *response.${p.pascal}Response, err error) {
	entity, err := a.repo.BuscarPorID(ctx, id)
	if err != nil {
		return
	}
	err = entity.Habilitar()
	if err != nil {
		return
	}
	err = a.repo.HabilitarDeshabilitar(ctx, id, true)
	if err != nil {
		return
	}
	return
}

func (a *${p.camel}UseCase) Deshabilitar(ctx context.Context, id int64) (res *response.${p.pascal}Response, err error) {
	entity, err := a.repo.BuscarPorID(ctx, id)
	if err != nil {
		return
	}
	err = entity.Deshabilitar()
	if err != nil {
		return
	}
	err = a.repo.HabilitarDeshabilitar(ctx, id, false)
	if err != nil {
		return
	}
	return
}

// BUSCAR

func (a *${p.camel}UseCase) Buscar(ctx context.Context, search, advancedSearch string, columns bool, id int, idEmpresa int64) (res []*response.SuggestV0, err error) {
	rs, err := a.repo.Buscar(ctx, search, advancedSearch, id, idEmpresa, columns)
	if err != nil {
		return
	}
	res = mapping.MapSuggestV0(rs)
	return
}

func (a *${p.camel}UseCase) BuscarPorID(ctx context.Context, id int64) (res *response.${p.pascal}Response, err error) {
	rs, err := a.repo.BuscarPorID(ctx, id)
	if err != nil {
		return
	}
	res = mapping.MapEntityToVO(rs)
	return
}

// OTROS

func (a *${p.camel}UseCase) VerificarCodigo(ctx context.Context, code string) (existe bool, err error) {
	rs, err := a.repo.VerificarCodigo(ctx, code)
	if nil != err {
		return
	}
	existe = rs
	return
}

func New${p.pascal}UseCase(r repository.${p.pascal}Repository) ${p.pascal}UseCase {
	return &${p.camel}UseCase{repo: r}
}
`;
}

// ── 9. Controller ──
function controllerGo(p) {
  const creaCall = `a.${p.camel}UseCase.Crear(ctx.GetContext(), &req)`;
  const actCall = `a.${p.camel}UseCase.Actualizar(ctx.GetContext(), ctx.GetIdParam(), &req)`;
  const elimCall = `a.${p.camel}UseCase.Eliminar(ctx.GetContext(), ctx.GetIdParam())`;
  const habCall = `a.${p.camel}UseCase.Habilitar(ctx.GetContext(), id)`;
  const deshabCall = `a.${p.camel}UseCase.Deshabilitar(ctx.GetContext(), id)`;

  return `package controller

import (
	"fmt"
	"${p.importPath}/application/request"
	"${p.importPath}/application/usecase"

	"ns-backoffice-transactional-service/utils"
	"strconv"

	"gitlab.com/ns-desarrollo-web/erp/ns-core-service"
)

type ${p.pascal}Controller struct {
	${p.camel}UseCase usecase.${p.pascal}UseCase
}

//CABECERA

func (a *${p.pascal}Controller) Listar(ctx *ns.Client) {
	p := ctx.GetPagination()
	rs, err := a.${p.camel}UseCase.Listar(ctx.GetContext(), p.Start, p.Length, p.Search)
	if err != nil {
		fmt.Println(utils.ListarError("[${p.pascal}]: "), err)
		ctx.Fail(err)
		return
	}
	ctx.Ok(rs)
}

func (a *${p.pascal}Controller) Crear(ctx *ns.Client) {
	var req request.${p.pascal}Request
	err := ctx.UnmarshalDTO(&req)
	if err != nil {
		ctx.Fail(err)
		return
	}
	req.IdComponente = utils.IdComponente.${p.componentField}
	rs, err := ${creaCall}
	if nil != err {
		fmt.Println(utils.CrearBuscarPorIdError("[${p.pascal}]: "), err)
		ctx.Fail(err)
		return
	}
	ctx.Ok(rs)
}

func (a *${p.pascal}Controller) Actualizar(ctx *ns.Client) {
	var req request.${p.pascal}Request
	if err := ctx.UnmarshalDTO(&req); err != nil {
		ctx.Fail(err)
		return
	}
	rs, err := ${actCall}
	if nil != err {
		fmt.Println(utils.ActualizarError("[${p.pascal}]: "), err)
		ctx.Fail(err)
		return
	}
	ctx.Ok(rs)
}

func (a *${p.pascal}Controller) Eliminar(ctx *ns.Client) {
	if err := ${elimCall}; nil != err {
		fmt.Println(utils.EliminarError("[${p.pascal}]: "), err)
		ctx.Fail(err)
		return
	}
	ctx.Ok()
}

func (a *${p.pascal}Controller) Habilitar(ctx *ns.Client) {
	id, err := strconv.ParseInt(ctx.Param("id"), 10, 64)
	if err != nil {
		ctx.Fail(err)
		return
	}
	rs, err := ${habCall}
	if err != nil {
		fmt.Println(utils.HabilitarBuscarPorIdError("[${p.pascal}]: "), err)
		ctx.Fail(err)
		return
	}
	ctx.Ok(rs)
}

func (a *${p.pascal}Controller) Deshabilitar(ctx *ns.Client) {
	idRaw := ctx.Param("id")
	id, err := strconv.ParseInt(idRaw, 10, 64)
	if err != nil {
		ctx.Fail(err)
		return
	}
	rs, err := ${deshabCall}
	if err != nil {
		fmt.Println(utils.DeshabilitarError("[${p.pascal}]: "), err)
		ctx.Fail(err)
		return
	}
	ctx.Ok(rs)
}

// BUSCAR

func (a *${p.pascal}Controller) Buscar(ctx *ns.Client) {
	id, _ := strconv.Atoi(ctx.Query("id"))
	idEmpresa := ctx.Meta.CompanyId
	var advancedSearch string

	advanced, err := utils.ParseBoolean(ctx.Query("advanced"))
	if err != nil {
		ctx.Fail(err)
		return
	}

	columns, err := utils.ParseBoolean(ctx.Query("c"))
	if err != nil {
		ctx.Fail(err)
		return
	}

	search := ctx.Query("search")
	if advanced {
		advancedSearch, err = utils.AdvanceSugget(search)
		if err != nil {
			return
		}
	}

	rs, err := a.${p.camel}UseCase.Buscar(ctx.GetContext(), search, advancedSearch, columns, id, idEmpresa)
	if nil != err {
		fmt.Println(utils.BuscarError("[${p.pascal}]: "), err)
		ctx.Fail(err)
		return
	}
	ctx.Ok(rs)
}

func (a *${p.pascal}Controller) BuscarPorID(ctx *ns.Client) {
	rs, err := a.${p.camel}UseCase.BuscarPorID(ctx.GetContext(), ctx.GetIdParam())
	if nil != err {
		fmt.Println(utils.BuscarPorIdError("[${p.pascal}]: "), err)
		ctx.Fail(err)
		return
	}
	ctx.Ok(rs)
}

// OTROS

func (a *${p.pascal}Controller) VerificarCodigo(c *ns.Client) {
	code := c.Query("code")
	rs, err := a.${p.camel}UseCase.VerificarCodigo(c.GetContext(), code)
	if nil != err {
		fmt.Println(utils.VerificarCodigoError("[${p.pascal}]: "), err)
		c.Fail(err)
		return
	}
	c.Ok(rs)
}

func New${p.pascal}Controller(useCase usecase.${p.pascal}UseCase) *${p.pascal}Controller {
	return &${p.pascal}Controller{${p.camel}UseCase: useCase}
}
`;
}

// ── 10. Routes ──
function routesGo(p) {
  const brokerImport = p.usesBroker ? '\n\t"gitlab.com/ns-desarrollo-web/erp/ns-core-service/pkg/kafka"' : '';
  const brokerParam = p.usesBroker ? ', broker kafka.Broker' : '';
  return `package routes

import (
	"${p.importPath}/application/usecase"
	"${p.importPath}/infrastructure/delivery/http/controller"

	"gitlab.com/ns-desarrollo-web/erp/ns-core-service"${brokerImport}
)

func New${p.pascal}Routes(router *ns.Router, useCase usecase.${p.pascal}UseCase${brokerParam}) {
	c := controller.New${p.pascal}Controller(useCase)

	//CABECERA
	router.GET("/${p.ruta}", c.Listar)
	router.POST("/${p.ruta}", c.Crear)
	router.PUT("/${p.ruta}/:id", c.Actualizar)
	router.DELETE("/${p.ruta}/:id", c.Eliminar)
	router.PATCH("/${p.ruta}/:id/habilitar", c.Habilitar)
	router.PATCH("/${p.ruta}/:id/deshabilitar", c.Deshabilitar)

	//BUSCAR
	router.GET("/${p.ruta}-buscar", c.Buscar)
	router.GET("/${p.ruta}/:id", c.BuscarPorID)

	//OTROS
	router.GET("/${p.ruta}-codigo", c.VerificarCodigo)
}
`;
}

// ── 11. Model (Row struct) ──
function modelGo(p) {
  const fields = p.fields.filter(f => f.inModel && f.name !== 'DocumentoSerie').map(f => {
    const mt = f.name === 'CodigoEstado' ? '*string' : f.type;
    return structField(f.name, mt, f.tagName, 'db');
  }).join('\n');
  const rowFields = p.fields.filter(f => f.inModel && f.inEntity).map(rowField).join('\n');

  return `package mssql_repository

import (
	"${p.importPath}/domain/entity"
)

type ${p.camel}Row struct {
${fields}
}

func rowsToEntities(rows []${p.camel}Row) []entity.${p.pascal}Entity {
	entities := make([]entity.${p.pascal}Entity, len(rows))
	for i, row := range rows {
		entities[i] = rowToEntity(row)
	}
	return entities
}

func rowToEntity(row ${p.camel}Row) entity.${p.pascal}Entity {
	return entity.${p.pascal}Entity{
${rowFields}
	}
}
`;
}

// ── 12. MSSQL repository ──
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

// ── 13. Import entity ──
function importEntityGo(p) {
  const fields = p.importFields.map(f => structField(f.name, f.type, f.tagName, 'db')).join('\n');
  return `package entity

type ImportExceldbEntity struct {
${fields}
}

type ImportExcelEntity struct {
	Validado      bool                    \`db:"validado"\`
	Errores       []ImportExcelFilaEntity \`db:"errores"\`
	Observaciones []ImportExcelFilaEntity \`db:"observaciones"\`
}

type ImportExcelFilaEntity struct {
	Fila     int64    \`db:"fila"\`
	Campo    string   \`db:"campo"\`
	Mensajes []string \`db:"mensajes"\`
}
`;
}

// ── 14. Import request ──
function importRequestGo(p) {
  const fields = p.importFields.map(f => structField(f.name, f.type, f.tagName, 'json')).join('\n');
  return `package request

type ImportExcelRequest struct {
${fields}
}
`;
}

// ── 15. Import response ──
function importResponseGo() {
  return `package response

type ImportExcelResponse struct {
	Validado      bool
	Errores       []ImportExcelFilaResponse
	Observaciones []ImportExcelFilaResponse
}

type ImportExcelFilaResponse struct {
	Fila     int64
	Campo    string
	Mensajes []string
}
`;
}

// ── 16. Import mapping ──
function importMappingGo(p) {
  const dtoFields = p.importFields.map(f => `\t\t\t${f.name}: r.${f.name},`).join('\n');
  return `package mapping

import (
	"${p.importPath}/application/request"
	"${p.importPath}/application/response"
	"${p.importPath}/domain/entity"
)

func MapValidateImportParaDBToDTO(req []request.ImportExcelRequest) []entity.ImportExceldbEntity {
	entities := make([]entity.ImportExceldbEntity, len(req))
	for i, r := range req {
		entities[i] = entity.ImportExceldbEntity{
${dtoFields}
		}
	}
	return entities
}

func MapValidateImportParaVistaToDTO(ent entity.ImportExcelEntity) response.ImportExcelResponse {
	errores := make([]response.ImportExcelFilaResponse, len(ent.Errores))
	for i, e := range ent.Errores {
		errores[i] = response.ImportExcelFilaResponse{Fila: e.Fila, Campo: e.Campo, Mensajes: e.Mensajes}
	}
	observaciones := make([]response.ImportExcelFilaResponse, len(ent.Observaciones))
	for i, o := range ent.Observaciones {
		observaciones[i] = response.ImportExcelFilaResponse{Fila: o.Fila, Campo: o.Campo, Mensajes: o.Mensajes}
	}
	return response.ImportExcelResponse{
		Validado: ent.Validado, Errores: errores, Observaciones: observaciones,
	}
}
`;
}

// ── 17. Import append methods (routes, controller, port, usecase, repo, mssql) ──
function importRouteMethods(p) {
  return `\n\n\t/*IMPORTAR*/\n\trouter.POST("/${p.ruta}-validate", c.ValidateImport)\n\trouter.POST("/${p.ruta}-save-import", c.SaveImport)`;
}

function importControllerMethods(p) {
  return `
/*IMPORTAR*/

func (a *${p.pascal}Controller) ValidateImport(ctx *ns.Client) {
	var req []request.ImportExcelRequest
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
	res, err := a.${p.camel}UseCase.ValidateImport(ctx.GetContext(), id, req)
	if err != nil {
		ctx.Fail(err)
		return
	}
	ctx.Ok(res)
}

func (a *${p.pascal}Controller) SaveImport(ctx *ns.Client) {
	var req []request.ImportExcelRequest
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
  res, err := a.${p.camel}UseCase.SaveImport(ctx.GetContext(), id, req)
	if err != nil {
		ctx.Fail(err)
		return
	}
	ctx.Ok(res)
}
`;
}

function importPortMethods(p) {
  return `\n\n\t/*IMPORTAR*/\n\tValidateImport(ctx context.Context, id int64, req []request.ImportExcelRequest) (resp response.ImportExcelResponse, err error)\n\tSaveImport(ctx context.Context, id int64, req []request.ImportExcelRequest) (res response.DetalleResponse, err error)`;
}

function importUseCaseMethods(p) {
  return `
/*IMPORTAR*/

func (app *${p.camel}UseCase) ValidateImport(ctx context.Context, id int64, req []request.ImportExcelRequest) (resp response.ImportExcelResponse, err error) {
	resDB := mapping.MapValidateImportParaDBToDTO(req)
	rs, err := app.repo.ValidateImport(ctx, id, resDB)
	if err != nil { return }
	resp = mapping.MapValidateImportParaVistaToDTO(rs)
	return
}

func (app *${p.camel}UseCase) SaveImport(ctx context.Context, id int64, req []request.ImportExcelRequest) (res response.DetalleResponse, err error) {
	resDB := mapping.MapValidateImportParaDBToDTO(req)
	res, err = app.repo.SaveImport(ctx, id, resDB)
	if err != nil { return }
	return
}
`;
}

function importRepoMethods(p) {
  return `\n\n\t/*IMPORTAR*/\n\tValidateImport(ctx context.Context, id int64, entity []entity.ImportExceldbEntity) (ent entity.ImportExcelEntity, err error)\n\tSaveImport(ctx context.Context, id int64, entity []entity.ImportExceldbEntity) (data response.DetalleResponse, err error)`;
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

// ── Detail templates ──
function detailEntityGo(p, det) {
  const fields = det.fields.filter(f => f.inEntity).map(f => structField(f.name, f.type, '', '')).join('\n');
  return `package entity

type ${p.pascal}${det.pascal}Entity struct {
${fields}
}

type Validacion${p.pascal}${det.pascal}Entity struct {
	Id    int64 \`db:"id"\`
	Index int   \`db:"index"\`
}
`;
}

function detailRequestGo(p, det) {
  const fields = det.fields.filter(f => f.inRequest).map(f => structField(f.name, f.type, f.tagName, 'json')).join('\n');
  return `package request

type ${p.pascal}${det.pascal}Request struct {
	IdHeader int64 \`json:"id_header"\`
${fields}
}
`;
}

function detailResponseGo(p, det) {
  const listarFields = det.fields.filter(f => f.inListar).map(f => structField(f.name, f.type, f.tagName, 'json')).join('\n');
  const responseFields = det.fields.filter(f => f.inResponse).map(f => structField(f.name, f.type, f.tagName, 'json')).join('\n');
  return `package response

type ${p.pascal}${det.pascal}ListarResponse struct {
${listarFields}
}

type ${p.pascal}${det.pascal}Response struct {
${responseFields}
}
`;
}

function detailMappingGo(p, det) {
  const dtoFields = det.fields.filter(f => f.inRequest && f.inEntity).map(f => {
    const src = f.name === `Id${p.pascal}` ? 'req.IdHeader' : `req.${f.name}`;
    return `\t\t${f.name}: ${src},`;
  }).join('\n');
  const voFields = det.fields.filter(f => f.inResponse && f.inEntity).map(mapField).join('\n');
  const pagFields = det.fields.filter(f => f.inListar).map(listarField).join('\n');

  return `package mapping

import (
	"${p.importPath}/application/request"
	"${p.importPath}/application/response"
	"${p.importPath}/domain/entity"
)

func MapDTOto${det.pascal}Entity(req *request.${p.pascal}${det.pascal}Request) entity.${p.pascal}${det.pascal}Entity {
	return entity.${p.pascal}${det.pascal}Entity{
${dtoFields}
	}
}

func Map${det.pascal}EntityToVO(e entity.${p.pascal}${det.pascal}Entity) *response.${p.pascal}${det.pascal}Response {
	return &response.${p.pascal}${det.pascal}Response{
${voFields}
	}
}

func Map${det.pascal}PaginacionVo(models []entity.${p.pascal}${det.pascal}Entity, validacion []entity.Validacion${p.pascal}${det.pascal}Entity, total int64, filtered int64) interface{} {
	res := make([]response.${p.pascal}${det.pascal}ListarResponse, 0)
	for i := range models {
		res = append(res, response.${p.pascal}${det.pascal}ListarResponse{
${pagFields}
		})
	}
	validacionExterna := make([]response.ValidacionExterna, 0)
	return struct {
		Data              interface{}
		Meta              interface{}
		ValidacionExterna []response.ValidacionExterna
	}{
		Data: res,
		Meta: struct {
			RecordsFiltered int64
			RecordsTotal    int64
		}{
			RecordsFiltered: filtered,
			RecordsTotal:    total,
		},
		ValidacionExterna: validacionExterna,
	}
}
`;
}

module.exports = {
  mntGo,
  entityGo,
  repositoryGo,
  requestGo,
  responseGo,
  mappingGo,
  portGo,
  usecaseGo,
  controllerGo,
  routesGo,
  modelGo,
  mssqlGo,
  importEntityGo,
  importRequestGo,
  importResponseGo,
  importMappingGo,
  importRouteMethods,
  importControllerMethods,
  importPortMethods,
  importUseCaseMethods,
  importRepoMethods,
  importMssqlMethods,
  detailEntityGo,
  detailRequestGo,
  detailResponseGo,
  detailMappingGo,
};
