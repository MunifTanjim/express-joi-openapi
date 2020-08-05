import type { Handler } from 'express'
import type { JoiRequestSchemaMap, JoiResponseSchemaMap } from './types'

export const requestSchemaStash = new Map<Handler, JoiRequestSchemaMap>()

export const responseSchemaStash = new Map<Handler, JoiResponseSchemaMap>()
