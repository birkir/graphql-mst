[![npm downloads](https://img.shields.io/npm/dt/graphql-mst.svg)](https://www.npmjs.com/package/graphql-mst)
[![npm](https://img.shields.io/npm/v/graphql-mst.svg?maxAge=2592000)](https://www.npmjs.com/package/graphql-mst)
[![codecov](https://codecov.io/gh/birkir/graphql-mst/branch/master/graph/badge.svg)](https://codecov.io/gh/birkir/graphql-mst)
[![CircleCI](https://circleci.com/gh/birkir/graphql-mst.svg?style=shield)](https://circleci.com/gh/birkir/graphql-mst)
[![MIT license](https://img.shields.io/github/license/birkir/graphql-mst.svg)](https://opensource.org/licenses/MIT)

# graphql-mst

Convert GraphQL Schema to mobx-state-tree models.

See demos in [tests folder](https://github.com/birkir/graphql-mst/blob/master/__testss__/index.ts)

### Installing

```bash
yarn add graphql-mst
# or
npm install graphql-mst
```

### Usage

```ts
import { generateFromSchema } from 'graphql-mst';

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

#### Identifiers

```ts
const schema = `
  type Foo {
    userId: ID!
    fooId: ID!
  }
`;

const config = {
  Foo: {
    identifier: 'fooId', // this will be used as identifier for model 'Foo'
  },
};

const { Foo } = generateFromSchema(schema, config);

const lookup = types
  .model({ items: types.map(Test) })
  .actions(self => ({ add: item => self.items.put(item) }))
  .create({ items: {} });

lookup.put({ userId: 10, fooId: 1 });
lookup.put({ userId: 20, fooId: 2 });

lookup.items.get(1); // { userId: 10, fooId: 1 }
lookup.items.get(2); // { userId: 20, fooId: 2 }
```

### TODO and thoughts

- Configure map type instead of array type
- Default values for arguments as `types.optional`
- reference types?
- Date scalar? Custom scalar?
