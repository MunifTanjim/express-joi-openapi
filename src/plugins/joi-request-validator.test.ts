import express, { Application, ErrorRequestHandler, Handler } from 'express'
import { ExpressOpenAPI } from '../index'
import {
  getJoiRequestValidatorPlugin,
  RequestValidationError,
  GetJoiRequestValidatorMiddleware,
} from './joi-request-validator'
import request from 'supertest'
import Joi from '@hapi/joi'

describe('getJoiRequestValidatorPlugin', () => {
  test('returns plugin', () => {
    const plugin = getJoiRequestValidatorPlugin()
    expect(plugin.name).toMatchInlineSnapshot(`"joi-request-validator"`)
    expect(plugin.getMiddleware).toBeDefined()
    expect(plugin.processRoute).toBeDefined()
  })

  describe('joiRequestValidatorPlugin', () => {
    let validate: GetJoiRequestValidatorMiddleware
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

    describe('segment validation', () => {
      beforeEach(() => {
        const expressOpenApi = new ExpressOpenAPI()

        app = express()
        app.use(express.json())

        const joiRequestValidatorPlugin = getJoiRequestValidatorPlugin()

        validate = expressOpenApi.registerPlugin(joiRequestValidatorPlugin)
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

        const invalidResponse2 = await request(app).post(
          '/ping?count=forty-two'
        )
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
    })

    describe('value coercion', () => {
      const mockFn = jest.fn()

      beforeEach(() => {
        const expressOpenApi = new ExpressOpenAPI()

        app = express()
        app.use(express.json())

        const joiRequestValidatorPlugin = getJoiRequestValidatorPlugin()

        validate = expressOpenApi.registerPlugin(joiRequestValidatorPlugin)

        mockFn.mockReset()
      })

      test('coerces w/o option debug/warnings', async () => {
        app.post(
          '/ping',
          validate({
            body: Joi.object({
              count: Joi.number().integer().required(),
            }),
          }),
          (req, _res, next) => {
            mockFn(req.body)
            next()
          },
          handler
        )

        app.use(errorHandler)

        const response = await request(app).post('/ping').send({ count: '42' })
        expect(response.status).toBe(200)
        expect(mockFn.mock.calls).toMatchInlineSnapshot(`
          Array [
            Array [
              Object {
                "count": 42,
              },
            ],
          ]
        `)
      })

      test('coerces w/ option debug=true', async () => {
        app.post(
          '/ping',
          validate(
            {
              body: Joi.object({
                count: Joi.number().integer().required(),
              }),
            },
            { debug: true }
          ),
          (req, _res, next) => {
            mockFn(req.body)
            next()
          },
          handler
        )

        app.use(errorHandler)

        const response = await request(app).post('/ping').send({ count: '42' })
        expect(response.status).toBe(200)
        expect(mockFn.mock.calls).toMatchInlineSnapshot(`
          Array [
            Array [
              Object {
                "count": 42,
              },
            ],
          ]
        `)
      })

      test('coerces w/ option warnings=true', async () => {
        app.post(
          '/ping',
          validate(
            {
              body: Joi.object({
                count: Joi.number().integer().required(),
              }),
            },
            { warnings: true }
          ),
          (req, _res, next) => {
            mockFn(req.body)
            next()
          },
          handler
        )

        app.use(errorHandler)

        const response = await request(app).post('/ping').send({ count: '42' })
        expect(response.status).toBe(200)
        expect(mockFn.mock.calls).toMatchInlineSnapshot(`
          Array [
            Array [
              Object {
                "count": 42,
              },
            ],
          ]
        `)
      })

      test('does not coerce w/ option convert=false', async () => {
        app.post(
          '/ping',
          validate(
            {
              body: Joi.object({
                count: Joi.number().integer().required(),
              }),
            },
            { convert: false }
          ),
          (req, _res, next) => {
            mockFn(req.body)
            next()
          },
          handler
        )

        app.use(errorHandler)

        const response = await request(app).post('/ping').send({ count: '42' })
        expect(response.status).toBe(400)
        expect(response.body).toMatchSnapshot()
        expect(mockFn.mock.calls).toMatchInlineSnapshot(`Array []`)
      })
    })

    describe('options: segmentOrder', () => {
      test('(default) validates query before body', async () => {
        const expressOpenApi = new ExpressOpenAPI()

        app = express()
        app.use(express.json())

        const joiRequestValidatorPlugin = getJoiRequestValidatorPlugin({})

        validate = expressOpenApi.registerPlugin(joiRequestValidatorPlugin)

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
        const expressOpenApi = new ExpressOpenAPI()

        app = express()
        app.use(express.json())

        const joiRequestValidatorPlugin = getJoiRequestValidatorPlugin({
          segmentOrder: ['body', 'query'],
        })

        validate = expressOpenApi.registerPlugin(joiRequestValidatorPlugin)

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
})
