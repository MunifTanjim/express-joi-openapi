import type {
  CallbackObject,
  ComponentsObject,
  ExampleObject,
  ExternalDocumentationObject,
  HeaderObject,
  InfoObject,
  LinkObject,
  OpenAPIObject,
  OperationObject,
  ParameterObject,
  PathItemObject,
  PathsObject,
  ReferenceObject,
  RequestBodyObject,
  ResponseObject,
  SchemaObject,
  SecurityRequirementObject,
  SecuritySchemeObject,
  ServerObject,
  TagObject,
} from 'openapi3-ts'
import type * as oa from 'openapi3-ts/src/model'
import { mergeDeepRight } from 'ramda'
import type { SetRequired } from 'type-fest'
import type { HttpMethod } from '../types'

type PathItemOperationKey = HttpMethod

export type ComponentType =
  | 'schemas'
  | 'responses'
  | 'parameters'
  | 'examples'
  | 'requestBodies'
  | 'headers'
  | 'securitySchemes'
  | 'links'
  | 'callbacks'

const emptyInfo: InfoObject = {
  title: '',
  version: '',
}

const emptyComponents: SetRequired<ComponentsObject, ComponentType> = {
  schemas: {},
  responses: {},
  parameters: {},
  examples: {},
  requestBodies: {},
  headers: {},
  securitySchemes: {},
  links: {},
  callbacks: {},
}

export class OpenAPISpecificationBuilder {
  private openapi: string
  private info: InfoObject
  private components: SetRequired<ComponentsObject, ComponentType>
  private paths: PathsObject
  private security: SecurityRequirementObject[]
  private tags: TagObject[]
  private servers: ServerObject[]
  private externalDocs?: ExternalDocumentationObject

  private static isValidOpenApiVersion(version = ''): boolean {
    const match = /(\d+)\.(\d+).(\d+)/.exec(version)

    if (match) {
      const major = Number(match[1])

      if (major >= 3) {
        return true
      }
    }

    return false
  }

  constructor(
    {
      openapi = '3.0.0',
      info = emptyInfo,
      components = emptyComponents,
      paths = {},
      security = [],
      tags = [],
      servers = [],
      externalDocs,
    }: oa.OpenAPIObject = {
      openapi: '3.0.0',
      info: emptyInfo,
      components: emptyComponents,
      paths: {},
      security: [],
      tags: [],
      servers: [],
    }
  ) {
    this.openapi = openapi
    this.info = { ...emptyInfo, ...info }
    this.components = { ...emptyComponents, ...components }
    this.paths = paths
    this.security = security
    this.tags = tags
    this.servers = servers
    this.externalDocs = externalDocs
  }

  toJSON(): OpenAPIObject {
    const {
      openapi,
      info,
      components,
      paths,
      security,
      tags,
      servers,
      externalDocs,
    } = this

    return {
      openapi,
      info,
      components,
      paths,
      security,
      tags,
      servers,
      externalDocs,
    }
  }

  setOpenApiVersion(openApiVersion: string): this {
    if (!OpenAPISpecificationBuilder.isValidOpenApiVersion(openApiVersion)) {
      throw new Error(
        `Invalid OpenAPI version: ${openApiVersion}. Expected: 3.y.z`
      )
    }

    this.openapi = openApiVersion

    return this
  }

  setInfo(info: InfoObject): this {
    this.info = info
    return this
  }

  getPathItem(path: string): PathItemObject | undefined {
    const pathItem: PathItemObject = this.paths[path]
    return pathItem
  }

  setPathItem(path: string, pathItem: PathItemObject): this {
    this.paths[path] = pathItem
    return this
  }

  addPathItemParameter(
    path: string,
    parameter: ParameterObject | ReferenceObject
  ): this {
    const pathItem: PathItemObject = { ...this.paths[path] }

    if (pathItem.parameters) {
      pathItem.parameters.push(parameter)
    } else {
      pathItem.parameters = [parameter]
    }

    this.paths[path] = pathItem

    return this
  }

  addPathItemServer(path: string, server: ServerObject): this {
    const pathItem: PathItemObject = { ...this.paths[path] }

    if (pathItem.servers) {
      pathItem.servers.push(server)
    } else {
      pathItem.servers = [server]
    }

    this.paths[path] = pathItem

    return this
  }

