const express = require('express')
const router = express.Router()
const Joi = require('joi')
const { adminAPIKeyMiddleware } = require('../../custom/auth.js')
const { basicDetaWrapper, VideoChannels } = require('../../custom/deta-wrapper.js')

const channelsDB = basicDetaWrapper(VideoChannels)

router.use(adminAPIKeyMiddleware)

router.route('/:key')
  .get(async (req, res) => {
    const channel = await channelsDB.get(req.params.key)
    if (!channel) {
      res.status(404).send({ success: false, error: 'Not found' })
      return
    }
    res.send(channel)
  })
  .delete(async (req, res) => {
    if (!req.params.key) return res.status(400).send({ success: false, error: 'Bad request' })
    const keyExists = !!await channelsDB.get(req.params.key)
    if (!keyExists) return res.status(404).send({ success: false, error: 'Video channel does not exist' })
    await channelsDB.delete(req.params.key)
    res.send({ success: true, deleted_key: req.params.key })
  })

router.route('/')
  .get(async (req, res) => {
    const channels = await channelsDB.fetch()
    channels.forEach(c => { c.key = c._id; delete c._id })
    res.send({ items: channels, count: channels.length, success: true })
  })
  .put(async (req, res) => {
    const entry = req.body.data
    if (!entry) {
      res.status(400).send({
        success: false,
        error: 'No entry was provided'
      })
      return
    }
    const schema = Joi.object({
      key: Joi.string().alphanum().required(),
      auth_code: Joi.when('requires_auth', {
        is: Joi.equal(true),
        then: Joi.string().required(),
        otherwise: Joi.forbidden()
      }),
      requires_auth: Joi.boolean().required(),
      title: Joi.string().required()
    })
    const { error, value } = schema.validate(entry)
    if (error) {
      res.status(400).send({
        success: false,
        error: 'Invalid or missing parameters',
        details: error.details
      })
      return
    }
    if (value) {
      await channelsDB.put(entry)
    }
    res.send({
      success: true,
      data: entry
    })
  })

module.exports = router
