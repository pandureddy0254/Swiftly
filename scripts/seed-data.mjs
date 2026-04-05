import config from '../src/server/config/index.js';

const token = config.monday.apiToken;
const url = config.monday.apiUrl;
const ver = config.monday.apiVersion;

async function gql(query) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': token, 'API-Version': ver },
    body: JSON.stringify({ query }),
  });
  const data = await r.json();
  if (data.errors) { console.error('ERR:', data.errors[0].message); return null; }
  return data;
}

async function createItem(boardId, groupId, name, colValues) {
  const vals = JSON.stringify(JSON.stringify(colValues));
  const q = `mutation { create_item(board_id: ${boardId}, group_id: "${groupId}", item_name: "${name}", column_values: ${vals}) { id } }`;
  const r = await gql(q);
  const id = r?.data?.create_item?.id;
  console.log(`  + ${name} (${id || 'failed'})`);
  return id;
}

// Column IDs (created in previous step)
const salesCols = { status: 'color_mm24k0j1', value: 'numeric_mm24cxg6', date: 'date_mm24sgfh' };
const prodCols = { status: 'color_mm24c0eq', priority: 'color_mm242sz0', date: 'date_mm243757' };
const mktCols = { status: 'color_mm24kbzy', priority: 'color_mm24tv44', date: 'date_mm24ycpm' };

// Create groups
console.log('=== Creating groups ===');

let r;
r = await gql('mutation { create_group(board_id: 5027626779, group_name: "Hot Leads", group_color: "#e2445c") { id } }');
const hotLeads = r?.data?.create_group?.id;
console.log('Hot Leads:', hotLeads);

r = await gql('mutation { create_group(board_id: 5027626779, group_name: "Negotiation", group_color: "#fdab3d") { id } }');
const negotiation = r?.data?.create_group?.id;
console.log('Negotiation:', negotiation);

r = await gql('mutation { create_group(board_id: 5027626779, group_name: "Closed Won", group_color: "#00c875") { id } }');
const closedWon = r?.data?.create_group?.id;
console.log('Closed Won:', closedWon);

r = await gql('mutation { create_group(board_id: 5027626778, group_name: "Sprint Backlog", group_color: "#579bfc") { id } }');
const backlog = r?.data?.create_group?.id;
console.log('Sprint Backlog:', backlog);

r = await gql('mutation { create_group(board_id: 5027626778, group_name: "In Progress", group_color: "#fdab3d") { id } }');
const inProg = r?.data?.create_group?.id;
console.log('In Progress:', inProg);

r = await gql('mutation { create_group(board_id: 5027626778, group_name: "Done", group_color: "#00c875") { id } }');
const prodDone = r?.data?.create_group?.id;
console.log('Done:', prodDone);

r = await gql('mutation { create_group(board_id: 5027626777, group_name: "Planning", group_color: "#579bfc") { id } }');
const planning = r?.data?.create_group?.id;
console.log('Planning:', planning);

r = await gql('mutation { create_group(board_id: 5027626777, group_name: "Active Campaigns", group_color: "#00c875") { id } }');
const activeCamp = r?.data?.create_group?.id;
console.log('Active Campaigns:', activeCamp);

r = await gql('mutation { create_group(board_id: 5027626777, group_name: "Completed", group_color: "#c4c4c4") { id } }');
const completedGrp = r?.data?.create_group?.id;
console.log('Completed:', completedGrp);

// === SALES PIPELINE ===
console.log('\n=== Sales Pipeline 2026 ===');
await createItem(5027626779, hotLeads, 'Globex Corp — Enterprise License', { [salesCols.status]: {label: 'Working on it'}, [salesCols.value]: '85000', [salesCols.date]: {date: '2026-04-15'} });
await createItem(5027626779, hotLeads, 'Initech — Platform Migration', { [salesCols.status]: {label: 'Working on it'}, [salesCols.value]: '120000', [salesCols.date]: {date: '2026-04-20'} });
await createItem(5027626779, hotLeads, 'Hooli — Data Analytics Suite', { [salesCols.status]: {label: 'Stuck'}, [salesCols.value]: '250000', [salesCols.date]: {date: '2026-04-10'} });
await createItem(5027626779, negotiation, 'Pied Piper — Compression API', { [salesCols.status]: {label: 'Working on it'}, [salesCols.value]: '45000', [salesCols.date]: {date: '2026-04-25'} });
await createItem(5027626779, negotiation, 'Stark Industries — Security Audit', { [salesCols.status]: {label: 'Working on it'}, [salesCols.value]: '175000', [salesCols.date]: {date: '2026-05-01'} });
await createItem(5027626779, negotiation, 'Acme Corp — Support Contract', { [salesCols.status]: {label: 'Working on it'}, [salesCols.value]: '62000', [salesCols.date]: {date: '2026-04-28'} });
await createItem(5027626779, closedWon, 'Wayne Enterprises — Cloud Migration', { [salesCols.status]: {label: 'Done'}, [salesCols.value]: '320000', [salesCols.date]: {date: '2026-03-28'} });
await createItem(5027626779, closedWon, 'Oscorp — Annual Renewal', { [salesCols.status]: {label: 'Done'}, [salesCols.value]: '95000', [salesCols.date]: {date: '2026-03-15'} });
await createItem(5027626779, closedWon, 'LexCorp — Consulting Package', { [salesCols.status]: {label: 'Done'}, [salesCols.value]: '55000', [salesCols.date]: {date: '2026-04-01'} });
await createItem(5027626779, closedWon, 'Capsule Corp — Integration Setup', { [salesCols.status]: {label: 'Done'}, [salesCols.value]: '78000', [salesCols.date]: {date: '2026-03-22'} });

