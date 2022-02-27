const express = require('express')
const router = express.Router()
const Joi = require('joi')
const axios = require('axios')
const { Deta } = require('deta')

const deta = Deta(process.env.PROJECT_KEY)
const screenshotMapDB = deta.Base('screenshot-map')

router.post('/speedrun', async (req, res) => {
  const postExp = /^(https:\/\/forum\.gethopscotch\.com\/t(?:\/[^/]+)?\/49377\/(\d+))/
  const schema = Joi.object({
    post_link: Joi.string().required().regex(postExp)
  }, { stripUnknown: true })
  const { error } = schema.validate(req.body)
  // Must be gaming comp topic link
  if (error) return res.status(400).send({ error: 'Parameter ' + error.details[0].path[0] + ' is invalid' })

  const match = req.body.post_link.match(postExp)
  const postId = match[2]

  const existingEntries = await screenshotMapDB.fetch({
    postId: postId
  })
  if (existingEntries.count) return res.status(409).send({ error: 'Post screenshot has already been submitted' })

  const jsonLink = match[1] + '.json'
  const response = await axios(jsonLink)
  const postData = response?.data
  if (!postData) return res.status(404).send({ error: 'Post not found' })

  const individualPost = postData.post_stream?.posts?.find(post => String(post.post_number) === match[2])
  if (!individualPost) return res.status(404).send({ error: 'Post not found' })

  const imgRegex = '<img src="(https://aws\\d+\\.discourse-cdn\\.com/gethopscotch/[^".]*?\\.[a-z]+)'
  const imgMatches = individualPost.cooked.match(new RegExp(imgRegex, 'g')) || []
  if (imgMatches.length !== 1) return res.status(400).send({ error: `Wrong number of images in post. Expected 1 but received ${imgMatches.length}.` })

  const imageLink = individualPost.cooked.match(new RegExp(imgRegex))[1]
  const now = Date.now().toString(36)
  const dbRes = await screenshotMapDB.put({
    key: '0'.repeat(10 - now.length) + now,
    group: 'speedrun',
    imageLink,
    postId,
    officialTime: NaN
  })

  res.send({ image: imageLink, post: individualPost, item: dbRes })
})

module.exports = router
