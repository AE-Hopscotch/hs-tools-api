const request = require('supertest')
function mockDeta (mockedValue) {
  jest.resetModules()
  global.jestFn = jest.fn().mockResolvedValue(mockedValue)
  jest.doMock('deta', global.deta)
  return getPackage('/index.js')
}

const sampleItem = {
  'expression': '\\b(?:ip\\s?)?address\\b',
  'key': 'address',
  'label': 'Address',
  'rules': [3],
  'severity': 0
}

describe('GET /admin/filter/entries', () => {
  beforeEach(() => {
    this.headers = { 'api-token': process.env.ADMIN_API_KEY }
    this.app = mockDeta({
      items: [sampleItem],
      count: 1
    })
  })
  test('should return a list with status 200', async () => {
    const { status, body: response } = await request(this.app)
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
    this.app = mockDeta(sampleItem)
  })
  test('should return status 400 on empty request body', async () => {
    const { status, body: response } = await request(this.app)
      .put('/admin/filter/entry')
      .set(this.headers)
      .send()

    expect(status).toBe(400)
    expect(response.success).toBe(false)
    expect(response.error).toBe('No entry was provided')
    expect(response.details).not.toBeDefined()
  })
  test('should return error details when missing parameters', async () => {
    const { status, body: response } = await request(this.app)
      .put('/admin/filter/entry')
      .set(this.headers)
      .send({ data: { label: 'TEST' } })

    expect(status).toBe(400)
    expect(response.success).toBe(false)
    expect(response.error).toBe('Invalid or missing parameters')
    expect(response.details).toBeDefined()
  })
  test('should return 200 and call DB put on valid request', async () => {
    const { status, body: response } = await request(this.app)
      .put('/admin/filter/entry')
      .set(this.headers)
      .send({
        data: sampleItem
      })

    expect(status).toBe(200)
    expect(global.jestFn).toBeCalled()
    expect(response.success).toBe(true)
    expect(response.data).toEqual(sampleItem)
  })
})

describe('DELETE /admin/filter/entries/:key', () => {
  beforeEach(() => {
    this.headers = { 'api-token': process.env.ADMIN_API_KEY }
  })
  test('returns with status 404 if the item does not exist', async () => {
    const app = mockDeta(null)
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
    const app = mockDeta(sampleItem)
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
