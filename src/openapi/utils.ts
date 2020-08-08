import { ReferenceObject } from 'openapi3-ts'
import { requestSchemaStash, responseSchemaStash } from '../stash'
import type {
  HttpMethod,
  JoiRequestSchemaMap,
  JoiResponseSchemaMap,
} from '../types'
import type { Route } from './types'

export const extractSchemaMaps = (
  route: Route,
  method: HttpMethod
): {
  request: JoiRequestSchemaMap | null
  response: JoiResponseSchemaMap | null
} => {
  const maps: {
    request: JoiRequestSchemaMap | null
    response: JoiResponseSchemaMap | null
  } = {
    request: null,
    response: null,
  }

  for (const layer of route.stack) {
    if (layer.method === method) {
      const requestSchemaMap = requestSchemaStash.get(layer.handle)
      if (requestSchemaMap) {
        maps.request = requestSchemaMap
      }

      const responseSchemaMap = responseSchemaStash.get(layer.handle)
      if (responseSchemaMap) {
        maps.response = responseSchemaMap
      }
    }
  }

  return maps
}

export const isReferenceObject = (
  referenceObject: { [key: string]: unknown } | ReferenceObject
): referenceObject is ReferenceObject => {
  return '$ref' in referenceObject
}
