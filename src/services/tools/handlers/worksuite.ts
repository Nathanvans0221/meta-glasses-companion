import type { RegisteredTool } from '../types';
import { wsapiService } from '../../wsapi';

// ─── Mock Data Fallback ─────────────────────────────────────────────
// Used when WSAPI is not configured. Gives a demo experience.

const MOCK_PRODUCTION = [
  { id: 'PRD-1042', item: 'Roma Tomatoes', quantity: '2,400 lbs', status: 'harvesting', dueDate: 'Today' },
  { id: 'PRD-1043', item: 'Sweet Corn', quantity: '800 dozen', status: 'ready', dueDate: 'Today' },
  { id: 'PRD-1044', item: 'Green Bell Peppers', quantity: '1,600 lbs', status: 'in-progress', dueDate: 'Tomorrow' },
];

const MOCK_INVENTORY = [
  { item: 'Roma Tomatoes', onHand: '4,800 lbs', available: '1,600 lbs', location: 'Cooler A', daysSupply: 2 },
  { item: 'Sweet Corn', onHand: '1,200 dozen', available: '300 dozen', location: 'Cooler B', daysSupply: 1 },
  { item: 'Green Bell Peppers', onHand: '2,100 lbs', available: '300 lbs', location: 'Cooler A', daysSupply: 1 },
];

const MOCK_ORDERS = [
  { id: 'ORD-8821', customer: 'Fresh Market Co-op', items: 'Roma Tomatoes (800 lbs), Sweet Corn (200 dz)', total: '$4,250', status: 'picking', deliveryDate: 'Today' },
  { id: 'ORD-8822', customer: 'Riverside Restaurant Group', items: 'Jalapeños (100 lbs), Bell Peppers (200 lbs)', total: '$1,820', status: 'picking', deliveryDate: 'Today' },
  { id: 'ORD-8823', customer: 'Valley Grocery Distribution', items: 'Roma Tomatoes (2,400 lbs), Butternut Squash (1,000 lbs)', total: '$12,600', status: 'confirmed', deliveryDate: 'Tomorrow' },
];

const MOCK_CUSTOMERS = [
  { name: 'Fresh Market Co-op', contact: 'Maria Santos', phone: '555-0142', terms: 'Net 30', ytdRevenue: '$148,200' },
  { name: 'Valley Grocery Distribution', contact: 'James Chen', phone: '555-0198', terms: 'Net 15', ytdRevenue: '$312,500' },
  { name: 'Riverside Restaurant Group', contact: 'David Park', phone: '555-0176', terms: 'Net 30', ytdRevenue: '$67,800' },
];

// In-memory harvest log
const harvestLog: Array<{ id: string; item: string; quantity: string; field: string; quality: string; timestamp: string }> = [];
let harvestCounter = 1;

// ─── GraphQL Queries ────────────────────────────────────────────────

const ORDERS_QUERY = `
  query GetOrders($tenantId: String!, $first: Int!, $statusFilter: OrderStatus) {
    orders(
      first: $first
      where: { and: [{ orderStatus: { eq: $statusFilter } }] }
      order: [{ initializedDate: DESC }]
    ) {
      nodes {
        orderId
        orderNumber
        customerName
        orderStatus
        orderTotal { amount, currency }
        numberOfLines
        expectedDeliveryDate
        initializedDate
      }
      totalCount
    }
  }
`;

const ITEMS_QUERY = `
  query GetItems($tenantId: String!, $first: Int!) {
    items(
      first: $first
      where: { status: { eq: ACTIVE } }
      order: [{ name: ASC }]
    ) {
      nodes {
        itemId
        name
        sku
        upc
        group
        status
        availableQuantity
        categories
      }
      totalCount
    }
  }
`;

const CUSTOMER_QUERY = `
  query GetCustomers($tenantId: String!, $first: Int!) {
    customers(
      first: $first
      where: { status: { eq: ACTIVE } }
      order: [{ name: ASC }]
    ) {
      nodes {
        customerId
        name
        erpId
        status
        numberOfLocations
        numberOfContacts
      }
      totalCount
    }
  }
`;

const CUSTOMER_DETAIL_QUERY = `
  query GetCustomer($tenantId: String!, $customerId: String!) {
    customer(tenantId: $tenantId, customerId: $customerId) {
      customerId
      name
      description
      currency
      status
      termsId
      contacts {
        type
        firstName
        lastName
        title
        phoneNumbers { type, value }
        emailAddresses { type, value }
      }
      locations {
        code
        name
        storeNumber
        address { city, stateProvince }
      }
      notes { noteText, submitDate }
    }
  }
`;

const WORK_ORDERS_QUERY = `
  query GetWorkOrders($tenantId: String!, $first: Int!) {
    workOrders(
      first: $first
      order: [{ deliveryDate: ASC }]
    ) {
      nodes {
        id
        jobId
        lineNumber
        erpId
        workOrderStatus
        startDate
        deliveryDate
        containerQuantity
        productionQuantity
        quantityProduced
      }
      totalCount
    }
  }
`;

