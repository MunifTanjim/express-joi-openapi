import { ParameterLocation } from 'openapi3-ts'
import { RequestSegment } from '../types'

const parameterLocationBySegment: {
  [key in Exclude<RequestSegment, 'body'>]: ParameterLocation
} = {
  cookies: 'cookie',
  signedCookies: 'cookie',
  headers: 'header',
  params: 'path',
  query: 'query',
}

export const getParameterLocation = (
  segment: Exclude<RequestSegment, 'body'>
): ParameterLocation => {
  return parameterLocationBySegment[segment]
}
