import type {
  AsyncValidationOptions,
  Root,
  Schema,
  ValidationError,
  ValidationOptions,
  ValidationResult,
} from '@hapi/joi'
import type { Handler } from 'express'
import { RequestValidationError, ResponseValidationError } from './error'
import { OpenAPISpecification, processExpressRoutes } from './openapi'
import { requestSchemaStash, responseSchemaStash } from './stash'
import type {
  GetRequestValidationMiddleware,
  GetResponseValidationMiddleware,
  JoiResponseSchemaMap,
  PrepareOpenAPISpecification,
  RequestSegment,
  ResponseSegment,
} from './types'

export * from './error'
export { OpenAPISpecification } from './openapi'

const defaultRequestSegmentOrder: RequestSegment[] = [
  'headers',
  'params',
  'query',
  'cookies',
  'signedCookies',
  'body',
]

const defaultResponseSegmentOrder: ResponseSegment[] = ['body', 'headers']

export const initializeJoiOpenApi = ({
  Joi,
}: {
  Joi: Root
}): {
  getRequestValidationMiddleware: GetRequestValidationMiddleware
  getResponseValidationMiddleware: GetResponseValidationMiddleware
  prepareOpenApiSpecification: PrepareOpenAPISpecification
} => {
  const getRequestValidationMiddleware: GetRequestValidationMiddleware = (
    joiRequestSchema,
    joiValidationOptions = {},
    { segmentOrder = defaultRequestSegmentOrder } = {}
  ) => {
    const schemaMap = new Map<RequestSegment, Schema | undefined>()

    for (const segment of segmentOrder) {
      const schema = joiRequestSchema[segment]
      if (schema) {
        schemaMap.set(segment, Joi.compile(schema))
      }
    }

    const validationOptions: AsyncValidationOptions = {
      ...joiValidationOptions,
    }

    const requestValidationMiddleware: Handler = async (
      req,
      _res,
      next
    ): Promise<void> => {
      try {
        await segmentOrder.reduce((promise, segment) => {
          return promise.then(() => {
            const schema = schemaMap.get(segment)

            if (!schema) {
              return null
            }

            return schema
              .validateAsync(req[segment], validationOptions)
              .then(({ value }: ValidationResult) => {
                req[segment] = value
                return null
              })
              .catch((error: ValidationError) => {
                throw new RequestValidationError(error, segment)
              })
          })
        }, Promise.resolve(null))

        next()
      } catch (error) {
        next(error)
      }
    }

    requestSchemaStash.set(requestValidationMiddleware, schemaMap)

    return requestValidationMiddleware
  }

  const getResponseValidationMiddleware: GetResponseValidationMiddleware = (
    joiResponseSchema,
    joiValidationOptions = {},
    { segmentOrder = defaultResponseSegmentOrder } = {}
  ) => {
    const schemaMap: JoiResponseSchemaMap = new Map()

    for (const [code, schemaBySegment] of Object.entries(joiResponseSchema)) {
      schemaMap.set(
        code,
        Object.entries(schemaBySegment).reduce<
          { [key in ResponseSegment]?: Schema }
        >((bySegment, [segment, schema]) => {
          if (schema) {
            bySegment[segment as ResponseSegment] = Joi.compile(schema)
          }
          return bySegment
        }, {})
      )
    }

    const validationOptions: ValidationOptions = {
      ...joiValidationOptions,
    }

    const validationMiddleware: Handler = async (
      _req,
      res,
      next
    ): Promise<void> => {
      const originalSend = res.send

      res.send = function validateAndSendResponse(...args) {
        const body = args[0]

        const isJsonContent = /application\/json/.test(
          String(res.get('content-type'))
        )

        const value: { [key in ResponseSegment]: unknown } = {
          body: isJsonContent ? JSON.parse(body) : body,
          headers: res.getHeaders(),
        }

        const schemaBySegment = schemaMap.has(String(res.statusCode))
          ? schemaMap.get(String(res.statusCode))
          : schemaMap.get('default')

        if (!schemaBySegment) {
          throw new Error(
            `Validation Schema not found for Response(${res.statusCode})`
          )
        }

        for (const segment of segmentOrder) {
          const schema = schemaBySegment[segment]

          if (!schema) {
            continue
          }

          const validationResult = schema.validate(
            value[segment],
            validationOptions
          )

          if (validationResult.error) {
            throw new ResponseValidationError(validationResult.error, segment)
          }

          if (segment === 'body') {
            value[segment] = validationResult.value
          }
        }

        return originalSend.apply(res, [
          isJsonContent ? JSON.stringify(value.body) : value.body,
        ])
      }

      next()
    }

    responseSchemaStash.set(validationMiddleware, schemaMap)

    return validationMiddleware
  }

  const prepareOpenApiSpecification: PrepareOpenAPISpecification = (
    app,
    basePath,
    specification = new OpenAPISpecification()
  ) => {
    processExpressRoutes(specification, app, basePath)

    return specification
  }

  return {
    getRequestValidationMiddleware,
    getResponseValidationMiddleware,
    prepareOpenApiSpecification,
  }
}
