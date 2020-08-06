import Joi from '@hapi/joi'
import express from 'express'
import { initializeJoiOpenApi } from './index'
import request from 'supertest'

describe('initializeJoiOpenApi', () => {
  test('basic request schema generation', () => {
    const {
      getRequestValidationMiddleware,
      getOpenApiSpecification,
    } = initializeJoiOpenApi({ Joi })

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

    const specification = getOpenApiSpecification(app)

    expect(specification.paths).toMatchSnapshot()
  })

  test('basic response schema generation', async () => {
    const {
      getResponseValidationMiddleware,
      getOpenApiSpecification,
    } = initializeJoiOpenApi({ Joi })

    const app = express()

    app.post(
      '/ping',
      getResponseValidationMiddleware({
        200: {
          body: Joi.object({
            pong: Joi.number().integer().required(),
          }),
        },
      }),
      (_req, res) => {
        res.status(200).json({ pong: 42 })
      }
    )

    const specification = getOpenApiSpecification(app)

    expect(specification.paths).toMatchSnapshot()

    const response = await request(app).post('/ping')

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ pong: 42 })
  })
})
