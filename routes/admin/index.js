const express = require('express')
const router = express.Router()
const { adminAPIKeyMiddleware } = require('../../custom/auth.js')

router.get('/ping', adminAPIKeyMiddleware, (req, res) => {
  res.send({ success: true, message: 'API Key authentication was successful' })
})

module.exports = router
