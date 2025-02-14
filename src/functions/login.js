'use strict'
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const qs = require('querystring')

const getSecret = require('../../helpers/get-secret')
const db = require('../../helpers/db')
const logger = require('../../helpers/logger')
const { render, response } = require('simple-sls-ssr')
const csrf = require('../../helpers/csrf')

const log = logger('SEQUENCE_LOGIN_USER')

/**
 * @description Currently only logs in families. Admin NOT supported
 * @param {*} event
 * @param {*} context
 */
module.exports.login = async (event, context) => {
  const body = qs.parse(event.body)
  log.info('STEP_REQUEST_BODY_PARSED')

  const docSort = `family:${body.email}`
  log.add('userid', docSort)
  log.add('chapter', body.chapter)
  log.info('STEP_LOGIN_PARSED_EVENT_BODY')

  // TODO check CSRF
  const { error: csrfError } = await csrf.verify(body.csrf_token)
  if (csrfError) {
    log.error('ERROR_VERIFYING_CSRF_TOKEN', { error: csrfError })
    return await render('error', {
      status_code: 403,
      status_message: 'Forbidden',
      details: 'Something went wrong.'
    })
  }

  log.info('STEP_CSRF_TOKEN_VERIFIED')

  const { family: familyData, error: dbError } = await db.getFamily(body.chapter, docSort)
  if (dbError) {
    log.error('ERROR_LOGIN_RETRIEVING_USER_DATA', { error: dbError })
    return await render('error', {
      status_code: 403,
      status_message: 'Forbidden',
      details: 'Something went wrong.'
    })
  }

  log.info('STEP_LOGIN_RETRIEVED_USER_DATA')

  const {
    password: hashedPassword,
    email_verified: emailVerified
  } = familyData

  try {
    const isMatch = bcrypt.compareSync(body.password, hashedPassword)
    log.info('STEP_LOGIN_COMPARE_RESULT', `Match: ${isMatch}`)

    if (!isMatch) {
      log.info('ERROR_LOGIN_COMPARE_RESULT', `Match: ${isMatch}`)
      return await render('error', {
        status_code: 403,
        status_message: 'Forbidden',
        details: 'Something went wrong.'
      })
    }
  } catch (error) {
    log.error('ERROR_LOGIN_VALIDATION', { error })
    return await render('error', {
      status_code: 403,
      status_message: 'Forbidden',
      details: 'Something went wrong.'
    })
  }

  log.info('STEP_PASSWORD_VALID')

  const { key: jwtSecretKey, error: getSecretError } = await getSecret('/NouriServerless/jwtSecretKey/dev')

  if (getSecretError) {
    log.error('ERROR_LOGIN_SECRET_KEY_RETRIEVAL', { error: getSecretError })

    return await render('error', {
      status_code: 400,
      status_message: 'Bad Request',
      details: 'Something went wrong.'
    })
  }

  log.info('STEP_LOGIN_SECRET_KEY_RETRIEVED')

  let token
  try {
    const payload = { email: body.email, chapter: body.chapter, emailVerified }
    token = jwt.sign(payload, jwtSecretKey, { expiresIn: '12h', algorithm: 'HS512' })
  } catch (error) {
    log.error('ERROR_LOGIN_JWT_SIGNING', { error })

    return await render('error', {
      status_code: 400,
      status_message: 'Bad Request',
      details: 'Something went wrong.'
    })
  }

  // Create a session in the database
  const { error: createSessionError } = await db.addSession(body.chapter, `family:${body.email}`, token)
  if (createSessionError) {
    log.error('ERROR_CREATING_SESSION', { error: createSessionError })
    return await render('error', {
      status_code: 400,
      status_message: 'Bad Request',
      details: 'Something went wrong.'
    })
  }

  log.info('SUCCESS_LOGIN_USER_AUTHENTICATED')
  return await response.redirect('family', {
    'Set-Cookie': `nouri=${token}`,
    'Access-Control-Allow-Credentials': true
  })
}
