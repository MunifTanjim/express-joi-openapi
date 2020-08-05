import Joi from '@hapi/joi'
import express from 'express'
import { initializeJoiOpenApi } from './index'

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
})
