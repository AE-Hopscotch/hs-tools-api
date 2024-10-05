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

/**
 * @template T
 * Wraps MongoDB functions in a Deta-compatible manner
 * @param {mongoose.Model<T, {}>} model The Mongoose model to search for in the db
 */
const basicDetaWrapper = model => ({
  get: async function (id) {
    const response = await model.findById(id).lean()
    if (!response) return null
    // for auto type recognition to be correct
    const data = { ...response, key: response._id, _id: undefined }
    delete data._id
    return data
  },
  put: async function (data, id) {
    id ??= data.key
    delete data.key
    await model.findByIdAndUpdate(id, data, { new: true, upsert: true })
  },
  delete: async function (id) {
    await model.findByIdAndDelete(id)
  },
  fetch: async function (query) {
    return await model.find(query).lean()
  }
})
module.exports = { basicDetaWrapper, Blocks, Objects }
