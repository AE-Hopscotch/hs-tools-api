const express = require('express')
const router = express.Router()
const { basicDetaWrapper, Videos, VideoChannels } = require('../custom/deta-wrapper')

const videosDB = basicDetaWrapper(Videos)
const channelsDB = basicDetaWrapper(VideoChannels)

router.post('/c/:channel?', async (req, res) => {
  // Get Channel Info
  const channelName = req.params.channel || '__OTHER'
  const isPublicFeed = ['__OTHER', 'GROUPED'].indexOf(channelName) !== -1
  let channel = await channelsDB.get(channelName)
  if (!channel && !isPublicFeed) {
    return res.status(404).send({
      success: false,
      status: 404,
      contents: null
    })
  }
  channel = channel || {}
  if (channel.auth_code && channel.auth_code !== req.body.passcode) {
    return res.status(401).send({
      success: false,
      status: 401,
      auth_code: req.body.passcode,
      contents: { title: channel.title }
    })
  }
  // Remove passphrase from response object
  delete channel.auth_code

  // Set Match query to either group name or public
  const matchQuery = { group: channelName }
  if (isPublicFeed) {
    delete matchQuery.group
    matchQuery.public = true
  }

  // Fetch videos that match the query
  const videos = await videosDB.fetch(matchQuery)
  videos.forEach(v => { v.key = v._id; delete v._id })

  videos.forEach(video => {
    video.time = video.time || new Date(video.date).getTime()
  })
  channel.videos = videos.sort((a, b) => b.time - a.time)
  res.send({
    success: true,
    status: 200,
    contents: channel
  })
})

module.exports = router
