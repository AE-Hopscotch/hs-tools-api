const nodemailer = require('nodemailer')
const { google } = require('googleapis')
const OAuth2 = google.auth.OAuth2

const client = {
  id: process.env.NODEMAILER_CLIENTID,
  secret: process.env.NODEMAILER_CLIENTSECRET,
  refresh_token: process.env.NODEMAILER_REFRESHTOKEN
}
const OAuth2Client = new OAuth2(client.id, client.secret)
OAuth2Client.setCredentials({ refresh_token: client.refresh_token })

function sendMail (recipient, subject, html) {
  const accessToken = OAuth2Client.getAccessToken()
  const transport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.NODEMAILER_USER,
      clientId: client.id,
      clientSecret: client.secret,
      refreshToken: client.refresh_token,
      accessToken: accessToken
    }
  })
  const mailOptions = {
    from: `Awesome_E <${process.env.NODEMAILER_USER}>`,
    to: recipient,
    subject: subject,
    html: html
  }
  return new Promise(function (resolve, reject) {
    transport.sendMail(mailOptions, (error, result) => {
      if (error) {
        console.log('Error: ', error)
        reject(error)
      } else {
        console.log('Success: ', result)
        resolve(result)
      }
      transport.close()
    })
  })
}

module.exports = { sendMail }
