import Joi from '@hapi/joi'
import { parseJoiSchema } from './parser'

describe('parseJoiSchema', () => {
  describe('string', () => {
    test('alphanum', () => {
      expect(parseJoiSchema(Joi.string().alphanum())).toMatchInlineSnapshot(`
        Object {
          "meta": Object {},
          "schema": Object {
            "pattern": "^[a-zA-Z0-9]*$",
            "type": "string",
          },
        }
      `)
    })

    test('alphanum + case(lower)', () => {
      expect(parseJoiSchema(Joi.string().alphanum().case('lower')))
        .toMatchInlineSnapshot(`
        Object {
          "meta": Object {},
          "schema": Object {
            "pattern": "^[a-z0-9]*$",
            "type": "string",
          },
        }
      `)
    })

    test('alphanum + case(upper)', () => {
      expect(parseJoiSchema(Joi.string().alphanum().case('upper')))
        .toMatchInlineSnapshot(`
        Object {
          "meta": Object {},
          "schema": Object {
            "pattern": "^[A-Z0-9]*$",
            "type": "string",
          },
        }
      `)
    })

    test('alphanum + case + strict', () => {
      expect(
        parseJoiSchema(Joi.string().alphanum().case('lower').strict(true))
      ).toMatchObject(
        parseJoiSchema(Joi.string().alphanum().case('upper').strict(true))
      )

      expect(parseJoiSchema(Joi.string().alphanum().case('lower').strict(true)))
        .toMatchInlineSnapshot(`
        Object {
          "meta": Object {},
          "schema": Object {
            "pattern": "^[a-zA-Z0-9]*$",
            "type": "string",
          },
        }
      `)
    })

    test('pattern', () => {
      expect(parseJoiSchema(Joi.string().pattern(/^[a-z]+$/i)))
        .toMatchInlineSnapshot(`
        Object {
          "meta": Object {},
          "schema": Object {
            "pattern": "^[a-z]+$",
            "type": "string",
          },
        }
      `)
    })

    test('token', () => {
      expect(parseJoiSchema(Joi.string().token())).toMatchInlineSnapshot(`
        Object {
          "meta": Object {},
          "schema": Object {
            "pattern": "^[a-zA-Z0-9_]*$",
            "type": "string",
          },
        }
      `)
    })
  })
})
