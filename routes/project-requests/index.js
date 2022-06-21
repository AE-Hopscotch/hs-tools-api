const express = require('express')
const router = express.Router()
const Joi = require('joi')
const axios = require('axios')
const { Deta } = require('deta')
const deta = Deta(process.env.PROJECT_KEY)
const prDB = deta.Base('project-requests')
const uuid = require('uuid')
const { compressToEncodedURIComponent: compress } = require('lz-string')

function randomChars (length) {
  const str = Math.round(Math.random() * 36 ** length).toString(36)
  return '0'.repeat(length - str.length) + str
}
async function getMatchFromSecretParam (req, res, next) {
  if (!req.query.key) return res.status(400).send({ success: false, error: 'Must include secret key' })
  const dbRes = await prDB.fetch({ secret: req.query.key })
  if (dbRes.count !== 1) return res.status(400).send({ success: false, error: 'Incorrect number of entries found' })
  req.dbItem = dbRes.items[0]
  next()
}

function compressForm (json) {
  const text = JSON.stringify(json)
  const compressed = compress(text)
  return compressed
}

const modReasons = [
  ['secret-blocks', 'Add Secret Blocks to the project'],
  ['in-project', 'Description is in the project'],
  ['keyboard-support', 'Add Keyboard Support'],
  ['filter-check', 'Project is filtered by an unknown word'],
  ['toggle-beta-editor', 'Enable or Disable the Beta Editor'],
  ['upgrade-player', 'Update the player without breaking anything']
]

router.post('/', async (req, res) => {
  // Error if Project Requests are Closed
  const IS_OPEN = process.env.MOD_REQ_STATUS === 'OPEN'
  if (!IS_OPEN) res.status(503).send({ error: 'Project Requests are currently unavailable' })

  // Validate Request Body
  const schema = Joi.object({
    'project-url': Joi.string().required().regex(/^(https:\/\/c(community)?.gethopscotch.com\/(p|e|project)\/)?[0-9a-z-]+([?#].*)?$/),
    'edit-reason': Joi.string().required().valid(...modReasons.map(r => r[0]))
  }, { stripUnknown: true })
  const { error } = schema.validate(req.body)
  if (error) return res.status(400).send({ error: 'Parameter ' + error.details[0].path[0] + ' is invalid' })

  // Get Project
  const projectReq = await axios({
    'method': 'GET',
    'url': 'https://c.gethopscotch.com/api/v1/projects/' + req.body['project-url'].replace(/^(https:\/\/c(community)?.gethopscotch.com\/(p|e|project)\/)?|([?#].*)?$/g, ''),
    'headers': {
      'Host': 'c.gethopscotch.com',
      'Content-Type': 'application/json',
      'Connection': 'keep-alive',
      'Accept': '*/*',
      'Accept-Language': 'en-us'
    }
  }).catch(e => {
  })
  if (!projectReq) return res.status(404).send({ error: 'Project could not be retrieved' })

  // Check to make sure there are not custom images
  const project = projectReq.data
  if (project.customObjects.length > 0) return res.status(400).send({ error: 'Project cannot have custom images' })

  const response = await prDB.put({
    created_at: new Date().toISOString(),
    downloaded_at: null,
    edit_reason: req.body['edit-reason'],
    key: Date.now().toString(36) + '-' + randomChars(5),
    output: null,
    project_uuid: project.uuid,
    secret: uuid.v4(),
    status: 'sent'
  })
  const rejectForm = compressForm({
    target: `/project-requests/${response.key}/reject`,
    fields: [
      { 'defaultText': 'Duplicate Project', name: 'reason', type: 'text' },
      { 'defaultText': response.secret, name: 'key', type: 'text' }
    ]
  })
  const completeForm = compressForm({
    target: `/project-requests/${response.key}/complete`,
    fields: [
      { 'defaultText': '', name: 'output', type: 'text' },
      { 'defaultText': response.secret, name: 'key', type: 'text' }
    ]
  })
  const profilePicture = project.user.remote_avatar_url || `https://ae-hopscotch.github.io/hs-tools/images/webavatars/${project.user?.avatar_type || 0}.png`
  await axios({
    method: 'POST',
    url: process.env.PROJECT_REQUEST_WEBHOOK,
    data: {
      embeds: [{
        color: 0x521256,
        author: { name: 'New Project Request', icon_url: profilePicture },
        title: '',
        thumbnail: { url: `https://s3.amazonaws.com/hopscotch-cover-images/production/${project.uuid}.png` },
        description: `You have a new project request for [${project.title}](https://c.gethopscotch.com/p/${project.uuid})`,
        fields: [
          { name: 'UUID', value: project.uuid, inline: true },
          { name: 'Author', value: project.user?.nickname, inline: true },
          { name: 'Reason', value: response.edit_reason, inline: true },
          { name: '\u1D00\u1D04\u1D1B\u026A\u1D0F\u0274', value: `[Reject...](https://hs-tools-api.up.railway.app/form/${rejectForm})`, inline: true },
          { name: '\u200B', value: `[Mark Received](https://hs-tools-api.up.railway.app/project-requests/${response.key}/received?key=${response.secret})`, inline: true },
          { name: '\u200B'.repeat(8), value: `[Complete...](https://hs-tools-api.up.railway.app/form/${completeForm})`, inline: true }
        ],
        timestamp: new Date().toISOString()
      }]
    }
  })

  delete response.secret // Exclude secret from response
  res.send(response)
})
router.get('/status', async (req, res) => {
  const IS_OPEN = process.env.MOD_REQ_STATUS === 'OPEN'
  res.send({
    is_open: IS_OPEN,
    options: IS_OPEN ? modReasons : []
  })
})
router.get('/:id', async (req, res) => {
  const dbRes = await prDB.get(req.params.id)
  if (!dbRes) return res.status(404).send({ success: false, error: 'Could not find project modding request' })
  let response = dbRes
  if (['complete', 'rejected'].includes(dbRes.status)) response = await prDB.put(Object.assign(dbRes, { downloaded_at: new Date().toISOString() }))
  res.send(response)
})
router.get('/:id/reject', getMatchFromSecretParam, async (req, res) => {
  const item = req.dbItem
  if (!item) return
  item.status = 'rejected'
  item.output = req.query.reason || 'Project request was rejected'
  const response = await prDB.put(item)
  res.send(response)
})
router.get('/:id/received', getMatchFromSecretParam, async (req, res) => {
  // GET because this will be from clicking a link in email
  const item = req.dbItem
  if (!item) return
  if (item.status !== 'sent') return res.status(400).send({ success: false, error: 'Project Request was already marked as received' })
  item.status = 'received'
  const response = await prDB.put(item)
  res.send(response)
})
router.get('/:id/complete', getMatchFromSecretParam, async (req, res) => {
  const item = req.dbItem
  if (!item) return
  item.status = 'complete'
  item.output = req.query.output || 'Project request was rejected'
  const response = await prDB.put(item)
  res.send(response)
})

module.exports = router
