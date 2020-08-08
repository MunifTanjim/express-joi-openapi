import Joi from '@hapi/joi'
import express from 'express'
import type { Application, ErrorRequestHandler, Handler } from 'express'
import request from 'supertest'
import { initializeJoiOpenApi, RequestValidationError } from './index'
import type { GetRequestValidationMiddleware } from './types'

describe('initializeJoiOpenApi', () => {
  test('basic request schema generation', () => {
    const {
      getRequestValidationMiddleware,
      prepareOpenApiSpecification,
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

    const specification = prepareOpenApiSpecification(app)

    expect(specification.paths).toMatchSnapshot()
  })

  test('basic response schema generation', async () => {
    const {
      getResponseValidationMiddleware,
      prepareOpenApiSpecification,
    } = initializeJoiOpenApi({ Joi })

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

    const specification = prepareOpenApiSpecification(app)

    expect(specification.paths).toMatchSnapshot()

    const response = await request(app).post('/ping')

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ pong: 42 })
  })
})

describe('getRequestValidationMiddleware', () => {
  let validate: GetRequestValidationMiddleware
  let app: Application

  const handler: Handler = (_req, res) => {
    res.status(200).json({
      pong: 42,
    })
  }

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof RequestValidationError) {
      res.status(400).json({
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
  }

  beforeEach(() => {
    const { getRequestValidationMiddleware } = initializeJoiOpenApi({ Joi })

    app = express()
    app.use(express.json())

    validate = getRequestValidationMiddleware
  })

  test('validates headers', async () => {
    app.post(
      '/ping',
      validate({
        headers: Joi.object({
          authorization: Joi.string()
            .pattern(/^Bearer .+$/)
            .required(),
        }).unknown(),
      }),
      handler
    )

    app.use(errorHandler)

    const invalidResponse1 = await request(app)
      .post('/ping')
      .set('authorization', `JWT 42`)
    expect(invalidResponse1.status).toBe(400)
    expect(invalidResponse1.body).toMatchSnapshot()

    const validResponse1 = await request(app)
      .post('/ping')
      .set('authorization', `Bearer 42`)
    expect(validResponse1.status).toBe(200)
  })

  test('validates params', async () => {
    app.post(
      '/ping/:id',
      validate({
        params: Joi.object({
          id: Joi.number().integer().required(),
        }),
      }),
      handler
    )

    app.use(errorHandler)

    const invalidResponse1 = await request(app).post('/ping/forty-two')
    expect(invalidResponse1.status).toBe(400)
    expect(invalidResponse1.body).toMatchSnapshot()

    const validResponse1 = await request(app).post('/ping/42')
    expect(validResponse1.status).toBe(200)
  })

  test('validates query', async () => {
    app.post(
      '/ping',
      validate({
        query: Joi.object({
          count: Joi.number().integer().required(),
        }),
      }),
      handler
    )

    app.use(errorHandler)

    const invalidResponse1 = await request(app).post('/ping')
    expect(invalidResponse1.status).toBe(400)
    expect(invalidResponse1.body).toMatchSnapshot()

    const invalidResponse2 = await request(app).post('/ping?count=forty-two')
    expect(invalidResponse2.status).toBe(400)
    expect(invalidResponse2.body).toMatchSnapshot()

    const validResponse1 = await request(app).post('/ping?count=42')
    expect(validResponse1.status).toBe(200)
  })

  test('validates body', async () => {
    app.post(
      '/ping',
      validate({
        body: {
          type: Joi.string()
            .valid('plastic', 'rubber', 'wood')
            .default('rubber'),
        },
      }),
      handler
    )

    app.use(errorHandler)

    const invalidResponse1 = await request(app)
      .post('/ping')
      .send({ type: 'paper' })
    expect(invalidResponse1.status).toBe(400)
    expect(invalidResponse1.body).toMatchSnapshot()

    const validResponse1 = await request(app).post('/ping')
    expect(validResponse1.status).toBe(200)

    const validResponse2 = await request(app)
      .post('/ping')
      .send({ type: 'wood' })
    expect(validResponse2.status).toBe(200)
  })

  describe('segmentOrder', () => {
    test('(default) validates query before body', async () => {
      app.post(
        '/ping',
        validate({
          body: {
            type: Joi.string()
              .valid('plastic', 'rubber', 'wood')
              .default('rubber'),
          },
          query: Joi.object({
            count: Joi.number().integer().required(),
          }),
        }),
        handler
      )

      app.use(errorHandler)

      const invalidResponse1 = await request(app)
        .post('/ping')
        .send({ type: 'paper' })
      expect(invalidResponse1.status).toBe(400)
      expect(invalidResponse1.body).toMatchSnapshot()

      const invalidResponse2 = await request(app)
        .post('/ping?count=42')
        .send({ type: 'paper' })
      expect(invalidResponse2.status).toBe(400)
      expect(invalidResponse2.body).toMatchSnapshot()

      const validResponse1 = await request(app)
        .post('/ping?count=42')
        .send({ type: 'wood' })
      expect(validResponse1.status).toBe(200)
    })

    test('(custom) validates body before query', async () => {
      app.post(
        '/ping',
        validate(
          {
            body: {
              type: Joi.string()
                .valid('plastic', 'rubber', 'wood')
                .default('rubber'),
            },
            query: Joi.object({
              count: Joi.number().integer().required(),
            }),
          },
          {},
          { segmentOrder: ['body', 'query'] }
        ),
        handler
      )

      app.use(errorHandler)

      const invalidResponse1 = await request(app)
        .post('/ping')
        .send({ type: 'paper' })
      expect(invalidResponse1.status).toBe(400)
      expect(invalidResponse1.body).toMatchSnapshot()

      const invalidResponse2 = await request(app)
        .post('/ping')
        .send({ type: 'wood' })
      expect(invalidResponse2.status).toBe(400)
      expect(invalidResponse2.body).toMatchSnapshot()

      const validResponse1 = await request(app)
        .post('/ping?count=42')
        .send({ type: 'wood' })
      expect(validResponse1.status).toBe(200)
    })
  })
})
