import type { RegisteredTool } from '../types';

// ─── Mock WorkSuite Data ────────────────────────────────────────────
// Realistic demo data for a produce grower operation.
// When the real WorkSuite MCP is ready, these handlers get swapped
// for actual API calls — tool declarations stay the same.

const MOCK_PRODUCTION_SCHEDULE = [
  { id: 'PRD-1042', item: 'Roma Tomatoes', quantity: '2,400 lbs', field: 'Field 7A', status: 'harvesting', crew: 'Team Alpha', dueDate: 'Today' },
  { id: 'PRD-1043', item: 'Sweet Corn', quantity: '800 dozen', field: 'Field 3B', status: 'ready', crew: 'Team Beta', dueDate: 'Today' },
  { id: 'PRD-1044', item: 'Green Bell Peppers', quantity: '1,600 lbs', field: 'Field 5C', status: 'in-progress', crew: 'Team Alpha', dueDate: 'Tomorrow' },
  { id: 'PRD-1045', item: 'Jalapeños', quantity: '400 lbs', field: 'Field 5C', status: 'scheduled', crew: 'Team Gamma', dueDate: 'Tomorrow' },
  { id: 'PRD-1046', item: 'Butternut Squash', quantity: '3,200 lbs', field: 'Field 12', status: 'scheduled', crew: 'Team Beta', dueDate: 'Wednesday' },
  { id: 'PRD-1047', item: 'Red Onions', quantity: '1,000 lbs', field: 'Field 2A', status: 'scheduled', crew: 'Team Alpha', dueDate: 'Thursday' },
];

const MOCK_INVENTORY = [
  { item: 'Roma Tomatoes', onHand: '4,800 lbs', committed: '3,200 lbs', available: '1,600 lbs', location: 'Cooler A', daysSupply: 2 },
  { item: 'Sweet Corn', onHand: '1,200 dozen', committed: '900 dozen', available: '300 dozen', location: 'Cooler B', daysSupply: 1 },
  { item: 'Green Bell Peppers', onHand: '2,100 lbs', committed: '1,800 lbs', available: '300 lbs', location: 'Cooler A', daysSupply: 1 },
  { item: 'Jalapeños', onHand: '600 lbs', committed: '200 lbs', available: '400 lbs', location: 'Cooler A', daysSupply: 4 },
  { item: 'Butternut Squash', onHand: '5,000 lbs', committed: '2,000 lbs', available: '3,000 lbs', location: 'Dry Storage', daysSupply: 6 },
  { item: 'Red Onions', onHand: '3,500 lbs', committed: '1,500 lbs', available: '2,000 lbs', location: 'Dry Storage', daysSupply: 8 },
  { item: 'Cilantro', onHand: '150 bunches', committed: '120 bunches', available: '30 bunches', location: 'Cooler C', daysSupply: 1 },
  { item: 'Mixed Greens', onHand: '800 lbs', committed: '600 lbs', available: '200 lbs', location: 'Cooler C', daysSupply: 2 },
];

const MOCK_ORDERS = [
  { id: 'ORD-8821', customer: 'Fresh Market Co-op', items: 'Roma Tomatoes (800 lbs), Sweet Corn (200 dz)', total: '$4,250', status: 'picking', deliveryDate: 'Today', route: 'Route A' },
  { id: 'ORD-8822', customer: 'Riverside Restaurant Group', items: 'Jalapeños (100 lbs), Cilantro (40 bunches), Bell Peppers (200 lbs)', total: '$1,820', status: 'picking', deliveryDate: 'Today', route: 'Route A' },
  { id: 'ORD-8823', customer: 'Valley Grocery Distribution', items: 'Roma Tomatoes (2,400 lbs), Sweet Corn (500 dz), Butternut Squash (1,000 lbs)', total: '$12,600', status: 'confirmed', deliveryDate: 'Tomorrow', route: 'Route B' },
  { id: 'ORD-8824', customer: 'Farm to Table Bistro', items: 'Mixed Greens (100 lbs), Roma Tomatoes (50 lbs)', total: '$580', status: 'confirmed', deliveryDate: 'Tomorrow', route: 'Route A' },
  { id: 'ORD-8825', customer: 'Sunshine Schools District', items: 'Sweet Corn (200 dz), Red Onions (300 lbs), Bell Peppers (400 lbs)', total: '$3,400', status: 'pending', deliveryDate: 'Wednesday', route: 'Route C' },
];

