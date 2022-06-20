const express = require('express')
const router = express.Router()
const { Deta } = require('deta')
const Joi = require('joi')
const { adminAPIKeyMiddleware } = require('../../custom/auth.js')

const deta = Deta(process.env.PROJECT_KEY)
const filterEntriesDB = deta.Base('filter')

router.use(adminAPIKeyMiddleware)

router.put('/entry', async (req, res) => {
  const entry = req.body.data
  if (!entry) {
    res.status(400).send({
      status: 'error',
      error: 'No entry was provided'
    })
    return
  }
  const filterEntrySchema = Joi.object({
    label: Joi.string().required(),
    key: Joi.string().required(),
    expression: Joi.string().required(),
    rules: Joi.array().items(Joi.number()).required(),
    severity: Joi.number().integer().required(),
    start_letter: Joi.string().pattern(/^(OTHER|[A-Z])$/),
    sub: Joi.string()
  })
  const { error, value } = filterEntrySchema.validate(entry)
  if (error) {
    res.status(400).send({
      status: 'error',
      error: 'Invalid or missing parameters',
      details: error.details
    })
    return
  }
  if (value) {
    await filterEntriesDB.put(entry)
  }
  res.send({
    status: 'success',
    data: entry
  })
})
router.delete('/entries/:key', async (req, res) => {
  if (!req.params.key) return res.status(400).send({ success: false, error: 'Bad request' })
  const keyExists = !!await filterEntriesDB.get(req.params.key)
  if (!keyExists) return res.status(404).send({ success: false, error: 'Filter entry does not exist' })
  await filterEntriesDB.delete(req.params.key)
  res.send({ success: true, deleted_key: req.params.key })
})
router.get('/entries', async (req, res) => {
  let filterRes = await filterEntriesDB.fetch()
  let entries = filterRes.items
  while (filterRes.last) {
    // Continue until filterRes.last is not present
    filterRes = await filterEntriesDB.fetch({}, { last: filterRes.last })
    entries = entries.concat(filterRes.items)
  }
  res.send({
    status: 'success',
    items: entries.sort((a, b) => a.key.toLowerCase() < b.key.toLowerCase() ? -1 : 1),
    count: entries.length
  })
})

module.exports = router
