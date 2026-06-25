const { mntGo } = require('./template-mnt');
const { entityGo, importEntityGo, detailEntityGo } = require('./template-entity');
const { repositoryGo, importRepoMethods } = require('./template-repository');
const { requestGo, importRequestGo, detailRequestGo } = require('./template-request');
const { responseGo, importResponseGo, detailResponseGo } = require('./template-response');
const { mappingGo, importMappingGo, detailMappingGo } = require('./template-mapping');
const { portGo, importPortMethods } = require('./template-port');
const { usecaseGo, importUseCaseMethods } = require('./template-usecase');
const { controllerGo, importControllerMethods } = require('./template-controller');
const { routesGo, importRouteMethods } = require('./template-routes');
const { modelGo } = require('./template-model');
const { mssqlGo, importMssqlMethods } = require('./template-mssql');

module.exports = {
  mntGo,
  entityGo,
  repositoryGo,
  requestGo,
  responseGo,
  mappingGo,
  portGo,
  usecaseGo,
  controllerGo,
  routesGo,
  modelGo,
  mssqlGo,
  importEntityGo,
  importRequestGo,
  importResponseGo,
  importMappingGo,
  importRouteMethods,
  importControllerMethods,
  importPortMethods,
  importUseCaseMethods,
  importRepoMethods,
  importMssqlMethods,
  detailEntityGo,
  detailRequestGo,
  detailResponseGo,
  detailMappingGo,
};
