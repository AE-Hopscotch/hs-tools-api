const request = require('supertest')
const app = getPackage('/index.js')

describe('Base routes are handled correctly', () => {
  test('GET \'/\' should return with status 200', async () => {
    const { status } = await request(app).get('/')
    expect(status).toBe(200)
  })
  test('404 page should return with status 404', async () => {
    const { status } = await request(app).get('/404-nonexistent-endpoint')
    expect(status).toBe(404)
  })
})
