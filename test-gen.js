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
    if (/InfoRetornoEntity/.test(content)) console.log('    ❌ Has InfoRetornoEntity (should be Retorno)');
    if (/entity\.Retorno/.test(content)) console.log('    ✅ Has entity.Retorno (correct)');
  }

  // Verify import entity has the right fields
  const entity = fs.readFileSync(path.join(dir, files[0]), 'utf-8');
  console.log('\nImport entity has Codigo:', entity.includes('Codigo'));
  console.log('Import entity has Descripcion:', entity.includes('Descripcion'));
  console.log('Import mapping has MapValidateImportParaDBToDTO:', entity.includes('Codigo'));

  // Hexagonal Architecture compliance checks
  console.log('\n=== Hexagonal Architecture Compliance ===');

  // Check domain/repository doesn't import application/response
  const repoContent = fs.readFileSync(path.join(dir, 'domain/repository/test.repository.go'), 'utf-8');
  const repoImportsApplication = repoContent.includes('application/response');
  console.log(`domain/repository imports application/response: ${repoImportsApplication ? '❌ VIOLATION' : '✅ COMPLIANT'}`);

  // Check domain/entity doesn't have DocumentoSerieResponse
  const mainEntityContent = fs.readFileSync(path.join(dir, 'domain/entity/test.entity.go'), 'utf-8');
  const entityHasDocumentoSerie = mainEntityContent.includes('DocumentoSerieResponse');
  console.log(`domain/entity has DocumentoSerieResponse: ${entityHasDocumentoSerie ? '❌ VIOLATION' : '✅ COMPLIANT'}`);

  // Check domain/entity has Detalle and Retorno
  const entityHasDetalle = mainEntityContent.includes('type Detalle struct');
  const entityHasRetorno = mainEntityContent.includes('type Retorno struct');
  console.log(`domain/entity has Detalle: ${entityHasDetalle ? '✅' : '❌'}`);
  console.log(`domain/entity has Retorno: ${entityHasRetorno ? '✅' : '❌'}`);

  // Check application/request has Validate()
  const requestContent = fs.readFileSync(path.join(dir, 'application/request/test.request.go'), 'utf-8');
  const requestHasValidate = requestContent.includes('func (r *TestRequest) Validate() error');
  console.log(`application/request has Validate(): ${requestHasValidate ? '✅' : '❌'}`);

  // Check usecase struct is not exported
  const usecaseContent = fs.readFileSync(path.join(dir, 'application/usecase/test.usecase.go'), 'utf-8');
  const usecaseHasUnexportedStruct = usecaseContent.includes('type testUseCase struct');
  console.log(`usecase struct is unexported: ${usecaseHasUnexportedStruct ? '✅' : '❌'}`);

  // Check usecase imports entity
  const usecaseImportsEntity = usecaseContent.includes('domain/entity');
  console.log(`usecase imports domain/entity: ${usecaseImportsEntity ? '✅' : '❌'}`);

  // Check mssql doesn't import application/response
  const mssqlContent = fs.readFileSync(path.join(dir, 'infrastructure/persistence/mssql_repository/test.mssql.go'), 'utf-8');
  const mssqlImportsAppResponse = mssqlContent.includes('application/response');
  console.log(`infrastructure/mssql imports application/response: ${mssqlImportsAppResponse ? '❌ VIOLATION' : '✅ COMPLIANT'}`);

  // Print all imports from usecase
  const usecaseImports = usecaseContent.match(/import\s*\([\s\S]*?\)/);
  if (usecaseImports) console.log(`\nusecase imports:\n${usecaseImports[0]}`);

  // Print all imports from repo
  const repoImports = repoContent.match(/import\s*\([\s\S]*?\)/);
  if (repoImports) console.log(`\nrepository imports:\n${repoImports[0]}`);

  fs.rmSync(basePath, { recursive: true, force: true });
  console.log('\nDONE');
}

main();
