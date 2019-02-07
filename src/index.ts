import { buildSchema, Source } from 'graphql';
import { Enum, Field, Interface, schemaToTemplateContext, Type, Union } from 'graphql-codegen-core';
import { ISimpleType, types } from 'mobx-state-tree';

const fieldMap = {
  Int: types.number,
  String: types.string,
  Boolean: types.boolean,
  Float: types.number,
  ID: types.identifier,
};

interface Config {
  identifier?: string | null;
}

export const generateFromSchema = (
  source: string | Source,
  typeConfig: { [key: string]: Config } = {}
): { [key: string]: any } => {
  const builtSchema = buildSchema(source);
  const context = schemaToTemplateContext(builtSchema);

  const cache = new Map();

  const mapField = (field: Field) => {
    let type = fieldMap[field.type];

    if (!type) {
      if (field.isType) {
        const fieldType = context.types.find(t => t.name === field.type);
        if (fieldType) {
          type = mapType(fieldType);
        }
      } else if (field.isInputType) {
        const fieldType = context.inputTypes.find(t => t.name === field.type);
        if (fieldType) {
          type = mapType(fieldType);
        }
      } else if (field.isUnion) {
        const fieldUnion = context.unions.find(t => t.name === field.type);
        if (fieldUnion) {
          type = mapUnion(fieldUnion);
        }
      } else if (field.isEnum) {
        const fieldEnum = context.enums.find(t => t.name === field.type);
        if (fieldEnum) {
          type = mapEnum(fieldEnum);
        }
      } else if (field.isScalar) {
        type = types.frozen();
      }
    }

    if (type) {
      if (field.isArray) {
        if (field.isNullableArray) {
          type = types.maybeNull(type);
        }

        for (let i = 0; i < field.dimensionOfArray; i++) {
          type = types.array(type);
        }
      }

      // @todo submit PR to get the defaultValue
      // if (field.hasDefaultValue && (field as any).defaultValue) {
      //   type = types.optional(type, (field as any).defaultValue);
      // } else
      if (!field.isRequired) {
        type = types.maybeNull(type);
      }

      return type;
    }
  };

  function isType(node: any): node is Type {
    return typeof node.interfaces !== 'undefined';
  }

  function isInterface(node: any): node is Interface {
    return typeof node.implementingTypes !== 'undefined';
  }

  const mapEnum = (type: Enum) => {
    if (cache.has(type.name)) {
      return cache.get(type.name);
    }

    const result = types.enumeration(type.name, type.values.map(value => value.name));

    cache.set(type.name, result);

    return result;
  };

  const mapUnion = (type: Union) => {
    if (cache.has(type.name)) {
      return cache.get(type.name);
    }

    const unions = type.possibleTypes
      .map((typeName: any) => context.types.find((n: any) => n.name === typeName))
      .map(unionType => {
        if (isType(unionType)) {
          return mapType(unionType);
        }
      })
      .filter(interfaceType => !!interfaceType);

    const result = types.union(...unions);

    cache.set(type.name, result);

    return result;
  };

  const mapType = (type: Type | Interface | Union, config?: Config) => {
    if (!config) {
      config = typeConfig[type.name] || { identifier: undefined };
    }

    if (cache.has(type.name)) {
      return cache.get(type.name);
    }

    if (isType(type) || isInterface(type)) {
      let result = types.model(
        type.name,
        type.fields.reduce((acc, field) => {
          const hasID = Object.values(acc).find((n: ISimpleType<any>) => n.name === 'identifier');
          if (field.type === 'ID') {
            if (
              (typeof config!.identifier === 'undefined' || field.name === config!.identifier) &&
              !hasID
            ) {
              acc[field.name] = types.identifier;
            } else {
              acc[field.name] = field.isRequired ? types.string : types.maybeNull(types.string);
            }
          } else {
            const fieldType = mapField(field);
            if (fieldType) {
              acc[field.name] = fieldType;
            }
          }

          return acc;
        }, {})
      );

      const hasIdentifier = !!(result as any).identifierAttribute;

      if (isType(type)) {
        const compositions = type.interfaces
          .map((interfaceName: any) =>
            context.interfaces.find((n: any) => n.name === interfaceName)
          )
          .map(interfaceType => {
            if (isInterface(interfaceType)) {
              return mapType(interfaceType, { identifier: hasIdentifier ? null : undefined });
            }
          })
          .filter(interfaceType => !!interfaceType);

        if (compositions.length) {
          result = (types.compose as any)(...compositions, result).named(type.name);
        }
      }

      cache.set(type.name, result);

      return result;
    }
  };

  context.inputTypes.forEach(type => mapType(type));
  context.types.forEach(type => mapType(type));
  context.unions.forEach(type => mapUnion(type));
  context.enums.forEach(type => mapEnum(type));

  return Array.from(cache.entries()).reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {});
};
