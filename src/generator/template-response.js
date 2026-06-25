const { structField, suggestFieldName, suggestFieldTag } = require('./template-helpers');

function responseGo(p) {
  const listarFields = p.fields.filter(f => f.inListar).map(f => {
    if (!f.inSuggest) return structField(f.name, f.type, f.tagName, 'json');
    return structField(suggestFieldName(f.name), 'interface{}', suggestFieldTag(f.tagName), 'json');
  }).join('\n');
  const responseFields = p.fields.filter(f => f.inResponse).flatMap(f => {
    const orig = structField(f.name, f.type, f.tagName, 'json');
    if (!f.inSuggest) return [orig];
    return [orig, structField(suggestFieldName(f.name), 'interface{}', suggestFieldTag(f.tagName), 'json')];
  }).join('\n');
  return `package response

type DocumentoSerieResponse struct {
	IdDocumento *int64
	Documento   *string
	IdSerie     *int64
	Serie       *string
	Numero      *int64
}

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

function detailResponseGo(p, det) {
  const listarFields = det.fields.filter(f => f.inListar).flatMap(f => {
    const orig = structField(f.name, f.type, f.tagName, 'json');
    if (!f.inSuggest) return [orig];
    return [orig, structField(suggestFieldName(f.name), 'interface{}', suggestFieldTag(f.tagName), 'json')];
  }).join('\n');
  const responseFields = det.fields.filter(f => f.inResponse).flatMap(f => {
    const orig = structField(f.name, f.type, f.tagName, 'json');
    if (!f.inSuggest) return [orig];
    return [orig, structField(suggestFieldName(f.name), 'interface{}', suggestFieldTag(f.tagName), 'json')];
  }).join('\n');
  return `package response

type ${p.pascal}${det.pascal}ListarResponse struct {
${listarFields}
}

type ${p.pascal}${det.pascal}Response struct {
${responseFields}
}
`;
}

module.exports = { responseGo, importResponseGo, detailResponseGo };
