const request = require('supertest')
function mockDeta (mockedValue) {
  jest.resetModules()
  global.jestFn = jest.fn().mockResolvedValue(mockedValue)
  jest.doMock('deta', global.deta)
  return getPackage('/index.js')
}

const sampleItem = {
  'created_at': '2022-05-09T22:13:34.979Z',
  'downloaded_at': null,
  'edit_reason': 'filter-check',
  'key': 'l2zav1ab-v208n4',
  'output': 'Output text here',
  'project_uuid': 'test2',
  'secret': 'secret-string',
  'status': 'sent'
}

describe('GET /project-requests/:id', () => {
  beforeEach(() => {
    this.headers = { 'api-token': process.env.ADMIN_API_KEY }
  })

  test('should return 404 when project request does not exist', async () => {
    const app = mockDeta(null)
    const { status, body: response } = await request(app).get('/project-requests/sample')
    expect(status).toBe(404)
    expect(response.success).toBe(false)
    expect(response.error).toBe('Could not find project modding request')
  })

  test('should have status 200 but not be downloaded when status is sent', async () => {
    const app = mockDeta(sampleItem)
    const { status, body: response } = await request(app).get('/project-requests/sample')
    expect(status).toBe(200)
    expect(response.downloaded_at).toBe(null)
  })
  test('should have status 200 and be downloaded when status is complete', async () => {
    sampleItem.status = 'complete'
    const app = mockDeta(sampleItem)
    const { status, body: response } = await request(app).get('/project-requests/sample')
    expect(status).toBe(200)
    expect(response.downloaded_at).not.toBe(null)
  })
})

describe('GET /project-requests/:id/reject', () => {
  beforeEach(() => {
    this.headers = { 'api-token': process.env.ADMIN_API_KEY }
  })

  test('should return 400 when secret key is missing', async () => {
    const app = mockDeta(null)
    const { status, body: response } = await request(app).get('/project-requests/sample/reject')
    expect(status).toBe(400)
    expect(response.success).toBe(false)
    expect(response.error).toBe('Must include secret key')
  })

  test('should return 400 when secret key is incorrect', async () => {
    const app = mockDeta({ items: [], count: 0 })
    const { status, body: response } = await request(app).get('/project-requests/sample/reject?key=bad')
    expect(status).toBe(400)
    expect(response.success).toBe(false)
    expect(response.error).toBe('Incorrect number of entries found')
  })

  test('should be rejected with status 200 when key matches', async () => {
    sampleItem.status = 'rejected'
    const app = mockDeta({ ...sampleItem, items: [sampleItem], count: 1 })
    const { status, body: response } = await request(app).get('/project-requests/sample/reject?key=good')
    expect(status).toBe(200)
    expect(response.status).toBe('rejected')
  })
})

describe('GET /project-requests/:id/received', () => {
  beforeEach(() => {
    this.headers = { 'api-token': process.env.ADMIN_API_KEY }
  })

  test('should return 400 when secret key is missing', async () => {
    const app = mockDeta(null)
    const { status, body: response } = await request(app).get('/project-requests/sample/received')
    expect(status).toBe(400)
    expect(response.success).toBe(false)
    expect(response.error).toBe('Must include secret key')
  })

  test('should return 400 when secret key is incorrect', async () => {
    const app = mockDeta({ items: [], count: 0 })
    const { status, body: response } = await request(app).get('/project-requests/sample/received?key=bad')
    expect(status).toBe(400)
    expect(response.success).toBe(false)
    expect(response.error).toBe('Incorrect number of entries found')
  })

  test('should return 400 if request was already received', async () => {
    sampleItem.status = 'received'
    const app = mockDeta({ ...sampleItem, items: [sampleItem], count: 1 })
    const { status, body: response } = await request(app).get('/project-requests/sample/received?key=ok')
    expect(status).toBe(400)
    expect(response.success).toBe(false)
    expect(response.error).toBe('Project Request was already marked as received')
  })

  test('should be received with status 200 when key matches', async () => {
    sampleItem.status = 'sent'
    const app = mockDeta({ ...sampleItem, items: [sampleItem], count: 1 })
    const { status } = await request(app).get('/project-requests/sample/reject?key=good')
    expect(status).toBe(200)
  })
})

describe('GET /project-requests/:id/complete', () => {
  beforeEach(() => {
    this.headers = { 'api-token': process.env.ADMIN_API_KEY }
  })

  test('should return 400 when secret key is missing', async () => {
    const app = mockDeta(null)
    const { status, body: response } = await request(app).get('/project-requests/sample/complete')
    expect(status).toBe(400)
    expect(response.success).toBe(false)
    expect(response.error).toBe('Must include secret key')
  })

  test('should return 400 when secret key is incorrect', async () => {
    const app = mockDeta({ items: [], count: 0 })
    const { status, body: response } = await request(app).get('/project-requests/sample/complete?key=bad')
    expect(status).toBe(400)
    expect(response.success).toBe(false)
    expect(response.error).toBe('Incorrect number of entries found')
  })

  test('should be complete with status 200 when key matches', async () => {
    sampleItem.status = 'complete'
    const app = mockDeta({ ...sampleItem, items: [sampleItem], count: 1 })
    const { status, body: response } = await request(app).get('/project-requests/sample/complete?key=good')
    expect(status).toBe(200)
    expect(response.status).toBe('complete')
  })
})
