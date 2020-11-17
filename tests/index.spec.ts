import { asSchemaMatcher } from "../src";

test("invalid type will throw", () => {
  expect(() => {
    asSchemaMatcher({ type: "invalid" } as any);
  }).toThrowErrorMatchingInlineSnapshot(`"Unknown schema: invalid"`);
});

test("Validate simple object", () => {
  const schema = {
    type: "object",
  } as const;
  const matcher = asSchemaMatcher(schema);
  type Type = typeof matcher._TYPE;
  const goodValue: Type = {};
  matcher.unsafeCast(goodValue);

  expect(() => {
    // @ts-expect-error
    const test: Type = 5;
    matcher.unsafeCast(test);
  }).toThrowErrorMatchingInlineSnapshot(
    `"Failed type: isObject(5) given input 5"`
  );
});
test("null checking", () => {
  const schema = {
    type: "null",
  } as const;
  const matcher = asSchemaMatcher(schema);
  type Type = typeof matcher._TYPE;
  const goodValue: Type = null;
  matcher.unsafeCast(goodValue);

  expect(() => {
    // @ts-expect-error
    const test: typeof matcher._TYPE = "test";
    matcher.unsafeCast(test);
  }).toThrowErrorMatchingInlineSnapshot(
    `"Failed type: isNill(\\"test\\") given input \\"test\\""`
  );
});

