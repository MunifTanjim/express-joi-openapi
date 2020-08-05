import type { ValidationError } from '@hapi/joi'
import type { RequestSegment } from './types'

export class RequestValidationError extends Error {
  validationError: ValidationError
  segment: RequestSegment

  constructor(validationError: ValidationError, segment: RequestSegment) {
    super(validationError.message)

    this.segment = segment
    this.validationError = validationError
  }
}
