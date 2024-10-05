const request = require('supertest')
const { VideoChannels } = require('../../../custom/deta-wrapper')
const app = getPackage('/index.js')

const sampleItem = {
  'auth_code': 'SamplePassword',
  'key': 'sample',
  'requires_auth': true,
  'title': 'SampleName'
}
const returnSample = () => ({ ...sampleItem, key: undefined, _id: sampleItem.key })

describe('GET /admin/video-channels', () => {
  beforeEach(() => {
    this.headers = { 'api-token': process.env.ADMIN_API_KEY }
    jest.spyOn(VideoChannels, 'find').mockReturnValue({ lean: () => [returnSample()] })
  })
  test('should return a list with status 200', async () => {
    const { status, body: response } = await request(app)
      .get('/admin/video-channels')
      .set(this.headers)

    expect(status).toBe(200)
    expect(response.items).toEqual([sampleItem])
    expect(response.count).toBe(1)
    expect(response.success).toBe(true)
  })
})

describe('PUT /admin/video-channels', () => {
  beforeEach(() => {
    this.headers = {
      'api-token': process.env.ADMIN_API_KEY,
      'Content-Type': 'application/json'
    }
    jest.spyOn(VideoChannels, 'findByIdAndUpdate').mockReturnValue({ lean: () => sampleItem })
  })
  test('should return status 400 on empty request body', async () => {
    const { status, body: response } = await request(app)
      .put('/admin/video-channels')
      .set(this.headers)
      .send()

    expect(status).toBe(400)
    expect(response.success).toBe(false)
    expect(response.error).toBe('No entry was provided')
    expect(response.details).not.toBeDefined()
  })
  test('should return error details when missing parameters', async () => {
    const { status, body: response } = await request(app)
      .put('/admin/video-channels')
      .set(this.headers)
      .send({ data: { title: 'TEST' } })

    expect(status).toBe(400)
    expect(response.success).toBe(false)
    expect(response.error).toBe('Invalid or missing parameters')
    expect(response.details).toBeDefined()
  })
  test('should return 200 and call DB put on valid request', async () => {
    const { status, body: response } = await request(app)
      .put('/admin/video-channels')
      .set(this.headers)
      .send({
        data: sampleItem
      })

    expect(status).toBe(200)
    expect(VideoChannels.findByIdAndUpdate).toBeCalled()
    expect(response.success).toBe(true)
    expect(response.data).toEqual(sampleItem)
  })
})

describe('GET /admin/video-channels/:key', () => {
  beforeEach(() => {
    this.headers = { 'api-token': process.env.ADMIN_API_KEY }
  })
  test('returns item with status 200 if it exists', async () => {
    jest.spyOn(VideoChannels, 'findById').mockReturnValue({ lean: () => sampleItem })
    const { status, body: response } = await request(app)
      .get('/admin/video-channels/sample')
      .set(this.headers)

    expect(status).toBe(200)
    expect(response).toEqual(sampleItem)
  })
  test('returns error 404 if it does not exist', async () => {
    jest.spyOn(VideoChannels, 'findById').mockReturnValue({ lean: () => null })
    const { status, body: response } = await request(app)
      .get('/admin/video-channels/sample')
      .set(this.headers)

    expect(status).toBe(404)
    expect(response).toEqual({
      success: false,
      error: 'Not found'
    })
  })
})

describe('DELETE /admin/video-channels/:key', () => {
  beforeEach(() => {
    this.headers = { 'api-token': process.env.ADMIN_API_KEY }
  })
  test('returns with status 404 if the item does not exist', async () => {
    jest.spyOn(VideoChannels, 'findById').mockReturnValue({ lean: () => null })
    jest.spyOn(VideoChannels, 'findByIdAndDelete').mockReturnValue({ lean: () => null })
    const { status, body: response } = await request(app)
      .delete('/admin/video-channels/sample')
      .set(this.headers)

    expect(status).toBe(404)
    expect(response).toEqual({
      success: false,
      error: 'Video channel does not exist'
    })
  })
  test('returns with status 404 if the item does not exist', async () => {
    jest.spyOn(VideoChannels, 'findById').mockReturnValue({ lean: () => null })
    jest.spyOn(VideoChannels, 'findByIdAndDelete').mockReturnValue({ lean: () => null })
    const { status, body: response } = await request(app)
      .delete('/admin/video-channels/sample')
      .set(this.headers)

    expect(status).toBe(404)
    expect(response).toEqual({
      success: false,
      error: 'Video channel does not exist'
    })
  })
})
