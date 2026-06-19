const { toGoPackageName } = require('./utils');

// ── Helper: format field for struct ──
function structField(name, type, tag, kind) {
  const t = tag ? ` \`${kind}:"${tag}"\`` : '';
  return `\t${name}\t\t\t\t${type}${t}`;
}

function mapField(name) {
  return `\t\t${name}: e.${name},`;
}

function listarField(name) {
  return `\t\t\t${name}: models[i].${name},`;
}

function rowField(name) {
  return `\t\t${name}: row.${name},`;
}

function dtoField(name) {
  return `\t\t${name}: req.${name},`;
}

// ── 1. Module entry point (.mnt.go) ──
function mntGo(p) {
  return `package ${p.packageName}

import (
	"${p.importPath}/application/usecase"
	"${p.importPath}/infrastructure/delivery/http/routes"
	"${p.importPath}/infrastructure/persistence/mssql_repository"

	"gitlab.com/ns-desarrollo-web/erp/ns-core-service"
	db "gitlab.com/ns-desarrollo-web/erp/ns-core-service/pkg/database"
)

func Create(router *ns.Router, db db.Sql) {
	repository := mssql_repository.New${p.pascal}Repository(db)
	useCase := usecase.New${p.pascal}UseCase(repository)
	routes.New${p.pascal}Routes(router, useCase)
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
`;
}

// ── 3. Repository interface ──
function repositoryGo(p) {
  const hasActivityLog = p.tipo !== 'movimientos';
  const activityLogImport = hasActivityLog ? `\n\tactivity_log "ns-backoffice-transactional-service/utils/activity-log-structure"` : '';
  const repoMethods = hasActivityLog ? `
	Crear(ctx context.Context, modelo entity.${p.pascal}Entity) (id int64, detalle []activity_log.Detalle, err error)
	Actualizar(ctx context.Context, id int64, modelo entity.${p.pascal}Entity) (detalle []activity_log.Detalle, err error)
` : `
	Crear(ctx context.Context, modelo entity.${p.pascal}Entity) (id int64, err error)
	Actualizar(ctx context.Context, id int64, modelo entity.${p.pascal}Entity) (err error)
`;

  return `package repository

import (
	"context"
	"${p.importPath}/domain/entity"${activityLogImport}
)

type ${p.pascal}Repository interface {
	//CABECERA
	Listar(ctx context.Context, start int, length int, search string) (res []entity.${p.pascal}Entity, total int64, filtered int64, err error)
	${repoMethods}
	Eliminar(ctx context.Context, id int64) (err error)
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
			Code:        entityList[i].Codigo,
			Label:       entityList[i].Descripcion,
			Description: entityList[i].Descripcion,
			Data:        &entityList[i],
		})
	}
	return
}
`;
}

