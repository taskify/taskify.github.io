import { html, render } from '../losos/html.js'

export default {
  label: 'Dashboard',
  icon: '📊',

  render(subject, lionStore, container, context) {
    var data = window.__paperclip
    var nav = window.__nav

    var agents = data.agents || []
    var issues = data.issues || []
    var projects = data.projects || []
    var goals = data.goals || []

    var activeAgents = agents.filter(function(a) { return a.status === 'running' || a.status === 'active' }).length
    var idleAgents = agents.filter(function(a) { return a.status === 'idle' }).length
    var openIssues = issues.filter(function(i) { return i.status !== 'done' && i.status !== 'completed' && i.status !== 'cancelled' }).length
    var inProgress = issues.filter(function(i) { return i.status === 'in_progress' }).length

    function timeAgo(d) {
      if (!d) return '—'
      var s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
      if (s < 60) return s + 's ago'
      if (s < 3600) return Math.floor(s / 60) + 'm ago'
      if (s < 86400) return Math.floor(s / 3600) + 'h ago'
      return Math.floor(s / 86400) + 'd ago'
    }

    function statusBadge(status) {
      var cls = { idle: 'badge-gray', running: 'badge-green', active: 'badge-green',
                  error: 'badge-red', paused: 'badge-yellow', in_progress: 'badge-blue',
                  done: 'badge-green', completed: 'badge-green' }
      return '<span class="badge ' + (cls[status] || 'badge-gray') + '">' + (status || '—').replace(/_/g, ' ') + '</span>'
    }

    var recentIssues = issues
    var recentActivity = (data.activity || []).slice(0, 8)

    render(container, html`
      <h1>${data.company.name}</h1>

      <div class="grid grid-3 mb">
        <div class="card metric clickable" onclick="${function() { nav('agents', 'Agents') }}">
          <div class="metric-value">${agents.length}</div>
          <div class="metric-label">Agents</div>
        </div>
        <div class="card metric">
          <div class="metric-value">${activeAgents || idleAgents}</div>
          <div class="metric-label">${activeAgents ? 'Active' : 'Idle'}</div>
        </div>
        <div class="card metric clickable" onclick="${function() { nav('issues', 'Issues') }}">
          <div class="metric-value">${issues.length}</div>
          <div class="metric-label">Issues</div>
        </div>
        <div class="card metric">
          <div class="metric-value">${openIssues} / ${issues.filter(function(i) { return i.status === 'done' || i.status === 'completed' }).length}</div>
          <div class="metric-label">Open / Done</div>
        </div>
        <div class="card metric clickable" onclick="${function() { nav('projects', 'Projects') }}">
          <div class="metric-value">${projects.length}</div>
          <div class="metric-label">Projects</div>
        </div>
        <div class="card metric clickable" onclick="${function() { nav('goals', 'Goals') }}">
          <div class="metric-value">${goals.length}</div>
          <div class="metric-label">Goals</div>
        </div>
      </div>

      <div class="grid grid-2">
        <div>
          <h2>Agents</h2>
          <div class="card">
            <table>
              <tr><th>Agent</th><th>Role</th><th>Status</th></tr>
              ${agents.map(function(a) {
                return html`<tr class="clickable" onclick="${function() { nav('agentDetail', a.name, { agentId: a.id }) }}">
                  <td class="row">
                    <span class="icon-circle">${a.icon || (a.name || '?').charAt(0)}</span>
                    <span>${a.name || '—'}</span>
                  </td>
                  <td class="text-muted text-sm">${a.role || '—'}</td>
                  <td innerHTML="${statusBadge(a.status)}"></td>
                </tr>`
              })}
              ${agents.length === 0 ? html`<tr><td colspan="3" class="text-muted">No agents yet</td></tr>` : ''}
            </table>
          </div>
        </div>

        <div>
          <h2>Issues</h2>
          <div class="card">
            <table>
              <tr><th>Issue</th><th>Status</th><th>Updated</th></tr>
              ${recentIssues.map(function(i) {
                return html`<tr class="clickable" onclick="${function() { nav('issueDetail', i.identifier, { issueId: i.id }) }}">
                  <td>
                    <span class="text-muted text-xs">${i.identifier} </span>
                    <span class="text-sm">${i.title}</span>
                  </td>
                  <td innerHTML="${statusBadge(i.status)}"></td>
                  <td class="text-muted text-xs">${timeAgo(i.updatedAt)}</td>
                </tr>`
              })}
              ${recentIssues.length === 0 ? html`<tr><td colspan="3" class="text-muted">No issues yet</td></tr>` : ''}
            </table>
          </div>
        </div>
      </div>

      <div class="mb" style="margin-top: 24px">
        <h2>Activity</h2>
        <div class="card">
          ${recentActivity.map(function(a) {
            return html`<div style="padding: 8px 0; border-bottom: 1px solid var(--border)" class="row-between">
              <div class="row">
                <span class="status-dot ${'status-' + (a.action.includes('created') ? 'active' : a.action.includes('error') ? 'error' : 'idle')}"></span>
                <span class="text-sm">${a.action.replace(/\./g, ' → ')}</span>
                <span class="text-muted text-xs">${a.entityType}</span>
              </div>
              <span class="text-muted text-xs">${timeAgo(a.createdAt)}</span>
            </div>`
          })}
          ${recentActivity.length === 0 ? html`<div class="text-muted" style="padding: 16px">No activity yet</div>` : ''}
        </div>
      </div>
    `)
  }
}
