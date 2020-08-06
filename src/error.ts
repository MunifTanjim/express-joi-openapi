import type { ValidationError } from '@hapi/joi'
import type { RequestSegment, ResponseSegment } from './types'

export class RequestValidationError extends Error {
  segment: RequestSegment
  validationError: ValidationError

  constructor(validationError: ValidationError, segment: RequestSegment) {
    super(validationError.message)

    this.segment = segment
    this.validationError = validationError
  }
}

export class ResponseValidationError extends Error {
  segment: ResponseSegment
  validationError: ValidationError

  constructor(validationError: ValidationError, segment: ResponseSegment) {
    super(validationError.message)

    this.segment = segment
    this.validationError = validationError
  }
}
