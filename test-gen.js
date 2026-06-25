const path = require('path');
const fs = require('fs');
const { generate } = require('./src/generator/index');

async function main() {
  const basePath = path.resolve(__dirname, 'tmp_imp');
  if (fs.existsSync(basePath)) fs.rmSync(basePath, { recursive: true, force: true });

  await generate({
    ruta: 'test', dominio: 'dom', tipo: 'mantenedores',
    tabla: 'NS_Test', broker: false, porSP: false, basePath,
    importHeader: true, componente: 'test',
    suggestCode: '', suggestLabel: '',
    campos: [
      { nombre: 'Id', campo: 'id', tipo: 'int64', entity: true, request: true, response: true, listar: true, model: true },
      { nombre: 'IdEmpresa', campo: 'idempresa', tipo: 'int64', entity: true, request: true, response: true, listar: false, model: true },
      { nombre: 'Codigo', campo: 'codigo', tipo: 'string', entity: true, request: true, response: true, listar: true, model: true },
      { nombre: 'Descripcion', campo: 'descripcion', tipo: 'string', entity: true, request: true, response: true, listar: true, model: true },
    ],
    importFields: [
      { nombre: 'Codigo', campo: 'codigo', tipo: 'string' },
      { nombre: 'Descripcion', campo: 'descripcion', tipo: 'string' },
    ],
    detalles: [],
  });

  const dir = path.join(basePath, 'dom/dom-service/api/mantenedores/test');
  const files = [
    'domain/entity/test-import.entity.go',
    'application/request/test-import.request.go',
    'application/response/test-import.response.go',
    'application/mapping/test-import.mapping.go',
  ];

  console.log('Generated import files:');
  for (const f of files) {
    const content = fs.readFileSync(path.join(dir, f), 'utf-8');
    console.log(`  ${f}: ${content.length} bytes`);
    if (/activity_log/.test(content)) console.log('    ❌ activity_log found!');
    if (/InfoRetornoEntity/.test(content)) console.log('    ℹ️  Has InfoRetornoEntity (expected in import?)');
  }

  // Verify import entity has the right fields
  const entity = fs.readFileSync(path.join(dir, files[0]), 'utf-8');
  console.log('\nImport entity has Codigo:', entity.includes('Codigo'));
  console.log('Import entity has Descripcion:', entity.includes('Descripcion'));
  console.log('Import mapping has MapValidateImportParaDBToDTO:', entity.includes('Codigo'));

  fs.rmSync(basePath, { recursive: true, force: true });
  console.log('\nDONE');
}

main();