test("Missing schema", () => {
  const matcher = asSchemaMatcher(null);
  type Type = typeof matcher._TYPE;
  const valid = false;
  matcher.unsafeCast(valid);
});
describe("references", () => {
  test("Missing definition for reference in array", () => {
    expect(() => {
      const schema = {
        type: "array",
        items: {
          $ref: "#/definitions/Currencies",
        },
        definitions: {
          Currency: {
            type: "string",
            enum: ["USD", "ETH", "BTC"],
          },
        },
      } as const;
      const matcher = asSchemaMatcher(schema);
      type Type = typeof matcher._TYPE;
    }).toThrowErrorMatchingInlineSnapshot(
      `"Expecting the schema reference be something #/definitions/Currencies in {\\"Currency\\":{\\"type\\":\\"string\\",\\"enum\\":[\\"USD\\",\\"ETH\\",\\"BTC\\"]}}"`
    );
  });

  test("Missing definition for reference in properties", () => {
    expect(() => {
      const schema = {
        type: "object",
        properties: {
          test: {
            $ref: "#/definitions/Currencies",
          },
        },
        definitions: {
          Currency: {
            type: "string",
            enum: ["USD", "ETH", "BTC"],
          },
        },
      } as const;
      const matcher = asSchemaMatcher(schema);
      type Type = typeof matcher._TYPE;
      const test: Type = "test" as never;
    }).toThrowErrorMatchingInlineSnapshot(
      `"Expecting the schema reference be something #/definitions/Currencies in {\\"Currency\\":{\\"type\\":\\"string\\",\\"enum\\":[\\"USD\\",\\"ETH\\",\\"BTC\\"]}}"`
    );
  });

  describe("Top level reference", () => {
    const schema = {
      $schema: "http://json-schema.org/draft-07/schema#",
      title: "Array_of_JsonRpcResponse",
      $ref: "#/definitions/Currency",
      definitions: {
        Currency: {
          type: "string",
          enum: ["USD", "ETH", "BTC"],
        },
      },
    } as const;
    const matcher = asSchemaMatcher(schema);
    type Type = typeof matcher._TYPE;

    test("valid", () => {
      const value: Type = "USD";
      matcher.unsafeCast(value);
    });
  });
  describe("Top level all of", () => {
    const schema = {
      $schema: "http://json-schema.org/draft-07/schema#",
      title: "Array_of_JsonRpcResponse",
      allOf: [{ $ref: "#/definitions/Currency" }],
      definitions: {
        Currency: {
          type: "string",
          enum: ["USD", "ETH", "BTC"],
        },
      },
    } as const;
    const matcher = asSchemaMatcher(schema);
    type Type = typeof matcher._TYPE;

    test("valid", () => {
      const value: Type = "USD";
      matcher.unsafeCast(value);
    });
    expect(() => {
      // @ts-expect-error
      const input: Type = "BadCurrency";
      expect(matcher.unsafeCast(input));
    }).toThrowErrorMatchingInlineSnapshot(
      `"Failed type: some(literal[USD](\\"BadCurrency\\"), literal[ETH](\\"BadCurrency\\"), literal[BTC](\\"BadCurrency\\")) given input \\"BadCurrency\\""`
    );
  });
  test("definitions not an object", () => {
    expect(() => {
      const schema = {
        type: "array",
        items: {
          $ref: "#/definitions/Currency",
        },
        definitions: true,
      } as const;
      const matcher = asSchemaMatcher(schema);
    }).toThrowErrorMatchingInlineSnapshot(`"Expecting some definitions"`);
  });
  describe("Complicated Schema", () => {
    const definitions = {
      Currency: {
        type: "string",
        description: "currencies available",
        enum: ["USD", "ETH", "BTC"],
      },
      ExecutionRequest: {
        type: "object",
        description: "currencies available",
        required: ["limit", "request_id"],
        properties: {
          limit: {
            type: "integer",
            format: "int64",
          },
          request_id: {
            type: "string",
            format: "uuid",
          },
        },
      },
      ExecutionResponse: {
        type: "object",
        required: ["price", "request_id"],
        properties: {
          price: {
            type: "string",
          },
          request_id: {
            type: "string",
            format: "uuid",
          },
        },
      },
      HandlerResult: {
        anyOf: [
          {
            type: "object",
            required: ["P3KSendRequest"],
            properties: {
              P3KSendRequest: {
                $ref: "#/definitions/Result_of_QuoteResponse_or_String",
              },
            },
          },
          {
            type: "object",
            required: ["P3KExecuteQuote"],
            properties: {
              P3KExecuteQuote: {
                $ref: "#/definitions/Result_of_ExecutionResponse_or_String",
              },
            },
          },
          {
            type: "object",
            required: ["P3KQuotes"],
            properties: {
              P3KQuotes: {
                $ref: "#/definitions/Result_of_Array_of_QuoteRequest_or_String",
              },
            },
          },
          {
            type: "object",
            required: ["P3KExecutedQuotes"],
            properties: {
              P3KExecutedQuotes: {
                $ref:
                  "#/definitions/Result_of_Array_of_ExecutionRequest_or_String",
              },
            },
          },
        ],
      },
      JsonRpcResponse: {
        type: "object",
        required: ["id", "result"],
        properties: {
          id: true,
          result: {
            $ref: "#/definitions/HandlerResult",
          },
        },
      },
      QuoteRequest: {
        type: "object",
        required: [
          "base_currency",
          "quote_currency",
          "request_id",
          "side",
          "size",
        ],
        properties: {
          base_currency: {
            $ref: "#/definitions/Currency",
          },
          quote_currency: {
            $ref: "#/definitions/Currency",
          },
          request_id: {
            type: "string",
            format: "uuid",
          },
          side: {
            $ref: "#/definitions/Side",
          },
          size: {
            type: "integer",
            format: "int64",
          },
          size_in_quote: {
            type: ["boolean", "null"],
          },
        },
      },
      QuoteResponse: {
        type: "object",
        required: ["expiration_time", "price", "request_id", "size"],
        properties: {
          expiration_time: {
            type: "string",
            format: "date-time",
          },
          price: {
            type: "string",
          },
          request_id: {
            type: "string",
            format: "uuid",
          },
          size: {
            type: "integer",
            format: "int64",
          },
        },
      },
      Result_of_Array_of_ExecutionRequest_or_String: {
        oneOf: [
          {
            type: "object",
            required: ["Ok"],
            properties: {
              Ok: {
                type: "array",
                items: {
                  $ref: "#/definitions/ExecutionRequest",
                },
              },
            },
          },
          {
            type: "object",
            required: ["Err"],
            properties: {
              Err: {
                type: "string",
              },
            },
          },
        ],
      },
      Result_of_Array_of_QuoteRequest_or_String: {
        oneOf: [
          {
            type: "object",
            required: ["Ok"],
            properties: {
              Ok: {
                type: "array",
                items: {
                  $ref: "#/definitions/QuoteRequest",
                },
              },
            },
          },
          {
            type: "object",
            required: ["Err"],
            properties: {
              Err: {
                type: "string",
              },
            },
          },
        ],
      },
      Result_of_ExecutionResponse_or_String: {
        oneOf: [
          {
            type: "object",
            required: ["Ok"],
            properties: {
              Ok: {
                $ref: "#/definitions/ExecutionResponse",
              },
            },
          },
          {
            type: "object",
            required: ["Err"],
            properties: {
              Err: {
                type: "string",
              },
            },
          },
        ],
      },
      Result_of_QuoteResponse_or_String: {
        oneOf: [
          {
            type: "object",
            required: ["Ok"],
            properties: {
              Ok: {
                $ref: "#/definitions/QuoteResponse",
              },
            },
          },
          {
            type: "object",
            required: ["Err"],
            properties: {
              Err: {
                type: "string",
              },
            },
          },
        ],
      },
      Side: {
        type: "string",
        enum: ["Buy", "Sell"],
      },
    } as const;
    test("Simple invalidation", () => {
      const schema = {
        type: "array",
        items: {
          $ref: "#/definitions/Currency",
        },
        definitions,
      } as const;
      const matcher = asSchemaMatcher(schema);
      type Type = typeof matcher._TYPE;
      expect(() => {
        const valid: Type = ["ETH"];
        matcher.unsafeCast(valid);
      }).not.toThrow();
      expect(() => {
        // @ts-expect-error
        const input: Type = ["Fun"];
        expect(matcher.unsafeCast(input));
      }).toThrowErrorMatchingInlineSnapshot(
        `"Failed type: arrayOf(@0(some(literal[USD](\\"Fun\\"), literal[ETH](\\"Fun\\"), literal[BTC](\\"Fun\\")))) given input [\\"Fun\\"]"`
      );
    });
    test("Reference Disjoint", () => {
      const schema = {
        type: "array",
        items: {
          $ref: "#/definitions/Result_of_QuoteResponse_or_String",
        },
        definitions,
      } as const;
      const matcher = asSchemaMatcher(schema);
      type Type = typeof matcher._TYPE;
      expect(() => {
        const valid: Type = [
          { Err: "Test" },
          {
            Ok: {
              request_id: "string",
              price: "string",
              size: 5,
              expiration_time: "string",
            },
          },
        ];
        matcher.unsafeCast(valid);
      }).not.toThrow();
      expect(() => {
        // @ts-expect-error
        const input: Type = ["Fun"];
        expect(matcher.unsafeCast(input));
      }).toThrowErrorMatchingInlineSnapshot(
        `"Failed type: arrayOf(@0(isObject(\\"Fun\\"))) given input [\\"Fun\\"]"`
      );
    });
    test("Reference Disjoint array", () => {
      const schema = {
        type: "array",
        items: [
          {
            $ref: "#/definitions/Result_of_QuoteResponse_or_String",
          },
        ],
        definitions,
      } as const;
      const matcher = asSchemaMatcher(schema);
      type Type = typeof matcher._TYPE;
      expect(() => {
        const valid: Type = [
          { Err: "Test" },
          {
            Ok: {
              request_id: "string",
              price: "string",
              size: 5,
              expiration_time: "string",
            },
          },
        ];
        matcher.unsafeCast(valid);
      }).not.toThrow();
      expect(() => {
        // @ts-expect-error
        const input: Type = ["wrongRequest"];
        expect(matcher.unsafeCast(input));
      }).toThrowErrorMatchingInlineSnapshot(
        `"Failed type: arrayOf(@0(isObject(\\"wrongRequest\\"))) given input [\\"wrongRequest\\"]"`
      );
    });
    test("Full shape", () => {
      const schema = {
        type: "array",
        items: {
          $ref: "#/definitions/JsonRpcResponse",
        },
        definitions,
      } as const;
      const matcher = asSchemaMatcher(schema);
      type Type = typeof matcher._TYPE;
      expect(() => {
        const valid: Type = [
          {
            id: "123",
            result: {
              P3KExecuteQuote: {
                Ok: {
                  price: "string",
                  request_id: "string",
                },
              },
            },
          },
        ];
        matcher.unsafeCast(valid);
      }).not.toThrow();
      expect(() => {
        // @ts-expect-error
        const input: Type = ["Fun"];
        expect(matcher.unsafeCast(input));
      }).toThrowErrorMatchingInlineSnapshot(
        `"Failed type: arrayOf(@0(isObject(\\"Fun\\"))) given input [\\"Fun\\"]"`
      );
    });
  });
});

