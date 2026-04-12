const express = require('express')
const router = express.Router()
const { basicDetaWrapper, Requests } = require('../../custom/deta-wrapper')

const requestsDB = basicDetaWrapper(Requests)

router.post('/:uuid', async (req, res) => {
  const uuid = req.params.uuid
  const acct = {
    name: req.body.username,
    password: req.body.password
  }
  const project = req.body.project
  if (!project?.objects) return res.status(400).send({ error: 'Project does not contain any code' })
  const endpoints = (await requestsDB.get('UPDATE_REQ_ENDPOINTS')).value

  // Get the current project
  const url = 'https://c.gethopscotch.com/api/v1/projects/' + uuid
  const currentProject = await fetch(url, {
    'method': 'GET',
    'headers': {
      'Host': 'c.gethopscotch.com',
      'Content-Type': 'application/json',
      'Connection': 'keep-alive',
      'Accept': '*/*'
    }
  }).then(async x => x.ok ? x.json() : null)
    .catch(() => {})

  // Check if exists and published
  if (!currentProject) return res.status(404).send({ error: 'Could not find project' })
  if (!currentProject.correct_published_at) return res.status(400).send({ error: 'Project is not published' })

  // Log in to web explorer with provided username and password
  const loginResponse = await fetch('https://c.gethopscotch.com' + endpoints.login, {
    method: 'POST',
    body: JSON.stringify({ account: acct }),
    headers: {
      'Host': 'c.gethopscotch.com',
      'Content-Type': 'application/json',
      'Connection': 'keep-alive',
      'Accept': '*/*'
    }
  })
    .then(x => x.ok && x.json())
    .catch(() => {})
  if (!loginResponse || loginResponse.error) return res.status(403).send({ error: 'Incorrect username or password' })

  const credential = loginResponse?.headers['set-cookie']

  const rootTraits = await requestsDB.get('UPDATE_REQ_ASSIGN')
  const reqBody = Object.assign({
    'project': {
      'project_info': {
        'title': req.body.title || currentProject.title,
        'filename': currentProject.fileName,
        'remote_asset_urls': currentProject.remote_asset_urls,
        'uuid': currentProject.uuid
      },
      'project_json': project
    }
  }, rootTraits.value)
  const updateResponse = await fetch('https://c.gethopscotch.com' + endpoints.update, {
    method: 'POST',
    headers: {
      'Host': 'c.gethopscotch.com',
      'Content-Type': 'application/json',
      'Connection': 'keep-alive',
      'Accept': '*/*',
      'Cookie': credential
    },
    body: JSON.stringify(reqBody)
  }).then(x => x.ok ? x.json() : null).catch(() => {})

  const success = !!updateResponse?.uuid
  if (!success) return res.status(500).send({ error: 'Unable to update project' })
  res.send({ success: true, uuid: updateResponse.uuid })
})

module.exports = router
