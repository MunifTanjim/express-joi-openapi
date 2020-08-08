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
  })
})
