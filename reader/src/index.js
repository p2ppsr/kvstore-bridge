const reader = require('bitquery-mongo-reader')
const path = require('path')
reader({
  documentationFileName: path.join(__dirname, '../protocol.md')
})