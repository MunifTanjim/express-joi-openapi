import type {
  AsyncValidationOptions,
  Schema,
  SchemaLike,
  ValidationOptions,
} from '@hapi/joi'
import type { Application, Handler } from 'express'
import type { OpenAPIObject } from 'openapi3-ts'

export type RequestSegment =
  | 'body'
  | 'cookies'
  | 'headers'
  | 'params'
  | 'query'
  | 'signedCookies'

export type ResponseSegment = 'body' | 'headers'

export type HttpMethod =
  | 'delete'
  | 'head'
  | 'get'
  | 'options'
  | 'patch'
  | 'post'
  | 'put'
  | 'trace'

export type JoiRequestSchemaMap = Map<RequestSegment, Schema | undefined>

type JoiRequestValidationSchema = { [segment in RequestSegment]?: SchemaLike }

export type GetRequestValidationMiddleware = (
  joiRequestSchema: JoiRequestValidationSchema,
  joiValidationOptions?: AsyncValidationOptions,
  options?: { segmentOrder?: RequestSegment[] }
) => Handler

export type JoiResponseSchemaMap = Map<
  string,
  { [segment in ResponseSegment]?: Schema } | undefined
>

type JoiResponseValidationSchema = {
  [statusCode: string]: {
    [segment in ResponseSegment]?: SchemaLike
  }
}

export type GetResponseValidationMiddleware = (
  joiResponseSchema: JoiResponseValidationSchema,
  joiValidationOptions?: ValidationOptions,
  options?: { segmentOrder?: ResponseSegment[] }
) => Handler

export type GetOpenAPISpecification = (
  app: Application,
  basePath?: string
) => OpenAPIObject
