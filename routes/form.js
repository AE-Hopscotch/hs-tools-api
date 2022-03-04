const express = require('express')
const router = express.Router()
const {
  compressToEncodedURIComponent: compress,
  decompressFromEncodedURIComponent: decompress
} = require('lz-string')

router.post('/create/', (req, res) => {
  const json = JSON.stringify(req.body)
  const compressed = compress(json)
  res.send(compressed)
})

router.get('/:data', (req, res) => {
  const data = req.params.data
  if (!data) return res.status(400).send({ error: 'No data' })
  let decoded = {}
  try {
    const decompressed = decompress(data)
    decoded = JSON.parse(decompressed)
  } catch (e) { return res.status(400).send({ error: 'Invalid Data' }) }
  decoded.method ??= 'GET'
  res.render('form', {
    helpers: decoded,
    data: JSON.stringify(decoded)
  })
  // res.send('<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
  //   '<style>input{margin:8px;padding:8px;border:1px solid gray}*{font-size:16px;font-family:sans-serif}</style>' +
  //   `<form action="${decoded.target}" method="${decoded.method || 'GET'}">` +
  //   'Action: ' + decoded.target + '<br>' +
  //   decoded.fields.map(f => `<label>${f.name} <input type="${f.type}" name="${f.name}" value="${f.defaultText || ''}"></label><br>`).join('') +
  //   '<input type="submit"></form>')
})

module.exports = router
