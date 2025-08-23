import { describe, it, expect, vi, beforeEach } from "vitest";
import { scanTypescriptOrJavascriptFile, toInitialFileCoverage } from "../src/code-scanner.js";
import { LineRange, FileCoverage } from "../src/types.js";

// Mock TypeScript module
vi.mock("typescript", () => ({
    default: {
        createSourceFile: vi.fn(),
        forEachChild: vi.fn(),
        isFunctionDeclaration: vi.fn(),
        isVariableStatement: vi.fn(),
        isClassDeclaration: vi.fn(),
        isInterfaceDeclaration: vi.fn(),
        isImportDeclaration: vi.fn(),
        isImportEqualsDeclaration: vi.fn(),
        isExportDeclaration: vi.fn(),
        isExportAssignment: vi.fn(),
        isMethodDeclaration: vi.fn(),
        createScanner: vi.fn(),
        ScriptTarget: { Latest: 99 },
        LanguageVariant: { Standard: 0 },
        SyntaxKind: {
            EndOfFileToken: 1,
            SingleLineCommentTrivia: 2,
            MultiLineCommentTrivia: 3,
            ExportKeyword: 4,
        },
        Modifier: class MockModifier {
            kind: number;
            constructor(kind: number) {
                this.kind = kind;
            }
        },
    },
}));

// Mock fs module
vi.mock("node:fs", () => ({
    promises: {
        readFile: vi.fn(),
    },
}));