const LOCATIONS_QUERY = `
  query GetLocations($tenantId: String!, $first: Int!) {
    locations(
      first: $first
      where: { status: { eq: ACTIVE } }
    ) {
      nodes {
        id
        name
        erpId
        locationType
        status
      }
      totalCount
    }
  }
`;

// ─── Tool Definitions ───────────────────────────────────────────────

export const productionScheduleTool: RegisteredTool = {
  declaration: {
    name: 'check_production_schedule',
    description:
      'Returns the current production/harvest schedule — work orders, jobs, what\'s in progress. ' +
      'Use when the grower asks "what\'s on the schedule?", "what are we working on?", or similar.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter by status: "NEW", "IN_PROGRESS", "CLOSED", or "all"',
        },
      },
    },
  },
  handler: async (args) => {
    if (!wsapiService.isConfigured()) {
      // Mock fallback
      let results = [...MOCK_PRODUCTION];
      const status = String(args.status || 'all').toLowerCase();
      if (status !== 'all') {
        results = results.filter((r) => r.status.toLowerCase().includes(status));
      }
      return { schedule: results, totalJobs: results.length, source: 'demo' };
    }

    try {
      const data = await wsapiService.query(WORK_ORDERS_QUERY, { first: 20 });
      const workOrders = data.workOrders?.nodes || [];

      const statusFilter = String(args.status || 'all').toUpperCase();
      const filtered = statusFilter === 'ALL'
        ? workOrders
        : workOrders.filter((wo: any) => wo.workOrderStatus === statusFilter);

      return {
        schedule: filtered.map((wo: any) => ({
          id: wo.erpId || wo.id,
          status: wo.workOrderStatus,
          deliveryDate: wo.deliveryDate,
          planned: wo.productionQuantity,
          produced: wo.quantityProduced,
          containers: wo.containerQuantity,
        })),
        totalJobs: filtered.length,
        source: 'worksuite',
      };
    } catch (err: any) {
      return { error: err.message, source: 'worksuite' };
    }
  },
};

export const inventoryTool: RegisteredTool = {
  declaration: {
    name: 'check_inventory',
    description:
      'Returns current inventory levels for items. Shows available quantity, SKU, and categories. ' +
      'Use when the grower asks about stock levels, "how much do we have?", "check inventory", or similar.',
    parameters: {
      type: 'object',
      properties: {
        item: {
          type: 'string',
          description: 'Specific item to look up (partial name match). Leave empty for all items.',
        },
      },
    },
  },
  handler: async (args) => {
    if (!wsapiService.isConfigured()) {
      let results = [...MOCK_INVENTORY];
      const item = String(args.item || '').toLowerCase();
      if (item) results = results.filter((r) => r.item.toLowerCase().includes(item));
      const lowStock = results.filter((r) => r.daysSupply <= 2);
      return {
        inventory: results,
        totalItems: results.length,
        lowStockAlerts: lowStock.length > 0
          ? `${lowStock.length} items low: ${lowStock.map((i) => i.item).join(', ')}`
          : 'No low stock alerts',
        source: 'demo',
      };
    }

    try {
      const data = await wsapiService.query(ITEMS_QUERY, { first: 50 });
      const items = data.items?.nodes || [];

      const itemFilter = String(args.item || '').toLowerCase();
      const filtered = itemFilter
        ? items.filter((i: any) => i.name?.toLowerCase().includes(itemFilter))
        : items;

      return {
        inventory: filtered.map((i: any) => ({
          name: i.name,
          sku: i.sku,
          upc: i.upc,
          group: i.group,
          available: i.availableQuantity,
          categories: i.categories,
        })),
        totalItems: filtered.length,
        source: 'worksuite',
      };
    } catch (err: any) {
      return { error: err.message, source: 'worksuite' };
    }
  },
};

export const ordersTool: RegisteredTool = {
  declaration: {
    name: 'check_orders',
    description:
      'Returns customer orders and their fulfillment status from WorkSuite. ' +
      'Use when the grower asks "what orders do we have?", "what\'s shipping?", or similar.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter by order status: "OPEN", "SUBMITTED", "PICKED", "SHIPPED", or "all"',
        },
        customer: {
          type: 'string',
          description: 'Filter by customer name (partial match).',
        },
      },
    },
  },
  handler: async (args) => {
    if (!wsapiService.isConfigured()) {
      let results = [...MOCK_ORDERS];
      const customer = String(args.customer || '').toLowerCase();
      if (customer) results = results.filter((r) => r.customer.toLowerCase().includes(customer));
      return { orders: results, totalOrders: results.length, source: 'demo' };
    }

    try {
      const statusFilter = String(args.status || 'OPEN').toUpperCase();
      const variables: Record<string, unknown> = { first: 25 };
      if (statusFilter !== 'ALL') {
        variables.statusFilter = statusFilter;
      }

      const data = await wsapiService.query(ORDERS_QUERY, variables);
      let orders = data.orders?.nodes || [];

      const customerFilter = String(args.customer || '').toLowerCase();
      if (customerFilter) {
        orders = orders.filter((o: any) =>
          o.customerName?.toLowerCase().includes(customerFilter),
        );
      }

      return {
        orders: orders.map((o: any) => ({
          orderNumber: o.orderNumber,
          customer: o.customerName,
          status: o.orderStatus,
          total: o.orderTotal ? `$${o.orderTotal.amount}` : 'N/A',
          lines: o.numberOfLines,
          deliveryDate: o.expectedDeliveryDate,
          created: o.initializedDate,
        })),
        totalOrders: orders.length,
        totalAllOrders: data.orders?.totalCount,
        source: 'worksuite',
      };
    } catch (err: any) {
      return { error: err.message, source: 'worksuite' };
    }
  },
};

