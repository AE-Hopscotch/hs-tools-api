const ExcelJS = require('exceljs')
const hashStringToColor = require('./hash-string-color')

// Data: [ Spreadsheet[Row[Col"", ...], ...], ... ]
async function toExcel (spreadsheetData) {
  const workbook = new ExcelJS.Workbook()
  // Set basic properties
  workbook.creator = 'Me'
  workbook.lastModifiedBy = 'Her'
  workbook.created = new Date()
  workbook.modified = new Date()
  workbook.lastPrinted = new Date(2016, 9, 27)

  spreadsheetData.forEach((table, tableNumber) => {
    // create a sheet with red tab colour
    const wsName = table.name || 'Sheet' + tableNumber
    const worksheet = workbook.addWorksheet(wsName, {
      properties: { tabColor: { argb: hashStringToColor(wsName).replace(/#/, '') } },
      views: [{ state: 'frozen', xSplit: 1, ySplit: 1 }],
      ...(table.options || {})
    })
    // Set column widths
    const widths = table.widths || []
    widths.forEach((w, col) => {
      worksheet.getColumn(col + 1).width = w
    })

    // Iterate through provided rows
    table.rows.forEach((row, index) => {
      // Create a new row in the worksheet
      const worksheetRow = worksheet.getRow(index + 1)
      row.forEach((cellData, col) => {
        const cell = worksheetRow.getCell(col + 1)
        // Set column to provided data
        if (typeof cellData === 'object') {
          Object.entries(cellData).forEach(([key, value]) => {
            cell[key] = value
          })
        } else {
          cell.value = cellData
        }
      })
    })
  })

  const buffer = await workbook.xlsx.writeBuffer()
  return buffer
}

module.exports = toExcel
