import { html, render } from '../losos/html.js'

export default {
  label: 'Issue',
  icon: '📋',

  render(subject, lionStore, container, context) {
    var data = window.__paperclip
    var nav = window.__nav
    var issue = data.issues.find(function(i) { return i.id === context.issueId })
    if (!issue) { container.innerHTML = '<div class="empty">Issue not found</div>'; return }

    var agents = data.agents
    var projects = data.projects
    var assignee = issue.assigneeAgentId ? agents.find(function(a) { return a.id === issue.assigneeAgentId }) : null
    var project = issue.projectId ? projects.find(function(p) { return p.id === issue.projectId }) : null
    var related = data.issues.filter(function(i) { return i.projectId === issue.projectId && i.id !== issue.id })

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
                  todo: 'badge-gray', cancelled: 'badge-gray', backlog: 'badge-gray' }
      return '<span class="badge ' + (cls[status] || 'badge-gray') + '">' + (status || '—').replace(/_/g, ' ') + '</span>'
    }

    function priorityBadge(p) {
      var cls = { high: 'badge-red', urgent: 'badge-red', medium: 'badge-yellow', low: 'badge-gray' }
      return '<span class="badge ' + (cls[p] || 'badge-gray') + '">' + p + '</span>'
    }

    async function updateField(field, value) {
      issue[field] = value
      issue.updatedAt = new Date().toISOString()
      await fetch(window.__getDB() + '/issues/' + issue.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/ld+json' },
        body: JSON.stringify(issue)
      })
      renderDetail()
    }

    async function deleteIssue() {
      if (!confirm('Delete issue ' + issue.identifier + '?')) return
      await fetch(window.__getDB() + '/issues/' + issue.id, { method: 'DELETE' })
      data.issues = data.issues.filter(function(i) { return i.id !== issue.id })
      document.getElementById('sb-issues-count').textContent =
        data.issues.filter(function(i) { return i.status !== 'done' && i.status !== 'completed' }).length
      nav('issues', 'Issues')
    }

    function showEditModal() {
      var modal = document.createElement('div')
      modal.className = 'modal-overlay'
      modal.innerHTML = '<div class="modal">' +
        '<div class="modal-header"><h2>Edit Issue</h2><button class="modal-close" id="modal-close">&times;</button></div>' +
        '<div class="modal-body">' +
          '<div class="form-group"><label class="form-label">Title</label><input class="form-input" id="f-title" value="' + (issue.title || '').replace(/"/g, '&quot;') + '"></div>' +
          '<div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="f-desc">' + (issue.description || '') + '</textarea></div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
            '<div class="form-group"><label class="form-label">Priority</label><select class="form-select" id="f-priority">' +
              ['low','medium','high','urgent'].map(function(p) { return '<option value="' + p + '"' + (issue.priority === p ? ' selected' : '') + '>' + p + '</option>' }).join('') + '</select></div>' +
            '<div class="form-group"><label class="form-label">Status</label><select class="form-select" id="f-status">' +
              ['backlog','todo','in_progress','done','cancelled'].map(function(s) { return '<option value="' + s + '"' + (issue.status === s ? ' selected' : '') + '>' + s.replace(/_/g, ' ') + '</option>' }).join('') + '</select></div>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
            '<div class="form-group"><label class="form-label">Project</label><select class="form-select" id="f-project">' +
              '<option value="">None</option>' + projects.map(function(p) { return '<option value="' + p.id + '"' + (issue.projectId === p.id ? ' selected' : '') + '>' + p.name + '</option>' }).join('') + '</select></div>' +
            '<div class="form-group"><label class="form-label">Assignee</label><select class="form-select" id="f-agent">' +
              '<option value="">Unassigned</option>' + agents.map(function(a) { return '<option value="' + a.id + '"' + (issue.assigneeAgentId === a.id ? ' selected' : '') + '>' + a.name + '</option>' }).join('') + '</select></div>' +
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
        var title = modal.querySelector('#f-title').value.trim()
        if (!title) return
        issue.title = title
        issue.description = modal.querySelector('#f-desc').value.trim() || null
        issue.priority = modal.querySelector('#f-priority').value
        issue.status = modal.querySelector('#f-status').value
        issue.projectId = modal.querySelector('#f-project').value || null
        issue.assigneeAgentId = modal.querySelector('#f-agent').value || null
        issue.updatedAt = new Date().toISOString()
        await fetch(window.__getDB() + '/issues/' + issue.id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/ld+json' },
          body: JSON.stringify(issue)
        })
        close()
        renderDetail()
      })
    }

    function simpleMd(text) {
      return text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code style="background:var(--bg2);padding:1px 4px;border-radius:3px">$1</code>')
        .replace(/\n/g, '<br>')
    }

    function renderDetail() {
      assignee = issue.assigneeAgentId ? agents.find(function(a) { return a.id === issue.assigneeAgentId }) : null
      project = issue.projectId ? projects.find(function(p) { return p.id === issue.projectId }) : null

      var comments = (data.activity || []).filter(function(a) {
        return a.action === 'issue.commented' && a.entityId === issue.id && a.details && a.details.comment
      }).sort(function(a, b) {
        return new Date(b.createdAt) - new Date(a.createdAt)
      })

      function agentName(id) {
        var a = agents.find(function(x) { return x.id === id })
        return a ? a.name : 'Agent'
      }

      render(container, html`
        <div class="row-between" style="margin-bottom: 8px">
          <div class="row" style="gap: 8px">
            <span class="text-muted text-sm">${issue.identifier}</span>
            <span innerHTML="${statusBadge(issue.status)}"></span>
            <span innerHTML="${priorityBadge(issue.priority)}"></span>
          </div>
          <div class="row" style="gap: 6px">
            <button class="btn btn-default" onclick="${showEditModal}">Edit</button>
            <button class="btn btn-default" style="color: var(--red)" onclick="${deleteIssue}">Delete</button>
          </div>
        </div>

        <h1 style="margin-bottom: 20px">${issue.title}</h1>

        <div class="grid grid-2 mb">
          <div>
            <h2>Details</h2>
            <div class="card">
              ${issue.description ? html`<div class="text-sm" style="margin-bottom: 16px; white-space: pre-wrap; color: var(--fg2)">${issue.description}</div>` : ''}
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px">
                <div>
                  <span class="text-muted text-xs">Assignee</span>
                  <div>${assignee
                    ? html`<span class="row clickable" onclick="${function() { nav('agentDetail', assignee.name, { agentId: assignee.id }) }}">
                        <span class="icon-circle" style="width: 22px; height: 22px; font-size: 10px">${assignee.name.charAt(0)}</span>
                        <span class="text-fg2">${assignee.name}</span>
                      </span>`
                    : html`<span class="text-fg2">Unassigned</span>`}</div>
                </div>
                <div>
                  <span class="text-muted text-xs">Project</span>
                  <div>${project
                    ? html`<span class="clickable text-fg2" onclick="${function() { nav('projectDetail', project.name, { projectId: project.id }) }}">${project.name}</span>`
                    : html`<span class="text-fg2">—</span>`}</div>
                </div>
                <div>
                  <span class="text-muted text-xs">Created</span>
                  <div class="text-fg2">${timeAgo(issue.createdAt)}</div>
                </div>
                <div>
                  <span class="text-muted text-xs">Updated</span>
                  <div class="text-fg2">${timeAgo(issue.updatedAt)}</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2>Related Issues</h2>
            <div class="card">
              ${related.length === 0 ? html`<div class="text-muted text-sm" style="padding: 8px 0">No related issues</div>` : ''}
              ${related.map(function(i) {
                return html`<div class="row clickable" onclick="${function() { nav('issueDetail', i.identifier, { issueId: i.id }) }}" style="padding: 8px 0; border-bottom: 1px solid var(--border)">
                  <span class="text-muted text-xs">${i.identifier}</span>
                  <span class="text-sm" style="flex: 1">${i.title}</span>
                  <span innerHTML="${statusBadge(i.status)}"></span>
                </div>`
              })}
            </div>
          </div>
        </div>

        <div class="mb">
          <h2>Comments (${comments.length})</h2>
          <div class="card">
            ${comments.length === 0 ? html`<div class="text-muted text-sm" style="padding: 16px; text-align: center">No comments yet</div>` : ''}
            ${comments.map(function(c, idx) {
              return html`<div style="${'padding: 12px 0;' + (idx < comments.length - 1 ? ' border-bottom: 1px solid var(--border)' : '')}">
                <div class="row-between" style="margin-bottom: 6px">
                  <div class="row" style="gap: 6px">
                    <span class="icon-circle" style="width: 22px; height: 22px; font-size: 10px">${agentName(c.actorId).charAt(0)}</span>
                    <span style="font-weight: 500; font-size: 13px">${agentName(c.actorId)}</span>
                  </div>
                  <span class="text-xs text-muted">${timeAgo(c.createdAt)}</span>
                </div>
                <div class="md-comment" style="padding: 8px 12px; background: var(--bg2); border-radius: 6px; font-size: 13px; line-height: 1.5">${c.details.comment}</div>
                ${c.details.usage || c.details.durationMs ? html`<div class="text-xs text-muted" style="margin-top: 4px; padding: 0 12px">${c.details.usage ? c.details.usage.total_tokens + ' tokens' : ''}${c.details.usage && c.details.durationMs ? ' · ' : ''}${c.details.durationMs ? (c.details.durationMs / 1000).toFixed(1) + 's' : ''}</div>` : ''}
              </div>`
            })}
          </div>
        </div>
      `)

      // Post-render: apply markdown to comment divs
      container.querySelectorAll('.md-comment').forEach(function(el) {
        el.innerHTML = simpleMd(el.textContent)
      })
    }

    renderDetail()
  }
}
