const { sendMail } = require('../../custom/email.js')
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
  if (!req.query.key) return res.status(400).send({ error: 'Must include secret key' })
  const dbRes = await prDB.fetch({ secret: req.query.key })
  if (dbRes.count !== 1) return res.status(400).send({ error: 'Incorrect number of entries found' })
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
  ['lock-project', 'Make the project uneditable'],
  ['freeze-issue', 'The project does not load'],
  ['clean-code', 'Reduce Lag and Optimize Performance'],
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

  await sendMail(process.env.NODEMAILER_USER, 'HS Tools API Notification',
    `<!DOCTYPE html><html lang="en" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:vml"><head><title></title>
      <meta charset="utf-8"/><meta content="width=device-width, initial-scale=1.0" name="viewport"/><style>*{box-sizing: border-box;}body{margin: 0;padding: 0;}a[x-apple-data-detectors]{color: inherit !important;text-decoration: inherit !important;}#MessageViewBody a{color: inherit;text-decoration: none;}p{line-height: inherit}@media (max-width:520px){.icons-inner{text-align: center;}.icons-inner td{margin: 0 auto;}.row-content{width: 100% !important;}.stack .column{width: 100%;display: block;}}</style></head>
      <body style="background-color: #FFFFFF; margin: 0; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none;"><table border="0" cellpadding="0" cellspacing="0" class="nl-container" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #FFFFFF;" width="100%"><tbody><tr><td><table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-1" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%"><tbody><tr><td><table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 500px;" width="500"><tbody><tr><td class="column" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; padding-top: 5px; padding-bottom: 5px; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="100%"><table border="0" cellpadding="0" cellspacing="0" class="heading_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%"><tr><td style="width:100%;text-align:center;"><h1 style="margin: 0; color: #555555; font-size: 23px; font-family: Arial, Helvetica Neue, Helvetica, sans-serif; line-height: 120%; text-align: center; direction: ltr; font-weight: normal; letter-spacing: normal; margin-top: 0; margin-bottom: 0;"><strong>You have a new Project Modding Request</strong></h1></td></tr></table><table border="0" cellpadding="10" cellspacing="0" class="text_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;" width="100%"><tr><td><div style="font-family: Arial, sans-serif"><div style="font-size: 12px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; mso-line-height-alt: 14.399999999999999px; color: #555555; line-height: 1.2;"><p style="margin: 0; font-size: 14px; text-align: center;"><span style="font-size:14px;">Hi. This is an automated message to let you know that there is a new project modding request pending.</span></p><p style="margin: 0; font-size: 14px; text-align: center; mso-line-height-alt: 14.399999999999999px;">&nbsp;</p><p style="margin: 0; font-size: 14px; text-align: center;"><span style="font-size:14px;">
      Project Title: ${project.title}
      </span></p><p style="margin: 0; font-size: 14px; text-align: center;"><span style="font-size:14px;">
      Project UUID: ${project.uuid}
      </span></p><p style="margin: 0; font-size: 14px; text-align: center;"><span style="font-size:14px;">
      Editing Reason: ${response.edit_reason}
      </span></p></div></div></td></tr></table></td></tr></tbody></table></td></tr></tbody></table><table align="center" border="0" cellpadding="0" cellspacing="0" class="row row-2" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%"><tbody><tr><td><table align="center" border="0" cellpadding="0" cellspacing="0" class="row-content stack" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 500px;" width="500"><tbody><tr><td class="column" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="33.333333333333336%"><table border="0" cellpadding="0" cellspacing="0" class="button_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%"><tr><td style="text-align:center;padding-top:15px;padding-right:10px;padding-bottom:15px;padding-left:10px;"><div align="center">
      <a href="https://hs-tools-api.up.railway.app/form/${rejectForm}" style="text-decoration:none;display:inline-block;color:#ffffff;background-color:#b31010;border-radius:4px;width:auto;border-top:1px solid #b31010;border-right:1px solid #b31010;border-bottom:1px solid #b31010;border-left:1px solid #b31010;padding-top:5px;padding-bottom:5px;font-family:Arial, Helvetica Neue, Helvetica, sans-serif;text-align:center;mso-border-alt:none;word-break:keep-all;" target="_blank"><span style="padding-left:20px;padding-right:20px;font-size:16px;display:inline-block;letter-spacing:normal;"><span style="font-size: 16px; line-height: 2; word-break: break-word; mso-line-height-alt: 32px;">Reject</span></span></a></div></td></tr></table></td><td class="column" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="33.333333333333336%"><table border="0" cellpadding="0" cellspacing="0" class="button_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%"><tr><td style="text-align:center;padding-top:15px;padding-right:10px;padding-bottom:15px;padding-left:10px;"><div align="center">
      <a href="https://hs-tools-api.up.railway.app/project-requests/${response.key}/received?key=${response.secret}" style="text-decoration:none;display:inline-block;color:#ffffff;background-color:#3AAEE0;border-radius:4px;width:auto;border-top:1px solid #3AAEE0;border-right:1px solid #3AAEE0;border-bottom:1px solid #3AAEE0;border-left:1px solid #3AAEE0;padding-top:5px;padding-bottom:5px;font-family:Arial, Helvetica Neue, Helvetica, sans-serif;text-align:center;mso-border-alt:none;word-break:keep-all;" target="_blank"><span style="padding-left:20px;padding-right:20px;font-size:16px;display:inline-block;letter-spacing:normal;"><span style="font-size: 16px; line-height: 2; word-break: break-word; mso-line-height-alt: 32px;">Received</span></span></a></div></td></tr></table></td><td class="column" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;" width="33.333333333333336%"><table border="0" cellpadding="0" cellspacing="0" class="button_block" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;" width="100%"><tr><td style="text-align:center;padding-top:15px;padding-right:10px;padding-bottom:15px;padding-left:10px;"><div align="center">
      <a href="https://hs-tools-api.up.railway.app/form/${completeForm}" style="text-decoration:none;display:inline-block;color:#ffffff;background-color:#197b23;border-radius:4px;width:auto;border-top:1px solid #197b23;border-right:1px solid #197b23;border-bottom:1px solid #197b23;border-left:1px solid #197b23;padding-top:5px;padding-bottom:5px;font-family:Arial, Helvetica Neue, Helvetica, sans-serif;text-align:center;mso-border-alt:none;word-break:keep-all;" target="_blank"><span style="padding-left:20px;padding-right:20px;font-size:16px;display:inline-block;letter-spacing:normal;"><span style="font-size: 16px; line-height: 2; word-break: break-word; mso-line-height-alt: 32px;">Complete</span></span></a></div></td></tr></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></body></html>
    `
  ).catch(
    e => console.log(e)
  )
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
  if (!dbRes) return res.status(404).send({ error: 'Could not find project modding request' })
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
  if (item.status !== 'sent') return res.status(400).send({ error: 'Project Request was already marked as received' })
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
