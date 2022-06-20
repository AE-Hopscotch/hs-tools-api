
const { checkAdminAPIKey, adminAPIKeyMiddleware } = getPackage('/custom/auth.js')

describe('checkAdminAPIKey behaves as expected', () => {
  test('returns true when Admin API Key is passed through body', () => {
    const reqBody = { api_token: process.env.ADMIN_API_KEY }
    const result = checkAdminAPIKey({ body: reqBody })
    expect(result).toBe(true)
  })
  test('returns true when Admin API Key is passed through headers', () => {
    const headers = { 'api-token': process.env.ADMIN_API_KEY }
    const result = checkAdminAPIKey({ headers })
    expect(result).toBe(true)
  })
  test('returns true when body token is incorrect', () => {
    const reqBody = { api_token: 'foo' }
    const result = checkAdminAPIKey({ body: reqBody })
    expect(result).toBe(false)
  })
  test('returns false when header token is incorrect', () => {
    const headers = { 'api-token': 'foo' }
    const result = checkAdminAPIKey({ headers })
    expect(result).toBe(false)
  })
  test('returns false when token is not present', () => {
    const result = checkAdminAPIKey({ headers: {} })
    expect(result).toBe(false)
  })
})

describe('adminAPIKeyMiddleware behaves as expected', () => {
  beforeEach(() => {
    this.response = class response {
      static status (code) {
        this.status = code
        return this
      }
    }
  })
  test('next is called when correct token is passed in request', () => {
    const reqBody = { api_token: process.env.ADMIN_API_KEY }
    const next = jest.fn()
    adminAPIKeyMiddleware({ body: reqBody }, null, next)
    expect(next).toBeCalled()
  })
  test('status is 400 and response is sent when token is wrong', () => {
    const headers = { 'api-token': 'foo' }
    const { response } = this
    response.send = jest.fn()
    adminAPIKeyMiddleware({ headers }, response)
    expect(response.status).toBe(400)
    expect(response.send).toBeCalled()
  })
})
