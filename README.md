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
  ExpressOpenAPI,
  getJoiRequestValidatorPlugin,
  getJoiResponseValidatorPlugin,
  RequestValidationError,
  ResponseValidationError,
} from 'express-joi-openapi'
import Joi from '@hapi/joi'

const expressOpenApi = new ExpressOpenAPI()

const requestValidatorPlugin = getJoiRequestValidatorPlugin()
const responseValidatorPlugin = getJoiResponseValidatorPlugin()

const validateRequest = expressOpenApi.registerPlugin(requestValidatorPlugin)
const validateResponse = expressOpenApi.registerPlugin(responseValidatorPlugin)

const app = express()

app.use(express.json())

app.post(
  '/ping',
  validateRequest({
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
  validateResponse({
    200: {
      body: {
        pong: Joi.number().integer().required(),
      },
    },
    default: {},
  }),
  (req, res) => {
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

    res.status(500).json({
      error: {
        message: 'Server Error: Invalid Response Schema',
      },
    })

    return
  }

  res.status(500).json({
    error: {
      message: 'Server Error',
    },
  })
})

const specification = expressOpenApi.populateSpecification(app)
```

## Plugin

You get the following plugins out of the box:

- `JoiRequestValidatorPlugin`
- `JoiResponseValidatorPlugin`

But that's not the end of it. You can write you own `ExpressOpenAPIPlugin` to perform arbitrary changes to
the OpenAPI Specification for your express routes.

**Plugin Example:**

```ts
import { Handler } from 'express'
import { ExpressOpenAPIPlugin } from 'express-joi-openapi'

type AuthorizationMiddleware = (permissions: string[]) => Handler

type AuthorizationPlugin = ExpressOpenAPIPlugin<
  string[],
  AuthorizationMiddleware
>

export const getAuthorizationPlugin = (): AuthorizationPlugin => {
  const authorizationPlugin: AuthorizationPlugin = {
    name: 'authorization-plugin',

    getMiddleware: (internals, permissions) => {
      const middleware: Handler = async (req, res, next) => {
        // do regular stuffs that you do in your authorization middleware

        /*
        const hasSufficientPermission = await checkUserPermission(
          req.user,
          permissions
        )

        if (!hasSufficientPermission) {
          return res.status(403).json({
            error: {
              message: `Not Authorized`,
            },
          })
        }
        */

        next()
      }

      // this will be available as a parameter to `processRoute`  function
      internals.stash.store(middleware, permissions)

      return middleware
    },

    processRoute: (specification, permissions, { path, method }) => {
      specification.addPathItemOperationSecurityRequirement(path, method, {
        BearerAuth: permissions,
      })
    },
  }

  return authorizationPlugin
}
```

## Acknowledgement

This project draws inspiration from the following awesome projects:

- [AlbertoFdzM/express-list-endpoints](https://github.com/AlbertoFdzM/express-list-endpoints)
- [arb/celebrate](https://github.com/arb/celebrate)
- [Twipped/joi-to-swagger](https://github.com/Twipped/joi-to-swagger)

## License

Licensed under the MIT License. Check the [LICENSE](./LICENSE) file for details.