const MOCK_CUSTOMERS = [
  { name: 'Fresh Market Co-op', contact: 'Maria Santos', phone: '555-0142', terms: 'Net 30', ytdRevenue: '$148,200', lastOrder: '2 days ago' },
  { name: 'Valley Grocery Distribution', contact: 'James Chen', phone: '555-0198', terms: 'Net 15', ytdRevenue: '$312,500', lastOrder: 'Today' },
  { name: 'Riverside Restaurant Group', contact: 'David Park', phone: '555-0176', terms: 'Net 30', ytdRevenue: '$67,800', lastOrder: '1 week ago' },
  { name: 'Farm to Table Bistro', contact: 'Sarah Miller', phone: '555-0133', terms: 'COD', ytdRevenue: '$23,400', lastOrder: '3 days ago' },
  { name: 'Sunshine Schools District', contact: 'Linda Torres', phone: '555-0155', terms: 'Net 45', ytdRevenue: '$89,000', lastOrder: '5 days ago' },
];

// In-memory harvest log for the session
const harvestLog: Array<{ id: string; item: string; quantity: string; field: string; quality: string; timestamp: string }> = [];
let harvestCounter = 1;

// ─── Tool Definitions ───────────────────────────────────────────────

export const productionScheduleTool: RegisteredTool = {
  declaration: {
    name: 'check_production_schedule',
    description:
      'Returns the current production/harvest schedule. Shows what crops are being harvested, ' +
      'what\'s ready to pick, and what\'s coming up. Use when the grower asks "what\'s on the schedule?", ' +
      '"what are we harvesting today?", "what\'s the plan?", or similar.',
    parameters: {
      type: 'object',
      properties: {
        timeframe: {
          type: 'string',
          description: 'Filter by timeframe: "today", "tomorrow", "this_week", or "all"',
          enum: ['today', 'tomorrow', 'this_week', 'all'],
        },
        status: {
          type: 'string',
          description: 'Filter by status: "harvesting", "ready", "in-progress", "scheduled", or "all"',
        },
      },
    },
  },
  handler: async (args) => {
    let results = [...MOCK_PRODUCTION_SCHEDULE];

    const timeframe = String(args.timeframe || 'all').toLowerCase();
    if (timeframe === 'today') {
      results = results.filter((r) => r.dueDate === 'Today');
    } else if (timeframe === 'tomorrow') {
      results = results.filter((r) => r.dueDate === 'Tomorrow');
    }

    const status = String(args.status || 'all').toLowerCase();
    if (status !== 'all' && status) {
      results = results.filter((r) => r.status === status);
    }

    return {
      schedule: results,
      totalJobs: results.length,
      summary: `${results.length} production jobs${timeframe !== 'all' ? ` for ${timeframe}` : ''}`,
    };
  },
};

