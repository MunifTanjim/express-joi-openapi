import { OpenAPISpecification } from './specification'

describe('openapi/specification', () => {
  test('can create instance without initial spec', () => {
    const spec = new OpenAPISpecification()
    expect(spec).toBeInstanceOf(OpenAPISpecification)
  })

  test('can create instance with initial spec', () => {
    const spec = new OpenAPISpecification({
      openapi: '3.0.0',
      info: { title: 'test', version: '0.0.0' },
      paths: {},
    })
    expect(spec).toBeInstanceOf(OpenAPISpecification)
  })

  test('throws if unsupported openapi version', () => {
    expect(() => {
      new OpenAPISpecification({
        openapi: '2.0.0',
        info: { title: 'test', version: '0.0.0' },
        paths: {},
      })
    }).toThrowErrorMatchingInlineSnapshot(
      `"Invalid OpenAPI version: 2.0.0, expected format: 3.y.z"`
    )
  })

  describe('methods', () => {
    test('setOpenApiVersion', () => {
      const spec = new OpenAPISpecification()
      spec.setOpenApiVersion('3.0.2')
      expect(spec.openapi).toBe('3.0.2')
    })

    test('setInfo', () => {
      const spec = new OpenAPISpecification()
      spec.setInfo({ title: 'test', version: '0.0.0' })
      expect(spec.info).toMatchObject({ title: 'test', version: '0.0.0' })
    })

    describe('setComponent', () => {
      test('securitySchemes', () => {
        const spec = new OpenAPISpecification()
        spec.setComponent('securitySchemes', 'BearerAuth', {
          type: 'http',
          scheme: 'bearer',
        })
        expect(spec.components.securitySchemes).toMatchObject({
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
          },
        })
      })
    })

    test('addSecurity', () => {
      const spec = new OpenAPISpecification()
      spec.addSecurity({ BearerAuth: [] })
      expect(spec.security).toMatchObject([{ BearerAuth: [] }])
    })

    test('toJSON', () => {
      const spec = new OpenAPISpecification()
      expect(spec.toJSON()).toMatchInlineSnapshot(`
        Object {
          "components": Object {
            "callbacks": Object {},
            "examples": Object {},
            "headers": Object {},
            "links": Object {},
            "parameters": Object {},
            "requestBodies": Object {},
            "responses": Object {},
            "schemas": Object {},
            "securitySchemes": Object {},
          },
          "externalDocs": undefined,
          "info": Object {
            "title": "",
            "version": "",
          },
          "openapi": "3.0.0",
          "paths": Object {},
          "security": Array [],
          "servers": Array [],
          "tags": Array [],
        }
      `)
    })

    test('toString', () => {
      const spec = new OpenAPISpecification()
      expect(spec.toString(null, 2)).toBe(
        JSON.stringify(spec.toJSON(), null, 2)
      )
    })
  })
})
