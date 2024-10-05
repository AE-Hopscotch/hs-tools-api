require('dotenv').config()
const { basicDetaWrapper, CompetitionJudging } = require('../deta-wrapper')
const scoringDB = basicDetaWrapper(CompetitionJudging)
const crypto = require('crypto')
function md5 (string) {
  return crypto.createHash('md5').update(string).digest('hex')
}

function getJudgingList (codeTrait) {
  async function setJudgingList (req, res, next) {
    const accessHeader = req.headers['x-judging-access-code']
    const providedCode = accessHeader ? md5(accessHeader) : req.query.key

    const judgingList = await scoringDB.get(req.params.id)
    if (!judgingList) {
      res.status(404).send({
        success: false,
        error: 'Competition judging sheet does not exist'
      })
      return
    }

    const accessCode = judgingList[codeTrait]
    if (accessCode && md5(accessCode) !== providedCode) {
      return res.status(401).send({
        success: false,
        error: 'You are not authorized'
      })
    }
    req.judgingList = judgingList
    req.editingHeader = req.headers['x-judging-edit-code']
    next()
  }
  return setJudgingList
}

function calculateTotalScores (judgingList) {
  judgingList.submissions.forEach(submission => {
    submission.scoringData.forEach(project => {
      project.total = Object.values(project.scores).reduce((a, b) => a + (parseInt(b) || 0), 0)
    })
  })
  return judgingList
}

function generateProjectScores (judgingList) {
  // Calculate Total Project Scores
  calculateTotalScores(judgingList)

  // Initiate project scores array from project list
  judgingList.projectScores = JSON.parse(JSON.stringify(judgingList.projects))
  judgingList.projectScores.forEach(project => {
    project.entries = []
  })

  // For each submission, add scoring details entry to projectScores
  judgingList.submissions.forEach(submission => {
    submission.scoringData.forEach(project => {
      // Ignore project if any entries are skipped
      if (Object.values(project.scores).includes('-')) return

      const projectEntry = judgingList.projectScores.find(p => p.id === project.id)
      const { scores, skipped, disqualified, total } = project
      projectEntry.entries.push({ scores, skipped, disqualified, total, username: submission.username })
    })
  })

  // Calculate the total and average for each project
  judgingList.projectScores.forEach(projectEntry => {
    projectEntry.total = projectEntry.entries.reduce((total, e) => total + e.total, 0)
    projectEntry.average = (projectEntry.total / projectEntry.entries.length) || 0
  })

  // Sort by average, descending
  judgingList.projectScores.sort((b, a) => a.average - b.average)
  return judgingList
}

function generateCategoryScores (judgingList) {
  // Calculate Total Project Scores
  calculateTotalScores(judgingList)

  // Initiate category scores array from project list
  judgingList.categoryScores = JSON.parse(JSON.stringify(judgingList.criteria))
  judgingList.categoryScores.unshift({
    name: 'Total Score',
    slug: 'total',
    description: 'The total combined score of the project',
    max: judgingList.categoryScores.reduce((total, category) => total + category.max, 0)
  })

  judgingList.categoryScores.forEach(category => {
    // For each category, create its project list
    category.projects = JSON.parse(JSON.stringify(judgingList.projects))
    category.projects.forEach(project => {
      // Add scores array to every project in category
      project.scores = []
    })
  })

  // Iterate through submissions
  judgingList.submissions.forEach(submission => {
    // Iterate through every project in each submission
    submission.scoringData.forEach(project => {
      // Ignore project if any entries are skipped
      if (Object.values(project.scores).includes('-')) return

      // For each project, iterate through the scoring categories
      Object.entries(project.scores).forEach(([category, score]) => {
        // Find corresponding project in corresponding category
        const categoryEntry = judgingList.categoryScores.find(c => c.slug === category)
        const projectEntry = categoryEntry.projects.find(p => p.id === project.id)
        // Add category scores to the project scores
        projectEntry.scores.push({
          skipped: project.skipped,
          disqualified: project.disqualified,
          value: score,
          username: submission.username
        })
      })

      // Also add the total
      const totalEntry = judgingList.categoryScores[0].projects
        .find(p => p.id === project.id)
      totalEntry.scores.push({
        skipped: project.skipped,
        disqualified: project.disqualified,
        value: project.total,
        username: submission.username
      })
    })
  })

  judgingList.categoryScores.forEach(category => {
    // Calculate the total and average for every project in each category
    category.projects.forEach(project => {
      project.total = project.scores.reduce((total, score) => total + score.value, 0)
      project.average = (project.total / project.scores.length) || 0
    })
    // Sort by project averages, descending
    category.projects.sort((b, a) => a.average - b.average)
  })

  return judgingList
}

module.exports = { getJudgingList, generateProjectScores, generateCategoryScores }