export const inventoryTool: RegisteredTool = {
  declaration: {
    name: 'check_inventory',
    description:
      'Returns current inventory levels for produce items. Shows on-hand quantity, committed (allocated to orders), ' +
      'available, storage location, and estimated days of supply. Use when the grower asks about stock levels, ' +
      '"how much do we have?", "are we low on anything?", "check inventory", or similar.',
    parameters: {
      type: 'object',
      properties: {
        item: {
          type: 'string',
          description: 'Specific item to look up, e.g. "tomatoes", "corn". Leave empty for all items.',
        },
        lowStockOnly: {
          type: 'string',
          description: 'Set to "true" to only show items with 2 or fewer days of supply.',
        },
      },
    },
  },
  handler: async (args) => {
    let results = [...MOCK_INVENTORY];

    const item = String(args.item || '').toLowerCase();
    if (item) {
      results = results.filter((r) => r.item.toLowerCase().includes(item));
    }

    if (args.lowStockOnly === 'true') {
      results = results.filter((r) => r.daysSupply <= 2);
    }

    const lowStockItems = results.filter((r) => r.daysSupply <= 2);

    return {
      inventory: results,
      totalItems: results.length,
      lowStockAlerts: lowStockItems.length > 0
        ? `${lowStockItems.length} items at 2 days or less: ${lowStockItems.map((i) => i.item).join(', ')}`
        : 'No low stock alerts',
    };
  },
};

export const ordersTool: RegisteredTool = {
  declaration: {
    name: 'check_orders',
    description:
      'Returns customer orders and their fulfillment status. Shows order details, customer, items, ' +
      'delivery date, and route. Use when the grower asks "what orders do we have?", "what\'s shipping today?", ' +
      '"any orders for [customer]?", or similar.',
    parameters: {
      type: 'object',
      properties: {
        customer: {
          type: 'string',
          description: 'Filter by customer name (partial match). Leave empty for all orders.',
        },
        deliveryDate: {
          type: 'string',
          description: 'Filter by delivery date: "today", "tomorrow", or "all"',
          enum: ['today', 'tomorrow', 'all'],
        },
        status: {
          type: 'string',
          description: 'Filter by status: "picking", "confirmed", "pending", or "all"',
        },
      },
    },
  },
  handler: async (args) => {
    let results = [...MOCK_ORDERS];

    const customer = String(args.customer || '').toLowerCase();
    if (customer) {
      results = results.filter((r) => r.customer.toLowerCase().includes(customer));
    }

    const deliveryDate = String(args.deliveryDate || 'all').toLowerCase();
    if (deliveryDate === 'today') {
      results = results.filter((r) => r.deliveryDate === 'Today');
    } else if (deliveryDate === 'tomorrow') {
      results = results.filter((r) => r.deliveryDate === 'Tomorrow');
    }

    const status = String(args.status || 'all').toLowerCase();
    if (status !== 'all' && status) {
      results = results.filter((r) => r.status === status);
    }

    const totalValue = results.reduce((sum, o) => {
      const val = parseFloat(o.total.replace(/[$,]/g, ''));
      return sum + val;
    }, 0);

    return {
      orders: results,
      totalOrders: results.length,
      totalValue: `$${totalValue.toLocaleString()}`,
    };
  },
};

export const customerLookupTool: RegisteredTool = {
  declaration: {
    name: 'lookup_customer',
    description:
      'Looks up customer information including contact details, payment terms, and year-to-date revenue. ' +
      'Use when the grower asks "who\'s the contact at [company]?", "what are their terms?", ' +
      '"how much have we sold to [customer]?", or similar.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Customer name to search for (partial match)',
        },
      },
      required: ['name'],
    },
  },
  handler: async (args) => {
    const name = String(args.name || '').toLowerCase();
    const results = MOCK_CUSTOMERS.filter((c) => c.name.toLowerCase().includes(name));

    if (results.length === 0) {
      return { found: false, message: `No customer found matching "${args.name}"` };
    }

    return {
      found: true,
      customers: results,
      count: results.length,
    };
  },
};

