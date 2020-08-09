import { Handler } from 'express'
import { OpenAPISpecification } from '../openapi'
import { Stash } from '../stash'
import { HttpMethod } from '../types'

export type ExpressOpenAPIPluginInternals<StashValue extends any> = {
  specification: OpenAPISpecification
  stash: Stash<StashValue>
}

export type RouteProcessor<StashValue extends any> = (
  specification: OpenAPISpecification,
  stash: StashValue,
  info: {
    path: string
    method: HttpMethod
  }
) => void

export interface ExpressOpenAPIPlugin<
  StashValue extends any = any,
  GetMiddleware extends (...params: any[]) => Handler = (
    ...params: any[]
  ) => Handler
> {
  name: string
  getMiddleware: (
    internals: ExpressOpenAPIPluginInternals<StashValue>,
    ...params: Parameters<GetMiddleware>
  ) => ReturnType<GetMiddleware>
  processRoute: RouteProcessor<StashValue>
}

export interface RegisteredExpressOpenAPIPlugin {
  name: string
  specification: OpenAPISpecification
  stash: Stash<any>
  processRoute: RouteProcessor<any>
}
