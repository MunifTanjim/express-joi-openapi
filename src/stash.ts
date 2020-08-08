import { Handler } from 'express'
import { JoiRequestSchemaMap, JoiResponseSchemaMap } from './types'

class JoiSchemaStash<SchemaMap extends Map<string, unknown>> {
  private symbol: symbol
  private symbolKey: symbol | string

  constructor(symbol: symbol) {
    this.symbol = symbol
    this.symbolKey = this.symbol
  }

  toggleStringStashKey(enable?: boolean): boolean {
    if (typeof enable !== 'boolean') {
      enable = typeof this.symbolKey !== 'string'
    }

    this.symbolKey = enable ? this.symbol.toString() : this.symbol

    return enable
  }

  set(handler: Handler, schemaMap: SchemaMap): void {
    Object.defineProperty(handler, this.symbolKey, {
      value: schemaMap,
      enumerable: true,
    })
  }

  get(handler: Handler): SchemaMap | null {
    const descriptor = Object.getOwnPropertyDescriptor(handler, this.symbolKey)
    return descriptor ? descriptor.value : null
  }
}

export const requestSchemaStash = new JoiSchemaStash<JoiRequestSchemaMap>(
  Symbol('request_schema_map')
)

export const responseSchemaStash = new JoiSchemaStash<JoiResponseSchemaMap>(
  Symbol('response_schema_map')
)
