import { Handler } from 'express'
import { JoiRequestSchemaMap, JoiResponseSchemaMap } from './types'

class JoiSchemaStash<SchemaMap extends Map<string, unknown>> {
  private symbol: symbol

  constructor(symbol: symbol) {
    this.symbol = symbol
  }

  set(handler: Handler, schemaMap: SchemaMap): void {
    Object.defineProperty(handler, this.symbol, {
      value: schemaMap,
      enumerable: true,
    })
  }

  get(handler: Handler): SchemaMap | null {
    const descriptor = Object.getOwnPropertyDescriptor(handler, this.symbol)
    return descriptor ? descriptor.value : null
  }
}

export const requestSchemaStash = new JoiSchemaStash<JoiRequestSchemaMap>(
  Symbol('request')
)

export const responseSchemaStash = new JoiSchemaStash<JoiResponseSchemaMap>(
  Symbol('response')
)
