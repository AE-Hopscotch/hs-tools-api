/*
  answered May 14, 2013 clayzermk1
  https://stackoverflow.com/questions/11120840/hash-string-into-rgb-color
*/
function djb2 (str) {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i) /* hash * 33 + c */
  }
  return hash
}

function hashStringToColor (str) {
  const hash = djb2(str)
  const r = (hash & 0xFF0000) >> 16
  const g = (hash & 0x00FF00) >> 8
  const b = hash & 0x0000FF
  return '#' + ('0' + r.toString(16)).substr(-2) + ('0' + g.toString(16)).substr(-2) + ('0' + b.toString(16)).substr(-2)
}

module.exports = hashStringToColor
