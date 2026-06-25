const { structField, suggestFieldName } = require('./template-helpers');

function entityGo(p) {
  const fields = p.fields.filter(f => f.inEntity).flatMap(f => {
    const orig = structField(f.name, f.type, f.tagName, 'db');
    if (!f.inSuggest) return [orig];
    return [orig, structField(suggestFieldName(f.name), 'string', '', '')];
  }).join('\n');
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

function detailEntityGo(p, det) {
  const fields = det.fields.filter(f => f.inEntity).flatMap(f => {
    const orig = structField(f.name, f.type, '', '');
    if (!f.inSuggest) return [orig];
    return [orig, structField(suggestFieldName(f.name), 'string', '', '')];
  }).join('\n');
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

module.exports = { entityGo, importEntityGo, detailEntityGo };
