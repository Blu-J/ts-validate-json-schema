import { default as matches, Validator } from "ts-matches";

const matchStringType = matches.literal("string")
const matchNumberType = matches.literal("number")
const matchIntegerType = matches.literal("integer")
const matchObjectType = matches.literal("object")
const matchArrayType = matches.literal("array")
const matchBooleanType = matches.literal("boolean")
const matchNullType = matches.literal("null")


type TypeString = typeof matchStringType._TYPE
type TypeNumber = typeof matchNumberType._TYPE
type TypeInteger = typeof matchIntegerType._TYPE
type TypeObject = typeof matchObjectType._TYPE
type TypeArray = typeof matchArrayType._TYPE
type TypeBoolean = typeof matchBooleanType._TYPE
type TypeNull = typeof matchNullType._TYPE

type SchemaTypes =
  | TypeString
  | TypeNumber
  | TypeInteger
  | TypeObject
  | TypeArray
  | TypeBoolean
  | TypeNull
  | Array<SchemaTypes>
  | ReadonlyArray<SchemaTypes>
type Schema = {
  type: SchemaTypes
}

/**
 * This is a JSON schema duck shaped, so we care about what we are looking for, and
 * won't throw for extras added
 */
export type SchemaDuck = { [key: string]: unknown } & Schema;
const matchItems = matches.shape({items: matches.object})
type ArrayType<T> = T extends { items: infer U } ? FromType<U> : unknown
const matchPrortiesShape = matches.shape({
  properties: matches.object
})
type PropertiesType<T> =
  T extends { properties: infer U } ? { [Key in (keyof U) & string]: FromType<U[Key]> } : unknown
const matchRequireds = matches.shape({
  requireds: matches.arrayOf(matches.string)
})
type RequiredTypes<T> = T extends { required: ReadonlyArray<infer U> | Array<infer U> } ? (
  U extends string ? { [Key in U]: unknown } : never
) : unknown

/**
 * This schema is to pull out the typescript type from a json Schema
 */
// pretier-ignore
export type FromType<T> =
  T extends { type: infer Type } ? (
    Type extends TypeInteger | TypeNumber ? number :
    Type extends TypeString ? string :
    Type extends TypeBoolean ? boolean :
    Type extends TypeNull ? null :
    Type extends TypeObject ? (object & PropertiesType<T> & RequiredTypes<T>) :
    Type extends TypeArray ? Array<ArrayType<T>> :
    never
  ) : never


function tryJson(x: unknown) {
  try {
    return JSON.stringify(x);
  } catch (e) {
    return "" + x;
  }
}

/**
 * This is the main function. Use this to turn a json-schema into a validator. Is
 * built on the ts-matches validator since that is a validator that also gives the
 * types out for typescript.
 * @param schema So this is a json schema that we want to turn into a validator
 */
export function asSchemaMatcher<T extends SchemaDuck>(
  schema: T
): Validator<FromType<T>> {
  const matcher = matches<Validator<any>>(schema.type)
    .when(matchIntegerType, (_) => matches.number)
    .when(matchObjectType, (schemaObject) => {
      const properties = matches<object>(schemaObject).when(matchPrortiesShape, ({properties}) => properties).defaultToLazy(() => ({}))
      const propertyKeys = Object.keys(properties);
      const required = matches<string[]>(schemaObject).when(matchRequireds, ({requireds}) => requireds).defaultToLazy(() => [])
      let requireds: { [key: string]: Validator<unknown> } = {};
      let partials: { [key: string]: Validator<unknown> } = {};

      for (const key of propertyKeys) {
        const matcher = asSchemaMatcher((properties as any)[key]);
        if (required.indexOf(key) !== -1) {
          requireds[key] = matcher;
        } else {
          partials[key] = matcher;
        }
      }

      return matches.every(matches.shape(requireds), matches.partial(partials));
    })
    .when(matchStringType, (_) => matches.string)
    .when(matchBooleanType, (_) => matches.boolean)
    .when(matchNullType, (_) => matches.nill)
    .when(matchArrayType, (a) => {
      if (matchItems.test(a)) {
        return matches.arrayOf(asSchemaMatcher(a.items as Schema));
      }
      return matches.arrayOf(matches.any);
    })
    .defaultToLazy(() => {
      throw new Error(`Unknown schema: ${tryJson(schema)}`);
    }) as any;
  return matcher;
}
