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

function importPortMethods(p) {
  return `\n\n\t/*IMPORTAR*/\n\tValidateImport(ctx context.Context, id int64, req []request.ImportExcelRequest) (resp response.ImportExcelResponse, err error)\n\tSaveImport(ctx context.Context, id int64, req []request.ImportExcelRequest) (res response.DetalleResponse, err error)`;
}

module.exports = { portGo, importPortMethods };
