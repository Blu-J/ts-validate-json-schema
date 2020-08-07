import { asSchemaMatcher } from ".";

test("invalid type will throw", () => {
  expect(() => {
    asSchemaMatcher({ type: "invalid" } as any);
  }).toThrowErrorMatchingInlineSnapshot(`"Unknown schema: \\"invalid\\""`);
});

test("throws invalid type will throw recursive", () => {
  expect(() => {
    let x: any = {};
    x["x"] = x;
    asSchemaMatcher(x as any);
  }).toThrowErrorMatchingInlineSnapshot(
    `"Unknown schema shape: [object Object]"`
  );
});

test("Validate simple object", () => {
  const matcher = asSchemaMatcher({
    type: "object",
  });
  matcher.unsafeCast({});
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
    expect(() =>
      testMatcher.unsafeCast("calculator")
    ).toThrowErrorMatchingInlineSnapshot(
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
      matchTestSchema.unsafeCast({});
    }).toThrowErrorMatchingInlineSnapshot(
      `"Failed type: shape(hasProperty@productId(), hasProperty@productName(), hasProperty@price(), hasProperty@errors()) given input {}"`
    );
  });
  test("throws for invalid integer", () => {
    expect(() => {
      matchTestSchema.unsafeCast({ ...validShape, productId: "0" });
    }).toThrowErrorMatchingInlineSnapshot(
      `"Failed type: partialShape(@productId(isNumber(\\"0\\"))) given input {\\"errors\\":null,\\"productId\\":\\"0\\",\\"price\\":0.4,\\"productName\\":\\"test\\",\\"tags\\":[\\"a\\"],\\"extras\\":[\\"string\\",4],\\"isProduct\\":false,\\"dimensions\\":{\\"length\\":7,\\"width\\":12,\\"height\\":9.5}}"`
    );
  });

  test("throws for invalid number", () => {
    expect(() => {
      matchTestSchema.unsafeCast({ ...validShape, price: "invalid" });
    }).toThrowErrorMatchingInlineSnapshot(
      `"Failed type: partialShape(@price(isNumber(\\"invalid\\"))) given input {\\"errors\\":null,\\"productId\\":0,\\"price\\":\\"invalid\\",\\"productName\\":\\"test\\",\\"tags\\":[\\"a\\"],\\"extras\\":[\\"string\\",4],\\"isProduct\\":false,\\"dimensions\\":{\\"length\\":7,\\"width\\":12,\\"height\\":9.5}}"`
    );
  });

  test("throws for invalid string", () => {
    expect(() => {
      matchTestSchema.unsafeCast({ ...validShape, productName: 0 });
    }).toThrowErrorMatchingInlineSnapshot(
      `"Failed type: partialShape(@productName(string(0))) given input {\\"errors\\":null,\\"productId\\":0,\\"price\\":0.4,\\"productName\\":0,\\"tags\\":[\\"a\\"],\\"extras\\":[\\"string\\",4],\\"isProduct\\":false,\\"dimensions\\":{\\"length\\":7,\\"width\\":12,\\"height\\":9.5}}"`
    );
  });

  test("throws for invalid array value", () => {
    expect(() => {
      matchTestSchema.unsafeCast({ ...validShape, tags: [0] });
    }).toThrowErrorMatchingInlineSnapshot(
      `"Failed type: partialShape(@tags(arrayOf(@{i}(string(0))))) given input {\\"errors\\":null,\\"productId\\":0,\\"price\\":0.4,\\"productName\\":\\"test\\",\\"tags\\":[0],\\"extras\\":[\\"string\\",4],\\"isProduct\\":false,\\"dimensions\\":{\\"length\\":7,\\"width\\":12,\\"height\\":9.5}}"`
    );
  });

  test("throws for invalid array", () => {
    expect(() => {
      matchTestSchema.unsafeCast({ ...validShape, extras: "invalid" });
    }).toThrowErrorMatchingInlineSnapshot(
      `"Failed type: partialShape(@extras(isArray(\\"invalid\\"))) given input {\\"errors\\":null,\\"productId\\":0,\\"price\\":0.4,\\"productName\\":\\"test\\",\\"tags\\":[\\"a\\"],\\"extras\\":\\"invalid\\",\\"isProduct\\":false,\\"dimensions\\":{\\"length\\":7,\\"width\\":12,\\"height\\":9.5}}"`
    );
  });

  test("throws for invalid boolean", () => {
    expect(() => {
      matchTestSchema.unsafeCast({ ...validShape, isProduct: "false" });
    }).toThrowErrorMatchingInlineSnapshot(
      `"Failed type: partialShape(@isProduct(boolean(\\"false\\"))) given input {\\"errors\\":null,\\"productId\\":0,\\"price\\":0.4,\\"productName\\":\\"test\\",\\"tags\\":[\\"a\\"],\\"extras\\":[\\"string\\",4],\\"isProduct\\":\\"false\\",\\"dimensions\\":{\\"length\\":7,\\"width\\":12,\\"height\\":9.5}}"`
    );
  });

  test("throws for invalid nested", () => {
    expect(() => {
      matchTestSchema.unsafeCast({
        ...validShape,
        dimensions: {
          width: 12.0,
          height: 9.5,
        },
      });
    }).toThrowErrorMatchingInlineSnapshot(
      `"Failed type: partialShape(@dimensions(shape(hasProperty@length()))) given input {\\"errors\\":null,\\"productId\\":0,\\"price\\":0.4,\\"productName\\":\\"test\\",\\"tags\\":[\\"a\\"],\\"extras\\":[\\"string\\",4],\\"isProduct\\":false,\\"dimensions\\":{\\"width\\":12,\\"height\\":9.5}}"`
    );
  });

  test("Will not fail for a valid shape", () => {
    const testSchema: TestSchema = matchTestSchema.unsafeCast(validShape);
  });
});
