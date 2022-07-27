const express = require('express')
const router = express.Router()
const Joi = require('joi')
const { Deta } = require('deta')
const deta = Deta(process.env.PROJECT_KEY)
const scoringDB = deta.Base('competition-judging')
const uuid = require('uuid')
const { getJudgingList, generateProjectScores, generateCategoryScores } = require('../../custom/judging/get-data')

router.get('/:id', getJudgingList('accessCode'), async (req, res) => {
  const { criteria, projects } = req.judgingList
  if (req.editingHeader) {
    const submission = req.judgingList.submissions.find(s => s.id === req.editingHeader)
    if (!submission) return res.status(404).send({ error: 'Cannot find submission' })
    return res.send({
      criteria, projects, submission
    })
  }
  res.send({ criteria, projects })
})

router.get('/:id/results', getJudgingList('viewingCode'), async (req, res) => {
  // Process category and project-based scores
  generateCategoryScores(req.judgingList)
  generateProjectScores(req.judgingList)

  const { submissions, categoryScores, projectScores, criteria, title } = req.judgingList
  res.send({ submissions, categoryScores, projectScores, criteria, title })
})

router.post('/', async (req, res) => {
  const schema = Joi.object({
    title: Joi.string().required(),
    accessCode: Joi.string(),
    viewingCode: Joi.string(),
    criteria: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        slug: Joi.string().regex(/^[0-9a-z-]+$/).required(),
        description: Joi.string().required(),
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
  value.submissions = []
  const dbItem = await scoringDB.put(value)
  res.send(dbItem)
})

router.post('/:id', getJudgingList('accessCode'), async (req, res) => {
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
    const existingSubmission = req.judgingList.submissions.find(s => s.id === req.editingHeader)
    const existingIndex = req.judgingList.submissions.indexOf(existingSubmission)
    // Replace existing entry
    value.id = req.editingHeader
    req.judgingList.submissions.splice(existingIndex, 1, value)
  } else {
    // Generate new ID
    const submissionId = uuid.v4().substring(0, 6)
    value.id = submissionId
    req.judgingList.submissions.push(value)
  }
  await scoringDB.put(req.judgingList)
  res.send({ success: true, submission: value })
})

module.exports = router
