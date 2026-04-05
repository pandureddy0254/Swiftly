/**
 * PDF Report Generator for Swiftly.
 * Generates clean, enterprise-grade PDF reports from aggregated board data.
 * Uses plain HTML → PDF approach for reliability and simplicity.
 */

/**
 * Generate HTML report content that can be rendered as PDF or displayed.
 */
export function generateReportHtml(reportData, aiReport = null, options = {}) {
  const { title = 'Project Status Report', generatedAt = new Date().toISOString() } = options;
  const date = new Date(generatedAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Roboto, sans-serif; color: #323338; line-height: 1.6; padding: 40px; max-width: 900px; margin: 0 auto; }

  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 3px solid #0073ea; }
  .header h1 { font-size: 24px; color: #0073ea; margin-bottom: 4px; }
  .header .subtitle { font-size: 13px; color: #676879; }
  .header .logo { font-size: 20px; font-weight: 800; color: #0073ea; }
  .header .date { font-size: 12px; color: #676879; text-align: right; }

  .kpi-row { display: flex; gap: 16px; margin-bottom: 28px; }
  .kpi-card { flex: 1; text-align: center; padding: 20px 16px; background: #f6f7fb; border-radius: 8px; }
  .kpi-value { font-size: 28px; font-weight: 700; line-height: 1.2; }
  .kpi-label { font-size: 12px; color: #676879; margin-top: 4px; }
  .kpi-value.green { color: #00ca72; }
  .kpi-value.orange { color: #fdab3d; }
  .kpi-value.red { color: #e2445c; }
  .kpi-value.blue { color: #0073ea; }

  h2 { font-size: 18px; color: #323338; margin-top: 28px; margin-bottom: 14px; padding-bottom: 6px; border-bottom: 1px solid #e6e9ef; }
  h3 { font-size: 15px; color: #323338; margin-top: 20px; margin-bottom: 10px; }

  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
  th { text-align: left; padding: 10px 12px; background: #f6f7fb; color: #676879; font-weight: 500; border-bottom: 2px solid #e6e9ef; }
  td { padding: 10px 12px; border-bottom: 1px solid #e6e9ef; }
  tr:last-child td { border-bottom: none; }

  .progress-bar { width: 100%; height: 8px; background: #e6e9ef; border-radius: 4px; overflow: hidden; display: inline-block; }
  .progress-fill { height: 100%; border-radius: 4px; }
  .progress-fill.green { background: #00ca72; }
  .progress-fill.orange { background: #fdab3d; }
  .progress-fill.red { background: #e2445c; }

  .status-badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
  .status-done { background: #e6f9f0; color: #037f4c; }
  .status-progress { background: #e6f0ff; color: #0060b9; }
  .status-stuck { background: #fde8eb; color: #d83a52; }
  .status-default { background: #f6f7fb; color: #676879; }

  .insight { padding: 12px 16px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid; }
  .insight-risk { border-left-color: #e2445c; background: #fef2f2; }
  .insight-good { border-left-color: #00ca72; background: #f0fdf4; }
  .insight-info { border-left-color: #579bfc; background: #f0f7ff; }
  .insight-title { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
  .insight-desc { font-size: 13px; color: #676879; }

  .ai-report { font-size: 14px; line-height: 1.7; white-space: pre-wrap; background: #fafbfc; padding: 20px; border-radius: 8px; border: 1px solid #e6e9ef; }

  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e6e9ef; font-size: 11px; color: #676879; text-align: center; }
</style>
</head>
<body>

<div class="header">
  <div>
    <h1>${escapeHtml(title)}</h1>
    <div class="subtitle">${reportData.totalBoards} board${reportData.totalBoards > 1 ? 's' : ''} &bull; ${reportData.totalItems} items &bull; ${reportData.totalSubitems} subitems</div>
  </div>
  <div style="text-align: right">
    <div class="logo">Swiftly</div>
    <div class="date">${date}</div>
  </div>
</div>

<!-- KPI Cards -->
<div class="kpi-row">
  <div class="kpi-card">
    <div class="kpi-value blue">${reportData.totalBoards}</div>
    <div class="kpi-label">Boards</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-value">${reportData.totalItems}</div>
    <div class="kpi-label">Total Items</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-value green">${reportData.completedItems}</div>
    <div class="kpi-label">Completed</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-value ${reportData.overallProgress >= 75 ? 'green' : reportData.overallProgress >= 40 ? 'orange' : 'red'}">${reportData.overallProgress}%</div>
    <div class="kpi-label">Progress</div>
  </div>
</div>

<!-- Board Breakdown Table -->
<h2>Board Progress</h2>
<table>
  <thead>
    <tr>
      <th>Board</th>
      <th style="text-align: center">Items</th>
      <th style="text-align: center">Subitems</th>
      <th style="text-align: center">Done</th>
      <th style="width: 200px">Progress</th>
    </tr>
  </thead>
  <tbody>
    ${reportData.boards.map((b) => {
      const cls = b.progress >= 75 ? 'green' : b.progress >= 40 ? 'orange' : 'red';
      return `<tr>
        <td style="font-weight: 500">${escapeHtml(b.name)}</td>
        <td style="text-align: center">${b.totalItems}</td>
        <td style="text-align: center">${b.subitems}</td>
        <td style="text-align: center">${b.completedItems}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px">
            <div class="progress-bar" style="flex:1">
              <div class="progress-fill ${cls}" style="width: ${b.progress}%"></div>
            </div>
            <span style="font-weight: 600; font-size: 13px; min-width: 36px; text-align: right">${b.progress}%</span>
          </div>
        </td>
      </tr>`;
    }).join('\n')}
  </tbody>
</table>

<!-- Status Distribution -->
<h2>Status Distribution</h2>
<table>
  <thead>
    <tr>
      <th>Status</th>
      <th style="text-align: center">Count</th>
      <th style="width: 200px">Proportion</th>
    </tr>
  </thead>
  <tbody>
    ${Object.entries(reportData.statusBreakdown).map(([status, count]) => {
      const pct = Math.round((count / reportData.totalItems) * 100);
      const statusClass = status.toLowerCase().includes('done') || status.toLowerCase().includes('complete') ? 'status-done'
        : status.toLowerCase().includes('progress') || status.toLowerCase().includes('working') ? 'status-progress'
        : status.toLowerCase().includes('stuck') || status.toLowerCase().includes('block') ? 'status-stuck'
        : 'status-default';
      return `<tr>
        <td><span class="status-badge ${statusClass}">${escapeHtml(status)}</span></td>
        <td style="text-align: center">${count}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px">
            <div class="progress-bar" style="flex:1">
              <div class="progress-fill ${statusClass === 'status-done' ? 'green' : statusClass === 'status-stuck' ? 'red' : 'orange'}" style="width: ${pct}%"></div>
            </div>
            <span style="font-size: 12px; color: #676879; min-width: 36px; text-align: right">${pct}%</span>
          </div>
        </td>
      </tr>`;
    }).join('\n')}
  </tbody>
</table>

${aiReport ? `
<!-- AI Report -->
<h2>AI Analysis</h2>
<div class="ai-report">${escapeHtml(aiReport.report || aiReport)}</div>
` : ''}

<div class="footer">
  Generated by Swiftly &mdash; AI-Powered Command Center for monday.com &bull; ${date}
</div>

</body>
</html>`;
}

/**
 * Generate a plain-text version of the report (for email body).
 */
export function generateReportText(reportData) {
  const lines = [
    'PROJECT STATUS REPORT',
    '='.repeat(50),
    `Generated: ${new Date().toLocaleDateString()}`,
    '',
    'SUMMARY',
    '-'.repeat(30),
    `Boards: ${reportData.totalBoards}`,
    `Total Items: ${reportData.totalItems}`,
    `Completed: ${reportData.completedItems}`,
    `Subitems: ${reportData.totalSubitems}`,
    `Progress: ${reportData.overallProgress}%`,
    '',
    'BOARD PROGRESS',
    '-'.repeat(30),
  ];

  for (const board of reportData.boards) {
    lines.push(`  ${board.name}: ${board.progress}% (${board.completedItems}/${board.totalItems})`);
  }

  lines.push('', 'STATUS BREAKDOWN', '-'.repeat(30));
  for (const [status, count] of Object.entries(reportData.statusBreakdown)) {
    lines.push(`  ${status}: ${count}`);
  }

  lines.push('', '---', 'Generated by Swiftly');
  return lines.join('\n');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default { generateReportHtml, generateReportText };
