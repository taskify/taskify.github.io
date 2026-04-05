import { html, render } from '../losos/html.js'

export default {
  label: 'Agents',
  icon: '🤖',

  render(subject, lionStore, container, context) {
    var data = window.__paperclip
    var nav = window.__nav
    var agents = data.agents || []
    var filter = 'all'

    function timeAgo(d) {
      if (!d) return '—'
      var s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
      if (s < 60) return s + 's ago'
      if (s < 3600) return Math.floor(s / 60) + 'm ago'
      if (s < 86400) return Math.floor(s / 3600) + 'h ago'
      return Math.floor(s / 86400) + 'd ago'
    }

    function statusColor(s) {
      return { idle: 'var(--fg3)', running: 'var(--green)', active: 'var(--green)',
               error: 'var(--red)', paused: 'var(--yellow)' }[s] || 'var(--fg3)'
    }

    function showCreateModal() {
      var modal = document.createElement('div')
      modal.className = 'modal-overlay'
      modal.innerHTML = '<div class="modal">' +
        '<div class="modal-header"><h2>New Agent</h2><button class="modal-close" id="modal-close">&times;</button></div>' +
        '<div class="modal-body">' +
          '<div class="form-group"><label class="form-label">Name</label><input class="form-input" id="f-name" placeholder="e.g. Engineer"></div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
            '<div class="form-group"><label class="form-label">Role</label><select class="form-select" id="f-role">' +
              ['ceo','cto','engineer','designer','marketing','sales','ops','custom'].map(function(r) { return '<option value="' + r + '">' + r + '</option>' }).join('') + '</select></div>' +
            '<div class="form-group"><label class="form-label">Adapter</label><select class="form-select" id="f-adapter">' +
              ['claude_local','codex_local','cursor_local','gemini_local','openclaw_gateway'].map(function(a) { return '<option value="' + a + '">' + a.replace(/_/g, ' ') + '</option>' }).join('') + '</select></div>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
            '<div class="form-group"><label class="form-label">Reports To</label><select class="form-select" id="f-reports">' +
              '<option value="">None (top level)</option>' + agents.map(function(a) { return '<option value="' + a.id + '">' + a.name + '</option>' }).join('') + '</select></div>' +
            '<div class="form-group"><label class="form-label">Monthly Budget ($)</label><input class="form-input" id="f-budget" type="number" value="0" min="0"></div>' +
          '</div>' +
        '</div>' +
        '<div class="modal-footer"><button class="btn-cancel" id="modal-cancel">Cancel</button><button class="btn-primary" id="modal-create">Create Agent</button></div>' +
      '</div>'

      document.body.appendChild(modal)
      function close() { modal.remove() }
      modal.querySelector('#modal-close').addEventListener('click', close)
      modal.querySelector('#modal-cancel').addEventListener('click', close)
      modal.addEventListener('click', function(e) { if (e.target === modal) close() })
      modal.querySelector('#f-name').focus()

      modal.querySelector('#modal-create').addEventListener('click', async function() {
        var name = modal.querySelector('#f-name').value.trim()
        if (!name) { modal.querySelector('#f-name').style.borderColor = 'var(--red)'; return }

        var id = 'a-' + Date.now()
        var now = new Date().toISOString()
        var agent = {
          '@id': '#agent-' + id, '@type': 'Agent',
          id: id, name: name,
          role: modal.querySelector('#f-role').value,
          icon: null, status: 'idle',
          adapterType: modal.querySelector('#f-adapter').value,
          reportsTo: modal.querySelector('#f-reports').value || null,
          budgetMonthlyCents: parseInt(modal.querySelector('#f-budget').value || '0', 10) * 100,
          spentMonthlyCents: 0,
          lastHeartbeatAt: null, pauseReason: null,
          permissions: {},
          runtimeConfig: { heartbeat: { enabled: true, intervalSec: 3600, maxConcurrentRuns: 1 } },
          createdAt: now, updatedAt: now
        }

        var btn = modal.querySelector('#modal-create')
        btn.textContent = 'Creating...'; btn.disabled = true

        try {
          await fetch(window.__getDB() + '/agents/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/ld+json' },
            body: JSON.stringify(agent)
          })
          data.agents.push(agent)
          agents = data.agents
          document.getElementById('sb-agents-count').textContent = agents.length
          close()
          renderAgents()
        } catch (err) { btn.textContent = 'Error — retry'; btn.disabled = false }
      })
    }

    function renderAgents() {
      var filtered = filter === 'all' ? agents : agents.filter(function(a) { return a.status === filter })

      render(container, html`
        <div class="row-between mb">
          <h1>Agents (${agents.length})</h1>
          <button class="btn-primary" onclick="${showCreateModal}">+ New Agent</button>
        </div>

        <div class="row mb" style="gap: 4px">
          ${['all', 'idle', 'running', 'paused', 'error'].map(function(f) {
            var count = f === 'all' ? agents.length : agents.filter(function(a) { return a.status === f }).length
            return html`<button onclick="${function() { filter = f; renderAgents() }}"
              class="${filter === f ? 'btn btn-active' : 'btn btn-default'}"
            >${f} (${count})</button>`
          })}
        </div>

        <div class="grid grid-2">
          ${filtered.map(function(a) {
            var heartbeat = a.runtimeConfig && a.runtimeConfig.heartbeat
            return html`<div class="card clickable" onclick="${function() { nav('agentDetail', a.name, { agentId: a.id }) }}">
              <div class="row-between" style="margin-bottom: 12px">
                <div class="row">
                  <span class="icon-circle" style="${'font-size: 16px; background: ' + statusColor(a.status) + '22'}">${a.icon || a.name.charAt(0)}</span>
                  <div>
                    <div style="font-weight: 600; font-size: 14px">${a.name}</div>
                    <div class="text-xs text-muted">${a.role || a.adapterType}</div>
                  </div>
                </div>
                <span class="badge ${'badge-' + (a.status === 'idle' ? 'gray' : a.status === 'running' || a.status === 'active' ? 'green' : a.status === 'error' ? 'red' : 'yellow')}">${a.status}</span>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px">
                <div>
                  <span class="text-muted">Adapter</span>
                  <div class="text-fg2">${(a.adapterType || '—').replace(/_/g, ' ')}</div>
                </div>
                <div>
                  <span class="text-muted">Last heartbeat</span>
                  <div class="text-fg2">${timeAgo(a.lastHeartbeatAt)}</div>
                </div>
              </div>
              ${a.permissions && a.permissions.canCreateAgents ? html`<div style="margin-top: 10px"><span class="badge badge-purple">can hire agents</span></div>` : ''}
            </div>`
          })}
        </div>
        ${filtered.length === 0 ? html`<div class="empty">No ${filter} agents</div>` : ''}
      `)
    }

    renderAgents()
  }
}