  setPathItemOperation(
    path: string,
    method: PathItemOperationKey,
    operation: OperationObject
  ): this {
    const pathItem: PathItemObject = { ...this.paths[path] }
    pathItem[method] = operation
    this.paths[path] = pathItem
    return this
  }

  mergePathItemOperation(
    path: string,
    method: PathItemOperationKey,
    operation: Partial<
      Pick<
        OperationObject,
        | 'summary'
        | 'description'
        | 'externalDocs'
        | 'operationId'
        | 'requestBody'
        | 'responses'
        | 'callbacks'
        | 'deprecated'
      >
    >
  ): this {
    if (!this.paths[path]?.[method]) {
      throw new Error(`paths[${path}][${method}] is not set!`)
    }

    this.paths[path][method] = mergeDeepRight(
      this.paths[path][method],
      operation
    )

    return this
  }

  addPathItemOperationTag(
    path: string,
    method: PathItemOperationKey,
    tag: string
  ): this {
    if (!this.paths[path]?.[method]) {
      throw new Error(`paths[${path}][${method}] is not set!`)
    }

    const operation: OperationObject = { ...this.paths[path][method] }

    operation.tags = operation.tags ? operation.tags.concat(tag) : [tag]

    this.paths[path][method] = operation
    return this
  }

  addPathItemOperationParameter(
    path: string,
    method: PathItemOperationKey,
    parameter: ParameterObject | ReferenceObject
  ): this {
    if (!this.paths[path]?.[method]) {
      throw new Error(`paths[${path}][${method}] is not set!`)
    }

    const operation: OperationObject = { ...this.paths[path][method] }

    operation.parameters = operation.parameters
      ? operation.parameters.concat(parameter)
      : [parameter]

    this.paths[path][method] = operation
    return this
  }

  addPathItemOperationSecurityRequirement(
    path: string,
    method: PathItemOperationKey,
    securityRequirement: SecurityRequirementObject
  ): this {
    if (!this.paths[path]?.[method]) {
      throw new Error(`paths[${path}][${method}] is not set!`)
    }

    const operation: OperationObject = { ...this.paths[path][method] }

    operation.security = operation.security
      ? operation.security.concat(securityRequirement)
      : [securityRequirement]

    this.paths[path][method] = operation

    return this
  }

  addPathItemOperationServer(
    path: string,
    method: PathItemOperationKey,
    server: ServerObject
  ): this {
    if (!this.paths[path]?.[method]) {
      throw new Error(`paths[${path}][${method}] is not set!`)
    }

    const operation: OperationObject = { ...this.paths[path][method] }

    operation.servers = operation.servers
      ? operation.servers.concat(server)
      : [server]

    this.paths[path][method] = operation

    return this
  }

  setSchema(name: string, schema: SchemaObject | ReferenceObject): this {
    this.components.schemas[name] = schema
    return this
  }

  setResponse(name: string, response: ResponseObject | ReferenceObject): this {
    this.components.responses[name] = response
    return this
  }

  setParameter(
    name: string,
    parameter: ParameterObject | ReferenceObject
  ): this {
    this.components.parameters[name] = parameter
    return this
  }

  setExample(name: string, example: ExampleObject | ReferenceObject): this {
    this.components.examples[name] = example
    return this
  }

  setRequestBody(
    name: string,
    requestBody: RequestBodyObject | ReferenceObject
  ): this {
    this.components.requestBodies[name] = requestBody
    return this
  }

  setHeader(name: string, header: HeaderObject | ReferenceObject): this {
    this.components.headers[name] = header
    return this
  }

  setSecurityScheme(
    name: string,
    securityScheme: SecuritySchemeObject | ReferenceObject
  ): this {
    this.components.securitySchemes[name] = securityScheme
    return this
  }

  setLink(name: string, link: LinkObject | ReferenceObject): this {
    this.components.links[name] = link
    return this
  }

  setCallback(name: string, callback: CallbackObject | ReferenceObject): this {
    this.components.callbacks[name] = callback
    return this
  }

  addServer(server: ServerObject): this {
    this.servers.push(server)
    return this
  }

  addTag(tag: TagObject): this {
    this.tags.push(tag)
    return this
  }

  setExternalDocs(
    externalDocs: oa.ExternalDocumentationObject
  ): OpenAPISpecificationBuilder {
    this.externalDocs = externalDocs
    return this
  }
}
