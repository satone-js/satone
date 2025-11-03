import type { NodePath } from "@babel/traverse";
import { parse, type ParseResult } from "@babel/parser";
import traverse from "@babel/traverse";
import * as t from "@babel/types";

export const getAST = (code: string): ParseResult<t.File> =>
  parse(code, {
    plugins: ["typescript", "jsx"],
    sourceType: "module"
  });

export const containsServerExport = (ast: ParseResult<t.File>): boolean => {
  let contains = false;

  traverse(ast, {
    ExportNamedDeclaration(path) {
      if (contains) return; // already found! let's skip.
      const decl = path.node.declaration;

      if (t.isVariableDeclaration(decl)) {
        contains = decl.declarations.some(
          (d) => t.isIdentifier(d.id) && d.id.name.toLowerCase() === "server"
        );
      }
    }
  });

  return contains;
};

export const containsViewExport = (ast: ParseResult<t.File>): boolean => {
  let contains = false;

  traverse(ast, {
    ExportDefaultDeclaration(path) {
      if (contains) return; // already found! let's skip.
      const decl = path.node.declaration;
      contains = t.isFunctionDeclaration(decl) || t.isIdentifier(decl);
    }
  });

  return contains;
};

/**
 * Mutates the `ast` parameter given, make sure to only run this at the end.
 */
export const cleanViewExport = (ast: ParseResult<t.File>): void => {
  const identifiersToRemove = new Set<string>();

  traverse(ast, {
    ExportDefaultDeclaration(path) {
      const decl = path.node.declaration;

      if (t.isFunctionDeclaration(decl)) {
        path.remove();
      }
      else if (t.isIdentifier(decl)) {
        identifiersToRemove.add(decl.name);
        path.remove();
      }
    }
  });

  if (identifiersToRemove.size > 0) {
    traverse(ast, {
      VariableDeclaration(path) {
        path.node.declarations = path.node.declarations.filter(
          (d) => !(t.isIdentifier(d.id) && identifiersToRemove.has(d.id.name))
        );

        if (path.node.declarations.length === 0) {
          path.remove();
        }
      }
    });
  }
};

export const cleanServerExport = (ast: ParseResult<t.File>): void => {
  traverse(ast, {
    // Remove any exported `server` declaration.
    ExportNamedDeclaration(path) {
      const decl = path.node.declaration;

      if (t.isVariableDeclaration(decl)) {
        // We're removing the `server` identifier out of all declarations.
        decl.declarations = decl.declarations.filter(
          (d) => !(t.isIdentifier(d.id) && d.id.name.toLowerCase() === "server")
        );

        // If there's no declarations anymore, we can remove the export directly.
        if (decl.declarations.length === 0) {
          path.remove();
        }
      }
    }
  });
};

export function pruneUnusedImports(ast: ParseResult<t.File>): void {
  const importedIdentifiers = new Set();
  const usedIdentifiers = new Set();
  const importDeclarations: Array<NodePath<t.ImportDeclaration>> = [];

  traverse(ast, {
    ImportDeclaration(path) {
      importDeclarations.push(path);

      path.node.specifiers.forEach((specifier) => {
        if (specifier.type === "ImportDefaultSpecifier") {
          importedIdentifiers.add(specifier.local.name);
        }
        else if (specifier.type === "ImportSpecifier") {
          importedIdentifiers.add(specifier.local.name);
        }
        else if (specifier.type === "ImportNamespaceSpecifier") {
          importedIdentifiers.add(specifier.local.name);
        }
      });
    }
  });

  traverse(ast, {
    Identifier(path) {
      if (
        path.isImportDefaultSpecifier()
        || path.isImportSpecifier()
        || path.isImportNamespaceSpecifier()
      ) {
        return;
      }

      if (
        path.parent.type === "ImportDefaultSpecifier"
        || path.parent.type === "ImportSpecifier"
        || path.parent.type === "ImportNamespaceSpecifier"
      ) {
        return;
      }

      if (path.findParent((p) => p.isImportDeclaration())) {
        return;
      }

      const name = path.node.name;
      if (importedIdentifiers.has(name)) {
        usedIdentifiers.add(name);
      }
    },

    // Handle JSX elements (like <A>)
    JSXIdentifier(path) {
      const name = path.node.name;
      if (importedIdentifiers.has(name)) {
        usedIdentifiers.add(name);
      }
    }
  });

  // ... and remove unused ones.
  //
  // This is done in a hope to remove any imported file from `api()` call
  // so the frontend does not have any server-side files.
  importDeclarations.forEach((path) => {
    const unusedSpecifiers: (
      | t.ImportDefaultSpecifier
      | t.ImportNamespaceSpecifier
      | t.ImportSpecifier
    )[] = [];

    const usedSpecifiers: (
      | t.ImportDefaultSpecifier
      | t.ImportNamespaceSpecifier
      | t.ImportSpecifier
    )[] = [];

    path.node.specifiers.forEach((specifier) => {
      const localName = specifier.local.name;
      if (usedIdentifiers.has(localName)) {
        usedSpecifiers.push(specifier);
      }
      else {
        unusedSpecifiers.push(specifier);
      }
    });

    if (unusedSpecifiers.length === path.node.specifiers.length) {
      // all imports from this declaration are unused, remove the entire declaration.
      path.remove();
    }
    else if (unusedSpecifiers.length > 0) {
      // some imports are unused, keep only the used ones.
      path.node.specifiers = usedSpecifiers;
    }
  });
}
