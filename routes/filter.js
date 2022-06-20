const express = require('express')
const router = express.Router()
const { Deta } = require('deta')
const { checkAdminAPIKey } = require('../custom/auth')
const axios = require('axios')

const deta = Deta(process.env.PROJECT_KEY)
const filterEntriesDB = deta.Base('filter')
const requestsDB = deta.Base('requests')

async function getEntries (req) {
  const versionId = '1.4.1'
  let filterRes = await filterEntriesDB.fetch()
  let filterEntries = filterRes.items
  while (filterRes.last) {
    // Continue until filterRes.last is not present
    filterRes = await filterEntriesDB.fetch({}, { last: filterRes.last })
    filterEntries = filterEntries.concat(filterRes.items)
  }
  filterEntries = filterEntries.map(e => {
    delete e.key
    return e
  })
  let regex = /^$/; let wordList = []; let vModifier = ''
  if (!checkAdminAPIKey(req)) {
    // Severity 0 = shown in list, Severity 1 = in expression, 2 = only if contained, 3 = not in expression
    regex = filterEntries.map(e => { return (e.severity < 3) ? e.expression : null }).filter(e => !!e).join('|')
    wordList = filterEntries.filter(e => { return (e.severity === 0) })
  } else {
    // Severity 2 matches even if alone (as opposed to contained), Severity 3 shows up
    regex = filterEntries.map(e => e.expression.replace(/\+/g, '*')).filter(e => !!e).join('|')
    wordList = filterEntries
    vModifier = 'x'
  }
  return { expression: regex, wordList, version: versionId + vModifier }
}
function jsonSubstitution (items, property, substitutions) {
  const data = items.find(i => i.key === property)
  const jsonString = data.value.replace(/<%(\d)%>/g, function (m0, m1) {
    return substitutions[m1]
  })
  try {
    return JSON.parse(jsonString)
  } catch (e) {
    return {}
  }
}

const Filter = {
  checkKnownMatches: function (textValue, expression, version, res) {
    const existingMatches = textValue.match(new RegExp(expression, 'gi'))
    if (existingMatches) {
      res.send({
        text: textValue,
        version: version,
        filtered: true,
        known: true,
        words: existingMatches
      })
      return true
    }
  },
  checkWithAPI: async function (textValue) {
    const customRequests = (await requestsDB.fetch({
      type: 'filter'
    })).items

    // PUBLISH A PROJECT
    const publishResponse = await axios(jsonSubstitution(customRequests, 'FILTER_REQ_CREATE', [
      // eslint-disable-next-line
      `{"abilities":[{"abilityID":"1B0A3028-2960-6B4A-A625-B9D9421F2152","blocks":[{"block_class":"method","description":"Set Invisibility","type":47,"parameters":[{"defaultValue":"","value":"100","key":"percent","type":42}]}],"createdAt":0}],"eventParameters":[],"objects":[{"height":"55","xPosition":"512","objectID":"1491AE53-EA6B-D298-3C74-E194B8AA0629","width":"74","text":${JSON.stringify(textValue)},"filename":"text-object.png","type":1,"rules":["5A875C30-E6EA-C150-D833-4EECFDCE3842"],"name":"Text","yPosition":"333.5"}],"rules":[{"ruleBlockType":6000,"id":"5A875C30-E6EA-C150-D833-4EECFDCE3842","objectID":"1491AE53-EA6B-D298-3C74-E194B8AA0629","name":"","abilityID":"1B0A3028-2960-6B4A-A625-B9D9421F2152","parameters":[{"defaultValue":"","datum":{"type":7000,"block_class":"operator","description":"Game Starts"},"key":"","value":"","type":52}],"type":6000}],"customRules":[],"variables":[],"scenes":[{"objects":["1491AE53-EA6B-D298-3C74-E194B8AA0629"],"name":"Scene 1"}],"traits":[],"stageSize":{"width":375,"height":667},"version":32,"playerVersion":"1.5.8","playerUpgrades":{},"baseObjectScale":0.5,"fontSize":72,"requires_beta_editor":false,"customObjects":[]}`
    ]))
    const timeDelay = new Promise((resolve, reject) => {
      setTimeout(() => resolve('done'), 400)
    })
    await timeDelay // Let the project get filtered if it contains a filtered word
    // GET THAT PROJECT
    const projectResponse = await axios(jsonSubstitution(customRequests, 'FILTER_REQ_GET', [publishResponse.data.uuid]))
    // UNPUBLISH THAT PROJECT
    await axios(jsonSubstitution(customRequests, 'FILTER_REQ_UNPUBLISH', [publishResponse.data.uuid]))
    // DELETE THAT PROJECT
    await axios(jsonSubstitution(customRequests, 'FILTER_REQ_DELETE', [publishResponse.data.uuid]))
    return { filtered: projectResponse.data.has_been_removed, projectResponse }
  }
}
async function checkFilter (req, res) {
  const { expression, version } = await getEntries(req)
  // Check for known matches
  const textValue = req.query.text_value || (req.body || {}).text_value || ''
  if (Filter.checkKnownMatches(textValue, expression, version, res)) return

  const { filtered, projectResponse } = await Filter.checkWithAPI(textValue)
  res.send({
    text: textValue,
    version: version,
    filtered: filtered,
    known: filtered ? false : undefined,
    in_moderation: (!filtered ? projectResponse.data.in_moderation : undefined)
  })
}

router.get('/regex', async (req, res) => {
  const { expression, wordList, version } = await getEntries(req)
  res.send({ success: true, expression, wordList, version })
})

router.route('/check')
  .get(async (req, res) => {
    await checkFilter(req, res)
  })
  .post(async (req, res) => {
    await checkFilter(req, res)
  })

module.exports = router
