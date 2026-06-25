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

function importRepoMethods(p) {
  return `\n\n\t/*IMPORTAR*/\n\tValidateImport(ctx context.Context, id int64, entity []entity.ImportExceldbEntity) (ent entity.ImportExcelEntity, err error)\n\tSaveImport(ctx context.Context, id int64, entity []entity.ImportExceldbEntity) (data response.DetalleResponse, err error)`;
}

module.exports = { repositoryGo, importRepoMethods };
