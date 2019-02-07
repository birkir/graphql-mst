import { generateFromSchema } from '../src/index';
import {
  isModelType,
  isFrozenType,
  types,
  IModelType,
  IAnyType,
  ISimpleType,
  UnionStringArray,
  ITypeUnion,
} from 'mobx-state-tree';

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
      enum Test {
        FOO
        BAR
      }
    `;
    const result = generateFromSchema(schema);
    const Test: ISimpleType<UnionStringArray<['FOO', 'BAR']>> = result.Test;
    expect(Test.name).toBe('Test');
    expect(Test.create('FOO')).toBe('FOO');
    try {
      expect(Test.create('BOO' as any)).toBe('BOO');
      throw new Error();
    } catch (err) {
      expect(err.message).toContain('Error while converting');
    }
  });

  it('should convert unions', () => {
    const schema = `
      type Foo { foo: String }
      type Bar { bar: String }
      union Test = Foo | Bar
    `;

    const result = generateFromSchema(schema);
    const Foo: IModelType<{ foo: IAnyType }, {}> = result.Foo;
    const Bar: IModelType<{ bar: IAnyType }, {}> = result.Bar;
    const Test: ITypeUnion<any, any, any> = result.Test;
    expect(Test.create(Foo)).toBe(Foo);
    expect(Test.create(Bar)).toBe(Bar);
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
});
