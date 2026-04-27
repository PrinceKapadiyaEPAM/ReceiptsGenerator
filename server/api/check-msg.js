const fs = require('fs')

function getEnvValue(envText, key) {
  const match = envText.match(new RegExp(`^${key}=(.*)$`, 'm'))
  if (!match) return ''
  return match[1].trim().replace(/^['\"]|['\"]$/g, '')
}

async function main() {
  const envText = fs.readFileSync('.env', 'utf8')
  const accountSid = getEnvValue(envText, 'TWILIO_ACCOUNT_SID')
  const authToken = getEnvValue(envText, 'TWILIO_AUTH_TOKEN')
  const messageSid = process.argv[2]

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages/${messageSid}.json`
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64')

  const response = await fetch(url, { headers: { Authorization: `Basic ${auth}` } })
  const j = await response.json()
  console.log(JSON.stringify({
    status: j.status,
    errorCode: j.error_code,
    errorMessage: j.error_message,
    dateSent: j.date_sent,
    dateUpdated: j.date_updated,
  }, null, 2))
}

main().catch(e => { console.error(e.message); process.exit(1) })
