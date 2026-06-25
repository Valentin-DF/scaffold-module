const { structField, suggestFieldName, suggestFieldTag } = require('./template-helpers');

function requestGo(p) {
  const fields = p.fields.filter(f => f.inRequest).flatMap(f => {
    const orig = structField(f.name, f.type, f.tagName, 'json');
    if (!f.inSuggest) return [orig];
    return [orig, structField(suggestFieldName(f.name), 'string', suggestFieldTag(f.tagName), 'json')];
  }).join('\n');
  return `package request

type ${p.pascal}Request struct {
${fields}
}
`;
}

function importRequestGo(p) {
  const fields = p.importFields.map(f => structField(f.name, f.type, f.tagName, 'json')).join('\n');
  return `package request

type ImportExcelRequest struct {
${fields}
}
`;
}

function detailRequestGo(p, det) {
  const fields = det.fields.filter(f => f.inRequest).flatMap(f => {
    const orig = structField(f.name, f.type, f.tagName, 'json');
    if (!f.inSuggest) return [orig];
    return [orig, structField(suggestFieldName(f.name), 'string', suggestFieldTag(f.tagName), 'json')];
  }).join('\n');
  return `package request

type ${p.pascal}${det.pascal}Request struct {
	IdHeader int64 \`json:"id_header"\`
${fields}
}
`;
}

module.exports = { requestGo, importRequestGo, detailRequestGo };
