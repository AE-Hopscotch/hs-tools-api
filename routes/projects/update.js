const express = require('express')
const router = express.Router()
const { Deta } = require('deta')
const axios = require('axios')

const deta = Deta(process.env.PROJECT_KEY)
const requestsDB = deta.Base('requests')

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
  const currentProject = (await axios({
    'method': 'GET',
    'url': 'https://c.gethopscotch.com/api/v1/projects/' + uuid,
    'headers': {
      'Host': 'c.gethopscotch.com',
      'Content-Type': 'application/json',
      'Connection': 'keep-alive',
      'Accept': '*/*'
    }
  }).catch(e => {}))?.data

  // Check if exists and published
  if (!currentProject) return res.status(404).send({ error: 'Could not find project' })
  if (!currentProject.correct_published_at) return res.status(400).send({ error: 'Project is not published' })

  // Log in to web explorer with provided username and password
  const loginResponse = (await axios({
    method: 'POST',
    url: 'https://c.gethopscotch.com' + endpoints.login,
    data: { account: acct },
    headers: {
      'Host': 'c.gethopscotch.com',
      'Content-Type': 'application/json',
      'Connection': 'keep-alive',
      'Accept': '*/*'
    }
  }).catch(e => {}))
  if (!loginResponse || loginResponse.data?.error) return res.status(403).send({ error: 'Incorrect username or password' })

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
  const updateResponse = await axios({
    method: 'POST',
    url: 'https://c.gethopscotch.com' + endpoints.update,
    headers: {
      'Host': 'c.gethopscotch.com',
      'Content-Type': 'application/json',
      'Connection': 'keep-alive',
      'Accept': '*/*',
      'Cookie': credential
    },
    data: reqBody
  })

  const success = !!updateResponse?.data?.uuid
  if (!success) return res.status(500).send({ error: 'Unable to update project' })
  res.send({ success: true, uuid: updateResponse.data.uuid })
})

module.exports = router
