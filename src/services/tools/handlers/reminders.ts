import type { RegisteredTool } from '../types';

interface Reminder {
  id: number;
  text: string;
  createdAt: string;
}

// In-memory store — persists for the session only (Phase 1)
let reminders: Reminder[] = [];
let nextId = 1;

export const setReminderTool: RegisteredTool = {
  declaration: {
    name: 'set_reminder',
    description:
      'Saves a reminder note for the user. The reminder is stored in memory for this session. ' +
      'Use this when the user says "remind me to...", "don\'t let me forget...", or similar.',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The reminder text, e.g. "Call the office at 3pm"',
        },
      },
      required: ['text'],
    },
  },
  handler: async (args) => {
    const text = String(args.text).trim();
    if (!text) {
      return { error: 'No reminder text provided' };
    }

    const reminder: Reminder = {
      id: nextId++,
      text,
      createdAt: new Date().toISOString(),
    };
    reminders.push(reminder);

    return {
      saved: true,
      reminder: reminder.text,
      totalReminders: reminders.length,
    };
  },
};

export const listRemindersTool: RegisteredTool = {
  declaration: {
    name: 'list_reminders',
    description:
      'Lists all reminders the user has set during this session. ' +
      'Use this when the user asks "what are my reminders?", "show my reminders", or similar.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  handler: async () => {
    if (reminders.length === 0) {
      return { reminders: [], message: 'No reminders set yet' };
    }

    return {
      reminders: reminders.map((r) => ({
        id: r.id,
        text: r.text,
        createdAt: r.createdAt,
      })),
      count: reminders.length,
    };
  },
};

// Exported for testing or clearing on reconnect
export function clearReminders(): void {
  reminders = [];
  nextId = 1;
}
