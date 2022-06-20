const path = require('path')
global.getPackage = (module) => {
  const projectRoot = path.resolve('./')
  return require(path.join(projectRoot, module))
}

global.detaResolvedValue = {}
global.deta = () => ({
  Deta: function () {
    return class Deta {
      static get Base () {
        return () => ({
          fetch: global.jestFn,
          put: global.jestFn
        })
      }
    }
  }
})

process.env.ADMIN_API_KEY = 'AdminTest'
