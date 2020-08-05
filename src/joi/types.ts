import type {
  ArrayUniqueOptions,
  ComparatorFunction,
  EmailOptions,
  GuidOptions,
  IpOptions,
  Root,
  Schema,
  SchemaInternals,
  StringRegexOptions,
} from '@hapi/joi'

type SchemaByType = ReturnType<Root['types']>
export type JoiSchemaType = keyof SchemaByType
export type JoiSchema<Type extends JoiSchemaType> = SchemaByType[Type]

type RuleArgsMap = {
  array: {
    length: { limit: number }
    max: { limit: number }
    min: { limit: number }
    unique: {
      comparator?: string | ComparatorFunction
      options?: ArrayUniqueOptions
    }
  }
  binary: {
    encoding: { encoding: string }
  }
  number: {
    greater: { limit: number }
    less: { limit: number }
    max: { limit: number }
    min: { limit: number }
    multiple: { base: number }
    port: never
    precision: { limit: number }
    sign: { sign: 'negative' | 'positive' }
  }
  object: {
    length: { limit: number; encoding?: string }
    max: { limit: number; encoding?: string }
    min: { limit: number; encoding?: string }
  }
  string: {
    case: { direction: 'upper' | 'lower' }
    email: { options: EmailOptions }
    guid: { options: GuidOptions }
    ip: { options: IpOptions }
    length: { limit: number; encoding?: string }
    max: { limit: number; encoding?: string }
    min: { limit: number; encoding?: string }
    pattern: { regex: RegExp; options?: string | StringRegexOptions }
  }
}

export type JoiSchemaRuleName<Type extends JoiSchemaType> = Exclude<
  keyof JoiSchema<Type>,
  keyof SchemaInternals | '_invalids' | '_valids' | '_preferences'
>

export interface JoiSchemaRule<
  Type extends JoiSchemaType,
  Name extends JoiSchemaRuleName<Type> = JoiSchemaRuleName<Type>
> {
  [key: string]: any
  name: Name
  args: Type extends keyof RuleArgsMap
    ? Name extends keyof RuleArgsMap[Type]
      ? RuleArgsMap[Type][Name]
      : any
    : any
  regex?: Type extends 'string' ? RegExp : never
}

interface JoiAnySchemaTerms {
  alterations: null
  examples: null | any[]
  externals: null
  metas: any[]
  notes: any[]
  shared: null
  tags: any[]
  whens: null | Array<{
    ref?: {
      adjust: null
      in: boolean
      iterables: null
      map: null
      separator: string
      type: 'value' | string
      ancestor: number
      path: string[]
      depth: number
      key: string
      root: string
      display: string
    }
    is?: Schema
    then?: Schema
    otherwise?: Schema
    switch?: Array<{ is: Schema; then: Schema; otherwise?: Schema }>
    break?: boolean
  }>
}

interface JoiAlternativesSchemaTerms extends JoiAnySchemaTerms {
  matches: Array<
    NonNullable<JoiAnySchemaTerms['whens']>[number] & {
      schema?: Schema
    }
  >
}

interface JoiArraySchemaTerms extends JoiAnySchemaTerms {
  items: Schema[]
  ordered: any[]
  _exclusions: any[]
  _requireds: any[]
}

interface JoiBinarySchemaTerms extends JoiAnySchemaTerms {
  externals: null
}

interface JoiBooleanSchemaTerms extends JoiAnySchemaTerms {
  falsy?: {
    _values: Set<any>
  }
  truthy?: {
    _values: Set<any>
  }
}

interface JoiNumberSchemaTerms extends JoiAnySchemaTerms {
  externals: null
}

interface JoiObjectSchemaTerms extends JoiAnySchemaTerms {
  dependencies: null
  keys: { key: string; schema: Schema }[]
  patterns: null
  renames: null
}

interface JoiStringSchemaTerms extends JoiAnySchemaTerms {
  externals: null
  replacements: null
}

type JoiSchemaTermsByType = {
  any: JoiAnySchemaTerms
  alternatives: JoiAlternativesSchemaTerms
  array: JoiArraySchemaTerms
  binary: JoiBinarySchemaTerms
  boolean: JoiBooleanSchemaTerms
  number: JoiNumberSchemaTerms
  object: JoiObjectSchemaTerms
  string: JoiStringSchemaTerms
}

export type JoiSchemaTerms<
  Type extends string
> = Type extends keyof JoiSchemaTermsByType
  ? JoiSchemaTermsByType[Type]
  : JoiSchemaTermsByType['any']

export type JoiSchemaFlags = {
  [key: string]: any
  default?: any
  description?: string
  encoding?: string
  format?: 'iso' | 'javascript' | 'unix'
  label?: string
  match?: 'any' | 'all' | 'one'
  only?: boolean
  presence?: 'optional' | 'required' | 'forbidden'
  sensitive?: boolean
  unknown?: boolean
}

declare module '@hapi/joi' {
  type Preferences = import('@hapi/joi').ValidationOptions
  interface SchemaInternals {
    _rules: any[]
    _singleRules: Map<string, any>
  }

  interface AnySchema {
    $_terms: JoiSchemaTerms<'any'>
    _preferences: null | Preferences
    _valids: null | {
      _values: Set<any>
    }
    _invalids: null | {
      _values: Set<any>
    }
  }

  interface AlternativesSchema {
    $_terms: JoiSchemaTerms<'alternatives'>
  }

  interface ArraySchema {
    $_terms: JoiSchemaTerms<'array'>
    _rules: JoiSchemaRule<'array'>[]
    _singleRules: Map<JoiSchemaRuleName<'array'>, JoiSchemaRule<'array'>>
  }

  interface BinarySchema {
    $_terms: JoiSchemaTerms<'binary'>
    _rules: JoiSchemaRule<'binary'>[]
    _singleRules: Map<JoiSchemaRuleName<'binary'>, JoiSchemaRule<'binary'>>
  }

  interface BooleanSchema {
    $_terms: JoiSchemaTerms<'boolean'>
  }

  interface NumberSchema {
    $_terms: JoiSchemaTerms<'number'>
    _rules: JoiSchemaRule<'number'>[]
    _singleRules: Map<JoiSchemaRuleName<'number'>, JoiSchemaRule<'number'>>
  }

  interface ObjectSchema<TSchema = any> {
    $_terms: JoiSchemaTerms<'object'>
    _rules: JoiSchemaRule<'object'>[]
    _singleRules: Map<JoiSchemaRuleName<'object'>, JoiSchemaRule<'object'>>
  }

  interface StringSchema {
    $_terms: JoiSchemaTerms<'string'>
    _rules: JoiSchemaRule<'string'>[]
    _singleRules: Map<JoiSchemaRuleName<'string'>, JoiSchemaRule<'string'>>
  }
}
