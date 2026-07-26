const { structField, suggestFieldName, suggestFieldTag } = require('./template-helpers');

function requestGo(p) {
  const fields = p.fields.filter(f => f.inRequest).flatMap(f => {
    const orig = structField(f.name, f.type, f.tagName, 'json');
    if (!f.inSuggest) return [orig];
    return [orig, structField(suggestFieldName(f.name), 'string', suggestFieldTag(f.tagName), 'json')];
  }).join('\n');

  const validations = p.fields
    .filter(f => f.inRequest && f.name !== 'Id' && f.type === 'string' && !f.inSuggest)
    .map(f => `\tif r.${f.name} == "" {\n\t\treturn fmt.Errorf("${f.name.toLowerCase()} es requerido")\n\t}`)
    .join('\n');

  const validateMethod = validations
    ? `\nfunc (r *${p.pascal}Request) Validate() error {\n${validations}\n\treturn nil\n}`
    : `\nfunc (r *${p.pascal}Request) Validate() error {\n\treturn nil\n}`;

  return `package request

import "fmt"

type ${p.pascal}Request struct {
${fields}
}${validateMethod}
`;
}

function importRequestGo(p) {
  const fields = p.importFields.map(f => structField(f.name, f.type, f.tagName, 'json')).join('\n');
  return `package request

import "fmt"

type ImportExcelRequest struct {
${fields}
}

func (r *ImportExcelRequest) Validate() error {
\treturn nil
}
`;
}

function detailRequestGo(p, det) {
  const fields = det.fields.filter(f => f.inRequest).flatMap(f => {
    const orig = structField(f.name, f.type, f.tagName, 'json');
    if (!f.inSuggest) return [orig];
    return [orig, structField(suggestFieldName(f.name), 'string', suggestFieldTag(f.tagName), 'json')];
  }).join('\n');

  const validations = det.fields
    .filter(f => f.inRequest && f.name !== 'Id' && !f.name.startsWith('Id') && f.type === 'string' && !f.inSuggest)
    .map(f => `\tif r.${f.name} == "" {\n\t\treturn fmt.Errorf("${f.name.toLowerCase()} es requerido")\n\t}`)
    .join('\n');

  const validateMethod = validations
    ? `\nfunc (r *${p.pascal}${det.pascal}Request) Validate() error {\n${validations}\n\treturn nil\n}`
    : `\nfunc (r *${p.pascal}${det.pascal}Request) Validate() error {\n\treturn nil\n}`;

  return `package request

import "fmt"

type ${p.pascal}${det.pascal}Request struct {
	IdHeader int64 \`json:"id_header"\`
${fields}
}${validateMethod}
`;
}

module.exports = { requestGo, importRequestGo, detailRequestGo };
