const request = require('supertest')
const { FilterEntries } = require('../../../custom/deta-wrapper')
const app = getPackage('/index.js')

const sampleItem = {
  'expression': '\\b(?:ip\\s?)?address\\b',
  'key': 'address',
  'label': 'Address',
  'rules': [3],
  'severity': 0
}
const returnSample = () => ({ ...sampleItem, key: undefined, _id: sampleItem.key })

describe('GET /admin/filter/entries', () => {
  beforeEach(() => {
    this.headers = { 'api-token': process.env.ADMIN_API_KEY }
    jest.spyOn(FilterEntries, 'find').mockReturnValue({ lean: () => [returnSample()] })
  })
  test('should return a list with status 200', async () => {
    const { status, body: response } = await request(app)
      .get('/admin/filter/entries')
      .set(this.headers)

    expect(status).toBe(200)
    expect(response.items).toEqual([sampleItem])
    expect(response.count).toBe(1)
    expect(response.success).toBe(true)
  })
})

describe('PUT /admin/filter/entry', () => {
  beforeEach(() => {
    this.headers = {
      'api-token': process.env.ADMIN_API_KEY,
      'Content-Type': 'application/json'
    }
    jest.spyOn(FilterEntries, 'findByIdAndUpdate').mockReturnValue({ lean: () => sampleItem })
  })
  test('should return status 400 on empty request body', async () => {
    const { status, body: response } = await request(app)
      .put('/admin/filter/entry')
      .set(this.headers)
      .send()

    expect(status).toBe(400)
    expect(response.success).toBe(false)
    expect(response.error).toBe('No entry was provided')
    expect(response.details).not.toBeDefined()
  })
  test('should return error details when missing parameters', async () => {
    const { status, body: response } = await request(app)
      .put('/admin/filter/entry')
      .set(this.headers)
      .send({ data: { label: 'TEST' } })

    expect(status).toBe(400)
    expect(response.success).toBe(false)
    expect(response.error).toBe('Invalid or missing parameters')
    expect(response.details).toBeDefined()
  })
  test('should return 200 and call DB put on valid request', async () => {
    const { status, body: response } = await request(app)
      .put('/admin/filter/entry')
      .set(this.headers)
      .send({
        data: sampleItem
      })

    expect(status).toBe(200)
    expect(FilterEntries.findByIdAndUpdate).toBeCalled()
    expect(response.success).toBe(true)
    expect(response.data).toEqual(sampleItem)
  })
})

describe('DELETE /admin/filter/entries/:key', () => {
  beforeEach(() => {
    this.headers = { 'api-token': process.env.ADMIN_API_KEY }
  })
  test('returns with status 404 if the item does not exist', async () => {
    jest.spyOn(FilterEntries, 'findById').mockReturnValue({ lean: () => null })
    jest.spyOn(FilterEntries, 'findByIdAndDelete').mockReturnValue(null)
    const { status, body: response } = await request(app)
      .delete('/admin/filter/entries/sample')
      .set(this.headers)

    expect(status).toBe(404)
    expect(response).toEqual({
      success: false,
      error: 'Filter entry does not exist'
    })
  })
  test('returns with status 200 if the item exists', async () => {
    jest.spyOn(FilterEntries, 'findById').mockReturnValue({ lean: () => sampleItem })
    jest.spyOn(FilterEntries, 'findByIdAndDelete').mockReturnValue(null)
    const { status, body: response } = await request(app)
      .delete('/admin/filter/entries/sample')
      .set(this.headers)

    expect(status).toBe(200)
    expect(response).toEqual({
      success: true,
      deleted_key: 'sample'
    })
  })
})