// === PRODUCT DEVELOPMENT ===
console.log('\n=== Product Development Sprint 14 ===');
await createItem(5027626778, inProg, 'Implement OAuth 2.0 flow', { [prodCols.status]: {label: 'Working on it'}, [prodCols.priority]: {label: 'Working on it'}, [prodCols.date]: {date: '2026-04-12'} });
await createItem(5027626778, inProg, 'Redesign settings page', { [prodCols.status]: {label: 'Working on it'}, [prodCols.date]: {date: '2026-04-14'} });
await createItem(5027626778, inProg, 'Fix memory leak in worker pool', { [prodCols.status]: {label: 'Stuck'}, [prodCols.priority]: {label: 'Stuck'}, [prodCols.date]: {date: '2026-04-08'} });
await createItem(5027626778, inProg, 'Add real-time notifications', { [prodCols.status]: {label: 'Working on it'}, [prodCols.date]: {date: '2026-04-16'} });
await createItem(5027626778, backlog, 'Add webhook retry mechanism', { [prodCols.date]: {date: '2026-04-18'} });
await createItem(5027626778, backlog, 'Create API rate limit dashboard', { [prodCols.date]: {date: '2026-04-20'} });
await createItem(5027626778, backlog, 'Implement file upload chunking', { [prodCols.date]: {date: '2026-04-22'} });
await createItem(5027626778, backlog, 'Add E2E test suite for checkout', { [prodCols.date]: {date: '2026-04-25'} });
await createItem(5027626778, backlog, 'Build customer feedback widget', { [prodCols.date]: {date: '2026-04-28'} });
await createItem(5027626778, prodDone, 'Setup CI/CD pipeline', { [prodCols.status]: {label: 'Done'}, [prodCols.date]: {date: '2026-04-01'} });
await createItem(5027626778, prodDone, 'Migrate database to PostgreSQL', { [prodCols.status]: {label: 'Done'}, [prodCols.date]: {date: '2026-03-30'} });
await createItem(5027626778, prodDone, 'Implement SSO integration', { [prodCols.status]: {label: 'Done'}, [prodCols.date]: {date: '2026-04-03'} });
await createItem(5027626778, prodDone, 'Add audit logging', { [prodCols.status]: {label: 'Done'}, [prodCols.date]: {date: '2026-04-05'} });
await createItem(5027626778, prodDone, 'Refactor payment module', { [prodCols.status]: {label: 'Done'}, [prodCols.date]: {date: '2026-03-28'} });

// === MARKETING ===
console.log('\n=== Marketing Campaign Q2 ===');
await createItem(5027626777, activeCamp, 'LinkedIn Thought Leadership Series', { [mktCols.status]: {label: 'Working on it'}, [mktCols.priority]: {label: 'Working on it'}, [mktCols.date]: {date: '2026-04-30'} });
await createItem(5027626777, activeCamp, 'Product Hunt Launch Campaign', { [mktCols.status]: {label: 'Working on it'}, [mktCols.date]: {date: '2026-04-18'} });
await createItem(5027626777, activeCamp, 'Customer Case Study — Globex', { [mktCols.status]: {label: 'Stuck'}, [mktCols.date]: {date: '2026-04-10'} });
await createItem(5027626777, activeCamp, 'Q2 Webinar Series', { [mktCols.status]: {label: 'Working on it'}, [mktCols.date]: {date: '2026-04-22'} });
await createItem(5027626777, activeCamp, 'Google Ads Retargeting Setup', { [mktCols.status]: {label: 'Working on it'}, [mktCols.date]: {date: '2026-04-15'} });
await createItem(5027626777, planning, 'Brand Refresh — New Logo & Guidelines', { [mktCols.date]: {date: '2026-05-01'} });
await createItem(5027626777, planning, 'SEO Strategy Overhaul', { [mktCols.date]: {date: '2026-05-10'} });
await createItem(5027626777, planning, 'Partner Co-marketing Program', { [mktCols.date]: {date: '2026-05-15'} });
await createItem(5027626777, planning, 'Community Forum Launch', { [mktCols.date]: {date: '2026-05-20'} });
await createItem(5027626777, completedGrp, 'Q1 Performance Report', { [mktCols.status]: {label: 'Done'}, [mktCols.date]: {date: '2026-03-31'} });
await createItem(5027626777, completedGrp, 'Email Drip Campaign Launch', { [mktCols.status]: {label: 'Done'}, [mktCols.date]: {date: '2026-03-25'} });
await createItem(5027626777, completedGrp, 'Trade Show Booth Design', { [mktCols.status]: {label: 'Done'}, [mktCols.date]: {date: '2026-03-20'} });
await createItem(5027626777, completedGrp, 'Competitive Analysis Report', { [mktCols.status]: {label: 'Done'}, [mktCols.date]: {date: '2026-04-02'} });

console.log('\n=== ALL DONE ===');
console.log('Sales: 10 items (3 hot leads, 3 negotiation, 4 closed)');
console.log('Product: 14 items (4 in progress, 5 backlog, 5 done)');
console.log('Marketing: 13 items (5 active, 4 planning, 4 completed)');
console.log('Total: 37 new items across 3 boards with statuses, dates, and values');
