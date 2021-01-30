import { default as matches, Validator } from "ts-matches";

const matchStringType = matches.literal("string");
const matchNumberType = matches.literal("number");
const matchIntegerType = matches.literal("integer");
const matchObjectType = matches.literal("object");
const matchArrayType = matches.literal("array");
const matchBooleanType = matches.literal("boolean");
const matchNullType = matches.literal("null");

type _<T> = T;
// prettier-ignore
export type MergeAll<T> = 
  T extends ReadonlyArray<infer U>
    ? ReadonlyArray<MergeAll<U>> 
    : T extends object 
      ? T extends null | undefined | never 
        ? T 
        : _<{ [k in keyof T]: MergeAll<T[k]> }> 
      : T;

type AnyInLiteral<T extends Readonly<any> | Array<any>> = T[number];

type TypeString = typeof matchStringType._TYPE;
type TypeNumber = typeof matchNumberType._TYPE;
type TypeInteger = typeof matchIntegerType._TYPE;
type TypeObject = typeof matchObjectType._TYPE;
type TypeArray = typeof matchArrayType._TYPE;
type TypeBoolean = typeof matchBooleanType._TYPE;
type TypeNull = typeof matchNullType._TYPE;

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
const matchRef = matches.shape({
  $ref: matches.string,
});
const matchAnyOf = matches.some(matches.shape({
  anyOf: matches.arrayOf(matches.object),
}),matches.shape({
  oneOf: matches.arrayOf(matches.object),
}));
const matchAllOf = matches.shape({
  allOf: matches.arrayOf(matches.object),
});

// prettier-ignore
type ItemType<T, D> = T extends { items: infer U }
  ? ReadonlyArray<FromSchema<U, D>>
  : unknown;
// prettier-ignore
type PropertiesType<T, D> = 
  T extends { properties: infer U; required: infer V } ? (
    V extends (Array<keyof U & string> | ReadonlyArray<keyof U & string>) ? 
    (
      & {
        [K in Exclude<keyof U, AnyInLiteral<V>>]?: FromSchema<U[K], D>;
      }
      & {
        [K in keyof U & AnyInLiteral<V>]: FromSchema<U[K], D>;
      }
    ):
    never
  ):
  T extends { properties: infer U } ? { [K in keyof U]?: FromSchema<U[K], D>; }
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
type AnyOfType<T, D> = 
  T extends { anyOf: Array<infer U> | ReadonlyArray<infer U> } | { oneOf: Array<infer U> | ReadonlyArray<infer U>}
    ? FromSchema<U, D>
    : unknown;

// prettier-ignore
type AllTuple<T, D> = 
  T extends [infer A] | readonly [infer A] ? FromSchema<A, D>
  : T extends [infer A, ...infer B] | readonly [infer A, ...infer B] ? (FromSchema<A, D> & AllTuple<B, D>)
  : never
// prettier-ignore
type AllOfType<T, D> = T extends { allOf: infer U }
  ? (
    AllTuple<U, D>
  ) 
  : unknown;


// prettier-ignore
type FromTypeProp<T> =
  T extends Array<infer U> | ReadonlyArray<infer U> ? FromTypeRaw<U> :
  FromTypeRaw<T>
type FromType<T> = T extends { type: infer Type }
  ? FromTypeProp<Type>
  : unknown;

// prettier-ignore
type MatchReference<T, D> =
  T extends { $ref: `#/definitions/${infer Reference}`} ? (
    Reference extends keyof D ?  FromSchema<D[Reference], D> : never
  ) : unknown

// prettier-ignore
type Definitions<T> =
    T extends { definitions: infer U} ? (
      U extends {} ? U : never
    ) : {}

type Any<T> = T extends true ? any : unknown
/**
 * This schema is to pull out the typescript type from a json Schema
 */
// prettier-ignore
export type FromSchema<T, D> = 
  T extends ReadonlyArray<infer U> ? FromSchema<U, D> :
  (
    MatchReference<T, D> &
    Any<T> &
    FromType<T> &
    PropertiesType<T, D> &
    ItemType<T, D> &
    EnumType<T> &
    AnyOfType<T, D> &
    AllOfType<T, D>
  );

