import { default as matches, Validator } from "ts-matches";

const matchStringType = matches.literal("string");
const matchNumberType = matches.literal("number");
const matchIntegerType = matches.literal("integer");
const matchObjectType = matches.literal("object");
const matchArrayType = matches.literal("array");
const matchBooleanType = matches.literal("boolean");
const matchNullType = matches.literal("null");

type AnyInLiteral<T extends Readonly<any> | Array<any>> = T[number];

type TypeString = typeof matchStringType._TYPE;
type TypeNumber = typeof matchNumberType._TYPE;
type TypeInteger = typeof matchIntegerType._TYPE;
type TypeObject = typeof matchObjectType._TYPE;
type TypeArray = typeof matchArrayType._TYPE;
type TypeBoolean = typeof matchBooleanType._TYPE;
type TypeNull = typeof matchNullType._TYPE;

type SchemaTypes =
  | TypeString
  | TypeNumber
  | TypeInteger
  | TypeObject
  | TypeArray
  | TypeBoolean
  | TypeNull
  | Array<SchemaTypes>
  | ReadonlyArray<SchemaTypes>;

const matchTypeShape = matches.shape({ type: matches.any });
const matchItems = matches.shape({ items: matches.object });
const matchPrortiesShape = matches.shape({
  properties: matches.object,
});
const matchRequireds = matches.shape({
  required: matches.arrayOf(matches.string),
});
const matchEnum = matches.shape({
  enum: matches.arrayOf(
    matches.some(matches.string, matches.number, matches.boolean, matches.nill)
  ),
});

type ItemType<T> = T extends { items: infer U }
  ? Array<FromSchema<U>> | ReadonlyArray<FromSchema<U>>
  : unknown;
// prettier-ignore
type PropertiesType<T> = 
  T extends { properties: infer U; required: infer V } ? (
    V extends (Array<keyof U & string> | ReadonlyArray<keyof U & string>) ? 
    (
      & {
        [K in Exclude<keyof U, AnyInLiteral<V>>]?: FromSchema<U[K]>;
      }
      & {
        [K in keyof U & AnyInLiteral<V>]: FromSchema<U[K]>;
      }
    ):
    never
  ):
  T extends { properties: infer U } ? { [K in keyof U]?: FromSchema<U[K]>; }
  : unknown;
type EnumType<T> = T extends { enum: infer U } ? AnyInLiteral<U> : unknown;
// prettier-ignore
type FromTypeRaw<T> =
  T extends (TypeInteger | TypeNumber) ? number :
  T extends TypeString ? string :
  T extends TypeBoolean ? boolean :
  T extends TypeNull ? null :
  T extends TypeObject ? object :
  T extends TypeArray ? Array<unknown> :
  never
// prettier-ignore
type FromTypeProp<T> =
  T extends Array<infer U> | ReadonlyArray<infer U> ? FromTypeRaw<U> :
  FromTypeRaw<T>
type FromType<T> = T extends { type: infer Type }
  ? FromTypeProp<Type>
  : unknown;

/**
 * This schema is to pull out the typescript type from a json Schema
 */
export type FromSchema<T> = FromType<T> &
  PropertiesType<T> &
  ItemType<T> &
  EnumType<T>;
type TestA = {
  enum: ["red"];
};
type Test = FromSchema<{
  enum: ["red"];
}>;
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
export function asSchemaMatcher<T>(schema: T): Validator<FromSchema<T>> {
  if (!matchTypeShape.test(schema)) {
    throw new Error(`Unknown schema shape: ${tryJson(schema)}`);
  }
  return matches.every(
    matchTypeFrom(schema.type),
    matchRequiredFrom(schema),
    matchPropertiesFrom(schema),
    matchItemsFrom(schema),
    matchEnumFrom(schema)
  );
}

function matchItemsFrom(schema: unknown): Validator<any> {
  if (!matchItems.test(schema)) {
    return matches.any;
  }
  return matches.arrayOf(asSchemaMatcher(schema.items));
}

function matchRequiredFrom(schema: unknown): Validator<any> {
  if (!matchRequireds.test(schema)) {
    return matches.any;
  }
  let requireds: { [key: string]: Validator<unknown> } = {};

  for (const key of schema.required) {
    requireds[key] = matches.any;
  }

  return matches.shape(requireds);
}

function matchPropertiesFrom(schema: unknown): Validator<any> {
  if (!matchPrortiesShape.test(schema)) {
    return matches.any;
  }
  const properties = schema.properties;
  const propertyKeys = Object.keys(properties);
  let shape: { [key: string]: Validator<unknown> } = {};

  for (const key of propertyKeys) {
    const matcher = asSchemaMatcher((properties as any)[key]);
    shape[key] = matcher;
  }
  return matches.partial(shape);
}

function matchEnumFrom(schema: unknown): Validator<any> {
  if (!matchEnum.test(schema)) {
    return matches.any;
  }
  return matches.some(...schema.enum.map((x) => matches.literal(x)));
}

function matchTypeFrom(type: unknown): Validator<any> {
  if (matches.arrayOf(matches.any).test(type)) {
    return matches.some(...type.map(matchTypeFrom));
  }
  return matches<Validator<any>>(type)
    .when(matchIntegerType, () => matches.number)
    .when(matchNumberType, () => matches.number)
    .when(matchObjectType, () => matches.object)
    .when(matchStringType, () => matches.string)
    .when(matchBooleanType, () => matches.boolean)
    .when(matchNullType, () => matches.nill)
    .when(matchArrayType, (a) => {
      return matches.arrayOf(matches.any);
    })
    .defaultToLazy(() => {
      throw new Error(`Unknown schema: ${tryJson(type)}`);
    });
}
