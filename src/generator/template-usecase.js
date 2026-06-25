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

module.exports = { usecaseGo, importUseCaseMethods };
