import { Handler } from 'express'
import { JoiRequestSchemaMap, JoiResponseSchemaMap } from './types'

export const requestSchemaStash = new Map<Handler, JoiRequestSchemaMap>()

export const responseSchemaStash = new Map<Handler, JoiResponseSchemaMap>()
