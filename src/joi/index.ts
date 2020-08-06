import type { Schema } from '@hapi/joi'
import type {
  HeaderObject,
  HeadersObject,
  ParameterLocation,
  ParameterObject,
  RequestBodyObject,
  ResponseObject,
} from 'openapi3-ts'
import type { OpenAPISpecificationBuilder } from '../openapi'
import type { HttpMethod } from '../types'
import { parseJoiSchema } from './parser'

type RequestBodyProcessor = (
  schema: Schema,
  info: { path: string; method: HttpMethod }
) => void

type RequestParametersProcessor = (
  schema: Schema,
  info: { path: string; method: HttpMethod; location: ParameterLocation }
) => void

type ResponseBodyProcessor = (
  schema: Schema,
  info: { path: string; method: HttpMethod; key: string | 'default' }
) => void

type ResponseHeadersProcessor = (
  schema: Schema,
  info: { path: string; method: HttpMethod; key: string | 'default' }
) => void

export const getJoiSchemaProcessor = (
  builder: OpenAPISpecificationBuilder
): {
  requestBody: RequestBodyProcessor
  requestParameters: RequestParametersProcessor
  responseBody: ResponseBodyProcessor
  responseHeaders: ResponseHeadersProcessor
} => ({
  requestBody: (schema, { path, method }) => {
    const result = parseJoiSchema(schema)

    const requestBody: RequestBodyObject = {
      content: {
        'application/json': {
          schema: result.schema,
        },
      },
    }

    builder.mergePathItemOperation(path, method, {
      requestBody,
    })
  },
  requestParameters: (schema, { path, method, location }) => {
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

        builder.addPathItemOperationParameter(path, method, parameterObject)
      }
    }
  },
  responseBody: (schema, { path, method, key }) => {
    const result = parseJoiSchema(schema)

    const responseObject: ResponseObject = {
      description: '',
      content: {
        'application/json': {
          schema: result.schema,
        },
      },
    }

    builder.mergePathItemOperation(path, method, {
      responses: {
        [key]: responseObject,
      },
    })
  },
  responseHeaders: (schema, { path, method, key }) => {
    const result = parseJoiSchema(schema)

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
      description: '',
      headers: headersObject,
    }

    builder.mergePathItemOperation(path, method, {
      responses: {
        [key]: responseObject,
      },
    })
  },
})