// ── 7. Usecase port ──
function portGo(p) {
  const hasClient = p.tipo !== 'movimientos';
  const clientPrefix = hasClient ? 'ctu *ns.Client, ' : '';
  const clientImport = hasClient ? '\n\t"gitlab.com/ns-desarrollo-web/erp/ns-core-service"' : '';
  return `package usecase

import (
	"context"
	"${p.importPath}/application/request"
	"${p.importPath}/application/response"${clientImport}
)

type ${p.pascal}UseCase interface {
	//CABECERA
	Listar(ctx context.Context, start int, length int, search string) (res *response.Paginacion, err error)
	Crear(ctx context.Context, ${clientPrefix}request *request.${p.pascal}Request) (res *response.${p.pascal}Response, err error)
	Actualizar(ctx context.Context, ${clientPrefix}id int64, request *request.${p.pascal}Request) (res *response.${p.pascal}Response, err error)
	Eliminar(ctx context.Context, ${clientPrefix}id int64) (err error)
	Habilitar(ctx context.Context, ${clientPrefix}id int64) (res *response.${p.pascal}Response, err error)
	Deshabilitar(ctx context.Context, ${clientPrefix}id int64) (res *response.${p.pascal}Response, err error)

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
  const isMov = p.tipo === 'movimientos';
  const clientPrefix = isMov ? '' : 'ctu *ns.Client, ';
  const createCall = isMov ? `id, err := a.repo.Crear(ctx, mod)` : `id, detalles, err := a.repo.Crear(ctx, mod)`;
  const updateCall = isMov ? `err = a.repo.Actualizar(ctx, id, mod)` : `detalles, err := a.repo.Actualizar(ctx, id, mod)`;
  const deleteCall = isMov ? `err = a.repo.Eliminar(ctx, id)` : `err = a.repo.Eliminar(ctx, id)`;

  const importBlock = `"context"
 	"${p.importPath}/application/mapping"
 	"${p.importPath}/application/request"
 	"${p.importPath}/application/response"
 	"${p.importPath}/domain/repository"
 	"ns-backoffice-transactional-service/utils"
 	activity_log "ns-backoffice-transactional-service/utils/activity-log-structure"
 	"time"

 	"github.com/google/uuid"
 	"gitlab.com/ns-desarrollo-web/erp/ns-core-service"`;

  const clientOrNil = isMov ? 'nil' : 'ctu';
  const crearDetalle = isMov ? 'nil' : 'detalles';
  const actualizarDetalle = isMov ? 'nil' : 'detalles';

  const crearActivity = `
 	activity_log.RegistroDeActividades(ctx, ${clientOrNil}, id, utils.IdComponente.${p.componentField}, activity_log.PreRegistroUtils{
 		Identificador: uuid.New().String(),
 		Fechahora:     time.Now().UTC().String(),
 		Action:        "Nuevo",
 		Informativo:   false,
 		Detalle:       ${crearDetalle},
 	}, false, nil)`;

  const actualizarActivity = `
 	activity_log.RegistroDeActividades(ctx, ${clientOrNil}, id, utils.IdComponente.${p.componentField}, activity_log.PreRegistroUtils{
 		Identificador: uuid.New().String(),
 		Fechahora:     time.Now().UTC().String(),
 		Action:        "Actualizado",
 		Informativo:   false,
 		Detalle:       ${actualizarDetalle},
 	}, false, nil)`;

  const eliminarActivity = `
 	activity_log.RegistroDeActividades(ctx, ${clientOrNil}, id, utils.IdComponente.${p.componentField}, activity_log.PreRegistroUtils{
 		Identificador: uuid.New().String(),
 		Fechahora:     time.Now().UTC().String(),
 		Action:        "Eliminado",
 		Informativo:   true,
 		Detalle:       nil,
 	}, false, nil)`;

  const habilitarActivity = `
 	activity_log.RegistroDeActividades(ctx, ${clientOrNil}, id, utils.IdComponente.${p.componentField}, activity_log.PreRegistroUtils{
 		Identificador: uuid.New().String(),
 		Fechahora:     time.Now().UTC().String(),
 		Action:        "Habilitado",
 		Informativo:   true,
 		Detalle:       nil,
 	}, false, nil)`;

  const deshabilitarActivity = `
 	activity_log.RegistroDeActividades(ctx, ${clientOrNil}, id, utils.IdComponente.${p.componentField}, activity_log.PreRegistroUtils{
 		Identificador: uuid.New().String(),
 		Fechahora:     time.Now().UTC().String(),
 		Action:        "Deshabilitado",
 		Informativo:   true,
 		Detalle:       nil,
 	}, false, nil)`;

  return `package usecase

import (
	${importBlock}
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

func (a *${p.camel}UseCase) Crear(ctx context.Context, ${clientPrefix}request *request.${p.pascal}Request) (res *response.${p.pascal}Response, err error) {
	mod := mapping.MapDTOtoEntity(request)
	${createCall}
	if err != nil {
		return
	}
	rs, err := a.repo.BuscarPorID(ctx, id)
	if err != nil {
		return
	}
	res = mapping.MapEntityToVO(rs)${crearActivity}
	return
}

func (a *${p.camel}UseCase) Actualizar(ctx context.Context, ${clientPrefix}id int64, request *request.${p.pascal}Request) (res *response.${p.pascal}Response, err error) {
	mod := mapping.MapDTOtoEntity(request)
	${updateCall}
	if err != nil {
		return
	}
	rs, err := a.repo.BuscarPorID(ctx, id)
	if err != nil {
		return
	}
	res = mapping.MapEntityToVO(rs)${actualizarActivity}
	return
}

func (a *${p.camel}UseCase) Eliminar(ctx context.Context, ${clientPrefix}id int64) (err error) {
	${deleteCall}
	if err != nil {
		return
	}${eliminarActivity}
	return
}

func (a *${p.camel}UseCase) Habilitar(ctx context.Context, ${clientPrefix}id int64) (res *response.${p.pascal}Response, err error) {
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
	}${habilitarActivity}
	return
}

func (a *${p.camel}UseCase) Deshabilitar(ctx context.Context, ${clientPrefix}id int64) (res *response.${p.pascal}Response, err error) {
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
	}${deshabilitarActivity}
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
  const isMov = p.tipo === 'movimientos';
  const useCasePrefix = isMov ? '' : 'ctx, ';
  const creaCall = isMov
    ? `a.${p.camel}UseCase.Crear(ctx.GetContext(), &req)`
    : `a.${p.camel}UseCase.Crear(ctx.GetContext(), ctx, &req)`;
  const actCall = isMov
    ? `a.${p.camel}UseCase.Actualizar(ctx.GetContext(), ctx.GetIdParam(), &req)`
    : `a.${p.camel}UseCase.Actualizar(ctx.GetContext(), ctx, ctx.GetIdParam(), &req)`;
  const elimCall = isMov
    ? `a.${p.camel}UseCase.Eliminar(ctx.GetContext(), ctx.GetIdParam())`
    : `a.${p.camel}UseCase.Eliminar(ctx.GetContext(), ctx, ctx.GetIdParam())`;
  const habCall = isMov
    ? `a.${p.camel}UseCase.Habilitar(ctx.GetContext(), id)`
    : `a.${p.camel}UseCase.Habilitar(ctx.GetContext(), ctx, id)`;
  const deshabCall = isMov
    ? `a.${p.camel}UseCase.Deshabilitar(ctx.GetContext(), id)`
    : `a.${p.camel}UseCase.Deshabilitar(ctx.GetContext(), ctx, id)`;

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
  return `package routes

import (
	"${p.importPath}/application/usecase"
	"${p.importPath}/infrastructure/delivery/http/controller"

	"gitlab.com/ns-desarrollo-web/erp/ns-core-service"
)

func New${p.pascal}Routes(router *ns.Router, useCase usecase.${p.pascal}UseCase) {
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

  const extraImports = isMov ? '' : `\n\t"ns-backoffice-transactional-service/utils"\n\tactivity_log "ns-backoffice-transactional-service/utils/activity-log-structure"\n\t"strings"`;

  const crearImpl = isMov
    ? `func (a *${p.pascal}MssqlRepository) Crear(ctx context.Context, modelo entity.${p.pascal}Entity) (id int64, err error) {
	meta := ns.MetaFromContext(ctx)
	if meta == nil {
		err = fmt.Errorf("no meta found in context")
		return
	}
	json, err := db.Marshal(modelo)
	if err != nil {
		return
	}
	id, err = a.db.QueryWithLastID(ctx, "EXEC NS_${p.tabla}_I @JSON = @p1, @idempresa=@p2 ", string(json), meta.Client.CompanyId)
	if err != nil {
		return
	}
	return
}`
    : `func (a *${p.pascal}MssqlRepository) Crear(ctx context.Context, modelo entity.${p.pascal}Entity) (id int64, detalle []activity_log.Detalle, err error) {
	var detallePrincipal []activity_log.DetallePrincipalEntity
	meta := ns.MetaFromContext(ctx)
	if meta == nil {
		err = fmt.Errorf("no meta found in context")
		return
	}
	json, err := db.Marshal(modelo)
	if err != nil {
		return
	}
	err = a.db.RunUnmarshal(ctx, &detallePrincipal, \`EXEC NS_${p.tabla}_I @JSON = @p1, @idempresa=@p2 \`, string(json), meta.Client.CompanyId)
	if err != nil {
		return
	}
	id = detallePrincipal[0].Id
	for _, d := range detallePrincipal[0].Detalle {
		detalle = append(detalle, activity_log.Detalle{
			Label: d.Label, Campo: d.Campo, Action: d.Action,
			ValorAntes: d.ValorAntes, ValorDespues: d.ValorDespues, Tipo: d.Tipo,
		})
	}
	return
}`;

  const actualizarImpl = isMov
    ? `func (a *${p.pascal}MssqlRepository) Actualizar(ctx context.Context, id int64, modelo entity.${p.pascal}Entity) (err error) {
	json, err := db.Marshal(modelo)
	if err != nil {
		return
	}
	_, err = a.db.Query(ctx, "EXEC NS_${p.tabla}_U @id = @p1, @JSON = @p2", id, string(json))
	if err != nil {
		return
	}
	return
}`
    : `func (a *${p.pascal}MssqlRepository) Actualizar(ctx context.Context, id int64, modelo entity.${p.pascal}Entity) (detalle []activity_log.Detalle, err error) {
	campos := strings.Split(modelo.Field, ",")
	detalle, err = utils.UpdateDynamic2(ctx, a.db, "${p.tabla}", "id", id, campos, modelo)
	if err != nil {
		return
	}
	return
}`;

  const eliminarImpl = isMov
    ? `func (a *${p.pascal}MssqlRepository) Eliminar(ctx context.Context, id int64) (err error) {
	meta := ns.MetaFromContext(ctx)
	if meta == nil {
		err = fmt.Errorf("no meta found in context")
		return
	}
	_, err = a.db.Query(ctx, "DELETE FROM ${p.tabla} WHERE id = @p1 AND idempresa=@p2", id, meta.Client.CompanyId)
	if err != nil {
		return
	}
	return
}`
    : `func (a *${p.pascal}MssqlRepository) Eliminar(ctx context.Context, id int64) (err error) {
	meta := ns.MetaFromContext(ctx)
	if meta == nil {
		err = fmt.Errorf("no meta found in context")
		return
	}
	_, err = a.db.Query(ctx, "UPDATE ${p.tabla} SET estado = 'E' WHERE id = @p1 AND idempresa=@p2", id, meta.Client.CompanyId)
	if err != nil {
		return
	}
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
	_, err = a.db.Query(ctx, "UPDATE ${p.tabla} SET habilitado = @p1 WHERE id = @p2 AND idempresa=@p3", status, id, meta.Client.CompanyId)
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
  const fields = p.importFields.filter(f => f.inImport).map(f => structField(f.name, f.type, f.tagName, 'db')).join('\n');
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
  const fields = p.importFields.filter(f => f.inImport).map(f => structField(f.name, f.type, f.tagName, 'json')).join('\n');
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
  const dtoFields = p.importFields.filter(f => f.inImport).map(f => `\t\t\t${f.name}: r.${f.name},`).join('\n');
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
	res, err := a.${p.camel}UseCase.SaveImport(ctx.GetContext(), ctx, id, req)
	if err != nil {
		ctx.Fail(err)
		return
	}
	ctx.Ok(res)
}
`;
}

function importPortMethods(p) {
  return `\n\n\t/*IMPORTAR*/\n\tValidateImport(ctx context.Context, id int64, req []request.ImportExcelRequest) (resp response.ImportExcelResponse, err error)\n\tSaveImport(ctx context.Context, ctu *ns.Client, id int64, req []request.ImportExcelRequest) (res response.DetalleResponse, err error)`;
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

func (app *${p.camel}UseCase) SaveImport(ctx context.Context, ctu *ns.Client, id int64, req []request.ImportExcelRequest) (res response.DetalleResponse, err error) {
	resDB := mapping.MapValidateImportParaDBToDTO(req)
	res, detalles, err := app.repo.SaveImport(ctx, id, resDB)
	if err != nil { return }
	activity_log.RegistroDeActividades(ctx, ctu, res.Id, utils.IdComponente.${p.componentField}, activity_log.PreRegistroUtils{
		Identificador: uuid.New().String(), Fechahora: time.Now().UTC().String(),
		Action: "Actualizado", Informativo: false, Detalle: detalles,
	}, true, nil)
	return
}
`;
}

function importRepoMethods(p) {
  return `\n\n\t/*IMPORTAR*/\n\tValidateImport(ctx context.Context, id int64, entity []entity.ImportExceldbEntity) (ent entity.ImportExcelEntity, err error)\n\tSaveImport(ctx context.Context, id int64, entity []entity.ImportExceldbEntity) (data response.DetalleResponse, detalle []activity_log.Detalle, err error)`;
}

function importMssqlMethods(p) {
  return `
//IMPORTAR

func (a *${p.pascal}MssqlRepository) SaveImport(ctx context.Context, id int64, entity []entity.ImportExceldbEntity) (data response.DetalleResponse, detalle []activity_log.Detalle, err error) {
	res, err := db.Marshal(entity)
	if err != nil { return }
	var detallePrincipal []activity_log.DetallePrincipalEntity
	err = a.db.RunUnmarshal(ctx, &detallePrincipal,
		\`EXEC NS_${p.tabla}_D_SAVE_IMPORT @id = @p1 , @json = @p2\`, id, string(res))
	if err != nil { return }
	data = response.DetalleResponse{Id: detallePrincipal[0].Id, Estado: "ACTUALIZAR"}
	for _, d := range detallePrincipal[0].Detalle {
		detalle = append(detalle, activity_log.Detalle{Label: d.Label, Campo: d.Campo, Action: d.Action, ValorAntes: d.ValorAntes, ValorDespues: d.ValorDespues, Tipo: d.Tipo, EsDetalle: d.EsDetalle})
	}
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
