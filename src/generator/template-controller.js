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
	req.IdEmpresa = ctx.User.CompanyId
	req.IdUsuario = ctx.User.UserId
	req.Ventana = "${p.ventana}"
	req.IdModulo , err = strconv.ParseInt(ctx.GetHeader("Ns-Module-Id"), 10, 64)
	if err != nil {
		ctx.Fail(err)
		return
	}
	
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

module.exports = { controllerGo, importControllerMethods };
