[![GitHub Workflow Status: CI](https://img.shields.io/github/workflow/status/MunifTanjim/express-joi-openapi/CI?label=CI&style=for-the-badge)](https://github.com/MunifTanjim/express-joi-openapi/actions?query=workflow%3ACI)
[![Version](https://img.shields.io/npm/v/express-joi-openapi?style=for-the-badge)](https://npmjs.org/package/express-joi-openapi)
[![Coverage](https://img.shields.io/codecov/c/gh/MunifTanjim/express-joi-openapi?style=for-the-badge)](https://codecov.io/gh/MunifTanjim/express-joi-openapi)
[![License](https://img.shields.io/github/license/MunifTanjim/express-joi-openapi?style=for-the-badge)](https://github.com/MunifTanjim/express-joi-openapi/blob/main/LICENSE)

# Express + Joi + OpenAPI

Express + Joi + OpenAPI

## Installation

```sh
# using yarn:
yarn add express-joi-openapi

# using npm:
npm install --save express-joi-openapi
```

## Usage

```ts
import express from 'express'
import {
  initializeJoiOpenApi,
  RequestValidationError,
  ResponseValidationError,
} from 'express-joi-openapi'
import Joi from '@hapi/joi'

const {
  getRequestValidationMiddleware,
  getResponseValidationMiddleware,
  prepareOpenApiSpecification,
} = initializeJoiOpenApi({ Joi })

const app = express()

app.use(express.json())

app.post(
  '/ping',
  getRequestValidationMiddleware({
    query: {
      count: Joi.number()
        .integer()
        .required()
        .label('pong count')
        .description('number of times ping will pong'),
    },
    body: {
      type: Joi.string().valid('plastic', 'rubber', 'wood').default('rubber'),
    },
  }),
  getResponseValidationMiddleware({
    200: {
      body: {
        pong: Joi.number().integer().required(),
      },
    },
    default: {},
  }),
  (_req, res) => {
    const { count } = req.query

    res.status(200).json({
      pong: count,
    })
  }
)

app.use((err, _req, res, _next) => {
  if (err instanceof RequestValidationError) {
    res.status(400).json({
      error: {
        message: err.message,
        segment: err.segment,
        details: err.validationError.details.map(({ message, path, type }) => ({
          message,
          path,
          type,
        })),
      },
    })

    return
  }

  if (err instanceof ResponseValidationError) {
    console.error(err)
  }

  res.status(500).json({
    error: {
      message: 'Server Error',
    },
  })
})

const specification = prepareOpenApiSpecification(app)
```

## Acknowledgement

This project draws inspiration from the following awesome projects:

- [AlbertoFdzM/express-list-endpoints](https://github.com/AlbertoFdzM/express-list-endpoints)
- [arb/celebrate](https://github.com/arb/celebrate)
- [Twipped/joi-to-swagger](https://github.com/Twipped/joi-to-swagger)

## License

Licensed under the MIT License. Check the [LICENSE](./LICENSE) file for details.
