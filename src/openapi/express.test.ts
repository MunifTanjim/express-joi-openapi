import express, { Handler } from 'express'
import { OpenAPIObject } from 'openapi3-ts'
import { processExpressRoutes } from './express'
import { OpenAPISpecification } from './index'

describe('buildSpecification', () => {
  describe('detects paths with methods', () => {
    const getPathMethods = (
      specification: OpenAPIObject
    ): Record<string, string[]> => {
      return Object.keys(specification.paths).reduce<Record<string, string[]>>(
        (result, path) => {
          result[path] = Object.keys(specification.paths[path])
          return result
        },
        {}
      )
    }

    let spec: OpenAPISpecification
    const middleware: Handler = (): void => {
      return
    }

    beforeEach(() => {
      spec = new OpenAPISpecification()
    })

    test('app', () => {
      const app = express()
      app.post('/', middleware)
      app.route('/:id').get(middleware).put(middleware)
      app.delete('/:id', middleware)

      processExpressRoutes(spec, app)
      const specification = spec.toJSON()
      const pathMethods = getPathMethods(specification)

      expect(pathMethods).toMatchInlineSnapshot(`
        Object {
          "/": Array [
            "post",
          ],
          "/{id}": Array [
            "get",
            "put",
            "delete",
          ],
        }
      `)
    })

    test('router', () => {
      const router = express.Router()
      router.post('/', middleware)
      router.route('/:id').get(middleware).put(middleware)
      router.delete('/:id', middleware)

      processExpressRoutes(spec, router)
      const specification = spec.toJSON()
      const pathMethods = getPathMethods(specification)

      expect(pathMethods).toMatchInlineSnapshot(`
        Object {
          "/": Array [
            "post",
          ],
          "/{id}": Array [
            "get",
            "put",
            "delete",
          ],
        }
      `)
    })

    test('app + router', () => {
      const app = express()
      app.post('/', middleware)
      app.route('/:id').get(middleware).put(middleware)
      app.delete('/:id', middleware)

      const router = express.Router()
      router.post('/', middleware)
      router.route('/:key').get(middleware).put(middleware)
      router.delete('/:key', middleware)

      app.use('/router', router)

      processExpressRoutes(spec, app)
      const specification = spec.toJSON()
      const pathMethods = getPathMethods(specification)

      expect(pathMethods).toMatchInlineSnapshot(`
        Object {
          "/": Array [
            "post",
          ],
          "/router": Array [
            "post",
          ],
          "/router/{key}": Array [
            "get",
            "put",
            "delete",
          ],
          "/{id}": Array [
            "get",
            "put",
            "delete",
          ],
        }
      `)
    })

    test('app + router + subRouter', () => {
      const app = express()
      app.post('/', middleware)
      app.route('/:id').get(middleware).put(middleware)

      const router = express.Router()
      router.post('/', middleware)
      router.route('/:key').get(middleware).put(middleware)

      const subRouter = express.Router()
      subRouter.post('/', middleware)
      subRouter.route('/:name').get(middleware).put(middleware)

      router.use('/sub-router', subRouter)

      app.use('/router', router)

      processExpressRoutes(spec, app)
      const specification = spec.toJSON()
      const pathMethods = getPathMethods(specification)

      expect(pathMethods).toMatchInlineSnapshot(`
        Object {
          "/": Array [
            "post",
          ],
          "/router": Array [
            "post",
          ],
          "/router/sub-router": Array [
            "post",
          ],
          "/router/sub-router/{name}": Array [
            "get",
            "put",
          ],
          "/router/{key}": Array [
            "get",
            "put",
          ],
          "/{id}": Array [
            "get",
            "put",
          ],
        }
      `)
    })
  })
})
