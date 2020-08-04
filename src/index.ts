
import { default as matches, Validator } from "ts-matches";



const matchSchemaObject = matches.every(
  matches.shape({
    type: matches.literal("object"),
  }),
  matches.partial({
    required: matches.arrayOf(matches.string),
    properties: matches.object,
  })
);
const matchSchemaString = matches.shape({
  type: matches.literal("string"),
});
const matchSchemaInteger = matches.shape({
  type: matches.some(matches.literal("integer"), matches.literal("number")),
});
const matchSchemaBool = matches.shape({
  type: matches.literal("boolean"),
});
const matchSchemaArray = matches.every(
  matches.shape({
    type: matches.literal("array"),
  }),
  matches.partial({
    items: matches.shape({
      type: matches.string,
    }),
  })
);
type SchemaString = typeof matchSchemaString._TYPE;
type SchemaInteger = typeof matchSchemaInteger._TYPE;
type SchemaBool = typeof matchSchemaBool._TYPE;
type SchemaArray<U extends Schema> = {
  type: "array";
} & (U extends unknown
  ? {}
  : {
      items: U;
    });
type SchemaObject<T extends { [key: string]: Schema }> = {
  type: "object";
  readonly required?: readonly (keyof T & string)[];
  properties?: T;
};

type AnyInLiteral<T extends any[] | readonly any[]> = T[number];
type SchemaTypeForObject<A> = A extends SchemaObject<infer B>
  ? A["required"] extends infer C
    ? C extends readonly (keyof B & string)[]
      ? {
          [K in Exclude<keyof B, AnyInLiteral<C>>]?: SchemaType<B[K]>;
        } &
          {
            [K in keyof B & AnyInLiteral<C>]: SchemaType<B[K]>;
          }
      : never
    : { [K in keyof B]?: SchemaType<B[K]> }
  : never;

type Schema =
  | SchemaString
  | SchemaInteger
  | SchemaObject<any>
  | SchemaBool
  | SchemaArray<any>;

export type SchemaTop = { [key: string]: unknown } & Schema;

export type SchemaType<T extends SchemaTop> = T extends SchemaObject<any>
  ? SchemaTypeForObject<T>
  : T extends SchemaInteger
  ? number
  : T extends SchemaString
  ? string
  : T extends SchemaBool
  ? boolean
  : T extends SchemaArray<infer U>
  ? Array<SchemaType<U>>
  : never;

export function asSchemaMatcher<T extends SchemaTop>(
  schema: T
): Validator<SchemaType<T>> {
  const matcher = matches<Validator<any>>(schema)
    .when(matchSchemaInteger, (_) => matches.number)
    .when(matchSchemaObject, (schemaObject) => {
      const properties = schemaObject.properties || {};
      const propertyKeys = Object.keys(properties)
      const required = schemaObject.required || [];
      let requireds: {[key: string]: Validator<unknown>} = {};
      let partials: {[key: string]: Validator<unknown>} = {};

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
    .when(matchSchemaString, (_) => matches.string)
    .when(matchSchemaBool, (_) => matches.boolean)
    .when(matchSchemaArray, (a) => {
      if (a.items) {
        return matches.arrayOf(asSchemaMatcher(a.items as Schema));
      }
      return matches.arrayOf(matches.any);
    })
    .defaultToLazy(() =>
      matches.guard((_) => false, "typeMatcherNotFound")
    ) as any;
  return matcher;
}

