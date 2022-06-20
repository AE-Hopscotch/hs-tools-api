const request = require('supertest')
function mockDeta (mockedValue) {
  jest.resetModules()
  global.jestFn = jest.fn().mockResolvedValue(mockedValue)
  jest.doMock('deta', global.deta)
  return getPackage('/index.js')
}

const sampleVideo = {
  'date': 'January 1, 1970',
  'group': 'aeMD',
  'icon': 'fa-wrench',
  'key': 'test',
  'name': 'Test Video',
  'public': true,
  'url': 'https://file.io/test.mp4'
}
const sampleInvalidVideo = {
  'date': 'January 1, 1970',
  'group': 'aeMD',
  'public': true,
  'url': 'https://file.io/test.mp4'
}
const sampleChannel = {
  'auth_code': 'SamplePassword',
  'key': 'sample',
  'requires_auth': true,
  'title': 'SampleName'
}
const sampleInvalidChannel = {
  'auth_code': 'SamplePassword',
  'key': 'sample'
}

describe('GET /admin/videos', () => {
  beforeEach(() => {
    this.headers = { 'api-token': process.env.ADMIN_API_KEY }
    this.app = mockDeta({
      items: [sampleVideo],
      count: 1
    })
  })
  test('should return a list with status 200', async () => {
    const { status, body: response } = await request(this.app)
      .get('/admin/videos')
      .set(this.headers)

    expect(status).toBe(200)
    expect(response.items).toEqual([sampleVideo])
    expect(response.count).toBe(1)
    expect(response.success).toBe(true)
  })
})

describe('DELETE /admin/videos/update/:key', () => {
  beforeEach(() => {
    this.headers = {
      'api-token': process.env.ADMIN_API_KEY,
      'Content-Type': 'application/json'
    }
  })
  test('should return status 404 when video does not exist', async () => {
    const app = mockDeta(null)
    const { status, body: response } = await request(app)
      .delete('/admin/videos/update/test')
      .set(this.headers)
      .send()

    expect(status).toBe(404)
    expect(response.success).toBe(false)
    expect(response.error).toBe('Video does not exist')
  })
  test('should return deleted_key with status 200 if video exists', async () => {
    const app = mockDeta(sampleVideo)
    const { status, body: response } = await request(app)
      .delete('/admin/videos/update/test')
      .set(this.headers)

    expect(status).toBe(200)
    expect(global.jestFn).toBeCalled()
    expect(response.success).toBe(true)
    expect(response.deleted_key).toBe('test')
  })
})

describe('GET /admin/videos/bulkupdate', () => {
  beforeEach(() => {
    this.headers = { 'api-token': process.env.ADMIN_API_KEY }
    this.app = mockDeta(sampleVideo)
  })
  test('returns item with status 400 if no updates are provided', async () => {
    const { status, body: response } = await request(this.app)
      .post('/admin/videos/bulkupdate')
      .set(this.headers)

    expect(status).toBe(400)
    expect(response.success).toEqual(false)
    expect(response.error).toEqual('There are no videos or channels provided')
  })
  test('returns status 400 if all items are invalid', async () => {
    const app = mockDeta(null)
    const { status, body: response } = await request(app)
      .post('/admin/videos/bulkupdate')
      .set(this.headers)
      .send({
        videos: [sampleInvalidVideo, sampleInvalidVideo]
      })

    expect(status).toBe(400)
    expect(response.success).toBe(false)
    expect(response.errors.length).toBe(2)
    expect(response.updated_channels).toEqual([])
    expect(response.updated_videos).toEqual([])
  })

  test('returns status 200 if some items are valid', async () => {
    const app = mockDeta(null)
    const { status, body: response } = await request(app)
      .post('/admin/videos/bulkupdate')
      .set(this.headers)
      .send({
        videos: [sampleVideo, sampleInvalidVideo],
        channels: [sampleInvalidChannel]
      })

    expect(status).toBe(200)
    expect(response.success).toBe(true)
    // DB PUT should be called once
    expect(global.jestFn).toHaveBeenCalledTimes(1)
    expect(response.errors.length).toBe(2)
    expect(response.updated_channels).toEqual([])
    expect(response.updated_videos).toEqual([Object.assign(sampleVideo, {
      date: '1970-01-01T08:00:00.000Z'
    })])
  })
  test('returns status 200 if all items are valid', async () => {
    const app = mockDeta(null)
    const { status, body: response } = await request(app)
      .post('/admin/videos/bulkupdate')
      .set(this.headers)
      .send({
        videos: [sampleVideo],
        channels: [sampleChannel]
      })

    expect(status).toBe(200)
    expect(response.success).toBe(true)
    // DB PUT should be called twice
    expect(global.jestFn).toHaveBeenCalledTimes(2)
    expect(response.errors.length).toBe(0)
    expect(response.updated_channels).toEqual([sampleChannel])
    expect(response.updated_videos).toEqual([
      Object.assign(sampleVideo, {
        date: '1970-01-01T08:00:00.000Z'
      })
    ])
  })
})
