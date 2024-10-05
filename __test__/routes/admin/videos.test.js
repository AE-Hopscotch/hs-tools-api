const request = require('supertest')
const { Videos, VideoChannels } = require('../../../custom/deta-wrapper')
const app = getPackage('/index.js')

const sampleVideo = {
  'date': '1970-01-01T00:00:00.000Z',
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
  '_id': 'sample'
}
const returnSampleVid = () => ({ ...sampleVideo, key: undefined, _id: sampleVideo.key })
const returnSampleCh = () => ({ ...sampleChannel, key: undefined, _id: sampleChannel.key })

describe('GET /admin/videos', () => {
  beforeEach(() => {
    this.headers = { 'api-token': process.env.ADMIN_API_KEY }
    jest.spyOn(Videos, 'find').mockReturnValue({ lean: () => [returnSampleVid()] })
  })
  test('should return a list with status 200', async () => {
    const { status, body: response } = await request(app)
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
    jest.spyOn(Videos, 'findById').mockReturnValue({ lean: () => null })
    const { status, body: response } = await request(app)
      .delete('/admin/videos/update/test')
      .set(this.headers)
      .send()

    expect(status).toBe(404)
    expect(response.success).toBe(false)
    expect(response.error).toBe('Video does not exist')
  })
  test('should return deleted_key with status 200 if video exists', async () => {
    jest.spyOn(Videos, 'findById').mockReturnValue({ lean: returnSampleVid })
    jest.spyOn(Videos, 'findByIdAndDelete').mockReturnValue(null)
    const { status, body: response } = await request(app)
      .delete('/admin/videos/update/test')
      .set(this.headers)

    expect(status).toBe(200)
    expect(response.success).toBe(true)
    expect(response.deleted_key).toBe('test')
  })
})

describe('GET /admin/videos/bulkupdate', () => {
  beforeEach(() => {
    this.headers = { 'api-token': process.env.ADMIN_API_KEY }
  })
  test('returns item with status 400 if no updates are provided', async () => {
    const { status, body: response } = await request(app)
      .post('/admin/videos/bulkupdate')
      .set(this.headers)

    expect(status).toBe(400)
    expect(response.success).toEqual(false)
    expect(response.error).toEqual('There are no videos or channels provided')
  })
  test('returns status 400 if all items are invalid', async () => {
    jest.spyOn(Videos, 'findByIdAndUpdate').mockReturnValue({ lean: () => null })
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
    jest.spyOn(Videos, 'findByIdAndUpdate').mockReturnValue({ lean: returnSampleVid })
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
    expect(Videos.findByIdAndUpdate).toHaveBeenCalledTimes(1)
    expect(response.errors.length).toBe(2)
    expect(response.updated_channels).toEqual([])
    expect(response.updated_videos).toEqual([Object.assign(sampleVideo, {
      date: '1970-01-01T00:00:00.000Z'
    })])
  })
  test('returns status 200 if all items are valid', async () => {
    jest.spyOn(Videos, 'findByIdAndUpdate').mockReturnValue({ lean: returnSampleVid })
    jest.spyOn(VideoChannels, 'findByIdAndUpdate').mockReturnValue({ lean: returnSampleCh })
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
    expect(Videos.findByIdAndUpdate).toHaveBeenCalledTimes(2)
    expect(response.updated_channels).toEqual([sampleChannel])
    expect(response.updated_videos).toEqual([
      Object.assign(sampleVideo, {
        date: '1970-01-01T00:00:00.000Z'
      })
    ])
  })
})
