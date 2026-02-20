import type { RegisteredTool } from '../types';

// Only allow digits, operators, parens, decimal points, and whitespace
const SAFE_MATH_PATTERN = /^[\d+\-*/().%\s]+$/;

export const mathTool: RegisteredTool = {
  declaration: {
    name: 'calculate',
    description:
      'Evaluates a mathematical arithmetic expression and returns the result. ' +
      'Supports +, -, *, /, %, and parentheses. ' +
      'Use this when the user asks to calculate, compute, or do math.',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'The arithmetic expression to evaluate, e.g. "145 * 3.5" or "(100 + 50) / 3"',
        },
      },
      required: ['expression'],
    },
  },
  handler: async (args) => {
    const expression = String(args.expression).trim();

    if (!expression) {
      return { error: 'No expression provided' };
    }

    if (!SAFE_MATH_PATTERN.test(expression)) {
      return { error: 'Invalid expression — only numbers and arithmetic operators are allowed' };
    }

    try {
      // eslint-disable-next-line no-eval
      const result = Function(`"use strict"; return (${expression})`)();

      if (typeof result !== 'number' || !isFinite(result)) {
        return { error: 'Expression did not produce a valid number' };
      }

      // Round to avoid floating point display issues
      const rounded = Math.round(result * 1e10) / 1e10;

      return {
        expression,
        result: rounded,
        formatted: rounded.toLocaleString('en-US', { maximumFractionDigits: 10 }),
      };
    } catch {
      return { error: 'Could not evaluate expression' };
    }
  },
};
