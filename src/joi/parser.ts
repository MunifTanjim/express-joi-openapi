import { Schema } from '@hapi/joi'
import { SchemaObject } from 'openapi3-ts'
import { JoiSchema, JoiSchemaFlags, JoiSchemaRule } from './types'
import {
  extractAlternativeSchemas,
  getMetas,
  isDeprecated,
  isRuleName,
  isSchemaType,
} from './utils'

type ParsedResult = {
  schema: SchemaObject
  meta: {
    [key: string]: any
    required?: boolean
  }
}

function parseAnySchema(schema: JoiSchema<'any'>): ParsedResult {
  const result: ParsedResult = {
    schema: {},
    meta: {},
  }

  const metas = getMetas<{ [key: string]: any }>(schema)

  if (metas.customType === 'file') {
    result.schema.type = 'string'
    result.schema.format = 'binary'
  }

  return result
}

function parseAlternativesSchema(
  schema: JoiSchema<'alternatives'>
): ParsedResult {
  const result: ParsedResult = {
    schema: {},
    meta: {},
  }

  const _flags = schema._flags as JoiSchemaFlags

  const matchMode = `${_flags.match ?? 'any'}Of` as 'anyOf' | 'allOf' | 'oneOf'

  result.schema[matchMode] = []

  const $_terms = schema.$_terms

  const alternativeSchemas = extractAlternativeSchemas($_terms.matches)

  for (const alternativeSchema of alternativeSchemas) {
    const matchResult = parseJoiSchema(alternativeSchema)
    result.schema[matchMode]!.push(matchResult.schema)
  }

  return result
}

function parseArraySchema(schema: JoiSchema<'array'>): ParsedResult {
  const result: ParsedResult = {
    schema: {
      type: 'array',
      items: {},
    },
    meta: {},
  }

  const $_terms = schema.$_terms

  const itemResults = $_terms.items.map((itemSchema) =>
    parseJoiSchema(itemSchema)
  )

  if (itemResults.length === 1) {
    result.schema.items = itemResults[0].schema
  } else if (itemResults.length > 1) {
    result.schema.items = {
      anyOf: itemResults.map(({ schema }) => schema),
    }
  }

  for (const rule of schema._rules) {
    if (isRuleName(rule, 'length')) {
      result.schema.minItems = rule.args.limit
      result.schema.maxItems = rule.args.limit
    }

    if (isRuleName(rule, 'min')) {
      result.schema.minItems = rule.args.limit
    }

    if (isRuleName(rule, 'max')) {
      result.schema.maxItems = rule.args.limit
    }

    if (isRuleName(rule, 'unique')) {
      result.schema.uniqueItems = true
    }
  }

  return result
}

function parseBooleanSchema(schema: JoiSchema<'boolean'>): ParsedResult {
  const result: ParsedResult = {
    schema: {
      oneOf: [
        {
          type: 'boolean',
        },
      ],
    },
    meta: {},
  }

  const $_terms = schema.$_terms

  const stringEnum: string[] = []
  const integerEnum: number[] = []

  const keys = ['falsy', 'truthy'] as const

  for (const key of keys) {
    const term = $_terms[key]

    if (!term) {
      continue
    }

    for (const value of term._values.values()) {
      if (typeof value === 'number') {
        integerEnum.push(value)
      } else if (typeof value === 'string') {
        stringEnum.push(value)
      }
    }
  }

  if (stringEnum.length > 0) {
    result.schema.oneOf?.push({
      type: 'string',
      enum: stringEnum,
    })
  }

  if (integerEnum.length > 0) {
    result.schema.oneOf?.push({
      type: 'integer',
      enum: integerEnum,
    })
  }

  if (result.schema.oneOf?.length === 1) {
    result.schema = result.schema.oneOf[0]
  }

  return result
}

function parseBinarySchema(schema: JoiSchema<'binary'>): ParsedResult {
  const result: ParsedResult = {
    schema: {
      type: 'string',
    },
    meta: {},
  }

  const _flags = schema._flags as JoiSchemaFlags

  if (_flags.encoding === 'base64') {
    result.schema.format = 'byte'
  } else {
    result.schema.format = 'binary'
  }

  return result
}

