const express = require('express')
const router = express.Router()
const Joi = require('joi')
const { adminAPIKeyMiddleware } = require('../../custom/auth.js')
const { Deta } = require('deta')

const deta = Deta(process.env.PROJECT_KEY)
const channelsDB = deta.Base('video-channels')

router.use(adminAPIKeyMiddleware)

router.route('/:key')
  .get(async (req, res) => {
    const channel = await channelsDB.get(req.params.key)
    if (!channel) {
      res.status(404).send({ status: 'error', error: 'Not found' })
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
    let channelsRes = await channelsDB.fetch()
    let channels = channelsRes.items
    while (channelsRes.last) {
      // Continue until videoRes.last is not present
      channelsRes = await channelsDB.fetch({}, { last: channelsRes.last })
      channels = channels.concat(channelsRes.items)
    }
    res.send({ items: channels, count: channels.length })
  })
  .put(async (req, res) => {
    const entry = req.body.data
    if (!entry) {
      res.status(400).send({
        status: 'error',
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
        status: 'error',
        error: 'Invalid or missing parameters',
        details: error.details
      })
      return
    }
    if (value) {
      await channelsDB.put(entry)
    }
    res.send({
      status: 'success',
      data: entry
    })
  })

module.exports = router
