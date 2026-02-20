import type { RegisteredTool } from '../types';

export const datetimeTool: RegisteredTool = {
  declaration: {
    name: 'get_current_datetime',
    description:
      'Returns the current date, time, day of week, and timezone. ' +
      'Use this when the user asks what time it is, what today\'s date is, or anything about the current date/time.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  handler: async () => {
    const now = new Date();

    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const tzFormatter = new Intl.DateTimeFormat('en-US', {
      timeZoneName: 'long',
    });
    const tzParts = tzFormatter.formatToParts(now);
    const timezone = tzParts.find((p) => p.type === 'timeZoneName')?.value || 'Unknown';

    return {
      formatted: `${dateFormatter.format(now)} at ${timeFormatter.format(now)}`,
      date: now.toISOString().split('T')[0],
      time: timeFormatter.format(now),
      dayOfWeek: new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(now),
      timezone,
      unixTimestamp: Math.floor(now.getTime() / 1000),
    };
  },
};