export type FromSchemaTop<T> = MergeAll<FromSchema<T, Definitions<T>>>

/**
 * This is the main function. Use this to turn a json-schema into a validator. Is
 * built on the ts-matches validator since that is a validator that also gives the
 * types out for typescript.
 * @param schema So this is a json schema that we want to turn into a validator
 */
export function asSchemaMatcher<T>(schema: T, definitions?: unknown): Validator<FromSchemaTop<T>> {
  const coalesceDefinitions = definitions || (schema as any)?.definitions || null;
  if(Array.isArray(schema)){ 
    return matchAllOfFrom(
      {
        allOf: schema
      },
      definitions
    );
  }
  return matches.every(
    matchReferenceFrom(schema, coalesceDefinitions),
    matchTypeFrom(schema, coalesceDefinitions),
    matchRequiredFrom(schema, coalesceDefinitions),
    matchPropertiesFrom(schema, coalesceDefinitions),
    matchItemsFrom(schema, coalesceDefinitions),
    matchEnumFrom(schema, coalesceDefinitions),
    matchAnyOfFrom(schema, coalesceDefinitions),
    matchAllOfFrom(schema, coalesceDefinitions)
  );
}

function matchItemsFrom(schema: unknown, definitions: any): Validator<any> {
  if (!matchItems.test(schema)) {
    return matches.any;
  }
  return matches.arrayOf(asSchemaMatcher<any>(schema.items, definitions));
}

function matchRequiredFrom(schema: unknown, definitions: any): Validator<any> {
  if (!matchRequireds.test(schema)) {
    return matches.any;
  }
  let requireds: { [key: string]: Validator<unknown> } = {};

  for (const key of schema.required) {
    requireds[key] = matches.any;
  }

  return matches.shape(requireds);
}

function matchAnyOfFrom(schema: unknown, definitions: any): Validator<any> {
  if (!matchAnyOf.test(schema)) {
    return matches.any;
  }
  if ("anyOf" in schema) {
    return matches.some(...schema.anyOf.map(x => asSchemaMatcher<any>(x, definitions)));
  }
  return matches.some(...schema.oneOf.map(x => asSchemaMatcher<any>(x, definitions)));
}

function matchAllOfFrom(schema: unknown, definitions: any): Validator<any> {
  if (!matchAllOf.test(schema)) {
    return matches.any;
  }
  return matches.every(...schema.allOf.map(x => asSchemaMatcher<any>(x, definitions)));
}

function matchPropertiesFrom(schema: unknown, definitions: any): Validator<any> {
  if (!matchPrortiesShape.test(schema)) {
    return matches.any;
  }
  const properties = schema.properties;
  const propertyKeys = Object.keys(properties);
  let shape: { [key: string]: Validator<unknown> } = {};

  for (const key of propertyKeys) {
    const matcher = asSchemaMatcher<any>((properties as any)[key], definitions);
    shape[key] = matcher;
  }
  return matches.partial(shape);
}

function matchEnumFrom(schema: unknown, definitions: any): Validator<any> {
  if (!matchEnum.test(schema)) {
    return matches.any;
  }
  return matches.some(...schema.enum.map((x) => matches.literal(x)));
}

function matchReferenceFrom(schema: unknown, definitions: any): Validator<any> {
  if (!matchRef.test(schema)) {
    return matches.any;
  }
  if (!matches.object.test(definitions)) {
    throw new TypeError("Expecting some definitions");
  }
  const referenceId = schema.$ref.replace(/^#\/definitions\//,'');
  const referenceSchema = referenceId in definitions && (definitions as any)[referenceId];
  if (!referenceId || !referenceSchema) {
    throw new TypeError(`Expecting the schema reference be something ${schema.$ref} in ${JSON.stringify(definitions)}`);
  }
  return asSchemaMatcher(referenceSchema, definitions);
}

function matchTypeFrom(schema: unknown, definitions: any): Validator<any> {
  if (!matchTypeShape.test(schema)) {
    return matches.any;
  }
  const type = schema.type;
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
    .when(matchArrayType, () => {
      return matches.arrayOf(matches.any);
    })
    .defaultToLazy(() => {
      throw new Error(`Unknown schema: ${type}`);
    });
}