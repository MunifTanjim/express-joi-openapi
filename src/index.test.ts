import Joi from '@hapi/joi'
import express from 'express'
import request from 'supertest'
import { ExpressOpenAPI } from './index'
import { JoiRequestValidator, JoiResponseValidator } from './plugins'

describe('ExpressOpenAPI', () => {
  describe('constructor', () => {
    test('can create instance without arguments', () => {
      expect(new ExpressOpenAPI()).toBeInstanceOf(ExpressOpenAPI)
    })

    test('can create instance with arguments', () => {
      expect(new ExpressOpenAPI({ useStringStashKey: true })).toBeInstanceOf(
        ExpressOpenAPI
      )
    })
  })

  test('basic request schema generation', () => {
    const expressOpenApi = new ExpressOpenAPI()

    const getRequestValidationMiddleware = expressOpenApi.registerPlugin(
      JoiRequestValidator
    )

    const app = express()

    app.post(
      '/ping',
      getRequestValidationMiddleware({
        query: {
          count: Joi.number()
            .integer()
            .required()
            .label('pong count')
            .description('number of times ping will pong'),
        },
        body: {
          type: Joi.string()
            .valid('plastic', 'rubber', 'wood')
            .default('rubber'),
        },
      })
    )

    const specification = expressOpenApi.populateSpecification(app)

    expect(specification.paths).toMatchSnapshot()
  })

  test('basic response schema generation', async () => {
    const expressOpenApi = new ExpressOpenAPI()

    const getResponseValidationMiddleware = expressOpenApi.registerPlugin(
      JoiResponseValidator
    )

    const app = express()

    app.post(
      '/ping',
      getResponseValidationMiddleware({
        200: {
          headers: Joi.object({
            'x-count': Joi.number().integer().required(),
          }).unknown(),
          body: Joi.object({
            pong: Joi.number().integer().required(),
          }),
        },
      }),
      (_req, res) => {
        res.set('x-count', '42')
        res.status(200).json({ pong: 42 })
      }
    )

    const specification = expressOpenApi.populateSpecification(app)

    expect(specification.paths).toMatchSnapshot()

    const response = await request(app).post('/ping')

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ pong: 42 })
  })
})