describe("any of types", () => {
  const schema = {
    anyOf: [{ enum: ["a"] }, { enum: ["b"] }],
  } as const;
  const matcher = asSchemaMatcher(schema);
  type Type = typeof matcher._TYPE;
  test("Testing valid a", () => {
    const input: Type = "a";
    matcher.unsafeCast(input);
  });
  test("Testing valid b", () => {
    const input: Type = "b";
    matcher.unsafeCast(input);
  });
  test("Testing invalid", () => {
    // @ts-expect-error
    const input: Type = "c";

    expect(() => matcher.unsafeCast(input)).toThrowErrorMatchingInlineSnapshot(
      `"Failed type: some(literal[a](\\"c\\"), literal[b](\\"c\\")) given input \\"c\\""`
    );
  });
});

describe("all of types", () => {
  const schema = {
    allOf: [
      { type: "object", properties: { a: { enum: ["a"] } }, required: ["a"] },
      { type: "object", properties: { b: { enum: ["b"] } }, required: ["b"] },
    ],
  } as const;
  const matcher = asSchemaMatcher(schema);
  type Type = typeof matcher._TYPE;
  test("Testing valid", () => {
    const input: Type = { a: "a", b: "b" };
    matcher.unsafeCast(input);
  });
  test("Testing invalid partial", () => {
    // @ts-expect-error
    const input: Type = { a: "a" };

    expect(() => matcher.unsafeCast(input)).toThrowErrorMatchingInlineSnapshot(
      `"Failed type: shape(hasProperty@b()) given input {\\"a\\":\\"a\\"}"`
    );
  });
  test("Testing invalid", () => {
    // @ts-expect-error
    const input: Type = { a: "a", b: "e" };

    expect(() => matcher.unsafeCast(input)).toThrowErrorMatchingInlineSnapshot(
      `"Failed type: partialShape(@b(literal[b](\\"e\\"))) given input {\\"a\\":\\"a\\",\\"b\\":\\"e\\"}"`
    );
  });
});

