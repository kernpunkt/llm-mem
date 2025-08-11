import { promises as fs } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { LineRange, FileCoverage } from "./types.js";

/**
 * Basic code scanner with minimal heuristics for Phase 1.
 * - Counts total lines
 * - Distinguishes comment-only lines (e.g., // or block comments)
 * - Detects functions and classes via regex (approximation)
 */
export async function scanTypescriptOrJavascriptFile(filePath: string): Promise<{
  totalLines: number;
  elements: LineRange[];
}> {
  const content = await fs.readFile(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  const elements: LineRange[] = [];

  const ext = path.extname(filePath).toLowerCase();
  const isTsLike = ext === ".ts" || ext === ".tsx" || ext === ".mts" || ext === ".cts";
  const isJsLike = ext === ".js" || ext === ".mjs" || ext === ".cjs";

  if (isTsLike || isJsLike) {
    try {
      const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
      const addElement = (startPos: number, endPos: number, type: LineRange["type"], name?: string) => {
        const start = sourceFile.getLineAndCharacterOfPosition(startPos).line + 1;
        const end = sourceFile.getLineAndCharacterOfPosition(endPos).line + 1;
        elements.push({ start, end, type, name });
      };

      const visit = (node: ts.Node) => {
        if (ts.isFunctionDeclaration(node) && node.name) {
          addElement(node.getStart(), node.getEnd(), "function", node.name.getText(sourceFile));
        }
        if (ts.isVariableStatement(node)) {
          for (const decl of node.declarationList.declarations) {
            if (ts.isIdentifier(decl.name) && decl.initializer) {
              if (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer)) {
                addElement(decl.getStart(), decl.getEnd(), "function", decl.name.text);
              }
            }
          }
        }
        if (ts.isClassDeclaration(node) && node.name) {
          addElement(node.getStart(), node.getEnd(), "class", node.name.getText(sourceFile));
          for (const member of node.members) {
            if (ts.isMethodDeclaration(member) && member.name) {
              addElement(member.getStart(), member.getEnd(), "method", member.name.getText(sourceFile));
            }
          }
        }
        if (ts.isInterfaceDeclaration(node)) {
          addElement(node.getStart(), node.getEnd(), "interface", node.name.getText(sourceFile));
        }
        if (ts.isImportDeclaration(node) || ts.isImportEqualsDeclaration(node)) {
          addElement(node.getStart(), node.getEnd(), "import");
        }
        if (ts.isExportDeclaration(node) || ts.isExportAssignment(node) || hasExportModifier(node)) {
          addElement(node.getStart(), node.getEnd(), "export");
        }
        ts.forEachChild(node, visit);
      };
      visit(sourceFile);

      // Collect comment ranges
      const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, content);
      let token = scanner.scan();
      while (token !== ts.SyntaxKind.EndOfFileToken) {
        if (token === ts.SyntaxKind.SingleLineCommentTrivia || token === ts.SyntaxKind.MultiLineCommentTrivia) {
          const startPos = scanner.getTokenPos();
          const endPos = scanner.getTextPos();
          addElement(startPos, endPos, "comment");
        }
        token = scanner.scan();
      }
    } catch {
      // Fallback: regex heuristics
      elements.push(...regexHeuristics(content));
    }
  }

  return { totalLines: lines.length, elements };
}

function hasExportModifier(node: ts.Node): boolean {
  const modifiers: readonly ts.ModifierLike[] | undefined = (node as any).modifiers;
  if (!modifiers) return false;
  for (const mod of modifiers) {
    if ((mod as ts.Modifier).kind === ts.SyntaxKind.ExportKeyword) return true;
  }
  return false;
}

function regexHeuristics(content: string): LineRange[] {
  const lines = content.split(/\r?\n/);
  const result: LineRange[] = [];
  const functionRegex = /(export\s+)?(async\s+)?function\s+([A-Za-z0-9_]+)/;
  const constArrowFnRegex = /(export\s+)?(const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*(async\s+)?\([^)]*\)\s*=>/;
  const classRegex = /(export\s+)?class\s+([A-Za-z0-9_]+)/;
  const exportRegex = /^\s*export\s+/;
  const importRegex = /^\s*import\s+/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (exportRegex.test(line)) result.push({ start: i + 1, end: i + 1, type: "export" });
    if (importRegex.test(line)) result.push({ start: i + 1, end: i + 1, type: "import" });
    if (functionRegex.test(line)) {
      const name = (line.match(functionRegex)?.[3]) || "anonymous";
      result.push({ start: i + 1, end: i + 1, type: "function", name });
    }
    if (constArrowFnRegex.test(line)) {
      const name = (line.match(constArrowFnRegex)?.[3]) || "anonymous";
      result.push({ start: i + 1, end: i + 1, type: "function", name });
    }
    if (classRegex.test(line)) {
      const name = (line.match(classRegex)?.[2]) || "AnonymousClass";
      result.push({ start: i + 1, end: i + 1, type: "class", name });
    }
    if (/^\s*\/\//.test(line) || /^\s*\*/.test(line) || /^\s*\/.*/.test(line)) {
      result.push({ start: i + 1, end: i + 1, type: "comment" });
    }
  }
  return result;
}

export function toInitialFileCoverage(path: string, totalLines: number): FileCoverage {
  return {
    path,
    totalLines,
    coveredLines: 0,
    uncoveredSections: [],
    coveredSections: [],
    functions: [],
    classes: [],
  };
}


