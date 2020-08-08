import { Schema } from '@hapi/joi'
import {
  HeaderObject,
  HeadersObject,
  ParameterLocation,
  ParameterObject,
  RequestBodyObject,
  ResponseObject,
} from 'openapi3-ts'
import { OpenAPISpecification } from '../openapi'
import { HttpMethod } from '../types'
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
  info: { path: string; method: HttpMethod; key: number | 'default' }
) => void

type ResponseHeadersProcessor = (
  schema: Schema,
  info: { path: string; method: HttpMethod; key: number | 'default' }
) => void

export const getJoiSchemaProcessor = (
  spec: OpenAPISpecification
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

    spec.setPathItemOperationRequestBody(path, method, requestBody)
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

        spec.addPathItemOperationParameter(path, method, parameterObject)
      }
    }
  },
  responseBody: (schema, { path, method, key }) => {
    const result = parseJoiSchema(schema)

    const responseObject: ResponseObject = {
      ...spec.getPathItemOperationResponse(path, method, key),
      description: '',
      content: {
        'application/json': {
          schema: result.schema,
        },
      },
    }

    spec.setPathItemOperationResponse(path, method, key, responseObject)
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
      ...spec.getPathItemOperationResponse(path, method, key),
      description: '',
      headers: headersObject,
    }

    spec.setPathItemOperationResponse(path, method, key, responseObject)
  },
})
