import Joi, {
  AsyncValidationOptions,
  Schema,
  SchemaLike,
  ValidationError,
  ValidationResult,
} from '@hapi/joi'
import { Handler } from 'express'
import {
  ParameterLocation,
  ParameterObject,
  RequestBodyObject,
} from 'openapi3-ts'
import { parseJoiSchema } from '../joi/parser'
import { ExpressOpenAPIPlugin } from './types'

export type RequestSegment =
  | 'body'
  | 'cookies'
  | 'headers'
  | 'params'
  | 'query'
  | 'signedCookies'

type JoiRequestSchemaMap = Map<RequestSegment, Schema | undefined>

type JoiRequestValidationSchema = { [segment in RequestSegment]?: SchemaLike }

export type GetJoiRequestValidatorMiddleware = (
  joiRequestSchema: JoiRequestValidationSchema,
  joiValidationOptions?: AsyncValidationOptions
) => Handler

type JoiRequestValidatorPlugin = ExpressOpenAPIPlugin<
  JoiRequestSchemaMap,
  GetJoiRequestValidatorMiddleware
>

export class RequestValidationError extends Error {
  segment: RequestSegment
  validationError: ValidationError

  constructor(validationError: ValidationError, segment: RequestSegment) {
    super(validationError.message)

    this.segment = segment
    this.validationError = validationError
  }
}

const parameterLocationBySegment: {
  [key in Exclude<RequestSegment, 'body'>]: ParameterLocation
} = {
  cookies: 'cookie',
  signedCookies: 'cookie',
  headers: 'header',
  params: 'path',
  query: 'query',
}

const defaultRequestSegmentOrder: RequestSegment[] = [
  'headers',
  'params',
  'query',
  'cookies',
  'signedCookies',
  'body',
]

export const getJoiRequestValidatorPlugin = ({
  segmentOrder = defaultRequestSegmentOrder,
}: { segmentOrder?: RequestSegment[] } = {}): JoiRequestValidatorPlugin => {
  const joiRequestValidatorPlugin: JoiRequestValidatorPlugin = {
    name: 'joi-request-validator',

    getMiddleware: (
      internals,
      joiRequestSchema,
      joiValidationOptions = {}
    ): Handler => {
      const schemaMap: JoiRequestSchemaMap = new Map()

      for (const segment of segmentOrder) {
        const schema = joiRequestSchema[segment]
        if (schema) {
          schemaMap.set(segment, Joi.compile(schema))
        }
      }

      const validationOptions: AsyncValidationOptions = {
        ...joiValidationOptions,
      }

      const extendedValidationResult =
        validationOptions.debug || validationOptions.warnings

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
                .then((result: ValidationResult) => {
                  if (extendedValidationResult) {
                    req[segment] = result.value
                  } else {
                    req[segment] = result
                  }

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

      internals.stash.store(requestValidationMiddleware, schemaMap)

      return requestValidationMiddleware
    },

    processRoute: (specification, schemaMap, { path, method }): void => {
      for (const [segment, schema] of schemaMap.entries()) {
        if (!schema) {
          continue
        }

        if (segment === 'body') {
          const result = parseJoiSchema(schema)

          const requestBody: RequestBodyObject = {
            content: {
              'application/json': {
                schema: result.schema,
              },
            },
          }

          specification.setPathItemOperationRequestBody(
            path,
            method,
            requestBody
          )

          return
        }

        const location = parameterLocationBySegment[segment]

        const result = parseJoiSchema(schema)

        const { properties, required = [] } = result.schema

        if (properties) {
          for (const [name, schema] of Object.entries(properties)) {
            const parameterObject: ParameterObject = {
              name,
              in: location,
              schema: schema,
              required: required.includes(name),
            }

            if ('deprecated' in schema) {
              parameterObject.deprecated = schema.deprecated
            }

            specification.addPathItemOperationParameter(
              path,
              method,
              parameterObject
            )
          }
        }
      }
    },
  }

  return joiRequestValidatorPlugin
}
