import Joi from '@hapi/joi'
import express, { Application, Handler } from 'express'
import request from 'supertest'
import { ExpressOpenAPI } from '../index'
import {
  GetJoiResponseValidatorMiddleware,
  JoiResponseValidator,
  ResponseValidationError,
} from './joi-response-validator'

describe('JoiResponseValidator', () => {
  let validate: GetJoiResponseValidatorMiddleware
  let app: Application

  const errorHandler = jest.fn((err, _req, res, _next) => {
    if (err instanceof ResponseValidationError) {
      res.status(500).json({
        error: {
          message: err.message,
          segment: err.segment,
          details: err.validationError.details.map(
            ({ message, path, type }) => ({ message, path, type })
          ),
        },
      })

      return
    }

    res.status(500).json({
      error: {
        message: 'Server Error',
      },
    })
  })

  beforeEach(() => {
    const expressOpenApi = new ExpressOpenAPI()

    app = express()
    app.use(express.json())

    validate = expressOpenApi.registerPlugin(JoiResponseValidator)
  })

  test('validates headers', async () => {
    app.post(
      '/ping',
      validate({
        200: {
          headers: Joi.object({
            'x-count': Joi.number().integer().required(),
          }).unknown(),
        },
        default: {},
      }),
      (req, res) => {
        const pass = Number(req.query.pass)

        if (pass) {
          res.set('x-count', '42')
        }

        res.status(200).json({
          pong: 42,
        })
      }
    )

    app.use(errorHandler)

    const responseFail = await request(app).post('/ping?pass=0')

    expect(responseFail.status).toBe(500)
    expect(responseFail.body).toMatchSnapshot()

    const responsePass = await request(app).post('/ping?pass=1')

    expect(responsePass.status).toBe(200)
  })

  test('validates body', async () => {
    app.post(
      '/ping',
      validate({
        200: {
          body: Joi.object({
            pong: Joi.number().integer().required(),
          }).unknown(),
        },
        default: {},
      }),
      (req, res) => {
        const pass = Number(req.query.pass)

        res.status(200).json({
          pong: pass ? 42 : 'forty-two',
        })
      }
    )

    app.use(errorHandler)

    const responseFail = await request(app).post('/ping?pass=0')

    expect(responseFail.status).toBe(500)
    expect(responseFail.body).toMatchSnapshot()

    const responsePass = await request(app).post('/ping?pass=1')

    expect(responsePass.status).toBe(200)
  })
})
