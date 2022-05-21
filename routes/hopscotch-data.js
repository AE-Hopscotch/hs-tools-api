const express = require('express')
const router = express.Router()
const { Deta } = require('deta')
const Joi = require('joi')
const { adminAPIKeyMiddleware } = require('../custom/auth.js')

const deta = Deta(process.env.PROJECT_KEY)
const blocksDB = deta.Base('blocks')
const objectsDB = deta.Base('objects')

router.delete('/blocks/:id', adminAPIKeyMiddleware, async (req, res) => {
  if (!req.params.id) return res.status(400).send({ success: false, error: 'Bad request' })
  const existingBlock = await blocksDB.get(req.params.id)
  if (!existingBlock) return res.status(404).send({ success: false, error: 'Block does not exist' })
  await blocksDB.delete(req.params.id)
  res.send({ success: true, deleted_item: existingBlock })
})
router.post('/blocks', adminAPIKeyMiddleware, async (req, res) => {
  if (!req.body.block) return res.status(400).send({ success: false, error: 'No block was provided' })
  const blockSchema = Joi.object({
    about: Joi.string().required(),
    authors: Joi.array().items(Joi.string()).required(),
    availability: Joi.string().required(),
    blockHTML: Joi.string().required(),
    collapsible: Joi.boolean().required(),
    community_links: Joi.array().items(Joi.string()).required(),
    description: Joi.string().required(),
    id: Joi.number().integer().required(),
    name: Joi.string().required(),
    label: Joi.string().required().allow(''),
    other_info: Joi.array().items(Joi.string()).required(),
    parameters: Joi.array().items(
      Joi.object({
        description: Joi.string().required(),
        label: Joi.string().required().allow(''),
        type: Joi.string().required()
      })
    ),
    type: Joi.string().required().allow(''),
    useful_for: Joi.array().items(Joi.string()).required()
  }, { stripUnknown: true })
  const block = req.body.block
  const { error } = blockSchema.validate(req.body.block)
  if (error) return res.send({ success: false, error: 'Missing or invalid parameters', details: error.details })
  await blocksDB.put(block, block.id.toString())
  res.send({ success: true, block: block })
})
router.get('/blocks', async (req, res) => {
  const data = await blocksDB.fetch()
  res.send(data.items)
})
router.get('/blocks/:id/:trait?', async (req, res) => {
  const blockData = await blocksDB.get(req.params.id)
  if (!blockData) return res.status(404).send({ status: 'error', error: `No block was found with ID ${req.params.id}` })
  if (!req.params.trait) return res.send(blockData)
  res.send({ value: blockData[req.params.trait] || null })
})
router.get('/objects', async (req, res) => {
  const data = await objectsDB.fetch()
  res.send(data.items)
})
router.get('/objects/:id/:trait?', async (req, res) => {
  const objectData = await objectsDB.get(req.params.id)
  if (!objectData) return res.status(404).send({ status: 'error', error: `No object was found with ID ${req.params.id}` })
  if (!req.params.trait) return res.send(objectData)
  res.send({ value: objectData[req.params.trait] || null })
})
router.get('/', async (req, res) => {
  res.send({
    endpoints: [
      'blocks/:id?/:trait?',
      'objects/:id?/:trait?'
    ],
    counts: {
      blocks: (await blocksDB.fetch()).count,
      objects: (await objectsDB.fetch()).count
    }
  })
})

module.exports = router
