function structField(name, type, tag, kind) {
  const t = tag ? ` \`${kind}:"${tag}"\`` : '';
  return `\t${name}\t\t\t\t${type}${t}`;
}

function mapField(f) {
  if (f.type === 'DocumentoSerieResponse') {
    return '\t\tDocumentoSerie: response.DocumentoSerieResponse{\n\t\t\tIdDocumento: &e.IdDocumento,\n\t\t\tDocumento:   &e.Documento,\n\t\t\tIdSerie:     &e.IdSerie,\n\t\t\tSerie:       &e.Serie,\n\t\t\tNumero:      &e.Numero,\n\t\t},';
  }
  return `\t\t${f.name}: e.${f.name},`;
}

function listarField(f) {
  return `\t\t\t${f.name}: models[i].${f.name},`;
}

function rowField(f) {
  return `\t\t${f.name}: row.${f.name},`;
}

function dtoField(name) {
  return `\t\t${name}: req.${name},`;
}

function suggestFieldName(name) {
  return 'Nombre' + (name.startsWith('Id') ? name.slice(2) : name);
}

function suggestFieldTag(tag) {
  return 'nombre_' + (tag.startsWith('id') ? tag.slice(2) : tag);
}

module.exports = { structField, mapField, listarField, rowField, dtoField, suggestFieldName, suggestFieldTag };
