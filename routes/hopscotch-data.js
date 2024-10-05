const express = require('express')
const router = express.Router()
const Joi = require('joi')
const { adminAPIKeyMiddleware } = require('../custom/auth.js')
const { basicDetaWrapper, Blocks, Objects } = require('../custom/deta-wrapper.js')

const blocksDB = basicDetaWrapper(Blocks)
const objectsDB = basicDetaWrapper(Objects)

router.delete('/blocks/:id', adminAPIKeyMiddleware, async (req, res) => {
  if (!req.params.id) return res.status(400).send({ success: false, error: 'Bad request' })
  const existingBlock = await blocksDB.get(parseInt(req.params.id))
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
  const data = await Blocks.find({}, undefined, { sort: { _id: 1 } }).lean()
  data.forEach(block => { block.id = block._id; delete block._id })
  res.send(data)
})
router.get('/blocks/:id/:trait?', async (req, res) => {
  const blockData = await blocksDB.get(req.params.id)
  blockData.id = blockData.key
  if (!blockData) return res.status(404).send({ success: false, error: `No block was found with ID ${req.params.id}` })
  if (!req.params.trait) return res.send(blockData)
  res.send({ value: blockData[req.params.trait] || null })
})

router.get('/objects', async (req, res) => {
  const data = await Objects.find({}, undefined, { sort: { _id: 1 } }).lean()
  data.forEach(obj => { obj.id = obj._id; delete obj._id })
  res.send(data)
})
router.get('/objects/:id/:trait?', async (req, res) => {
  const objectData = await objectsDB.get(req.params.id)
  if (!objectData) return res.status(404).send({ success: false, error: `No object was found with ID ${req.params.id}` })
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
      blocks: (await blocksDB.fetch()).length,
      objects: (await objectsDB.fetch()).length
    }
  })
})

module.exports = router
