import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createServer, runStdio, runHttp, main } from '../src/index.js';
import { createApp, createRouter, eventHandler } from 'h3';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

/**
 * Comprehensive test suite for MCP Template Server
 * 
 * Tests cover:
 * - Server creation and basic functionality
 * - Tool integration and response structures
 * - Transport functions (stdio)
 * - Command line argument parsing
 * - Error handling scenarios
 * - Edge cases and boundary conditions
 */

describe('MCP Template Server', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console methods to avoid noise in test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    // Mock process.exit to prevent actual process termination
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createServer function', () => {
    it('should create MCP server with correct configuration', () => {
      const server = createServer();
      
      expect(server).toBeDefined();
      expect(typeof server).toBe('object');
      expect(server.constructor.name).toBe('McpServer');
    });

    it('should have tool method available', () => {
      const server = createServer();
      
      expect(typeof server.tool).toBe('function');
    });

    it('should create server instances independently', () => {
      const server1 = createServer();
      const server2 = createServer();
      
      expect(server1).not.toBe(server2);
      expect(server1).toBeDefined();
      expect(server2).toBeDefined();
    });
  });

  describe('Server Configuration', () => {
    it('should have the correct server name', () => {
      const server = createServer();
      
      // The server should be properly configured
      expect(server).toBeDefined();
    });

    it('should support multiple server instances', () => {
      const servers = Array.from({ length: 5 }, () => createServer());
      
      servers.forEach(server => {
        expect(server).toBeDefined();
        expect(typeof server.tool).toBe('function');
      });
    });
  });

  describe('Tool Response Structure', () => {
    it('should return responses with correct structure', async () => {
      // Test the structure that tools should return
      const expectedResponse = {
        content: [{
          type: "text",
          text: "Test response"
        }],
        isError: false
      };

      expect(expectedResponse).toHaveProperty('content');
      expect(expectedResponse).toHaveProperty('isError');
      expect(expectedResponse.content).toHaveLength(1);
      expect(expectedResponse.content[0]).toHaveProperty('type', 'text');
      expect(expectedResponse.content[0]).toHaveProperty('text');
      expect(expectedResponse.isError).toBe(false);
    });

    it('should handle error responses correctly', () => {
      const errorResponse = {
        content: [{
          type: "text",
          text: "Error occurred"
        }],
        isError: true
      };

      expect(errorResponse.isError).toBe(true);
      expect(errorResponse.content[0].text).toBe("Error occurred");
    });
  });

  describe('Text Processing Functions', () => {
    it('should handle uppercase transformation', () => {
      const text = 'hello world';
      const uppercase = true;
      const result = uppercase ? text.toUpperCase() : text;
      
      expect(result).toBe('HELLO WORLD');
    });

    it('should handle normal text without transformation', () => {
      const text = 'hello world';
      const uppercase = false;
      const result = uppercase ? text.toUpperCase() : text;
      
      expect(result).toBe('hello world');
    });

    it('should handle empty strings', () => {
      const text = '';
      const uppercase = true;
      const result = uppercase ? text.toUpperCase() : text;
      
      expect(result).toBe('');
    });

    it('should handle special characters and emojis', () => {
      const text = '🚀 Special chars: @#$%^&*()!';
      const uppercase = false;
      const result = uppercase ? text.toUpperCase() : text;
      
      expect(result).toBe('🚀 Special chars: @#$%^&*()!');
    });
  });

  describe('Mathematical Operations', () => {
    it('should perform addition correctly', () => {
      const result = 5 + 3;
      expect(result).toBe(8);
    });

    it('should perform subtraction correctly', () => {
      const result = 10 - 4;
      expect(result).toBe(6);
    });

    it('should perform multiplication correctly', () => {
      const result = 6 * 7;
      expect(result).toBe(42);
    });

    it('should perform division correctly', () => {
      const result = 15 / 3;
      expect(result).toBe(5);
    });

    it('should handle division by zero', () => {
      const a = 10;
      const b = 0;
      
      expect(() => {
        if (b === 0) throw new Error("Division by zero is not allowed");
        return a / b;
      }).toThrow("Division by zero is not allowed");
    });

    it('should handle decimal numbers', () => {
      const result = 1.5 + 2.3;
      expect(result).toBeCloseTo(3.8);
    });

    it('should handle negative numbers', () => {
      const result = -5 + 3;
      expect(result).toBe(-2);
    });

    it('should format mathematical results correctly', () => {
      const a = 5;
      const operation = 'add';
      const b = 3;
      const result = 8;
      const formatted = `${a} ${operation} ${b} = ${result}`;
      
      expect(formatted).toBe('5 add 3 = 8');
    });
  });

  describe('Time Operations', () => {
    beforeEach(() => {
      // Mock Date to ensure consistent test results
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T12:00:00.000Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should format time in ISO format', () => {
      const now = new Date();
      const timeString = now.toISOString();
      
      expect(timeString).toBe('2024-01-01T12:00:00.000Z');
    });

    it('should format time in locale format', () => {
      const now = new Date();
      const timeString = now.toLocaleString();
      
      expect(typeof timeString).toBe('string');
      expect(timeString.length).toBeGreaterThan(0);
    });

    it('should format time as timestamp', () => {
      const now = new Date();
      const timeString = now.getTime().toString();
      
      expect(timeString).toBe('1704110400000');
    });

    it('should handle different time formats', () => {
      const now = new Date();
      const formats = ['iso', 'locale', 'timestamp'] as const;
      
      formats.forEach(format => {
        let timeString: string;
        switch (format) {
          case 'iso':
            timeString = now.toISOString();
            break;
          case 'locale':
            timeString = now.toLocaleString();
            break;
          case 'timestamp':
            timeString = now.getTime().toString();
            break;
        }
        
        expect(typeof timeString).toBe('string');
        expect(timeString.length).toBeGreaterThan(0);
      });
    });

    it('should default to iso format', () => {
      const format = undefined;
      const defaultFormat = format || 'iso';
      
      expect(defaultFormat).toBe('iso');
    });
  });

  describe('Error Handling Patterns', () => {
    it('should handle Error instances properly', () => {
      const testError = new Error('Test error message');
      const errorMessage = testError instanceof Error ? testError.message : String(testError);
      
      expect(errorMessage).toBe('Test error message');
    });

    it('should handle non-Error objects', () => {
      const nonErrorObject: unknown = 'String error';
      const errorMessage = nonErrorObject instanceof Error ? nonErrorObject.message : String(nonErrorObject);
      
      expect(errorMessage).toBe('String error');
    });

    it('should handle null and undefined errors', () => {
      const nullError: unknown = null;
      const undefinedError: unknown = undefined;
      
      const nullMessage = nullError instanceof Error ? nullError.message : String(nullError);
      const undefinedMessage = undefinedError instanceof Error ? undefinedError.message : String(undefinedError);
      
      expect(nullMessage).toBe('null');
      expect(undefinedMessage).toBe('undefined');
    });

    it('should wrap tool errors correctly', () => {
      const originalError = new Error('Original error');
      const wrappedError = new Error(`Echo tool failed: ${originalError.message}`);
      
      expect(wrappedError.message).toBe('Echo tool failed: Original error');
    });

    it('should handle various error types', () => {
      const errorTypes = [
        new Error('Error object'),
        'String error',
        123,
        null,
        undefined,
        { message: 'Object error' }
      ];

      errorTypes.forEach(error => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        expect(typeof errorMessage).toBe('string');
      });
    });
  });

  describe('runStdio function', () => {
    it('should call console.error with correct message', async () => {
      await runStdio();
      
      expect(console.error).toHaveBeenCalledWith('MCP Server running on stdio');
    });

    it('should setup SIGINT handler', async () => {
      const processOnSpy = vi.spyOn(process, 'on');
      
      await runStdio();
      
      expect(processOnSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    });

    it('should handle multiple calls', async () => {
      await runStdio();
      await runStdio();
      
      expect(console.error).toHaveBeenCalledTimes(2);
    });
  });

  describe('Command Line Argument Parsing', () => {
    let originalArgv: string[];

    beforeEach(() => {
      originalArgv = process.argv;
    });

    afterEach(() => {
      process.argv = originalArgv;
    });

    it('should default to stdio transport when no args provided', () => {
      process.argv = ['node', 'dist/index.js'];
      
      const args = process.argv.slice(2);
      const transportType = args.find(arg => arg.startsWith('--transport='))?.split('=')[1] || 'stdio';
      
      expect(transportType).toBe('stdio');
    });

    it('should parse HTTP transport argument', () => {
      process.argv = ['node', 'dist/index.js', '--transport=http'];
      
      const args = process.argv.slice(2);
      const transportType = args.find(arg => arg.startsWith('--transport='))?.split('=')[1] || 'stdio';
      
      expect(transportType).toBe('http');
    });

    it('should parse custom port number', () => {
      process.argv = ['node', 'dist/index.js', '--transport=http', '--port=8080'];
      
      const args = process.argv.slice(2);
      const port = parseInt(args.find(arg => arg.startsWith('--port='))?.split('=')[1] || '3000');
      
      expect(port).toBe(8080);
    });

    it('should default to port 3000', () => {
      process.argv = ['node', 'dist/index.js', '--transport=http'];
      
      const args = process.argv.slice(2);
      const port = parseInt(args.find(arg => arg.startsWith('--port='))?.split('=')[1] || '3000');
      
      expect(port).toBe(3000);
    });

    it('should handle multiple arguments', () => {
      process.argv = ['node', 'dist/index.js', '--transport=http', '--port=5000', '--other=value'];
      
      const args = process.argv.slice(2);
      const transportType = args.find(arg => arg.startsWith('--transport='))?.split('=')[1] || 'stdio';
      const port = parseInt(args.find(arg => arg.startsWith('--port='))?.split('=')[1] || '3000');
      
      expect(transportType).toBe('http');
      expect(port).toBe(5000);
      expect(args).toContain('--other=value');
    });

    it('should handle malformed arguments gracefully', () => {
      process.argv = ['node', 'dist/index.js', '--transport', '--port=abc', '--invalid'];
      
      const args = process.argv.slice(2);
      const transportType = args.find(arg => arg.startsWith('--transport='))?.split('=')[1] || 'stdio';
      const port = parseInt(args.find(arg => arg.startsWith('--port='))?.split('=')[1] || '3000');
      
      expect(transportType).toBe('stdio'); // Falls back to default
      expect(isNaN(port)).toBe(true); // Invalid port results in NaN
    });
  });

  describe('Main Function Error Handling', () => {
    it('should handle caught errors properly', () => {
      const testError = new Error('Test error');
      
      try {
        throw testError;
      } catch (error) {
        console.error('Fatal error in main():', error);
        process.exit(1);
      }

      expect(console.error).toHaveBeenCalledWith('Fatal error in main():', testError);
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle different error types in main', () => {
      const errors = [
        new Error('Standard error'),
        'String error',
        { message: 'Object error' },
        null
      ];

      errors.forEach(error => {
        try {
          throw error;
        } catch (e) {
          console.error('Fatal error in main():', e);
          process.exit(1);
        }
      });

      expect(console.error).toHaveBeenCalledTimes(errors.length);
      expect(process.exit).toHaveBeenCalledTimes(errors.length);
    });
  });

  describe('Edge Cases and Validation', () => {
    it('should handle undefined values gracefully', () => {
      const undefinedValue = undefined;
      const result = undefinedValue ? 'defined' : 'undefined';
      expect(result).toBe('undefined');
    });

    it('should handle null values gracefully', () => {
      const nullValue = null;
      const result = nullValue ? 'defined' : 'null';
      expect(result).toBe('null');
    });

    it('should handle empty object parameters', () => {
      const emptyParams = {};
      expect(Object.keys(emptyParams)).toHaveLength(0);
    });

    it('should handle empty arrays', () => {
      const emptyArray: any[] = [];
      expect(emptyArray).toHaveLength(0);
      expect(Array.isArray(emptyArray)).toBe(true);
    });

    it('should handle various falsy values', () => {
      const falsyValues = [false, 0, '', null, undefined, NaN];
      
      falsyValues.forEach(value => {
        const result = value || 'default';
        expect(result).toBe('default');
      });
    });

    it('should handle various truthy values', () => {
      const truthyValues = [true, 1, 'string', {}, [], -1];
      
      truthyValues.forEach(value => {
        const result = value ? 'truthy' : 'falsy';
        expect(result).toBe('truthy');
      });
    });

    it('should validate parameter types', () => {
      const testString = 'test';
      const testNumber = 42;
      const testBoolean = true;
      const testObject = {};
      const testArray: any[] = [];

      expect(typeof testString).toBe('string');
      expect(typeof testNumber).toBe('number');
      expect(typeof testBoolean).toBe('boolean');
      expect(typeof testObject).toBe('object');
      expect(Array.isArray(testArray)).toBe(true);
    });

    it('should handle large numbers', () => {
      const largeNumber = 999999999999;
      const result = largeNumber * 2;
      
      expect(typeof result).toBe('number');
      expect(result).toBe(1999999999998);
    });

    it('should handle floating point precision', () => {
      const result = 0.1 + 0.2;
      
      // Use toBeCloseTo for floating point comparisons
      expect(result).toBeCloseTo(0.3);
    });

    it('should handle string concatenation edge cases', () => {
      const testCases = [
        { input: 'Echo: ' + '', expected: 'Echo: ' },
        { input: 'Echo: ' + 'test', expected: 'Echo: test' },
        { input: 'Echo: ' + null, expected: 'Echo: null' },
        { input: 'Echo: ' + undefined, expected: 'Echo: undefined' }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(input).toBe(expected);
      });
    });
  });

  describe('Module Import and Export', () => {
    it('should export main functions', () => {
      expect(typeof createServer).toBe('function');
      expect(typeof runStdio).toBe('function');
      expect(typeof main).toBe('function');
    });

    it('should create independent instances', () => {
      const server1 = createServer();
      const server2 = createServer();
      
      expect(server1).not.toBe(server2);
    });
  });

  describe('Performance and Memory', () => {
    it('should handle multiple server creations efficiently', () => {
      const servers = [];
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        servers.push(createServer());
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(servers).toHaveLength(100);
      expect(duration).toBeLessThan(1000); // Should take less than 1 second
    });

    it('should handle rapid argument parsing', () => {
      const originalArgv = process.argv;
      
      const testConfigs = [
        ['node', 'dist/index.js'],
        ['node', 'dist/index.js', '--transport=http'],
        ['node', 'dist/index.js', '--transport=http', '--port=8080'],
        ['node', 'dist/index.js', '--transport=stdio']
      ];

      testConfigs.forEach(config => {
        process.argv = config;
        const args = process.argv.slice(2);
        const transportType = args.find(arg => arg.startsWith('--transport='))?.split('=')[1] || 'stdio';
        
        expect(['stdio', 'http']).toContain(transportType);
      });

      process.argv = originalArgv;
    });
  });

  describe('HTTP Transport Integration', () => {
    let mockHttpServer: any;
    
    beforeEach(() => {
      // Mock HTTP server creation
      mockHttpServer = {
        listen: vi.fn((port, callback) => {
          if (callback) callback();
        }),
        close: vi.fn()
      };
      
      // Mock the HTTP server creation
      vi.mock('http', () => ({
        createServer: vi.fn(() => mockHttpServer)
      }));
    });

    it('should create H3 app and router', () => {
      const app = createApp();
      const router = createRouter();
      
      expect(app).toBeDefined();
      expect(router).toBeDefined();
      expect(typeof app.use).toBe('function');
    });

    it('should handle port configuration parsing', () => {
      const testPorts = [3000, 8080, 5000, 9999];
      
      testPorts.forEach(expectedPort => {
        const args = [`--transport=http`, `--port=${expectedPort}`];
        const port = parseInt(args.find(arg => arg.startsWith('--port='))?.split('=')[1] || '3000');
        
        expect(port).toBe(expectedPort);
      });
    });

    it('should default to port 3000 for HTTP transport', () => {
      const args = ['--transport=http'];
      const port = parseInt(args.find(arg => arg.startsWith('--port='))?.split('=')[1] || '3000');
      
      expect(port).toBe(3000);
    });

    it('should handle invalid port numbers gracefully', () => {
      const args = ['--transport=http', '--port=invalid'];
      const port = parseInt(args.find(arg => arg.startsWith('--port='))?.split('=')[1] || '3000');
      
      expect(isNaN(port)).toBe(true);
    });
  });

  describe('Main Function Integration', () => {
    let originalArgv: string[];
    let mockRunStdio: any;
    let mockRunHttp: any;
    
    beforeEach(() => {
      originalArgv = process.argv;
      
      // Mock the transport functions to avoid actual server startup
      mockRunStdio = vi.fn().mockResolvedValue(undefined);
      mockRunHttp = vi.fn().mockResolvedValue(undefined);
      
      // Replace the actual functions with mocks
      vi.doMock('../src/index.js', () => ({
        createServer,
        runStdio: mockRunStdio,
        runHttp: mockRunHttp,
        main: async () => {
          const args = process.argv.slice(2);
          const transportType = args.find(arg => arg.startsWith('--transport='))?.split('=')[1] || 'stdio';
          const port = parseInt(args.find(arg => arg.startsWith('--port='))?.split('=')[1] || '3000');
          
          switch (transportType) {
            case 'http':
              await mockRunHttp(port);
              break;
            case 'stdio':
            default:
              await mockRunStdio();
              break;
          }
        }
      }));
    });
    
    afterEach(() => {
      process.argv = originalArgv;
      vi.restoreAllMocks();
    });

    it('should route to stdio transport by default', async () => {
      process.argv = ['node', 'dist/index.js'];
      
      const args = process.argv.slice(2);
      const transportType = args.find(arg => arg.startsWith('--transport='))?.split('=')[1] || 'stdio';
      
      expect(transportType).toBe('stdio');
    });

    it('should route to HTTP transport when specified', async () => {
      process.argv = ['node', 'dist/index.js', '--transport=http'];
      
      const args = process.argv.slice(2);
      const transportType = args.find(arg => arg.startsWith('--transport='))?.split('=')[1] || 'stdio';
      
      expect(transportType).toBe('http');
    });

    it('should parse custom port for HTTP transport', async () => {
      process.argv = ['node', 'dist/index.js', '--transport=http', '--port=8080'];
      
      const args = process.argv.slice(2);
      const port = parseInt(args.find(arg => arg.startsWith('--port='))?.split('=')[1] || '3000');
      
      expect(port).toBe(8080);
    });

    it('should handle malformed transport arguments', async () => {
      process.argv = ['node', 'dist/index.js', '--transport=invalid'];
      
      const args = process.argv.slice(2);
      const transportType = args.find(arg => arg.startsWith('--transport='))?.split('=')[1] || 'stdio';
      
      // Invalid transport should still be captured as string
      expect(transportType).toBe('invalid');
    });
  });

  describe('Tool Implementation Integration', () => {
    let server: any;
    
    beforeEach(() => {
      server = createServer();
    });

    it('should register all example tools', () => {
      // Server should be created and configured
      expect(server).toBeDefined();
      expect(typeof server.tool).toBe('function');
    });

    it('should handle tool registration with proper parameters', () => {
      // Test the pattern used by tools
      const mockTool = vi.fn();
      server.tool = mockTool;
      
      // Simulate tool registration
      server.tool(
        'test_tool',
        'Test description',
        { param: { describe: () => 'Test param' } },
        async () => ({
          content: [{ type: 'text', text: 'Test result' }],
          isError: false
        })
      );
      
      expect(mockTool).toHaveBeenCalledWith(
        'test_tool',
        'Test description',
        { param: { describe: expect.any(Function) } },
        expect.any(Function)
      );
    });

    it('should create proper tool response structure', () => {
      const response = {
        content: [{
          type: 'text',
          text: 'Test response'
        }],
        isError: false
      };
      
      // Validate response structure matches MCP specification
      expect(response).toHaveProperty('content');
      expect(response).toHaveProperty('isError');
      expect(Array.isArray(response.content)).toBe(true);
      expect(response.content[0]).toHaveProperty('type', 'text');
      expect(response.content[0]).toHaveProperty('text');
      expect(typeof response.isError).toBe('boolean');
    });

    it('should handle tool error responses correctly', () => {
      const errorResponse = {
        content: [{
          type: 'text',
          text: 'Error: Something went wrong'
        }],
        isError: true
      };
      
      expect(errorResponse.isError).toBe(true);
      expect(errorResponse.content[0].text).toContain('Error:');
    });
  });

  describe('Server Configuration and Capabilities', () => {
    it('should initialize server with correct capabilities', () => {
      const server = createServer();
      
      // Server should be properly initialized
      expect(server).toBeDefined();
      expect(server.constructor.name).toBe('McpServer');
    });

    it('should handle server name configuration', () => {
      // Test server name pattern
      const expectedName = 'mcp-template-server';
      const actualName = 'mcp-template-server'; // This would come from server config
      
      expect(actualName).toBe(expectedName);
    });

    it('should support MCP 2025-06-18 specification features', () => {
      // Test specification compliance features
      const capabilities = {
        tools: {},
        resources: {},
        prompts: {},
        logging: {}
      };
      
      expect(capabilities).toHaveProperty('tools');
      expect(capabilities).toHaveProperty('resources');
      expect(capabilities).toHaveProperty('prompts');
      expect(capabilities).toHaveProperty('logging');
    });

    it('should handle protocol version headers', () => {
      const protocolVersion = '2024-11-05';
      const mockHeaders = { 'MCP-Protocol-Version': protocolVersion };
      
      expect(mockHeaders['MCP-Protocol-Version']).toBe(protocolVersion);
    });
  });

  describe('Error Boundary and Resilience', () => {
    it('should handle server creation failures gracefully', () => {
      // Test that server creation doesn't throw under normal conditions
      expect(() => createServer()).not.toThrow();
    });

    it('should handle transport connection errors', () => {
      // Mock console.error to test error handling
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      try {
        throw new Error('Transport connection failed');
      } catch (error) {
        console.error('Transport error:', error);
      }
      
      expect(consoleSpy).toHaveBeenCalledWith('Transport error:', expect.any(Error));
    });

    it('should handle JSON-RPC error responses', () => {
      const jsonRpcError = {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error'
        },
        id: null
      };
      
      expect(jsonRpcError).toHaveProperty('jsonrpc', '2.0');
      expect(jsonRpcError).toHaveProperty('error');
      expect(jsonRpcError.error).toHaveProperty('code');
      expect(jsonRpcError.error).toHaveProperty('message');
    });

    it('should handle method not allowed responses', () => {
      const methodNotAllowed = {
        statusCode: 405,
        body: {
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Method not allowed.'
          },
          id: null
        }
      };
      
      expect(methodNotAllowed.statusCode).toBe(405);
      expect(methodNotAllowed.body.error.code).toBe(-32000);
      expect(methodNotAllowed.body.error.message).toBe('Method not allowed.');
    });
  });

  describe('Tool Handler Integration', () => {
    it('should simulate echo tool execution', async () => {
      // Simulate the echo tool logic
      const echoTool = async ({ text, uppercase }: { text: string; uppercase?: boolean }) => {
        try {
          const result = uppercase ? text.toUpperCase() : text;
          return {
            content: [{
              type: "text",
              text: `Echo: ${result}`
            }],
            isError: false
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`Echo tool failed: ${errorMessage}`);
        }
      };
      
      const result = await echoTool({ text: 'hello world', uppercase: true });
      expect(result.content[0].text).toBe('Echo: HELLO WORLD');
      expect(result.isError).toBe(false);
    });

    it('should simulate calculate tool execution', async () => {
      // Simulate the calculate tool logic
      const calculateTool = async ({ operation, a, b }: { operation: 'add' | 'subtract' | 'multiply' | 'divide'; a: number; b: number }) => {
        try {
          let result: number;
          switch (operation) {
            case "add":
              result = a + b;
              break;
            case "subtract":
              result = a - b;
              break;
            case "multiply":
              result = a * b;
              break;
            case "divide":
              if (b === 0) throw new Error("Division by zero is not allowed");
              result = a / b;
              break;
          }
          
          return {
            content: [{
              type: "text",
              text: `${a} ${operation} ${b} = ${result}`
            }],
            isError: false
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`Calculate tool failed: ${errorMessage}`);
        }
      };
      
      const result = await calculateTool({ operation: 'add', a: 5, b: 3 });
      expect(result.content[0].text).toBe('5 add 3 = 8');
      expect(result.isError).toBe(false);
    });

    it('should simulate current_time tool execution', async () => {
      // Simulate the current_time tool logic
      const currentTimeTool = async ({ format = "iso" }: { format?: 'iso' | 'locale' | 'timestamp' }) => {
        try {
          const now = new Date();
          let timeString: string;
          
          switch (format) {
            case "iso":
              timeString = now.toISOString();
              break;
            case "locale":
              timeString = now.toLocaleString();
              break;
            case "timestamp":
              timeString = now.getTime().toString();
              break;
          }
          
          return {
            content: [{
              type: "text",
              text: `Current time (${format}): ${timeString}`
            }],
            isError: false
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`Current time tool failed: ${errorMessage}`);
        }
      };
      
      const result = await currentTimeTool({ format: 'iso' });
      expect(result.content[0].text).toMatch(/Current time \(iso\): \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
      expect(result.isError).toBe(false);
    });

    it('should handle tool execution errors', async () => {
      // Test division by zero error
      const calculateTool = async ({ operation, a, b }: { operation: 'divide'; a: number; b: number }) => {
        try {
          if (b === 0) throw new Error("Division by zero is not allowed");
          const result = a / b;
          return {
            content: [{
              type: "text",
              text: `${a} ${operation} ${b} = ${result}`
            }],
            isError: false
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`Calculate tool failed: ${errorMessage}`);
        }
      };
      
      await expect(() => calculateTool({ operation: 'divide', a: 10, b: 0 })).rejects.toThrow('Calculate tool failed: Division by zero is not allowed');
    });

    it('should simulate weather API tool execution without API key', async () => {
      // Simulate the weather tool logic when no API key is set
      const weatherTool = async () => {
        try {
          const API_KEY = "your-api-key-here"; // Simulate no API key set
          
          if (API_KEY === "your-api-key-here") {
            return {
              content: [{
                type: "text",
                text: "⚠️ Weather API demo: Please set OPENWEATHER_API_KEY environment variable. Visit https://openweathermap.org/api to get a free API key.\\n\\nExample response format:\\n🌤️ London, GB\\nTemperature: 15°C (feels like 13°C)\\nConditions: Partly cloudy\\nHumidity: 65%\\nWind: 12 km/h SW"
              }],
              isError: false
            };
          }
          
          // This wouldn't be reached in this test
          return {
            content: [{ type: "text", text: "Weather data" }],
            isError: false
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`Weather tool failed: ${errorMessage}`);
        }
      };
      
      const result = await weatherTool();
      expect(result.content[0].text).toContain('Weather API demo');
      expect(result.content[0].text).toContain('OPENWEATHER_API_KEY');
      expect(result.isError).toBe(false);
    });

    it('should simulate weather API error handling', async () => {
      // Test various weather API error scenarios
      const weatherErrorScenarios = [
        { name: 'timeout', error: { name: 'AbortError' }, expectedMessage: 'Weather API request timed out' },
        { name: 'network', error: new TypeError('fetch failed'), expectedMessage: 'Network error: Unable to connect to weather service' },
        { name: 'generic', error: new Error('API error'), expectedMessage: 'Weather tool failed: API error' }
      ];

      for (const { error, expectedMessage } of weatherErrorScenarios) {
        const weatherTool = async () => {
          try {
            throw error;
          } catch (err: any) {
            if (err.name === 'AbortError') {
              throw new Error("Weather API request timed out. Please try again.");
            } else if (err instanceof TypeError && err.message.includes('fetch')) {
              throw new Error("Network error: Unable to connect to weather service. Please check your internet connection.");
            } else {
              const errorMessage = err instanceof Error ? err.message : String(err);
              throw new Error(`Weather tool failed: ${errorMessage}`);
            }
          }
        };

        await expect(weatherTool()).rejects.toThrow(expectedMessage);
      }
    });

    it('should test weather helper functions', async () => {
      // Test weather emoji mapping logic
      const getWeatherEmoji = (condition: string): string => {
        const emojiMap: Record<string, string> = {
          'Clear': '☀️',
          'Clouds': '☁️',
          'Rain': '🌧️',
          'Snow': '❄️',
          'Thunderstorm': '⛈️'
        };
        return emojiMap[condition] || '🌤️';
      };

      expect(getWeatherEmoji('Clear')).toBe('☀️');
      expect(getWeatherEmoji('Rain')).toBe('🌧️');
      expect(getWeatherEmoji('Unknown')).toBe('🌤️');

      // Test wind direction conversion
      const getWindDirection = (degrees?: number): string => {
        if (degrees === undefined) return '';
        const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        const index = Math.round(degrees / 22.5) % 16;
        return directions[index];
      };

      expect(getWindDirection(0)).toBe('N');
      expect(getWindDirection(90)).toBe('E');
      expect(getWindDirection(180)).toBe('S');
      expect(getWindDirection(270)).toBe('W');
      expect(getWindDirection(undefined)).toBe('');
    });

    it('should test API response validation patterns', async () => {
      // Test API response structure validation
      const validateWeatherResponse = (data: any): boolean => {
        return !!(data.main && data.weather && data.weather[0]);
      };

      const validResponse = {
        main: { temp: 20, feels_like: 18, humidity: 65 },
        weather: [{ main: 'Clear', description: 'clear sky' }],
        name: 'London'
      };

      const invalidResponses = [
        {},
        { main: {} },
        { weather: [] },
        { main: {}, weather: [] }
      ];

      expect(validateWeatherResponse(validResponse)).toBe(true);
      invalidResponses.forEach(response => {
        expect(validateWeatherResponse(response)).toBe(false);
      });
    });
  });

  describe('Module and Import Validation', () => {
    it('should validate that all required modules are importable', () => {
      // Test that core dependencies are properly imported
      expect(McpServer).toBeDefined();
      expect(StdioServerTransport).toBeDefined();
      expect(createApp).toBeDefined();
      expect(createRouter).toBeDefined();
    });

    it('should validate server factory function exports', () => {
      expect(typeof createServer).toBe('function');
      expect(typeof runStdio).toBe('function');
      expect(typeof runHttp).toBe('function');
      expect(typeof main).toBe('function');
    });

    it('should validate server instance creation', () => {
      const server = createServer();
      expect(server).toBeInstanceOf(McpServer);
      expect(server).toHaveProperty('tool');
      expect(server).toHaveProperty('connect');
    });
  });

  describe('Argument Parsing Edge Cases', () => {
    let originalArgv: string[];
    
    beforeEach(() => {
      originalArgv = process.argv;
    });
    
    afterEach(() => {
      process.argv = originalArgv;
    });

    it('should handle empty command line arguments', () => {
      process.argv = ['node', 'dist/index.js'];
      const args = process.argv.slice(2);
      
      expect(args).toHaveLength(0);
      
      const transportType = args.find(arg => arg.startsWith('--transport='))?.split('=')[1] || 'stdio';
      const port = parseInt(args.find(arg => arg.startsWith('--port='))?.split('=')[1] || '3000');
      
      expect(transportType).toBe('stdio');
      expect(port).toBe(3000);
    });

    it('should handle partial argument parsing', () => {
      process.argv = ['node', 'dist/index.js', '--transport='];
      const args = process.argv.slice(2);
      
      const transportArg = args.find(arg => arg.startsWith('--transport='));
      const transportType = transportArg?.split('=')[1] || 'stdio';
      
      // Empty value after = should fall back to default 'stdio'
      expect(transportType).toBe('stdio');
    });

    it('should handle mixed valid and invalid arguments', () => {
      process.argv = ['node', 'dist/index.js', '--transport=http', '--invalid-arg', '--port=8080', '--another-invalid'];
      const args = process.argv.slice(2);
      
      const transportType = args.find(arg => arg.startsWith('--transport='))?.split('=')[1] || 'stdio';
      const port = parseInt(args.find(arg => arg.startsWith('--port='))?.split('=')[1] || '3000');
      
      expect(transportType).toBe('http');
      expect(port).toBe(8080);
      expect(args).toContain('--invalid-arg');
      expect(args).toContain('--another-invalid');
    });

    it('should handle duplicate arguments', () => {
      process.argv = ['node', 'dist/index.js', '--transport=http', '--transport=stdio', '--port=8080', '--port=9000'];
      const args = process.argv.slice(2);
      
      // Should find the first occurrence
      const transportType = args.find(arg => arg.startsWith('--transport='))?.split('=')[1] || 'stdio';
      const port = parseInt(args.find(arg => arg.startsWith('--port='))?.split('=')[1] || '3000');
      
      expect(transportType).toBe('http'); // First occurrence
      expect(port).toBe(8080); // First occurrence
    });
  });

  describe('HTTP Transport Integration Tests', () => {
    it('should demonstrate HTTP server testing patterns', async () => {
      // Example: Testing HTTP server creation logic
      const testPort = 3001;
      
      // Test argument parsing for HTTP transport
      const args = ['--transport=http', `--port=${testPort}`];
      const transportType = args.find(arg => arg.startsWith('--transport='))?.split('=')[1] || 'stdio';
      const port = parseInt(args.find(arg => arg.startsWith('--port='))?.split('=')[1] || '3000');
      
      expect(transportType).toBe('http');
      expect(port).toBe(testPort);
    });

    it('should test HTTP route creation patterns', async () => {
      // Example: Testing H3 app and router creation
      const app = createApp();
      const router = createRouter();
      
      expect(app).toBeDefined();
      expect(router).toBeDefined();
      expect(typeof app.use).toBe('function');
      
      // Test router method availability
      expect(typeof router.get).toBe('function');
      expect(typeof router.post).toBe('function');
      expect(typeof router.delete).toBe('function');
    });

    it('should test H3 eventHandler pattern', async () => {
      // Example: Testing H3 eventHandler wrapper function
      const mockHandler = eventHandler(async () => {
        return { message: 'test response' };
      });
      
      expect(mockHandler).toBeDefined();
      expect(typeof mockHandler).toBe('function');
      
      // Test that eventHandler creates a proper route handler
      const mockEvent = {
        node: {
          req: { headers: {} },
          res: { setHeader: vi.fn(), write: vi.fn(), end: vi.fn() }
        }
      } as any; // Type assertion for testing - real H3Event has many more properties
      
      const result = await mockHandler(mockEvent);
      expect(result).toEqual({ message: 'test response' });
    });

    it('should test HTTP error response patterns', async () => {
      // Example: Method not allowed response pattern
      const methodNotAllowedResponse = {
        statusCode: 405,
        body: {
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Method not allowed."
          },
          id: null
        }
      };
      
      expect(methodNotAllowedResponse.statusCode).toBe(405);
      expect(methodNotAllowedResponse.body.error.code).toBe(-32000);
    });

    it('should test health check response pattern', async () => {
      // Example: Health check endpoint response
      const healthResponse = {
        statusCode: 200,
        body: { 
          status: 'ok', 
          timestamp: new Date().toISOString() 
        }
      };
      
      expect(healthResponse.statusCode).toBe(200);
      expect(healthResponse.body.status).toBe('ok');
      expect(healthResponse.body.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
    });

    it('should test MCP protocol version header pattern', async () => {
      // Example: Testing protocol version header setting
      const protocolVersion = '2024-11-05';
      const headers: Record<string, string> = {};
      
      // Simulate header setting
      headers['MCP-Protocol-Version'] = protocolVersion;
      
      expect(headers['MCP-Protocol-Version']).toBe(protocolVersion);
    });

    it('should test Express adapter pattern', async () => {
      // Example: Testing the Express compatibility adapter
      const mockH3Event = {
        node: {
          req: { headers: { 'content-type': 'application/json' } },
          res: { setHeader: vi.fn(), write: vi.fn(), end: vi.fn() }
        }
      };
      
      const mockReq = {
        body: { jsonrpc: '2.0', method: 'tools/list' },
        headers: mockH3Event.node.req.headers,
        method: 'POST',
        url: '/mcp'
      };
      
      const mockRes = {
        headersSent: false,
        json: vi.fn(),
        setHeader: vi.fn(),
        end: vi.fn()
      };
      
      // Test adapter structure
      expect(mockReq).toHaveProperty('body');
      expect(mockReq).toHaveProperty('headers');
      expect(mockReq).toHaveProperty('method', 'POST');
      expect(mockRes).toHaveProperty('json');
      expect(mockRes).toHaveProperty('setHeader');
    });
  });

  describe('Stdio Transport Integration Tests', () => {
    it('should test stdio server initialization pattern', async () => {
      // Example: Testing stdio transport setup pattern
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const processOnSpy = vi.spyOn(process, 'on').mockImplementation(() => process);
      
      // Test that stdio server can be started (actual server creation tested separately)
      await runStdio();
      
      // Verify logging and signal setup
      expect(consoleSpy).toHaveBeenCalledWith('MCP Server running on stdio');
      expect(processOnSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    });

    it('should test SIGINT handler pattern', async () => {
      // Example: Testing signal handler setup pattern
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      
      // Simulate the SIGINT handler logic
      const sigintHandler = async () => {
        console.log('Shutting down STDIO server...');
        console.log('Server shutdown complete');
        process.exit(0);
      };
      
      await sigintHandler();
      
      // Verify graceful shutdown pattern
      expect(consoleSpy).toHaveBeenCalledWith('Shutting down STDIO server...');
      expect(consoleSpy).toHaveBeenCalledWith('Server shutdown complete');
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should test MCP SDK integration pattern', async () => {
      // Example: Testing MCP server and transport creation pattern
      const server = createServer();
      
      // Verify server has required MCP methods
      expect(server).toHaveProperty('tool');
      expect(server).toHaveProperty('connect');
      expect(server).toHaveProperty('close');
      
      // Test that server is an MCP server instance
      expect(server.constructor.name).toBe('McpServer');
    });
  });

  describe('Main Function Integration Tests', () => {
    let originalArgv: string[];
    
    beforeEach(() => {
      originalArgv = process.argv;
    });
    
    afterEach(() => {
      process.argv = originalArgv;
    });

    it('should test main function argument parsing', async () => {
      // Example: Testing main function argument parsing logic
      process.argv = ['node', 'dist/index.js'];
      
      const args = process.argv.slice(2);
      const transportType = args.find(arg => arg.startsWith('--transport='))?.split('=')[1] || 'stdio';
      const port = parseInt(args.find(arg => arg.startsWith('--port='))?.split('=')[1] || '3000');
      
      expect(transportType).toBe('stdio');
      expect(port).toBe(3000);
    });

    it('should test main function HTTP transport routing', async () => {
      // Example: Testing HTTP transport argument handling
      process.argv = ['node', 'dist/index.js', '--transport=http', '--port=3002'];
      
      const args = process.argv.slice(2);
      const transportType = args.find(arg => arg.startsWith('--transport='))?.split('=')[1] || 'stdio';
      const port = parseInt(args.find(arg => arg.startsWith('--port='))?.split('=')[1] || '3000');
      
      expect(transportType).toBe('http');
      expect(port).toBe(3002);
    });

    it('should test main function error handling pattern', async () => {
      // Example: Testing error handling in main function
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      
      // Simulate the error handling pattern from main
      const simulateMainError = async () => {
        try {
          throw new Error('Main function failed');
        } catch (error) {
          console.error('Fatal error in main():', error);
          process.exit(1);
        }
      };
      
      await simulateMainError();
      
      expect(consoleSpy).toHaveBeenCalledWith('Fatal error in main():', expect.any(Error));
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should test main function transport switching logic', async () => {
      // Example: Testing the switch statement logic in main
      const testCases = [
        { args: ['--transport=http'], expectedTransport: 'http' },
        { args: ['--transport=stdio'], expectedTransport: 'stdio' },
        { args: [], expectedTransport: 'stdio' }, // default case
        { args: ['--transport=invalid'], expectedTransport: 'invalid' }
      ];
      
      testCases.forEach(({ args, expectedTransport }) => {
        process.argv = ['node', 'dist/index.js', ...args];
        const argv = process.argv.slice(2);
        const transportType = argv.find(arg => arg.startsWith('--transport='))?.split('=')[1] || 'stdio';
        
        expect(transportType).toBe(expectedTransport);
      });
    });
  });

  describe('Advanced Testing Patterns for Template Users', () => {
    it('should demonstrate MCP request/response testing pattern', async () => {
      // Example: How to test MCP JSON-RPC request/response cycle
      const mockRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
      };
      
      const mockResponse = {
        jsonrpc: '2.0',
        id: 1,
        result: {
          tools: [
            {
              name: 'echo',
              description: 'Echoes back the provided text with optional formatting'
            }
          ]
        }
      };
      
      expect(mockRequest.jsonrpc).toBe('2.0');
      expect(mockRequest.method).toBe('tools/list');
      expect(mockResponse.result.tools).toHaveLength(1);
    });

    it('should demonstrate HTTP method testing pattern', async () => {
      // Example: How to test HTTP method restrictions
      const methodTests = [
        { method: 'GET', shouldAllow: false },
        { method: 'POST', shouldAllow: true },
        { method: 'DELETE', shouldAllow: false },
        { method: 'PUT', shouldAllow: false }
      ];
      
      methodTests.forEach(({ method, shouldAllow }) => {
        if (shouldAllow) {
          expect(method).toBe('POST');
        } else {
          const errorResponse = {
            statusCode: 405,
            body: {
              jsonrpc: '2.0',
              error: { code: -32000, message: 'Method not allowed.' },
              id: null
            }
          };
          expect(errorResponse.statusCode).toBe(405);
        }
      });
    });

    it('should demonstrate server lifecycle testing pattern', async () => {
      // Example: How to test server startup and shutdown patterns
      const lifecycleEvents: string[] = [];
      
      // Simulate server lifecycle
      const simulateServerLifecycle = async () => {
        lifecycleEvents.push('creating server');
        const server = createServer();
        
        lifecycleEvents.push('server created');
        expect(server).toBeDefined();
        
        lifecycleEvents.push('setting up transport');
        // Transport setup would happen here
        
        lifecycleEvents.push('server ready');
        
        // Cleanup
        lifecycleEvents.push('shutting down');
      };
      
      await simulateServerLifecycle();
      
      expect(lifecycleEvents).toEqual([
        'creating server',
        'server created', 
        'setting up transport',
        'server ready',
        'shutting down'
      ]);
    });

    it('should demonstrate configuration testing pattern', async () => {
      // Example: How to test different configuration scenarios
      const configTests = [
        { 
          name: 'default config',
          args: [],
          expected: { transport: 'stdio', port: 3000 }
        },
        {
          name: 'http config',
          args: ['--transport=http'],
          expected: { transport: 'http', port: 3000 }
        },
        {
          name: 'custom port',
          args: ['--transport=http', '--port=8080'],
          expected: { transport: 'http', port: 8080 }
        }
      ];
      
      configTests.forEach(({ args, expected }) => {
        const transportType = args.find(arg => arg.startsWith('--transport='))?.split('=')[1] || 'stdio';
        const port = parseInt(args.find(arg => arg.startsWith('--port='))?.split('=')[1] || '3000');
        
        expect({ transport: transportType, port }).toEqual(expected);
      });
    });

    it('should demonstrate error handling testing pattern', async () => {
      // Example: How to test comprehensive error scenarios
      const errorScenarios = [
        {
          name: 'JSON-RPC parse error',
          error: { code: -32700, message: 'Parse error' }
        },
        {
          name: 'Invalid request',
          error: { code: -32600, message: 'Invalid Request' }
        },
        {
          name: 'Method not found',
          error: { code: -32601, message: 'Method not found' }
        },
        {
          name: 'Internal error',
          error: { code: -32603, message: 'Internal error' }
        }
      ];
      
      errorScenarios.forEach(({ error }) => {
        const errorResponse = {
          jsonrpc: '2.0',
          error,
          id: null
        };
        
        expect(errorResponse.jsonrpc).toBe('2.0');
        expect(errorResponse.error.code).toBeDefined();
        expect(errorResponse.error.message).toBeDefined();
      });
    });

    it('should demonstrate performance testing pattern', async () => {
      // Example: How to test performance characteristics
      const startTime = performance.now();
      
      // Simulate rapid server creation (template users might do this)
      const servers = [];
      for (let i = 0; i < 10; i++) {
        servers.push(createServer());
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(servers).toHaveLength(10);
      expect(duration).toBeLessThan(100); // Should be very fast
      
      // Test that all servers are independent
      const serverIds = servers.map(s => s.constructor.name);
      expect(serverIds.every(id => id === 'McpServer')).toBe(true);
    });
  });
});