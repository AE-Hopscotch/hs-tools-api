const express = require('express')
const fs = require('fs')
const path = require('path')
const cors = require('cors')
const handlebars = require('express-handlebars')

require('dotenv').config()
const whitelist = process.env.CORS_ORIGINS.split(', ')
const corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(null, false)
    }
  },
  optionsSuccessStatus: 200
}
const app = express()
app.use(express.json({ extended: true, limit: '5mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cors(corsOptions))

app.engine('handlebars', handlebars.engine({
  defaultLayout: false,
  partialsDir: 'views/partials/'
}))
app.set('view engine', 'handlebars')
app.set('views', path.join(__dirname, 'views'))

// Routes
function recursiveRoutes (folderName) {
  fs.readdirSync(folderName).forEach(function (file) {
    const fullName = path.join(folderName, file)
    const stat = fs.lstatSync(fullName)

    if (stat.isDirectory()) {
      recursiveRoutes(fullName)
    } else if (file.toLowerCase().endsWith('.js')) {
      const routeName = fullName.replace(/^routes|\.js$/g, '')
      const route = require('./' + fullName)
      app.use(routeName.replace(/\/index$/, ''), route)
    }
  })
}
recursiveRoutes('routes')

app.use(express.static('public'))
app.get('/', (req, res) => {
  res.send({ success: true, message: 'Hello, World!' })
})
app.use(function (req, res) {
  res.status(404).send({ success: false, error: 'Not found' })
})

if (process.env.DETA_PATH || process.env.NODE_ENV === 'test') {
  // export serverless app
  module.exports = app
} else {
  const http = require('http')
  const server = http.Server(app)
  server.listen(7700, function () {
    console.log('Listening on port 7700')
  })
}
