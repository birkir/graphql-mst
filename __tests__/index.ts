import {
  IAnyType,
  IModelType,
  isFrozenType,
  ISimpleType,
  isModelType,
  types,
  UnionStringArray,
} from 'mobx-state-tree';
import { generateFromSchema } from '../src/index';

describe('graphql-mst', () => {
  it('should export a generateFromSchema function', () => {
    expect(typeof generateFromSchema).toBe('function');
  });

  it('should parse schema', () => {
    const schema = `
      type Test {
        foo: String!
      }
    `;

    const { Test } = generateFromSchema(schema);
    expect(Test).toBeTruthy();
    expect(isModelType(Test)).toBe(true);
  });

  it('should throw on syntax error', () => {
    try {
      generateFromSchema('');
      throw new Error();
    } catch (err) {
      expect(err.message).toContain('Syntax Error');
    }
  });

  it('should convert scalars to frozen', () => {
    const schema = `
      scalar JSON
      type Test {
        foo: JSON
      }
    `;
    const { Test } = generateFromSchema(schema);
    expect(isFrozenType(Test.properties.foo)).toBe(true);
  });

  it('should convert string properties', () => {
    const schema = `
      type Test {
        foo: String
      }
    `;
    const result = generateFromSchema(schema);
    const Test: IModelType<{ foo: IAnyType }, {}> = result.Test;
    expect(Test.properties.foo).toBeTruthy();
    expect(typeof Test.properties.foo).toBe(typeof types.string);
  });

  it('should convert enum properties', () => {
    const schema = `
      enum TestEnum {
        FOO
        BAR
      }
      type Test {
        foo: TestEnum
      }
    `;
    const { Test, TestEnum } = generateFromSchema(schema) as {
      Test: any;
      TestEnum: ISimpleType<UnionStringArray<['FOO', 'BAR']>>;
    };
    expect(TestEnum.name).toBe('TestEnum');
    expect(TestEnum.create('FOO')).toBe('FOO');
    try {
      expect(TestEnum.create('BOO' as any)).toBe('BOO');
      throw new Error();
    } catch (err) {
      expect(err.message).toContain('Error while converting');
    }
    expect(typeof (Test as IModelType<{ foo: typeof TestEnum }, {}>).properties.foo).toBe(
      typeof TestEnum
    );
  });

  it('should convert unions', () => {
    const schema = `
      type Foo { foo: String }
      type Bar { bar: String }
      union FooBar = Foo | Bar
      type Test {
        baz: FooBar
      }
    `;

    const result = generateFromSchema(schema);
    const Foo: IModelType<{ foo: IAnyType }, {}> = result.Foo;
    const Bar: IModelType<{ bar: IAnyType }, {}> = result.Bar;
    const Test: IModelType<{ baz: IAnyType }, {}> = result.Test;

    expect(Test.create({ baz: Foo.create({ foo: 'foo' }) })).toEqual({
      baz: { foo: 'foo' },
    });

    expect(Test.create({ baz: Bar.create({ bar: 'bar' }) })).toEqual({
      baz: { bar: 'bar' },
    });
  });

  it('should convert complex type', () => {
    const schema = `
      type Foo { foo: String }
      type Test {
        a: String
        b: ID
        c: Int
        d: Float
        e: [String]
        f: Foo
      }
    `;
    const result = generateFromSchema(schema);
    const test = result.Test.create({
      a: 'string',
      b: 'id',
      c: 1,
      d: 1.1,
      e: ['one', 'two'],
      f: {
        foo: 'bar',
      },
    });
    expect(test).toMatchSnapshot();
  });

  it('should convert arrays', () => {
    const schema = `
      type Test {
        a: [String]
        b: [String!]
        c: [String]!
        d: [String!]!
        e: [[String!]]!
      }
    `;
    const { Test } = generateFromSchema(schema);
    expect(Test.properties.a.name).toEqual('((string | null)[] | null)');
    expect(Test.properties.b.name).toEqual('(string[] | null)');
    expect(Test.properties.c.name).toEqual('(string | null)[]');
    expect(Test.properties.d.name).toEqual('string[]');
    expect(Test.properties.e.name).toEqual('string[][]');
  });

  it('should convert interfaces', () => {
    const schema = `
      interface Demo {
        foo: String!
      }
      type Test implements Demo {
        bar: String!
      }
    `;
    const { Test } = generateFromSchema(schema);
    expect(Test.properties.foo.name).toBe('string');
    expect(Test.properties.bar.name).toBe('string');
  });

  it('should convert input types', () => {
    const schema = `
      input TestInput {
        foo: String!
      }
      type Test {
        bar: TestInput
      }
    `;
    const { Test, TestInput } = generateFromSchema(schema);
    expect(TestInput.properties.foo.name).toBe('string');
    expect(Test.properties.bar.name).toBe('(TestInput | null)');
  });

  it('should handle ID types', () => {
    let Test;
    const schema = `
      type Test {
        foo: ID!
        bar: ID
      }
    `;
    Test = generateFromSchema(schema).Test;
    expect(Test.properties.foo.name).toBe('identifier');

    Test = generateFromSchema(schema, { Test: { identifier: 'bar' } }).Test;
    expect(Test.properties.foo.name).toBe('string');
  });

  it('should handle ID types in interfaces', () => {
    const schema = `
      interface TestInterface {
        foo: ID!
      }
      type Test implements TestInterface {
        bar: ID!
      }
    `;
    const { Test } = generateFromSchema(schema);
    expect(Test.properties.foo.name).toBe('string');
    expect(Test.properties.bar.name).toBe('identifier');

    const lookup = types
      .model({
        foos: types.map(Test),
      })
      .actions(self => ({ add: item => self.foos.put(item) }))
      .create({ foos: {} });

    lookup.add({ foo: '10', bar: '1' });
    lookup.add({ foo: '20', bar: '2' });

    expect(lookup.foos.get('1')).toEqual({ foo: '10', bar: '1' });
    expect(lookup.foos.get('2')).toEqual({ foo: '20', bar: '2' });
  });
});

// type Foo {
//   foo: String
// }

// type Bar {
//   bar: String
// }

// union TestUnion = Foo | Bar

// enum Baz {
//   FOO
//   BAR
// }

// interface Character {
//   id: ID!
//   name: String!
// }

// type Human implements Character {
//   id: ID!
//   name: String!
//   totalCredits: Int
// }

// type Droid implements Character {
//   id: ID!
//   bleh: ID!
//   primaryFunction: String
// }

// type Demo {
//   a: String!
//   aa: String
//   b: [String!]!
//   bb: [String!]
//   bbb: [String]!
//   bbbb: [String]
//   bbbbb: [[[String!]!]!]!
//   c: TestUnion
//   d: [Foo]
//   e: Bar
//   f: Baz
//   g: Droid
//   h(yo: UserInput): Human
//   u: UserInput
// }
