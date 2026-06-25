const { mapField, listarField, suggestFieldName } = require('./template-helpers');

function mappingGo(p) {
  const dtoFields = p.fields.filter(f => f.inRequest && f.inEntity).flatMap(f => {
    const orig = `\t\t${f.name}: req.${f.name},`;
    if (!f.inSuggest) return [orig];
    return [orig, `\t\t${suggestFieldName(f.name)}: req.${suggestFieldName(f.name)},`];
  }).join('\n');
  const voFields = p.fields.filter(f => f.inResponse && f.inEntity).flatMap(f => {
    const orig = mapField(f);
    if (!f.inSuggest) return [orig];
    return [orig, `\t\t${suggestFieldName(f.name)}: cons.ToJson(e.${suggestFieldName(f.name)}),`];
  }).join('\n');
  const pagFields = p.fields.filter(f => f.inListar).map(f => {
    if (!f.inSuggest) return listarField(f);
    return `\t\t\t${suggestFieldName(f.name)}: cons.ToJson(models[i].${suggestFieldName(f.name)}),`;
  }).join('\n');
  const needCons = p.fields.some(f => f.inSuggest);
  const consImport = needCons ? '\n\tcons "gitlab.com/ns-desarrollo-web/erp/ns-core-service/shared/constants"' : '';

  const codeField = p.suggestCode || (p.fields.find(f => f.name === 'Codigo' && f.inEntity) ? 'Codigo' : 'Id');
  const labelField = p.suggestLabel || (p.fields.find(f => f.name === 'Descripcion' && f.inEntity) ? 'Descripcion' : codeField);

  return `package mapping

import (
	"${p.importPath}/application/request"
	"${p.importPath}/application/response"
	"${p.importPath}/domain/entity"${consImport}
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

function detailMappingGo(p, det) {
  const dtoFields = det.fields.filter(f => f.inRequest && f.inEntity).flatMap(f => {
    const src = f.name === `Id${p.pascal}` ? 'req.IdHeader' : `req.${f.name}`;
    const orig = `\t\t${f.name}: ${src},`;
    if (!f.inSuggest) return [orig];
    const suggSrc = f.name === `Id${p.pascal}` ? 'req.IdHeader' : `req.${suggestFieldName(f.name)}`;
    return [orig, `\t\t${suggestFieldName(f.name)}: ${suggSrc},`];
  }).join('\n');
  const voFields = det.fields.filter(f => f.inResponse && f.inEntity).flatMap(f => {
    const orig = mapField(f);
    if (!f.inSuggest) return [orig];
    return [orig, `\t\t${suggestFieldName(f.name)}: cons.ToJson(e.${suggestFieldName(f.name)}),`];
  }).join('\n');
  const pagFields = det.fields.filter(f => f.inListar).flatMap(f => {
    const orig = listarField(f);
    if (!f.inSuggest) return [orig];
    return [orig, `\t\t\t${suggestFieldName(f.name)}: cons.ToJson(models[i].${suggestFieldName(f.name)}),`];
  }).join('\n');
  const needCons = det.fields.some(f => f.inSuggest);
  const consImport = needCons ? '\n\tcons "gitlab.com/ns-desarrollo-web/erp/ns-core-service/shared/constants"' : '';

  return `package mapping

import (
	"${p.importPath}/application/request"
	"${p.importPath}/application/response"
	"${p.importPath}/domain/entity"${consImport}
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

module.exports = { mappingGo, importMappingGo, detailMappingGo };