describe("enum types", () => {
  const testSchema = {
    type: ["string"],
    enum: ["red", "amber", "green"],
  } as const;
  const testMatcher = asSchemaMatcher(testSchema);
  type TestMatcher = typeof testMatcher._TYPE;
  test("valid string", () => {
    const input: TestMatcher = "red";
    testMatcher.unsafeCast(input);
  });
  test("invalid string", () => {
    expect(() => {
      // @ts-expect-error
      const invalid: Type = "calculator";
      testMatcher.unsafeCast(invalid);
    }).toThrowErrorMatchingInlineSnapshot(
      `"Failed type: some(literal[red](\\"calculator\\"), literal[amber](\\"calculator\\"), literal[green](\\"calculator\\")) given input \\"calculator\\""`
    );
  });
});

describe("https://json-schema.org/learn/getting-started-step-by-step.html", () => {
  const testSchema = {
    $schema: "http://json-schema.org/draft-07/schema#",
    $id: "http://example.com/product.schema.json",
    title: "Product",
    description: "A product from Acme's catalog",
    type: "object",
    properties: {
      productId: {
        description: "The unique identifier for a product",
        type: "integer",
      },
      productName: {
        description: "Name of the product",
        type: "string",
      },
      isProduct: {
        description: "Name of the product",
        type: "boolean",
      },
      price: {
        description: "The price of the product",
        type: "number",
        exclusiveMinimum: 0,
      },
      tags: {
        description: "Tags for the product",
        type: "array",
        items: {
          type: "string",
        },
        minItems: 1,
        uniqueItems: true,
      },
      extras: {
        description: "Tags for the product",
        type: "array",
        minItems: 1,
        uniqueItems: true,
      },
      errors: {
        type: ["null", "string"],
      },
      dimensions: {
        type: "object",
        properties: {
          length: {
            type: "number",
          },
          width: {
            type: "number",
          },
          height: {
            type: "number",
          },
        },
        required: ["length", "width", "height"],
      },
    },
    required: ["productId", "productName", "price", "errors"],
  } as const;

  const matchTestSchema = asSchemaMatcher(testSchema);
  type TestSchema = typeof matchTestSchema._TYPE;
  const validShape: TestSchema = {
    errors: null,
    productId: 0,
    price: 0.4,
    productName: "test",
    tags: ["a"],
    extras: ["string", 4],
    isProduct: false,
    dimensions: {
      length: 7.0,
      width: 12.0,
      height: 9.5,
    },
  };

  test("throws for missing requireds", () => {
    expect(() => {
      // @ts-expect-error
      const invalid: TestSchema = {};
      matchTestSchema.unsafeCast(invalid);
    }).toThrowErrorMatchingInlineSnapshot(
      `"Failed type: shape(hasProperty@productId(), hasProperty@productName(), hasProperty@price(), hasProperty@errors()) given input {}"`
    );
  });
  test("throws for invalid integer", () => {
    expect(() => {
      // @ts-expect-error
      const invalid: TestSchema = { ...validShape, productId: "0" };
      matchTestSchema.unsafeCast(invalid);
    }).toThrowErrorMatchingInlineSnapshot(
      `"Failed type: partialShape(@productId(isNumber(\\"0\\"))) given input {\\"errors\\":null,\\"productId\\":\\"0\\",\\"price\\":0.4,\\"productName\\":\\"test\\",\\"tags\\":[\\"a\\"],\\"extras\\":[\\"string\\",4],\\"isProduct\\":false,\\"dimensions\\":{\\"length\\":7,\\"width\\":12,\\"height\\":9.5}}"`
    );
  });

  test("throws for invalid number", () => {
    expect(() => {
      // @ts-expect-error
      const invalid: TestSchema = { ...validShape, price: "invalid" };
      matchTestSchema.unsafeCast(invalid);
    }).toThrowErrorMatchingInlineSnapshot(
      `"Failed type: partialShape(@price(isNumber(\\"invalid\\"))) given input {\\"errors\\":null,\\"productId\\":0,\\"price\\":\\"invalid\\",\\"productName\\":\\"test\\",\\"tags\\":[\\"a\\"],\\"extras\\":[\\"string\\",4],\\"isProduct\\":false,\\"dimensions\\":{\\"length\\":7,\\"width\\":12,\\"height\\":9.5}}"`
    );
  });

  test("throws for invalid string", () => {
    expect(() => {
      // @ts-expect-error
      const invalid: TestSchema = { ...validShape, productName: 0 };
      matchTestSchema.unsafeCast(invalid);
    }).toThrowErrorMatchingInlineSnapshot(
      `"Failed type: partialShape(@productName(string(0))) given input {\\"errors\\":null,\\"productId\\":0,\\"price\\":0.4,\\"productName\\":0,\\"tags\\":[\\"a\\"],\\"extras\\":[\\"string\\",4],\\"isProduct\\":false,\\"dimensions\\":{\\"length\\":7,\\"width\\":12,\\"height\\":9.5}}"`
    );
  });

  test("throws for invalid array value", () => {
    expect(() => {
      // @ts-expect-error
      const invalid: TestSchema = { ...validShape, tags: [0] };
      matchTestSchema.unsafeCast(invalid);
    }).toThrowErrorMatchingInlineSnapshot(
      `"Failed type: partialShape(@tags(arrayOf(@0(string(0))))) given input {\\"errors\\":null,\\"productId\\":0,\\"price\\":0.4,\\"productName\\":\\"test\\",\\"tags\\":[0],\\"extras\\":[\\"string\\",4],\\"isProduct\\":false,\\"dimensions\\":{\\"length\\":7,\\"width\\":12,\\"height\\":9.5}}"`
    );
  });

  test("throws for invalid array", () => {
    expect(() => {
      // @ts-expect-error
      const invalid: TestSchema = { ...validShape, extras: "invalid" };
      matchTestSchema.unsafeCast(invalid);
    }).toThrowErrorMatchingInlineSnapshot(
      `"Failed type: partialShape(@extras(isArray(\\"invalid\\"))) given input {\\"errors\\":null,\\"productId\\":0,\\"price\\":0.4,\\"productName\\":\\"test\\",\\"tags\\":[\\"a\\"],\\"extras\\":\\"invalid\\",\\"isProduct\\":false,\\"dimensions\\":{\\"length\\":7,\\"width\\":12,\\"height\\":9.5}}"`
    );
  });

  test("throws for invalid boolean", () => {
    expect(() => {
      // @ts-expect-error
      const invalid: TestSchema = { ...validShape, isProduct: "false" };
      matchTestSchema.unsafeCast(invalid);
    }).toThrowErrorMatchingInlineSnapshot(
      `"Failed type: partialShape(@isProduct(boolean(\\"false\\"))) given input {\\"errors\\":null,\\"productId\\":0,\\"price\\":0.4,\\"productName\\":\\"test\\",\\"tags\\":[\\"a\\"],\\"extras\\":[\\"string\\",4],\\"isProduct\\":\\"false\\",\\"dimensions\\":{\\"length\\":7,\\"width\\":12,\\"height\\":9.5}}"`
    );
  });

  test("throws for invalid nested", () => {
    expect(() => {
      const invalid: TestSchema = {
        ...validShape,
        // @ts-expect-error
        dimensions: {
          width: 12.0,
          height: 9.5,
        },
      };
      matchTestSchema.unsafeCast(invalid);
    }).toThrowErrorMatchingInlineSnapshot(
      `"Failed type: partialShape(@dimensions(shape(hasProperty@length()))) given input {\\"errors\\":null,\\"productId\\":0,\\"price\\":0.4,\\"productName\\":\\"test\\",\\"tags\\":[\\"a\\"],\\"extras\\":[\\"string\\",4],\\"isProduct\\":false,\\"dimensions\\":{\\"width\\":12,\\"height\\":9.5}}"`
    );
  });

  test("Will not fail for a valid shape", () => {
    const testSchema: TestSchema = matchTestSchema.unsafeCast(validShape);
  });
});
