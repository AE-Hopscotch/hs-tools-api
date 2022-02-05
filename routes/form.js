const express = require('express')
const router = express.Router()

router.get('/:data', (req, res) => {
  const data = req.params.data
  if (!data) return res.status(400).send({ error: 'No data' })
  let decoded = {}
  try {
    decoded = JSON.parse(Buffer.from(data, 'base64'))
  } catch (e) { return res.status(400).send({ error: 'Invalid Data' }) }
  res.send('<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<style>input{margin:8px;padding:8px;border:1px solid gray}*{font-size:16px;font-family:sans-serif}</style>' +
    `<form action="${decoded.target}" method="${decoded.method || 'GET'}">` +
    'Action: ' + decoded.target + '<br>' +
    decoded.fields.map(f => `<label>${f.name} <input type="${f.type}" name="${f.name}" value="${f.defaultText || ''}"></label><br>`).join('') +
    '<input type="submit"></form>')
})

module.exports = router
