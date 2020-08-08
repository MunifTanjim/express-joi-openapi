import { Handler } from 'express'
import { requestSchemaStash, responseSchemaStash } from './stash'

describe('stash', () => {
  test('works as expected', () => {
    const handler: Handler = () => {
      return
    }

    const requestSchemaMap = new Map()
    requestSchemaStash.set(handler, requestSchemaMap)
    expect(requestSchemaStash.get(handler)).toBe(requestSchemaMap)

    const responseSchemaMap = new Map()
    responseSchemaStash.set(handler, responseSchemaMap)
    expect(responseSchemaStash.get(handler)).toBe(responseSchemaMap)

    expect(Object.getOwnPropertySymbols(handler)).toMatchInlineSnapshot(`
      Array [
        Symbol(request_schema_map),
        Symbol(response_schema_map),
      ]
    `)
  })

  test('toggleStringStashKey works', () => {
    let usingStringKey = false

    const requestSchemaMap = new Map()

    usingStringKey = requestSchemaStash.toggleStringStashKey(true)
    expect(usingStringKey).toBe(true)

    const handler1: Handler = () => {
      return
    }

    requestSchemaStash.set(handler1, requestSchemaMap)

    expect(Object.keys(handler1)).toMatchInlineSnapshot(`
      Array [
        "Symbol(request_schema_map)",
      ]
    `)

    expect(Object.getOwnPropertySymbols(handler1)).toMatchInlineSnapshot(
      `Array []`
    )

    usingStringKey = requestSchemaStash.toggleStringStashKey()
    expect(usingStringKey).toBe(false)
    usingStringKey = requestSchemaStash.toggleStringStashKey(false)
    expect(usingStringKey).toBe(false)

    const handler2: Handler = () => {
      return
    }

    requestSchemaStash.set(handler2, requestSchemaMap)

    expect(Object.keys(handler2)).toMatchInlineSnapshot(`Array []`)

    expect(Object.getOwnPropertySymbols(handler2)).toMatchInlineSnapshot(`
      Array [
        Symbol(request_schema_map),
      ]
    `)
  })
})