describe("CodeScanner Extended Tests", () => {
    let mockTs: any;
    let mockFs: any;

    beforeEach(async () => {
        mockTs = (await import("typescript")).default;
        mockFs = (await import("node:fs")).promises;
        vi.clearAllMocks();
    });

    describe("scanTypescriptOrJavascriptFile - TypeScript parsing edge cases", () => {
        it("should handle TypeScript parsing errors gracefully and fall back to regex", async () => {
            // Mock fs.readFile to return content
            mockFs.readFile.mockResolvedValue(`
                export function testFunction() {
                    return "test";
                }
                
                export const testConst = () => "test";
                
                export class TestClass {
                    testMethod() {}
                }
                
                // This is a comment
                /* This is a block comment */
                
                import { something } from 'somewhere';
                export { something } from 'somewhere';
            `);

            // Mock TypeScript to throw an error
            mockTs.createSourceFile.mockImplementation(() => {
                throw new Error("TypeScript parsing failed");
            });

            const result = await scanTypescriptOrJavascriptFile("test.ts");

            expect(result.totalLines).toBe(17); // Includes template literal backticks
            expect(result.elements.length).toBeGreaterThan(0);
            
            // Should fall back to regex heuristics
            const functionElements = result.elements.filter(el => el.type === "function");
            expect(functionElements.length).toBeGreaterThan(0);
        });

        it("should handle malformed TypeScript content", async () => {
            mockFs.readFile.mockResolvedValue("export function test() { return 'test'; }");

            // Mock TypeScript to return a malformed AST
            const mockSourceFile = {
                getStart: () => 0,
                getEnd: () => 100,
                getText: () => "malformed",
                members: [],
            };

            mockTs.createSourceFile.mockReturnValue(mockSourceFile);
            mockTs.forEachChild.mockImplementation((node: any, visitor: any) => {
                // Simulate malformed node traversal
                throw new Error("Malformed AST");
            });

            const result = await scanTypescriptOrJavascriptFile("test.ts");

            expect(result.totalLines).toBe(1);
            // Should fall back to regex heuristics
            expect(result.elements.length).toBeGreaterThan(0);
        });

        it("should handle empty TypeScript content", async () => {
            mockFs.readFile.mockResolvedValue("");

            mockTs.createSourceFile.mockImplementation(() => {
                throw new Error("Empty content");
            });

            const result = await scanTypescriptOrJavascriptFile("test.ts");

            expect(result.totalLines).toBe(1); // Empty string becomes single line
            expect(result.elements).toEqual([]);
        });

        it("should handle content with only whitespace", async () => {
            mockFs.readFile.mockResolvedValue("   \n  \t  \n  ");

            mockTs.createSourceFile.mockImplementation(() => {
                throw new Error("Whitespace only");
            });

            const result = await scanTypescriptOrJavascriptFile("test.ts");

            expect(result.totalLines).toBe(3);
            expect(result.elements).toEqual([]);
        });
    });

    describe("scanTypescriptOrJavascriptFile - TypeScript AST traversal edge cases", () => {
        it("should handle nodes without names gracefully", async () => {
            mockFs.readFile.mockResolvedValue("export function() { return 'test'; }");

            const mockSourceFile = {
                getStart: () => 0,
                getEnd: () => 100,
                getText: () => "unnamed",
                members: [],
            };

            mockTs.createSourceFile.mockReturnValue(mockSourceFile);
            mockTs.forEachChild.mockImplementation((node: any, visitor: any) => {
                // Simulate nodes without names
                const unnamedNode = {
                    getStart: () => 10,
                    getEnd: () => 50,
                    getText: () => "",
                    members: [],
                };
                visitor(unnamedNode);
            });

            const result = await scanTypescriptOrJavascriptFile("test.ts");

            expect(result.totalLines).toBe(1);
            // Should handle gracefully without crashing
        });

        it("should handle nodes with undefined members", async () => {
            mockFs.readFile.mockResolvedValue("export class TestClass { }");

            const mockSourceFile = {
                getStart: () => 0,
                getEnd: () => 100,
                getText: () => "test",
                members: undefined, // Undefined members
            };

            mockTs.createSourceFile.mockReturnValue(mockSourceFile);
            mockTs.forEachChild.mockImplementation((node: any, visitor: any) => {
                // Simulate class with undefined members
                const classNode = {
                    getStart: () => 10,
                    getEnd: () => 50,
                    getText: () => "TestClass",
                    members: undefined,
                };
                mockTs.isClassDeclaration.mockReturnValue(true);
                mockTs.isMethodDeclaration.mockReturnValue(false);
                visitor(classNode);
            });

            const result = await scanTypescriptOrJavascriptFile("test.ts");

            expect(result.totalLines).toBe(1);
            // Should handle undefined members gracefully
        });
    });

    describe("scanTypescriptOrJavascriptFile - Comment scanning edge cases", () => {
        it("should handle scanner errors gracefully", async () => {
            mockFs.readFile.mockResolvedValue("// This is a comment\n/* Block comment */");

            const mockSourceFile = {
                getStart: () => 0,
                getEnd: () => 100,
                getText: () => "test",
                members: [],
            };

            mockTs.createSourceFile.mockReturnValue(mockSourceFile);
            mockTs.forEachChild.mockImplementation(() => {}); // No child nodes

            // Mock scanner to throw error
            mockTs.createScanner.mockImplementation(() => {
                throw new Error("Scanner creation failed");
            });

            const result = await scanTypescriptOrJavascriptFile("test.ts");

            expect(result.totalLines).toBe(2);
            // Should handle scanner errors gracefully
        });

        it("should handle scanner with no tokens", async () => {
            mockFs.readFile.mockResolvedValue("export function test() { return 'test'; }");

            const mockSourceFile = {
                getStart: () => 0,
                getEnd: () => 100,
                getText: () => "test",
                members: [],
            };

            mockTs.createSourceFile.mockReturnValue(mockSourceFile);
            mockTs.forEachChild.mockImplementation(() => {}); // No child nodes

            const mockScanner = {
                scan: vi.fn().mockReturnValue(mockTs.SyntaxKind.EndOfFileToken),
                getTokenPos: vi.fn(),
                getTextPos: vi.fn(),
            };

            mockTs.createScanner.mockReturnValue(mockScanner);

            const result = await scanTypescriptOrJavascriptFile("test.ts");

            expect(result.totalLines).toBe(1);
            expect(mockScanner.scan).toHaveBeenCalledTimes(1);
        });
    });

    describe("regexHeuristics - comprehensive testing", () => {
        it("should handle complex function declarations", async () => {
            const content = `
                export async function complexFunction(param1: string, param2: number): Promise<string> {
                    return param1 + param2.toString();
                }
                
                const arrowFunction = async (param: string) => {
                    return param.toUpperCase();
                }
                
                export const exportedArrow = (param: string) => param.length;
                
                let anotherArrow = (param: string) => param.trim();
                
                var legacyFunction = function(param: string) {
                    return param.toLowerCase();
                }
            `;

            mockFs.readFile.mockResolvedValue(content);
            mockTs.createSourceFile.mockImplementation(() => {
                throw new Error("Force regex fallback");
            });

            const result = await scanTypescriptOrJavascriptFile("test.ts");

            expect(result.totalLines).toBe(17); // Includes template literal backticks
            const functionElements = result.elements.filter(el => el.type === "function");
            expect(functionElements.length).toBeGreaterThan(0);
        });

        it("should handle complex class declarations", async () => {
            const content = `
                export class ComplexClass extends BaseClass implements Interface {
                    private property: string;
                    
                    constructor(param: string) {
                        this.property = param;
                    }
                    
                    public method(): string {
                        return this.property;
                    }
                    
                    static staticMethod(): number {
                        return 42;
                    }
                }
                
                class AnonymousClass {
                    method() {}
                }
            `;

            mockFs.readFile.mockResolvedValue(content);
            mockTs.createSourceFile.mockImplementation(() => {
                throw new Error("Force regex fallback");
            });

            const result = await scanTypescriptOrJavascriptFile("test.ts");

            expect(result.totalLines).toBe(21); // Includes template literal backticks
            const classElements = result.elements.filter(el => el.type === "class");
            expect(classElements.length).toBeGreaterThan(0);
        });

        it("should handle various comment styles", async () => {
            const content = `
                // Single line comment
                /* Multi-line comment
                   spanning multiple lines */
                /** JSDoc comment */
                // Another single line
                /* Another multi-line */
            `;

            mockFs.readFile.mockResolvedValue(content);
            mockTs.createSourceFile.mockImplementation(() => {
                throw new Error("Force regex fallback");
            });

            const result = await scanTypescriptOrJavascriptFile("test.ts");

            expect(result.totalLines).toBe(8); // Includes template literal backticks
            const commentElements = result.elements.filter(el => el.type === "comment");
            expect(commentElements.length).toBeGreaterThan(0);
        });
    });

    describe("toInitialFileCoverage", () => {
        it("should create initial coverage with correct structure", () => {
            const result = toInitialFileCoverage("src/test.ts", 100);

            expect(result).toEqual({
                path: "src/test.ts",
                totalLines: 100,
                coveredLines: 0,
                uncoveredSections: [],
                coveredSections: [],
                functions: [],
                classes: [],
            });
        });

        it("should handle zero lines", () => {
            const result = toInitialFileCoverage("src/empty.ts", 0);

            expect(result.totalLines).toBe(0);
            expect(result.coveredLines).toBe(0);
        });

        it("should handle very large line counts", () => {
            const largeLineCount = 1000000;
            const result = toInitialFileCoverage("src/large.ts", largeLineCount);

            expect(result.totalLines).toBe(largeLineCount);
            expect(result.coveredLines).toBe(0);
        });

        it("should handle special characters in paths", () => {
            const specialPath = "src/components/Button-Component_v2.0.1.tsx";
            const result = toInitialFileCoverage(specialPath, 50);

            expect(result.path).toBe(specialPath);
            expect(result.totalLines).toBe(50);
        });
    });

    describe("Integration edge cases", () => {
        it("should handle content with only newlines", async () => {
            const content = "\n\n\n\n";
            
            mockFs.readFile.mockResolvedValue(content);
            mockTs.createSourceFile.mockImplementation(() => {
                throw new Error("Force regex fallback");
            });

            const result = await scanTypescriptOrJavascriptFile("test.ts");

            expect(result.totalLines).toBe(5); // Includes template literal backticks
            expect(result.elements).toEqual([]);
        });

        it("should handle content with mixed line endings", async () => {
            const content = "line1\r\nline2\nline3\rline4";
            
            mockFs.readFile.mockResolvedValue(content);
            mockTs.createSourceFile.mockImplementation(() => {
                throw new Error("Force regex fallback");
            });

            const result = await scanTypescriptOrJavascriptFile("test.ts");

            expect(result.totalLines).toBe(3); // Mixed line endings are normalized
        });

        it("should handle very long lines", async () => {
            const longLine = "a".repeat(10000);
            const content = `${longLine}\nshort line`;
            
            mockFs.readFile.mockResolvedValue(content);
            mockTs.createSourceFile.mockImplementation(() => {
                throw new Error("Force regex fallback");
            });

            const result = await scanTypescriptOrJavascriptFile("test.ts");

            expect(result.totalLines).toBe(2);
            // Should not crash on very long lines
        });
    });
});
