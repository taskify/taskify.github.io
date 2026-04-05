import { html, render } from '../losos/html.js'

export default {
  label: 'Agent',
  icon: '🤖',

  render(subject, lionStore, container, context) {
    var data = window.__paperclip
    var nav = window.__nav
    var agent = data.agents.find(function(a) { return a.id === context.agentId })
    if (!agent) { container.innerHTML = '<div class="empty">Agent not found</div>'; return }

    var agents = data.agents
    var issues = data.issues.filter(function(i) { return i.assigneeAgentId === agent.id }).sort(function(a, b) {
      return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
    })
    var activity = data.activity.filter(function(a) { return a.agentId === agent.id })
    var reportsTo = agent.reportsTo ? agents.find(function(a) { return a.id === agent.reportsTo }) : null
    var reports = agents.filter(function(a) { return a.reportsTo === agent.id })
    var heartbeat = agent.runtimeConfig && agent.runtimeConfig.heartbeat

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
                  done: 'badge-green', completed: 'badge-green', todo: 'badge-gray' }
      return '<span class="badge ' + (cls[status] || 'badge-gray') + '">' + (status || '—').replace(/_/g, ' ') + '</span>'
    }

    function actionIcon(action) {
      if (action.includes('created')) return '✨'
      if (action.includes('completed')) return '✅'
      if (action.includes('error')) return '❌'
      if (action.includes('cancelled')) return '🚫'
      if (action.includes('checked_out')) return '📥'
      if (action.includes('heartbeat')) return '💓'
      if (action.includes('key')) return '🔑'
      return '•'
    }

    async function updateAgent(fields) {
      Object.assign(agent, fields)
      agent.updatedAt = new Date().toISOString()
      await fetch(window.__getDB() + '/agents/' + agent.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/ld+json' },
        body: JSON.stringify(agent)
      })
      renderDetail()
    }

    async function deleteAgent() {
      if (!confirm('Delete agent ' + agent.name + '?')) return
      await fetch(window.__getDB() + '/agents/' + agent.id, { method: 'DELETE' })
      data.agents = data.agents.filter(function(a) { return a.id !== agent.id })
      document.getElementById('sb-agents-count').textContent = data.agents.length
      nav('agents', 'Agents')
    }

    function showEditModal() {
      var modal = document.createElement('div')
      modal.className = 'modal-overlay'
      modal.innerHTML = '<div class="modal">' +
        '<div class="modal-header"><h2>Edit Agent</h2><button class="modal-close" id="modal-close">&times;</button></div>' +
        '<div class="modal-body">' +
          '<div class="form-group"><label class="form-label">Name</label><input class="form-input" id="f-name" value="' + (agent.name || '').replace(/"/g, '&quot;') + '"></div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
            '<div class="form-group"><label class="form-label">Role</label><select class="form-select" id="f-role">' +
              ['ceo','cto','engineer','designer','marketing','sales','ops','custom'].map(function(r) { return '<option value="' + r + '"' + (agent.role === r ? ' selected' : '') + '>' + r + '</option>' }).join('') + '</select></div>' +
            '<div class="form-group"><label class="form-label">Status</label><select class="form-select" id="f-status">' +
              ['idle','running','paused','error'].map(function(s) { return '<option value="' + s + '"' + (agent.status === s ? ' selected' : '') + '>' + s + '</option>' }).join('') + '</select></div>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
            '<div class="form-group"><label class="form-label">Adapter</label><select class="form-select" id="f-adapter">' +
              ['claude_local','codex_local','cursor_local','gemini_local','openclaw_gateway'].map(function(a) { return '<option value="' + a + '"' + (agent.adapterType === a ? ' selected' : '') + '>' + a.replace(/_/g, ' ') + '</option>' }).join('') + '</select></div>' +
            '<div class="form-group"><label class="form-label">Reports To</label><select class="form-select" id="f-reports">' +
              '<option value="">None</option>' + agents.filter(function(a) { return a.id !== agent.id }).map(function(a) { return '<option value="' + a.id + '"' + (agent.reportsTo === a.id ? ' selected' : '') + '>' + a.name + '</option>' }).join('') + '</select></div>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
            '<div class="form-group"><label class="form-label">Monthly Budget ($)</label><input class="form-input" id="f-budget" type="number" value="' + ((agent.budgetMonthlyCents || 0) / 100) + '" min="0"></div>' +
            '<div class="form-group"><label class="form-label">Pause Reason</label><input class="form-input" id="f-pause" value="' + (agent.pauseReason || '').replace(/"/g, '&quot;') + '" placeholder="Why paused?"></div>' +
          '</div>' +
        '</div>' +
        '<div class="modal-footer"><button class="btn-cancel" id="modal-cancel">Cancel</button><button class="btn-primary" id="modal-save">Save</button></div>' +
      '</div>'

      document.body.appendChild(modal)
      function close() { modal.remove() }
      modal.querySelector('#modal-close').addEventListener('click', close)
      modal.querySelector('#modal-cancel').addEventListener('click', close)
      modal.addEventListener('click', function(e) { if (e.target === modal) close() })

      modal.querySelector('#modal-save').addEventListener('click', async function() {
        var name = modal.querySelector('#f-name').value.trim()
        if (!name) return
        await updateAgent({
          name: name,
          role: modal.querySelector('#f-role').value,
          status: modal.querySelector('#f-status').value,
          adapterType: modal.querySelector('#f-adapter').value,
          reportsTo: modal.querySelector('#f-reports').value || null,
          budgetMonthlyCents: parseInt(modal.querySelector('#f-budget').value || '0', 10) * 100,
          pauseReason: modal.querySelector('#f-pause').value.trim() || null
        })
        close()
      })
    }

    function renderDetail() {
      reportsTo = agent.reportsTo ? agents.find(function(a) { return a.id === agent.reportsTo }) : null
      reports = agents.filter(function(a) { return a.reportsTo === agent.id })
      heartbeat = agent.runtimeConfig && agent.runtimeConfig.heartbeat

      render(container, html`
        <div class="row-between" style="margin-bottom: 16px">
          <div class="row" style="gap: 16px">
            <div class="icon-circle" style="width: 56px; height: 56px; font-size: 24px">${agent.icon || agent.name.charAt(0)}</div>
            <div>
              <h1 style="margin-bottom: 2px">${agent.name}</h1>
              <div class="row" style="gap: 8px">
                <span class="text-sm text-muted">${agent.role || '—'}</span>
                <span innerHTML="${statusBadge(agent.status)}"></span>
                <span class="badge badge-purple">${(agent.adapterType || '—').replace(/_/g, ' ')}</span>
              </div>
            </div>
          </div>
          <div class="row" style="gap: 6px">
            <button class="btn btn-default" onclick="${showEditModal}">Edit</button>
            <button class="btn btn-default" style="color: var(--red)" onclick="${deleteAgent}">Delete</button>
          </div>
        </div>

        <div class="grid grid-3 mb">
          <div class="card metric">
            <div class="metric-value" style="font-size: 24px">${issues.length}</div>
            <div class="metric-label">Issues</div>
          </div>
          <div class="card metric">
            <div class="metric-value" style="font-size: 24px">${reports.length}</div>
            <div class="metric-label">Direct Reports</div>
          </div>
          <div class="card metric">
            <div class="metric-value" style="font-size: 24px">$${((agent.spentMonthlyCents || 0) / 100).toFixed(0)}</div>
            <div class="metric-label">Spent / $${((agent.budgetMonthlyCents || 0) / 100).toFixed(0)} budget</div>
          </div>
        </div>

        <div class="grid grid-2 mb">
          <div>
            <h2>Configuration</h2>
            <div class="card">
              ${agent.description ? html`<div class="text-sm" style="margin-bottom: 12px; color: var(--fg2)">${agent.description}</div>` : ''}
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px">
                <div>
                  <span class="text-muted text-xs">Provider</span>
                  <div class="text-fg2">${agent.provider || '—'}</div>
                </div>
                <div>
                  <span class="text-muted text-xs">Model</span>
                  <div class="text-fg2">${agent.model || '—'}</div>
                </div>
                <div>
                  <span class="text-muted text-xs">Heartbeat interval</span>
                  <div class="text-fg2">${agent.intervalSec ? agent.intervalSec + 's' : '—'}</div>
                </div>
                <div>
                  <span class="text-muted text-xs">Last heartbeat</span>
                  <div class="text-fg2">${timeAgo(agent.lastHeartbeatAt)}</div>
                </div>
                <div>
                  <span class="text-muted text-xs">Reports to</span>
                  <div>${reportsTo
                    ? html`<span class="clickable text-fg2" onclick="${function() { nav('agentDetail', reportsTo.name, { agentId: reportsTo.id }) }}">${reportsTo.name}</span>`
                    : html`<span class="text-fg2">— (top level)</span>`}</div>
                </div>
                <div>
                  <span class="text-muted text-xs">Max tokens</span>
                  <div class="text-fg2">${agent.maxTokens || '—'}</div>
                </div>
                ${agent.capabilities && agent.capabilities.length ? html`<div style="grid-column: span 2">
                  <span class="text-muted text-xs">Capabilities</span>
                  <div class="row" style="gap: 4px; margin-top: 4px; flex-wrap: wrap">${agent.capabilities.map(function(c) { return html`<span class="badge badge-blue">${c.replace(/_/g, ' ')}</span>` })}</div>
                </div>` : ''}
                ${agent.systemPrompt ? html`<div style="grid-column: span 2">
                  <span class="text-muted text-xs">System prompt</span>
                  <div class="text-sm text-fg2" style="margin-top: 4px; padding: 8px; background: var(--bg2); border-radius: 6px; font-style: italic">${agent.systemPrompt}</div>
                </div>` : ''}
                ${agent.pauseReason ? html`<div style="grid-column: span 2">
                  <span class="text-muted text-xs">Pause reason</span>
                  <div style="color: var(--yellow)">${agent.pauseReason}</div>
                </div>` : ''}
              </div>
            </div>
          </div>

          <div>
            <h2>Direct Reports</h2>
            <div class="card">
              ${reports.length === 0 ? html`<div class="text-muted text-sm" style="padding: 8px 0">No direct reports</div>` : ''}
              ${reports.map(function(r) {
                return html`<div class="row clickable" onclick="${function() { nav('agentDetail', r.name, { agentId: r.id }) }}" style="padding: 8px 0; border-bottom: 1px solid var(--border)">
                  <span class="icon-circle" style="width: 24px; height: 24px; font-size: 11px">${r.name.charAt(0)}</span>
                  <span class="text-sm">${r.name}</span>
                  <span innerHTML="${statusBadge(r.status)}"></span>
                </div>`
              })}
            </div>
          </div>
        </div>

        <h2>Assigned Issues (${issues.length})</h2>
        <div class="card mb">
          <table>
            <tr><th>Issue</th><th>Status</th><th>Priority</th><th>Updated</th></tr>
            
              ${issues.map(function(i) {
                return html`<tr class="clickable" onclick="${function() { nav('issueDetail', i.identifier, { issueId: i.id }) }}">
                  <td><span class="text-muted text-xs">${i.identifier} </span><span class="text-sm">${i.title}</span></td>
                  <td innerHTML="${statusBadge(i.status)}"></td>
                  <td class="text-sm ${'priority-' + i.priority}">${i.priority}</td>
                  <td class="text-xs text-muted">${timeAgo(i.updatedAt)}</td>
                </tr>`
              })}
              ${issues.length === 0 ? html`<tr><td colspan="4" class="text-muted" style="text-align: center; padding: 16px">No assigned issues</td></tr>` : ''}
            
          </table>
        </div>

        <h2>Activity (${activity.length})</h2>
        <div class="card">
          ${activity.length === 0 ? html`<div class="text-muted text-sm" style="padding: 16px; text-align: center">No activity</div>` : ''}
          ${activity.map(function(a) {
            return html`<div class="row-between" style="padding: 8px 0; border-bottom: 1px solid var(--border)">
              <div class="row"><span>${actionIcon(a.action)}</span><span class="text-sm">${a.action.replace(/\./g, ' → ')}</span><span class="text-xs text-muted">${a.entityType.replace(/_/g, ' ')}</span></div>
              <span class="text-xs text-muted">${timeAgo(a.createdAt)}</span>
            </div>`
          })}
        </div>
      `)
    }

    renderDetail()
  }
}