function parseDateSchema(schema: JoiSchema<'date'>): ParsedResult {
  const result: ParsedResult = {
    schema: {
      type: 'string',
    },
    meta: {},
  }

  const _flags = schema._flags as JoiSchemaFlags

  if (_flags.format === 'iso') {
    result.schema.format = 'date-time'
  }

  if (_flags.format === 'javascript' || _flags.format === 'unix') {
    result.schema.type = 'integer'
  }

  return result
}

function parseNumberSchema(schema: JoiSchema<'number'>): ParsedResult {
  const result: ParsedResult = {
    schema: {},
    meta: {},
  }

  if (schema._singleRules.get('integer')) {
    result.schema.type = 'integer'
  } else {
    result.schema.type = 'number'

    const precisionRule = schema._singleRules.get('precision') as
      | JoiSchemaRule<'number', 'precision'>
      | undefined

    if (precisionRule) {
      result.schema.format = 'double'
    } else {
      result.schema.format = 'float'
    }
  }

  for (const rule of schema._rules) {
    if (isRuleName(rule, 'greater')) {
      result.schema.minimum = rule.args.limit
      result.schema.exclusiveMinimum = true
    }

    if (isRuleName(rule, 'less')) {
      result.schema.maximum = rule.args.limit
      result.schema.exclusiveMaximum = true
    }

    if (isRuleName(rule, 'min')) {
      result.schema.minimum = rule.args.limit
    }

    if (isRuleName(rule, 'max')) {
      result.schema.maximum = rule.args.limit
    }

    if (isRuleName(rule, 'port')) {
      result.schema.minimum = 0
      result.schema.maximum = 65535
    }

    if (isRuleName(rule, 'multiple')) {
      result.schema.multipleOf = rule.args.base
    }
  }

  const signRule = schema._singleRules.get('sign') as
    | JoiSchemaRule<'number', 'sign'>
    | undefined

  if (signRule) {
    if (signRule.args.sign === 'negative') {
      const maximum = result.schema.maximum ?? -1
      result.schema.maximum = maximum < 0 ? maximum : -1
    }

    if (signRule.args.sign === 'positive') {
      const minimum = result.schema.minimum ?? 0
      result.schema.minimum = minimum >= 0 ? minimum : 0
    }
  }

  return result
}

function parseObjectSchema(schema: JoiSchema<'object'>): ParsedResult {
  const result: ParsedResult = {
    schema: {
      type: 'object',
      properties: {},
    },
    meta: {},
  }

  const _flags = schema._flags as JoiSchemaFlags

  if (_flags.unknown !== true) {
    result.schema.additionalProperties = false
  }

  const $_terms = schema.$_terms

  const required: string[] = []

  for (const key of $_terms.keys) {
    const name = key.key

    const keyResult = parseJoiSchema(key.schema)

    result.schema.properties![name] = keyResult.schema

    if (keyResult.meta.required) {
      required.push(name)
    }
  }

  for (const rule of schema._rules) {
    if (isRuleName(rule, 'length')) {
      result.schema.minProperties = rule.args.limit
      result.schema.maxProperties = rule.args.limit
    }

    if (isRuleName(rule, 'min')) {
      result.schema.minProperties = rule.args.limit
    }

    if (isRuleName(rule, 'max')) {
      result.schema.maxProperties = rule.args.limit
    }
  }

  if (required.length) {
    result.schema.required = required
  }

  return result
}

