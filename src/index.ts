import { Application, Handler, Router } from 'express'
import { PluginProcessor } from 'express-route-plugin'
import { OpenAPISpecification } from './openapi'
import { ExpressOpenAPIPlugin } from './plugins'

export * from './joi'
export { OpenAPISpecification } from './openapi'
export * from './plugins'

export class ExpressOpenAPI {
  private specification: OpenAPISpecification
  private processor: PluginProcessor<OpenAPISpecification>

  constructor({
    specification = new OpenAPISpecification(),
    useStringStashKey = false,
  }: {
    specification?: OpenAPISpecification
    /**
     * if you're using a library that dynamically modifies your middlewares
     * and the `populateSpecification` method is not working properly,
     * then set this to `true`
     */
    useStringStashKey?: boolean
  } = {}) {
    this.specification = specification
    this.processor = new PluginProcessor<OpenAPISpecification>({
      state: this.specification,
      useStringStashKey,
    })
  }

  registerPlugin = <
    StashType,
    GetMiddleware extends (...params: any[]) => Handler
  >(
    plugin: ExpressOpenAPIPlugin<StashType, GetMiddleware>
  ): ((...params: Parameters<GetMiddleware>) => ReturnType<GetMiddleware>) => {
    return this.processor.registerPlugin<StashType, GetMiddleware>({
      id: plugin.name,
      state: this.specification,
      getMiddleware: (store, ...params) => {
        return plugin.getMiddleware(
          {
            specification: store.state,
            stash: store.stash,
          },
          ...params
        )
      },
      processRoute: (store, info) => {
        return plugin.processRoute(store.state, store.stash, info)
      },
    })
  }

  populateSpecification = (
    app: Application | Router,
    basePath?: string
  ): OpenAPISpecification => {
    return this.processor.process(app, basePath)
  }
}
