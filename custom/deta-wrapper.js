require('dotenv').config()
const mongoose = require('mongoose')

if (process.env.NODE_ENV !== 'test') {
  // Connect when we're not in a testing environment
  mongoose.connect(process.env.MONGO_URL).then(() => console.log('Connected to DB'))
}

const schemaConfig = { versionKey: false }

const Blocks = mongoose.model('blocks', new mongoose.Schema({
  _id: Number,
  about: String,
  authors: [{ type: String }],
  availability: String,
  blockHTML: String,
  collapsible: Boolean,
  community_links: [{ type: String }],
  description: String,
  label: String,
  name: String,
  other_info: [{ type: String }],
  parameters: Array,
  type: String,
  useful_for: [{ type: String }]
}, schemaConfig))

const Objects = mongoose.model('objects', new mongoose.Schema({
  _id: Number,
  codename: String,
  description: String,
  name: String
}))

const Videos = mongoose.model('videos', new mongoose.Schema({
  _id: String,
  date: String,
  group: String,
  icon: String,
  name: String,
  public: Boolean,
  url: String
}, schemaConfig))

const VideoChannels = mongoose.model('video-channels', new mongoose.Schema({
  _id: String,
  requires_auth: Boolean,
  title: String
}, schemaConfig))

const FilterEntries = mongoose.model('filter', new mongoose.Schema({
  _id: String,
  expression: String,
  label: String,
  rules: Array,
  severity: Number,
  sub: String,
  start_letter: String
}, { ...schemaConfig, collection: 'filter' }))

const CompetitionJudging = mongoose.model('competition-judging', new mongoose.Schema({
  _id: String,
  accessCode: String,
  criteria: Array,
  projects: Array,
  submissions: Array,
  title: String,
  viewingCode: String
}, { ...schemaConfig, collection: 'competition-judging' }))

const Requests = mongoose.model('requests', new mongoose.Schema({
  _id: String,
  type: String,
  value: Object
}))

/**
 * @template T
 * Wraps MongoDB functions in a Deta-compatible manner
 * @param {mongoose.Model<T, {}>} model The Mongoose model to search for in the db
 */
const basicDetaWrapper = model => ({
  get: async function (id) {
    let response
    try {
      // Not using promise catch due to test dependency injection
      response = await model.findById(id).lean()
    } catch {}
    if (!response) return null
    // for auto type recognition to be correct
    const data = { ...response, key: response._id, _id: undefined }
    delete data._id
    return data
  },
  put: async function (data, id) {
    id ??= data.key
    delete data.key
    const res = await model.findByIdAndUpdate(id, data, { new: true, upsert: true }).lean()
    res.key = res._id
    delete res._id
    return res
  },
  delete: async function (id) {
    await model.findByIdAndDelete(id)
  },
  fetch: async function (query) {
    return await model.find(query).lean()
  }
})

module.exports = {
  basicDetaWrapper,
  Blocks,
  Objects,
  Videos,
  VideoChannels,
  FilterEntries,
  CompetitionJudging,
  Requests
}
