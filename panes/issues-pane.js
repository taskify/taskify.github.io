import { html, render } from '../losos/html.js'

export default {
  label: 'Issues',
  icon: '📋',

  render(subject, lionStore, container, context) {
    var data = window.__paperclip
    var nav = window.__nav
    var issues = (data.issues || []).slice().sort(function(a, b) {
      return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
    })
    var agents = data.agents || []
    var projects = data.projects || []
    var filter = 'all'

    function agentName(id) {
      if (!id) return '—'
      var a = agents.find(function(x) { return x.id === id })
      return a ? a.name : '—'
    }

    function projectName(id) {
      if (!id) return '—'
      var p = projects.find(function(x) { return x.id === id })
      return p ? p.name : '—'
    }

    function timeAgo(d) {
      if (!d) return '—'
      var s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
      if (s < 60) return s + 's ago'
      if (s < 3600) return Math.floor(s / 60) + 'm ago'
      if (s < 86400) return Math.floor(s / 3600) + 'h ago'
      return Math.floor(s / 86400) + 'd ago'
    }

    function statusBadge(status) {
      var cls = { in_progress: 'badge-blue', done: 'badge-green', completed: 'badge-green',
                  cancelled: 'badge-gray', backlog: 'badge-gray', todo: 'badge-gray' }
      return '<span class="badge ' + (cls[status] || 'badge-gray') + '">' + (status || '—').replace(/_/g, ' ') + '</span>'
    }

    function nextIdentifier() {
      var prefix = data.company.issuePrefix || 'ISS'
      var max = 0
      issues.forEach(function(i) {
        if (!i.identifier) return
        var num = parseInt(i.identifier.split('-')[1], 10)
        if (num > max) max = num
      })
      return prefix + '-' + (max + 1)
    }

    function showCreateModal() {
      var modal = document.createElement('div')
      modal.className = 'modal-overlay'
      modal.innerHTML = '<div class="modal">' +
        '<div class="modal-header"><h2>New Issue</h2><button class="modal-close" id="modal-close">&times;</button></div>' +
        '<div class="modal-body">' +
          '<div class="form-group"><label class="form-label">Title</label><input class="form-input" id="f-title" placeholder="What needs to be done?"></div>' +
          '<div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="f-desc" placeholder="Details..."></textarea></div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
            '<div class="form-group"><label class="form-label">Priority</label><select class="form-select" id="f-priority">' +
              '<option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>' +
            '<div class="form-group"><label class="form-label">Status</label><select class="form-select" id="f-status">' +
              '<option value="backlog">Backlog</option><option value="todo" selected>Todo</option><option value="in_progress">In Progress</option></select></div>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
            '<div class="form-group"><label class="form-label">Project</label><select class="form-select" id="f-project">' +
              '<option value="">None</option>' + projects.map(function(p) { return '<option value="' + p.id + '">' + p.name + '</option>' }).join('') + '</select></div>' +
            '<div class="form-group"><label class="form-label">Assignee</label><select class="form-select" id="f-agent">' +
              '<option value="">Unassigned</option>' + agents.map(function(a) { return '<option value="' + a.id + '">' + a.name + ' (' + a.role + ')</option>' }).join('') + '</select></div>' +
          '</div>' +
        '</div>' +
        '<div class="modal-footer"><button class="btn-cancel" id="modal-cancel">Cancel</button><button class="btn-primary" id="modal-create">Create Issue</button></div>' +
      '</div>'

      document.body.appendChild(modal)

      function close() { modal.remove() }
      modal.querySelector('#modal-close').addEventListener('click', close)
      modal.querySelector('#modal-cancel').addEventListener('click', close)
      modal.addEventListener('click', function(e) { if (e.target === modal) close() })

      modal.querySelector('#f-title').focus()

      modal.querySelector('#modal-create').addEventListener('click', async function() {
        var title = modal.querySelector('#f-title').value.trim()
        if (!title) { modal.querySelector('#f-title').style.borderColor = 'var(--red)'; return }

        var id = 'i-' + Date.now()
        var identifier = nextIdentifier()
        var now = new Date().toISOString()
        var issue = {
          '@id': '#issue-' + id,
          '@type': 'Issue',
          id: id,
          identifier: identifier,
          title: title,
          description: modal.querySelector('#f-desc').value.trim() || null,
          status: modal.querySelector('#f-status').value,
          priority: modal.querySelector('#f-priority').value,
          projectId: modal.querySelector('#f-project').value || null,
          goalId: null,
          assigneeAgentId: modal.querySelector('#f-agent').value || null,
          createdAt: now,
          updatedAt: now
        }

        // Write to MongoDB via JSS /db/
        var btn = modal.querySelector('#modal-create')
        btn.textContent = 'Creating...'
        btn.disabled = true

        try {
          await fetch(window.__getDB() + '/issues/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/ld+json' },
            body: JSON.stringify(issue)
          })

          // Add to local data and re-render
          data.issues.push(issue)
          issues = data.issues
          close()
          renderIssues()

          // Update sidebar count
          document.getElementById('sb-issues-count').textContent =
            issues.filter(function(i) { return i.status !== 'done' && i.status !== 'completed' }).length
        } catch (err) {
          btn.textContent = 'Error — retry'
          btn.disabled = false
        }
      })
    }

    function renderIssues() {
      var filtered = filter === 'all' ? issues :
                     filter === 'open' ? issues.filter(function(i) { return i.status !== 'done' && i.status !== 'completed' && i.status !== 'cancelled' }) :
                     issues.filter(function(i) { return i.status === filter })

      render(container, html`
        <div class="row-between mb">
          <h1>Issues (${issues.length})</h1>
          <button class="btn-primary" onclick="${showCreateModal}">+ New Issue</button>
        </div>

        <div class="row mb" style="gap: 4px">
          ${['all', 'open', 'in_progress', 'done'].map(function(f) {
            var count = f === 'all' ? issues.length :
                        f === 'open' ? issues.filter(function(i) { return i.status !== 'done' && i.status !== 'completed' && i.status !== 'cancelled' }).length :
                        issues.filter(function(i) { return i.status === f }).length
            return html`<button onclick="${function() { filter = f; renderIssues() }}"
              class="${filter === f ? 'btn btn-active' : 'btn btn-default'}"
            >${f.replace(/_/g, ' ')} (${count})</button>`
          })}
        </div>

        <div class="card">
          <table>
            
              <tr>
                <th style="width: 50px"></th>
                <th>Issue</th>
                <th>Project</th>
                <th>Assignee</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            
            
              ${filtered.map(function(i) {
                return html`<tr class="clickable" onclick="${function() { nav('issueDetail', i.identifier, { issueId: i.id }) }}">
                  <td class="text-sm">${i.priority === 'high' || i.priority === 'urgent' ? '🔴' : i.priority === 'medium' ? '🟡' : '⚪'}</td>
                  <td>
                    <div style="font-weight: 500; font-size: 13px">${i.title}</div>
                    <div class="text-xs text-muted">${i.identifier}</div>
                  </td>
                  <td class="text-sm text-muted">${projectName(i.projectId)}</td>
                  <td class="text-sm text-fg2">${agentName(i.assigneeAgentId)}</td>
                  <td innerHTML="${statusBadge(i.status)}"></td>
                  <td class="text-xs text-muted">${timeAgo(i.updatedAt)}</td>
                </tr>`
              })}
              ${filtered.length === 0 ? html`<tr><td colspan="6" class="text-muted" style="text-align:center; padding:24px">No issues</td></tr>` : ''}
            
          </table>
        </div>
      `)
    }

    renderIssues()
  }
}
