import { Schema } from '@hapi/joi'
import {
  JoiSchema,
  JoiSchemaRule,
  JoiSchemaRuleName,
  JoiSchemaTerms,
  JoiSchemaType,
} from './types'

export const isSchemaType = <Type extends string>(
  schema: Schema,
  type: Type
): schema is Type extends JoiSchemaType
  ? JoiSchema<Type>
  : JoiSchema<'any'> => {
  return (
    schema.type === type ||
    schema.$_terms.metas.some((meta: any) => meta.baseType === type)
  )
}

export const isRuleName = <
  Type extends JoiSchemaType,
  Name extends JoiSchemaRuleName<Type>
>(
  rule: JoiSchemaRule<Type>,
  name: Name
): rule is JoiSchemaRule<Type, Name> => {
  return rule.name === name
}

export const isDeprecated = (schema: Schema): boolean => {
  return schema.$_terms.metas.some((meta: any) => meta.deprecated === true)
}

export const extractAlternativeSchemas = (
  conditionals: NonNullable<
    JoiSchemaTerms<'any'>['whens'] | JoiSchemaTerms<'alternatives'>['matches']
  >
): Schema[] => {
  const alternativeSchemas: Schema[] = []

  for (const conditional of conditionals) {
    if (conditional.ref) {
      if (conditional.then) {
        alternativeSchemas.push(conditional.then)
      }
      if (conditional.otherwise) {
        alternativeSchemas.push(conditional.otherwise)
      }
      if (conditional.switch) {
        for (const switchCase of conditional.switch) {
          alternativeSchemas.push(switchCase.then)
          if (switchCase.otherwise) {
            alternativeSchemas.push(switchCase.otherwise)
          }
        }
      }
    } else if ('schema' in conditional && conditional.schema) {
      alternativeSchemas.push(conditional.schema)
    }
  }

  return alternativeSchemas
}

export const getMetas = <
  Metas extends { [key: string]: any } = { [key: string]: any }
>(
  schema: JoiSchema<'any'>
): Metas => {
  return (schema.$_terms as JoiSchemaTerms<JoiSchemaType>).metas.reduce<Metas>(
    (metas, meta) => {
      if (typeof meta === 'object' && !Array.isArray(meta)) {
        Object.assign(metas, meta)
      }

      return metas
    },
    {} as Metas
  )
}

export const toStringPattern = (regex: RegExp): string => {
  return String(regex).slice(1, -1)
}
