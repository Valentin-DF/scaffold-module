function mntGo(p) {
  const brokerImport = p.usesBroker ? '\n\t"gitlab.com/ns-desarrollo-web/erp/ns-core-service/pkg/kafka"' : '';
  const brokerParam = p.usesBroker ? ', broker kafka.Broker' : '';
  const brokerArg = p.usesBroker ? ', broker' : '';
  return `package ${p.packageName}

import (
	"${p.importPath}/application/usecase"
	"${p.importPath}/infrastructure/delivery/http/routes"
	"${p.importPath}/infrastructure/persistence/mssql_repository"

	"gitlab.com/ns-desarrollo-web/erp/ns-core-service"
	db "gitlab.com/ns-desarrollo-web/erp/ns-core-service/pkg/database"${brokerImport}
)

func Create(router *ns.Router, db db.Sql${brokerParam}) {
	repository := mssql_repository.New${p.pascal}Repository(db)
	useCase := usecase.New${p.pascal}UseCase(repository)
	routes.New${p.pascal}Routes(router, useCase${brokerArg})
}
`;
}

module.exports = { mntGo };
