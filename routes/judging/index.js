const express = require('express')
const router = express.Router()
const Joi = require('joi')
const { Deta } = require('deta')
const deta = Deta(process.env.PROJECT_KEY)
const scoringDB = deta.Base('competition-judging')
const uuid = require('uuid')

async function getJudgingList (req, res, next) {
  const judgingList = await scoringDB.get(req.params.id)
  if (!judgingList) {
    res.status(404).send({
      success: false,
      error: 'Competition judging sheet does not exist'
    })
    return
  }

  const { accessCode } = judgingList
  if (accessCode && accessCode !== req.headers['x-judging-access-code']) {
    return res.status(401).send({
      success: false,
      error: 'You are not authorized'
    })
  }
  req.judgingList = judgingList
  req.editingHeader = req.headers['x-judging-edit-code']
  next()
}

router.get('/:id', getJudgingList, async (req, res) => {
  const { criteria, projects } = req.judgingList
  if (req.editingHeader) {
    const submission = req.judgingList.scores.find(s => s.id === req.editingHeader)
    if (!submission) return res.status(404).send({ error: 'Cannot find submission' })
    return res.send({
      criteria, projects, submission
    })
  }
  res.send({ criteria, projects })
})

router.post('/', async (req, res) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    criteria: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        slug: Joi.string().alphanum().lowercase().required(),
        max: Joi.number().integer().required(),
        symbol: Joi.string().required()
      })
    ),
    projects: Joi.array().items(
      Joi.object({
        id: Joi.string().required(),
        title: Joi.string()
      })
    )
  })
  const { error, value } = schema.validate(req.body)
  if (error) {
    res.status(400).send({
      success: false,
      error: 'Invalid or missing parameters',
      details: error.details
    })
    return
  }
  value.scores = []
  const dbItem = await scoringDB.put(value)
  res.send(dbItem)
})

router.post('/:id', getJudgingList, async (req, res) => {
  const schema = Joi.object({
    username: Joi.string().required(),
    scoringData: Joi.array().items(
      Joi.object({
        id: Joi.string().required(),
        disqualified: Joi.boolean().required(),
        skipped: Joi.boolean().required(),
        title: Joi.string(),
        scores: Joi.object().required()
      })
    )
  })
  const { error, value } = schema.validate(req.body)
  if (error) {
    res.status(400).send({
      success: false,
      error: 'Invalid or missing parameters',
      details: error.details
    })
    return
  }

  if (req.editingHeader) {
    const existingSubmission = req.judgingList.scores.find(s => s.id === req.editingHeader)
    const existingIndex = req.judgingList.scores.indexOf(existingSubmission)
    // Replace existing entry
    value.id = req.editingHeader
    req.judgingList.scores.splice(existingIndex, 1, value)
    console.log(req.judgingList.scores)
  } else {
    // Generate new ID
    const submissionId = uuid.v4().substring(0, 6)
    value.id = submissionId
    req.judgingList.scores.push(value)
  }
  await scoringDB.put(req.judgingList)
  res.send({ success: true, submission: value })
})

module.exports = router