function parseStringSchema(schema: JoiSchema<'string'>): ParsedResult {
  const result: ParsedResult = {
    schema: {
      type: 'string',
    },
    meta: {},
  }

  for (const rule of schema._rules) {
    if (isRuleName(rule, 'base64')) {
      result.schema.format = 'byte'
    }

    if (isRuleName(rule, 'email')) {
      result.schema.format = 'email'
    }

    if (isRuleName(rule, 'guid')) {
      result.schema.format = 'uuid'
    }

    if (isRuleName(rule, 'ip')) {
      result.schema.format =
        rule.args.options.version?.length === 1
          ? rule.args.options.version[0]
          : 'ip'
    }

    if (isRuleName(rule, 'isoDate')) {
      result.schema.format = 'date-time'
    }

    if (isRuleName(rule, 'uri')) {
      result.schema.format = 'uri'
    }

    if (isRuleName(rule, 'alphanum')) {
      const isStrict = schema._preferences?.convert === false

      const caseRule = schema._singleRules.get('case') as
        | JoiSchemaRule<'string', 'case'>
        | undefined

      if (caseRule && !isStrict) {
        if (caseRule.args.direction === 'upper') {
          result.schema.pattern = /^[A-Z0-9]*$/.source
        }

        if (caseRule.args.direction === 'lower') {
          result.schema.pattern = /^[a-z0-9]*$/.source
        }
      } else {
        result.schema.pattern = /^[a-zA-Z0-9]*$/.source
      }
    }

    if (isRuleName(rule, 'token')) {
      result.schema.pattern = /^[a-zA-Z0-9_]*$/.source
    }

    if (isRuleName(rule, 'pattern')) {
      if (typeof rule.args.options !== 'string' && rule.args.options?.invert) {
        result.schema.not = {
          ...result.schema.not,
          pattern: rule.args.regex.source,
        }
      } else {
        result.schema.pattern = rule.args.regex.source
      }
    } else if (rule.regex) {
      result.schema.pattern = rule.regex.source
    }

    if (isRuleName(rule, 'length')) {
      result.schema.minLength = rule.args.limit
      result.schema.maxLength = rule.args.limit
    }

    if (isRuleName(rule, 'min')) {
      result.schema.minLength = rule.args.limit
    }

    if (isRuleName(rule, 'max')) {
      result.schema.minLength = rule.args.limit
    }
  }

  return result
}

export function parseJoiSchema(schema: Schema): ParsedResult {
  const result: ParsedResult = { schema: {}, meta: {} }

  const _flags = schema._flags as JoiSchemaFlags

  if (_flags.presence === 'forbidden') {
    return result
  }

  if (_flags.presence === 'required') {
    result.meta.required = true
  }

  if (_flags.presence === 'optional') {
    result.meta.required = false
  }

  if (_flags.description) {
    result.schema.description = _flags.description
  }

  if (_flags.label) {
    result.schema.title = _flags.label
  }

  if (_flags.default) {
    if (typeof _flags.default !== 'function') {
      result.schema.default = _flags.default
    }
  }

  if (isDeprecated(schema)) {
    result.schema.deprecated = true
  }

  if (schema._valids) {
    if (schema._valids._values.has(null)) {
      result.schema.nullable = true
    }

    if (_flags.only) {
      result.schema.enum = Array.from(schema._valids._values).filter(
        (value) => value !== null
      )
    }
  } else if (schema._invalids) {
    result.schema.not = {
      enum: Array.from(schema._invalids._values),
    }
  }

  const $_terms = schema.$_terms

  if ($_terms.examples) {
    if ($_terms.examples.length === 1) {
      result.schema.example = $_terms.examples[0]
    } else {
      result.schema.examples = $_terms.examples
    }
  }

  if ($_terms.whens) {
    result.schema.anyOf = []

    const alternativeSchemas = extractAlternativeSchemas($_terms.whens)

    for (const alternativeSchema of alternativeSchemas) {
      const matchResult = parseJoiSchema(alternativeSchema)
      result.schema.anyOf.push(matchResult.schema)
    }
  }

  let resultOverride: ParsedResult = { schema: {}, meta: {} }

  if (isSchemaType(schema, 'array')) {
    resultOverride = parseArraySchema(schema)
  }

  if (isSchemaType(schema, 'binary')) {
    resultOverride = parseBinarySchema(schema)
  }

  if (isSchemaType(schema, 'boolean')) {
    resultOverride = parseBooleanSchema(schema)
  }

  if (isSchemaType(schema, 'date')) {
    resultOverride = parseDateSchema(schema)
  }

  if (isSchemaType(schema, 'number')) {
    resultOverride = parseNumberSchema(schema)
  }

  if (isSchemaType(schema, 'object')) {
    resultOverride = parseObjectSchema(schema)
  }

  if (isSchemaType(schema, 'string')) {
    resultOverride = parseStringSchema(schema)
  }

  if (isSchemaType(schema, 'any')) {
    resultOverride = parseAnySchema(schema)
  }

  if (isSchemaType(schema, 'alternatives')) {
    resultOverride = parseAlternativesSchema(schema)
  }

  Object.assign(result.schema, resultOverride.schema)

  Object.assign(result.meta, resultOverride.meta)

  return result
}