export const customerLookupTool: RegisteredTool = {
  declaration: {
    name: 'lookup_customer',
    description:
      'Looks up customer information from WorkSuite — contacts, locations, terms. ' +
      'Use when the grower asks "who\'s the contact at [company]?", "customer info", or similar.',
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
    if (!wsapiService.isConfigured()) {
      const name = String(args.name || '').toLowerCase();
      const results = MOCK_CUSTOMERS.filter((c) => c.name.toLowerCase().includes(name));
      if (results.length === 0) return { found: false, message: `No customer matching "${args.name}"`, source: 'demo' };
      return { found: true, customers: results, source: 'demo' };
    }

    try {
      const data = await wsapiService.query(CUSTOMER_QUERY, { first: 50 });
      const customers = data.customers?.nodes || [];

      const nameFilter = String(args.name || '').toLowerCase();
      const filtered = customers.filter((c: any) =>
        c.name?.toLowerCase().includes(nameFilter),
      );

      if (filtered.length === 0) {
        return { found: false, message: `No customer matching "${args.name}" in WorkSuite`, source: 'worksuite' };
      }

      return {
        found: true,
        customers: filtered.map((c: any) => ({
          id: c.customerId,
          name: c.name,
          erpId: c.erpId,
          status: c.status,
          locations: c.numberOfLocations,
          contacts: c.numberOfContacts,
        })),
        count: filtered.length,
        source: 'worksuite',
      };
    } catch (err: any) {
      return { error: err.message, source: 'worksuite' };
    }
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
          description: 'Quality grade: "A", "B", or "C". Defaults to "A".',
          enum: ['A', 'B', 'C'],
        },
      },
      required: ['item', 'quantity'],
    },
  },
  handler: async (args) => {
    // Harvest logging is local for now — will push to WSAPI when mutation is ready
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
      'Shows all harvest entries logged during this session. ' +
      'Use when the grower asks "what have we logged?", "harvest summary", or similar.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  handler: async () => {
    if (harvestLog.length === 0) {
      return { entries: [], message: 'No harvests logged this session yet.' };
    }
    return { entries: harvestLog, totalEntries: harvestLog.length };
  },
};

export const fieldStatusTool: RegisteredTool = {
  declaration: {
    name: 'check_field_status',
    description:
      'Returns locations/facilities from WorkSuite — warehouses, fields, coolers. ' +
      'Use when the grower asks "what locations do we have?", "field status", or similar.',
    parameters: {
      type: 'object',
      properties: {
        field: {
          type: 'string',
          description: 'Specific location to check (partial name match). Leave empty for all.',
        },
      },
    },
  },
  handler: async (args) => {
    if (!wsapiService.isConfigured()) {
      // Mock fallback
      const fields = [
        { field: 'Field 2A', crop: 'Red Onions', stage: 'Mature', issues: 'None' },
        { field: 'Field 3B', crop: 'Sweet Corn', stage: 'Harvest in progress', issues: 'None' },
        { field: 'Field 5C', crop: 'Bell Peppers', stage: 'Fruiting', issues: 'Minor aphid pressure' },
        { field: 'Field 7A', crop: 'Roma Tomatoes', stage: 'Peak harvest', issues: 'Some blossom end rot' },
      ];
      const q = String(args.field || '').toLowerCase();
      const results = q ? fields.filter((f) => f.field.toLowerCase().includes(q)) : fields;
      return { fields: results, totalFields: results.length, source: 'demo' };
    }

    try {
      const data = await wsapiService.query(LOCATIONS_QUERY, { first: 50 });
      const locations = data.locations?.nodes || [];

      const fieldFilter = String(args.field || '').toLowerCase();
      const filtered = fieldFilter
        ? locations.filter((l: any) => l.name?.toLowerCase().includes(fieldFilter))
        : locations;

      return {
        locations: filtered.map((l: any) => ({
          name: l.name,
          type: l.locationType,
          erpId: l.erpId,
          status: l.status,
        })),
        totalLocations: filtered.length,
        source: 'worksuite',
      };
    } catch (err: any) {
      return { error: err.message, source: 'worksuite' };
    }
  },
};
