require('dotenv').config()

function checkAdminAPIKey (req) {
  const formToken = req.body?.api_token || req.headers['api-token']
  return formToken === process.env.ADMIN_API_KEY
}

function adminAPIKeyMiddleware (req, res, next) {
  if (checkAdminAPIKey(req)) {
    next()
  } else {
    res.status(400).send({ success: false, error: 'Incorrect API Key' })
  }
}

module.exports = { checkAdminAPIKey, adminAPIKeyMiddleware }
