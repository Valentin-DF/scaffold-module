function routesGo(p) {
  const brokerImport = p.usesBroker ? '\n\t"gitlab.com/ns-desarrollo-web/erp/ns-core-service/pkg/kafka"' : '';
  const brokerParam = p.usesBroker ? ', broker kafka.Broker' : '';
  return `package routes

import (
	"${p.importPath}/application/usecase"
	"${p.importPath}/infrastructure/delivery/http/controller"

	"gitlab.com/ns-desarrollo-web/erp/ns-core-service"${brokerImport}
)

func New${p.pascal}Routes(router *ns.Router, useCase usecase.${p.pascal}UseCase${brokerParam}) {
	c := controller.New${p.pascal}Controller(useCase)

	//CABECERA
	router.GET("/${p.ruta}", c.Listar)
	router.POST("/${p.ruta}", c.Crear)
	router.PUT("/${p.ruta}/:id", c.Actualizar)
	router.DELETE("/${p.ruta}/:id", c.Eliminar)
	router.PATCH("/${p.ruta}/:id/habilitar", c.Habilitar)
	router.PATCH("/${p.ruta}/:id/deshabilitar", c.Deshabilitar)

	//BUSCAR
	router.GET("/${p.ruta}-buscar", c.Buscar)
	router.GET("/${p.ruta}/:id", c.BuscarPorID)

	//OTROS
	router.GET("/${p.ruta}-codigo", c.VerificarCodigo)
}
`;
}

function importRouteMethods(p) {
  return `\n\n\t/*IMPORTAR*/\n\trouter.POST("/${p.ruta}-validate", c.ValidateImport)\n\trouter.POST("/${p.ruta}-save-import", c.SaveImport)`;
}

module.exports = { routesGo, importRouteMethods };
