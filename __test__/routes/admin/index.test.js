const request = require('supertest')
const app = getPackage('/index.js')

describe('GET /admin/ping', () => {
  beforeEach(() => {
    this.headers = { 'api-token': process.env.ADMIN_API_KEY }
  })

  test('should return 400 with invalid Admin API key', async () => {
    const { status, body: response } = await request(app).get('/admin/ping')
    expect(status).toBe(400)
    expect(response.success).toBe(false)
    expect(response.error).toBe('Incorrect API Key')
  })

  test('should return 200 with valid Admin API key', async () => {
    const { status, body: response } = await request(app).get('/admin/ping')
      .set(this.headers)

    expect(status).toBe(200)
    expect(response.success).toBe(true)
    expect(response.message).toBe('API Key authentication was successful')
  })
})
