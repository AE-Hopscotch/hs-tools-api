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
})

module.exports = router
