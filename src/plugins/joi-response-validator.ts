import Joi, {
  Schema,
  SchemaLike,
  ValidationError,
  ValidationOptions,
} from '@hapi/joi'
import { Handler } from 'express'
import { HeaderObject, HeadersObject, ResponseObject } from 'openapi3-ts'
import { parseJoiSchema } from '../joi/parser'
import { ExpressOpenAPIPlugin } from './types'

export type ResponseSegment = 'body' | 'headers'

type JoiResponseSchemaMap = Map<
  string,
  { [segment in ResponseSegment]?: Schema } | undefined
>

type JoiResponseValidationSchema = {
  [statusCode: string]: {
    [segment in ResponseSegment]?: SchemaLike
  }
}

export type GetJoiResponseValidatorMiddleware = (
  joiResponseSchema: JoiResponseValidationSchema,
  joiValidationOptions?: ValidationOptions,
  options?: { segmentOrder?: ResponseSegment[] }
) => Handler

export class ResponseValidationError extends Error {
  segment: ResponseSegment
  validationError: ValidationError

  constructor(validationError: ValidationError, segment: ResponseSegment) {
    super(validationError.message)

    this.segment = segment
    this.validationError = validationError
  }
}

const defaultResponseSegmentOrder: ResponseSegment[] = ['body', 'headers']

export const JoiResponseValidator: ExpressOpenAPIPlugin<
  JoiResponseSchemaMap,
  GetJoiResponseValidatorMiddleware
> = {
  name: 'joi-response-validation',

  getMiddleware: (
    internals,
    joiResponseSchema,
    joiValidationOptions = {},
    { segmentOrder = defaultResponseSegmentOrder } = {}
  ): Handler => {
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

    internals.stash.store(validationMiddleware, schemaMap)

    return validationMiddleware
  },

  processRoute: (specification, schemaMap, { path, method }): void => {
    for (const [key, schemaBySegment] of schemaMap.entries()) {
      if (!schemaBySegment) {
        continue
      }

      const httpStatusCode = key as number | 'default'

      if (schemaBySegment.body) {
        const result = parseJoiSchema(schemaBySegment.body)

        const responseObject: ResponseObject = {
          ...specification.getPathItemOperationResponse(
            path,
            method,
            httpStatusCode
          ),
          description: '',
          content: {
            'application/json': {
              schema: result.schema,
            },
          },
        }

        specification.setPathItemOperationResponse(
          path,
          method,
          httpStatusCode,
          responseObject
        )
      }

      if (schemaBySegment.headers) {
        const result = parseJoiSchema(schemaBySegment.headers)

        const { properties, required = [] } = result.schema

        const headersObject: HeadersObject = {}

        if (properties) {
          for (const [name, schema] of Object.entries(properties)) {
            const headerObject: HeaderObject = {
              schema: schema,
              required: required.includes(name),
            }

            if ('deprecated' in schema) {
              headerObject.deprecated = schema.deprecated
            }

            headersObject[name] = headerObject
          }
        }

        const responseObject: ResponseObject = {
          ...specification.getPathItemOperationResponse(
            path,
            method,
            httpStatusCode
          ),
          description: '',
          headers: headersObject,
        }

        specification.setPathItemOperationResponse(
          path,
          method,
          httpStatusCode,
          responseObject
        )
      }
    }
  },
}
