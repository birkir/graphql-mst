import { ASTNode, parse, Source } from "graphql";
import { IAnyType, types } from "mobx-state-tree";

const fieldMap = {
  Int: types.number,
  String: types.string,
  Boolean: types.boolean,
  Float: types.number,
  ID: types.identifier
};

export const generateFromSchema = (source: string | Source): { [key: string]: any } => {
  const nodes: Map<string, IAnyType> = new Map();
  const { definitions } = parse(source);

  const mapASTNode = (type: ASTNode) => {
    if (type.kind === "UnionTypeDefinition") {
      const name = type.name.kind === "Name" && type.name.value;
      if (name && type.types) {
        const unionTypes = type.types.reduce<IAnyType[]>((acc, typesType) => {
          if (typesType.kind === "NamedType") {
            const item = parseASTNode(typesType);
            if (item) {
              acc.push(item);
            }
          }
          return acc;
        }, []);
        return types.union(...unionTypes);
      }
    } else if (type.kind === "ObjectTypeDefinition") {
      const name = type.name.kind === "Name" && type.name.value;
      if (name) {
        const fields = (type.fields || []).reduce((acc, field) => {
          const fieldName = field.name.value;
          const node = parseASTNode(field);
          if (node) {
            acc[fieldName] = node;
          }
          return acc;
        }, {});
        return types.model(name, fields);
      }
    } else if (type.kind === "EnumTypeDefinition") {
      const name = type.name.kind === "Name" && type.name.value;
      if (name && type.values) {
        const values = type.values.map(value => value.name.value);
        return types.enumeration(name, values);
      }
    } else if (type.kind === "ScalarTypeDefinition") {
      return types.frozen();
    } else if (type.kind === "NonNullType") {
      return parseASTNode(type.type);
    } else if (type.kind === "FieldDefinition") {
      const node = parseASTNode(type.type);
      if (node) {
        if (type.type.kind === "NonNullType") {
          return node;
        } else {
          return types.maybeNull(node);
        }
      }
    } else if (type.kind === "NamedType") {
      if (fieldMap[type.name.value]) {
        return fieldMap[type.name.value];
      }
      return types.frozen();
    } else if (type.kind === "ListType") {
      const node = parseASTNode(type.type);
      if (node) {
        return types.array(node);
      }
    } else {
      console.log("unknown", type);
      return null;
    }

    return null;
  };

  const parseASTNode = (type: ASTNode) => {
    if (!type) {
      return null;
    }

    const name = (type as any)!.name && (type as any).name.value;

    if (
      type.kind === "ObjectTypeDefinition" ||
      type.kind === "EnumTypeDefinition" ||
      type.kind === "ScalarTypeDefinition" ||
      type.kind === "UnionTypeDefinition"
    ) {
      const definitionNode =
        name && definitions.find((n: any) => n.name.value === name);
      if (!nodes.has(name)) {
        const node = mapASTNode(definitionNode || type);
        if (node) {
          nodes.set(name, node);
        }
      }
      const node = nodes.get(name);
      if (node) {
        return node;
      }
    }

    return mapASTNode(type);
  };

  definitions.forEach(parseASTNode);

  return Array.from(nodes.entries()).reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {});
};
