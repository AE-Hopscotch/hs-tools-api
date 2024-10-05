const express = require('express')
const router = express.Router()
const Joi = require('joi')
const { adminAPIKeyMiddleware } = require('../../custom/auth.js')
const { FilterEntries, basicDetaWrapper } = require('../../custom/deta-wrapper.js')

const filterEntriesDB = basicDetaWrapper(FilterEntries)

router.use(adminAPIKeyMiddleware)

router.put('/entry', async (req, res) => {
  const entry = req.body.data
  if (!entry) {
    res.status(400).send({
      success: false,
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
      success: false,
      error: 'Invalid or missing parameters',
      details: error.details
    })
    return
  }
  if (value) {
    await filterEntriesDB.put(entry)
  }
  res.send({
    success: true,
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
  const filterRes = await filterEntriesDB.fetch()
  filterRes.forEach(e => { e.key = e._id; delete e._id })

  res.send({
    success: true,
    items: filterRes.sort((a, b) => a.key.toLowerCase() < b.key.toLowerCase() ? -1 : 1),
    count: filterRes.length
  })
})

module.exports = router
