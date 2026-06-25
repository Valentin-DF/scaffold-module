const { structField, rowField, suggestFieldName, suggestFieldTag } = require('./template-helpers');

function modelGo(p) {
  const fields = p.fields.filter(f => f.inModel && f.name !== 'DocumentoSerie').flatMap(f => {
    const mt = f.name === 'CodigoEstado' ? '*string' : f.type;
    const orig = structField(f.name, mt, f.tagName, 'db');
    if (!f.inSuggest) return [orig];
    return [orig, structField(suggestFieldName(f.name), 'string', suggestFieldTag(f.tagName), 'db')];
  }).join('\n');
  const rowFields = p.fields.filter(f => f.inModel && f.inEntity).flatMap(f => {
    const orig = rowField(f);
    if (!f.inSuggest) return [orig];
    return [orig, `\t\t${suggestFieldName(f.name)}: row.${suggestFieldName(f.name)},`];
  }).join('\n');

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

module.exports = { modelGo };