export const logHarvestTool: RegisteredTool = {
  declaration: {
    name: 'log_harvest',
    description:
      'Records a harvest entry — logs what was picked, how much, from which field, and quality grade. ' +
      'Use when the grower says "log a harvest", "we just picked...", "record that we harvested...", or similar.',
    parameters: {
      type: 'object',
      properties: {
        item: {
          type: 'string',
          description: 'What was harvested, e.g. "Roma Tomatoes", "Sweet Corn"',
        },
        quantity: {
          type: 'string',
          description: 'Amount harvested, e.g. "800 lbs", "200 dozen"',
        },
        field: {
          type: 'string',
          description: 'Which field it came from, e.g. "Field 7A". Optional.',
        },
        quality: {
          type: 'string',
          description: 'Quality grade: "A", "B", or "C". Defaults to "A" if not specified.',
          enum: ['A', 'B', 'C'],
        },
      },
      required: ['item', 'quantity'],
    },
  },
  handler: async (args) => {
    const entry = {
      id: `HRV-${String(harvestCounter++).padStart(4, '0')}`,
      item: String(args.item),
      quantity: String(args.quantity),
      field: String(args.field || 'Not specified'),
      quality: String(args.quality || 'A'),
      timestamp: new Date().toISOString(),
    };
    harvestLog.push(entry);

    return {
      logged: true,
      entry,
      message: `Harvest logged: ${entry.quantity} of ${entry.item} from ${entry.field}, Grade ${entry.quality}`,
      totalEntriesThisSession: harvestLog.length,
    };
  },
};

export const harvestSummaryTool: RegisteredTool = {
  declaration: {
    name: 'harvest_summary',
    description:
      'Shows all harvest entries logged during this session. Use when the grower asks ' +
      '"what have we logged?", "show me today\'s harvests", "harvest summary", or similar.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  handler: async () => {
    if (harvestLog.length === 0) {
      return { entries: [], message: 'No harvests logged this session yet.' };
    }

    return {
      entries: harvestLog,
      totalEntries: harvestLog.length,
    };
  },
};

export const fieldStatusTool: RegisteredTool = {
  declaration: {
    name: 'check_field_status',
    description:
      'Returns the status of fields — what\'s planted, growth stage, and any issues. ' +
      'Use when the grower asks "how\'s field 7?", "what\'s planted where?", "field status", or similar.',
    parameters: {
      type: 'object',
      properties: {
        field: {
          type: 'string',
          description: 'Specific field to check, e.g. "7A", "3B". Leave empty for all fields.',
        },
      },
    },
  },
  handler: async (args) => {
    const fields = [
      { field: 'Field 2A', crop: 'Red Onions', acreage: 8, stage: 'Mature — ready to harvest', planted: '10 weeks ago', issues: 'None' },
      { field: 'Field 3B', crop: 'Sweet Corn', acreage: 15, stage: 'Mature — harvest in progress', planted: '12 weeks ago', issues: 'None' },
      { field: 'Field 5C', crop: 'Bell Peppers & Jalapeños', acreage: 10, stage: 'Fruiting — picking daily', planted: '14 weeks ago', issues: 'Minor aphid pressure on south rows' },
      { field: 'Field 7A', crop: 'Roma Tomatoes', acreage: 12, stage: 'Peak harvest', planted: '16 weeks ago', issues: 'Some blossom end rot on Block 3' },
      { field: 'Field 9', crop: 'Mixed Greens & Cilantro', acreage: 4, stage: 'Succession planting — harvesting weekly', planted: 'Rolling', issues: 'Bolting in older cilantro beds' },
      { field: 'Field 12', crop: 'Butternut Squash', acreage: 20, stage: 'Curing — harvest next week', planted: '18 weeks ago', issues: 'None' },
    ];

    const fieldQuery = String(args.field || '').toLowerCase();
    const results = fieldQuery
      ? fields.filter((f) => f.field.toLowerCase().includes(fieldQuery))
      : fields;

    const withIssues = results.filter((f) => f.issues !== 'None');

    return {
      fields: results,
      totalFields: results.length,
      totalAcreage: results.reduce((sum, f) => sum + f.acreage, 0),
      activeIssues: withIssues.length > 0
        ? withIssues.map((f) => `${f.field}: ${f.issues}`).join('; ')
        : 'No active issues',
    };
  },
};
