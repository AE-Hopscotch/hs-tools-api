const express = require('express')
const router = express.Router()
const Joi = require('joi')
const { adminAPIKeyMiddleware } = require('../../custom/auth.js')
const { basicDetaWrapper, Videos, VideoChannels } = require('../../custom/deta-wrapper.js')

const videosDB = basicDetaWrapper(Videos)
const channelsDB = basicDetaWrapper(VideoChannels)

router.use(adminAPIKeyMiddleware)

router.post('/bulkupdate', async (req, res) => {
  if (!req.body.videos && !req.body.channels) {
    res.status(400).send({
      success: false,
      error: 'There are no videos or channels provided'
    })
    return
  }
  let errors = []
  let updatedVids = []
  let updatedChannels = []
  if (req.body.videos) {
    const videoSchema = Joi.object({
      'date': Joi.date().required(),
      'group': Joi.string().required(),
      'icon': Joi.string().required().pattern(/^fa-[0-9a-zA-Z-]+$/),
      'key': Joi.string(),
      'name': Joi.string().required().max(24),
      'public': Joi.boolean().required(),
      'time': Joi.number(),
      'url': Joi.string().uri()
    })
    const videoResponses = await Promise.all(req.body.videos.filter(v => !!v).map(async (video) => {
      const { error, value } = videoSchema.validate(video)
      if (error) return { error }
      const id = video.key || video.url.replace(/.*\/|\.[0-9a-zA-Z]+/g, '')
      if (value) {
        await videosDB.put(video, id)
      }
      return { value }
    }))
    const videoErrors = videoResponses.filter(result => !!result.error).map(e => e.error)
    errors = errors.concat(videoErrors)
    updatedVids = updatedVids.concat(videoResponses.filter(result => !!result.value).map(v => v.value))
  }
  if (req.body.channels) {
    const channelSchema = Joi.object({
      auth_code: Joi.string(),
      requires_auth: Joi.boolean().required(),
      key: Joi.string().required(),
      title: Joi.string().required()
    })
    const channelResponses = await Promise.all(req.body.channels.map(async (channel) => {
      const { error, value } = channelSchema.validate(channel)
      if (error) return { error }
      if (value) {
        await channelsDB.put(channel)
      }
      return { value }
    }))
    const channelErrors = channelResponses.filter(r => !!r.error).map(e => e.error)
    errors = errors.concat(channelErrors)
    updatedChannels = updatedChannels.concat(channelResponses.filter(r => !!r.value).map(c => c.value))
  }
  const isSuccess = ((req.body.videos || []).length || 0) + ((req.body.channels || []).length || 0) !== errors.length
  res.status(isSuccess ? 200 : 400).send({
    success: isSuccess,
    errors: errors.map(e => e.details).flat(),
    updated_videos: updatedVids,
    updated_channels: updatedChannels
  })
})
router.delete('/update/:key', async (req, res) => {
  if (!req.params.key) return res.status(400).send({ success: false, error: 'Bad request' })
  const keyExists = !!await videosDB.get(req.params.key)
  if (!keyExists) return res.status(404).send({ success: false, error: 'Video does not exist' })
  await videosDB.delete(req.params.key)
  res.send({ success: true, deleted_key: req.params.key })
})
router.get('/', async (req, res) => {
  const videos = await Videos.find().lean()
  videos.forEach(v => { v.key = v._id; delete v._id })
  res.send({ items: videos, count: videos.length, success: true })
})

module.exports = router
