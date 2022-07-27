const express = require('express')
const router = express.Router()
const { getJudgingList, generateProjectScores, generateCategoryScores } = require('../../custom/judging/get-data')
const toExcel = require('../../custom/toExcel')

router.get('/:id/projects', getJudgingList('viewingCode'), async (req, res) => {
  const results = generateProjectScores(req.judgingList)

  const { criteria, projectScores } = results

  // Secondary sort: name
  criteria.sort((a, b) => a.name > b.name || -1)
  // Primary sort: max score, desc
  criteria.sort((b, a) => a.max - b.max)

  const spreadsheets = projectScores.map(project => {
    // Set first row to labels
    const headerRow = ['Judge', 'Total', ...criteria.map(c => c.name)]

    // Set second row to averages
    const categoryAverages = criteria.map(c => {
      const criteriaKey = c.slug
      const average = project.entries.reduce((total, submission) => {
        return total + submission.scores[criteriaKey]
      }, 0) / project.entries.length
      return average || 0
    })
    const secondaryHeader = ['Average', project.average, ...categoryAverages]

    // Set content to judge's scores for every project
    const contentRows = project.entries.map(submission => {
      const totalScore = submission.disqualified
        ? { value: submission.total, font: { color: { argb: 'FF0000' } } }
        : submission.total
      const categoryScores = criteria.map(c => {
        const criteriaKey = c.slug
        const score = submission.scores[criteriaKey]
        if (submission.disqualified) return { value: score, font: { color: { argb: 'FF0000' } } }
        return score
      })
      return [submission.username, totalScore, ...categoryScores]
    })

    return {
      name: `(${Math.round(project.average * 100) / 100}) ${project.title}`.replace(/[*?:\\/[\]]/g, ''),
      options: {
        views: [{ state: 'frozen', xSplit: 1, ySplit: 2 }]
      },
      widths: [20, 8, ...new Array(criteria.length).fill(12)],
      rows: [headerRow, secondaryHeader, ...contentRows]
    }
  })

  const excelFile = await toExcel(spreadsheets)
  const filename = encodeURIComponent('Projects - ' + (results.title || 'Judging Results'))
  res.header({
    'content-disposition': `attachment; filename=${filename}.xlsx`
  }).send(excelFile)
})

router.get('/:id/categories', getJudgingList('viewingCode'), async (req, res) => {
  const results = generateCategoryScores(req.judgingList)

  const { criteria, categoryScores } = results

  // Secondary sort: name
  criteria.sort((a, b) => a.name > b.name || -1)
  // Primary sort: max score, desc
  criteria.sort((b, a) => a.max - b.max)

  const spreadsheets = categoryScores.map(category => {
    const scores = category.projects.map(p => p.scores).flat()
    const judges = [...new Set(scores.map(s => s.username))].sort()
    // Set first row to labels
    const headerRow = ['Project', 'Average', 'Total', ...judges]

    const contentRows = category.projects.map(project => {
      const titleCell = {
        value: { text: project.title, hyperlink: `https://c.gethopscotch.com/p/${project.id}` },
        font: { underline: true, color: { argb: '0000FF' } }
      }
      const scores = judges.map(j => project.scores.find(s => s.username === j)).map(s => {
        // Red text if disqualified, gray tile if skipped
        if (!s) return { value: '', fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DDDDDD' } } }
        if (s?.disqualified) return { value: s.value, font: { color: { argb: 'FF0000' } } }
        return s.value ?? ''
      })
      const total = parseInt(scores.reduce((total, score) => total + score, 0))
      return [titleCell, total / scores.length || 0, total, ...scores]
    })
    return {
      name: `${category.name} (Max ${category.max})`,
      options: {
        views: [{ state: 'frozen', xSplit: 2, ySplit: 1 }]
      },
      widths: [32, 8, 8, ...new Array(judges.length).fill(12)],
      rows: [headerRow, ...contentRows]
    }
  })

  const excelFile = await toExcel(spreadsheets)
  const filename = encodeURIComponent('Categories - ' + (results.title || 'Judging Results'))
  res.header({
    'content-disposition': `attachment; filename=${filename}.xlsx`
  }).send(excelFile)
})

module.exports = router
