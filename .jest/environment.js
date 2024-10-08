const path = require('path')
global.getPackage = (module) => {
  const projectRoot = path.resolve('./')
  return require(path.join(projectRoot, module))
}

global.detaResolvedValue = {}

process.env.PROJECT_KEY = 'ProjectKeySample'
process.env.ADMIN_API_KEY = 'AdminTest'
process.env.CORS_ORIGINS = 'https://ae-hopscotch.github.io'
process.env.MONGO_URL = ''
process.env.NODEMAILER_USER = 'email@example.com'
process.env.NODEMAILER_CLIENTID = 'ThisIsFake'
process.env.NODEMAILER_CLIENTSECRET = 'ThisIsNotReal'
process.env.NODEMAILER_REFRESHTOKEN = 'ThisIsAToken'
process.env.MOD_REQ_STATUS = 'OPEN'
process.env.PROJECT_REQUEST_WEBHOOK = 'webhook-url://test-environment-url'
