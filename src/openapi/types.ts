import type { Router } from 'express'
import type { Key } from 'path-to-regexp'
import type { HttpMethod } from '../types'

export const enum StackName {
  QUERY = 'query',
  EXPRESS_INIT = 'expressInit',
  BOUND_DISPATCH = 'bound dispatch',
  ROUTER = 'router',
  MOUNTED_APP = 'mounted_app',
}

export interface Layer {
  handle: Router | ((...params: any[]) => any)
  params?: Record<string, any>
  path?: string
  keys: Key[]
  regexp: RegExp & { fast_star: boolean; fast_slash: boolean }
}

export interface StackLayer extends Layer {
  name: StackName
  route?: Route
}

export interface RouteLayer extends Layer {
  name: string
  method: HttpMethod
}

export interface Route {
  path: string | string[]
  stack: RouteLayer[]
  methods: {
    [method in HttpMethod | '_all']?: boolean
  }
}
