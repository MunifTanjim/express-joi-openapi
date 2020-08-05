import type { Application, Router } from 'express'
import { getJoiSchemaProcessor } from '../joi'
import type { HttpMethod } from '../types'
import { getParameterLocation } from '../utils'
import type { OpenAPISpecificationBuilder } from './builder'
import { StackName } from './types'
import type { Layer, Route, StackLayer } from './types'
import { extractSchemaMaps } from './utils'

const regexPattern = {
  param: /\(\?:\(\[\^\\\/]\+\?\)\)/,
  path: /^\^\\\/(?:(:?[\w\\.-]*(?:\\\/:?[\w\\.-]*)*)|(\(\?:\(\[\^\\\/]\+\?\)\)))\\/,
  rootPath: /^\^\\\/\?\(\?=\\\/\|\$\)$/,
}

const getPathString = (pathRegex: RegExp, keys: Layer['keys']): string => {
  const pathRegexpSource = pathRegex.source

  let regexString = pathRegexpSource

  let regexStringExecArray = regexPattern.path.exec(regexString)

  let paramIndex = 0
  while (regexPattern.param.test(regexString)) {
    const param = `:${keys[paramIndex].name}`

    regexString = regexString.replace(regexPattern.param, param)

    paramIndex++
  }

  if (regexString !== pathRegexpSource) {
    regexStringExecArray = regexPattern.path.exec(regexString)
  }

  const pathString = regexStringExecArray![1].replace(/\\\//g, '/')

  return pathString
}

const processRoute = (
  builder: OpenAPISpecificationBuilder,
  route: Route,
  basePath = ''
): void => {
  const routePaths = Array.isArray(route.path) ? route.path : [route.path]

  routePaths.forEach((routePath) => {
    const path = `${
      basePath ? `${basePath}${routePath === '/' ? '' : routePath}` : routePath
    }`.replace(/:([a-zA-Z0-9_]+)/g, '{$1}')

    const methods: HttpMethod[] = Object.keys(route.methods).filter(
      (method): method is HttpMethod => method !== '_all'
    )

    if (!builder.getPathItem(path)) {
      builder.setPathItem(path, {})
    }

    for (const method of methods) {
      builder.setPathItemOperation(path, method, {
        responses: {
          default: {
            description: '',
          },
        },
      })

      const {
        request: requestSchemaMap,
        response: responseSchemaMap,
      } = extractSchemaMaps(route, method)

      const processJoiSchema = getJoiSchemaProcessor(builder)

      if (requestSchemaMap) {
        for (const [segment, schema] of requestSchemaMap.entries()) {
          if (!schema) {
            continue
          }

          if (segment === 'body') {
            processJoiSchema.requestBody(schema, { path, method })
          } else {
            const location = getParameterLocation(segment)

            processJoiSchema.requestParameters(schema, {
              path,
              method,
              location,
            })
          }
        }
      }

      if (responseSchemaMap) {
        for (const [key, schemaBySegment] of responseSchemaMap.entries()) {
          if (!schemaBySegment) {
            continue
          }

          if (schemaBySegment.body) {
            processJoiSchema.responseBody(schemaBySegment.body, {
              path,
              method,
              key,
            })
          }

          if (schemaBySegment.headers) {
            processJoiSchema.responseHeaders(schemaBySegment.headers, {
              path,
              method,
              key,
            })
          }
        }
      }
    }
  })
}

export const processExpressRoutes = (
  builder: OpenAPISpecificationBuilder,
  app: Application | Router,
  basePath = ''
): void => {
  const stack: StackLayer[] = app.stack ?? (app as Application)._router?.stack

  if (!stack) {
    builder.setPathItem(basePath, {})

    return
  }

  for (const layer of stack) {
    // terminal route
    if (layer.route) {
      processRoute(builder, layer.route, basePath)

      continue
    }

    if (
      layer.name !== StackName.ROUTER &&
      layer.name !== StackName.BOUND_DISPATCH &&
      layer.name !== StackName.MOUNTED_APP
    ) {
      continue
    }

    if (regexPattern.path.test(layer.regexp.source)) {
      const parsedPath = getPathString(layer.regexp, layer.keys)

      processExpressRoutes(
        builder,
        layer.handle as Router,
        basePath + '/' + parsedPath
      )

      continue
    }

    if (
      !layer.path &&
      layer.regexp &&
      !regexPattern.rootPath.test(layer.regexp.source)
    ) {
      const regexPath = ' RegExp(' + layer.regexp + ') '

      processExpressRoutes(
        builder,
        layer.handle as Router,
        basePath + '/' + regexPath
      )

      continue
    }

    processExpressRoutes(builder, layer.handle as Router, basePath)
  }
}
