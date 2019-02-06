graphql-mst
===========

Convert GraphQL Schema to mobx-state-tree models.

See demos in [tests folder](https://github.com/birkir/graphql-mst/blob/master/__testss__/index.ts)

### Installing

```
yarn add graphql-mst
# or
npm install graphql-mst
```

### Usage

```ts
const schema = `
  type Foo {
    a: String
    b: Int
  }
  type Bar {
    c: [Foo]
  }
`;

const { Foo, Bar } = generateFromSchema(schema);

const foo = Foo.create({
  a: 'Hello',
  b: 10,
});

const bar = Bar.create({
  c: [foo, { a: 'World', b: 20 }],
});
```
