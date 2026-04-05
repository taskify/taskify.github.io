import { html, render } from '../losos/html.js'

export default {
  label: 'Goals',
  icon: '🎯',

  render(subject, lionStore, container, context) {
    var data = window.__paperclip
    var nav = window.__nav
    var goals = data.goals || []
    var projects = data.projects || []
    var issues = data.issues || []
    var agents = data.agents || []

    function projectsForGoal(gid) {
      return projects.filter(function(p) {
        return p.goalId === gid || (p.goalIds && p.goalIds.indexOf(gid) !== -1)
      })
    }

    function issuesForGoal(gid) {
      return issues.filter(function(i) { return i.goalId === gid })
    }

    function agentName(id) {
      if (!id) return '—'
      var a = agents.find(function(x) { return x.id === id })
      return a ? a.name : '—'
    }

    function statusBadge(status) {
      var cls = { active: 'badge-green', completed: 'badge-green', paused: 'badge-yellow', archived: 'badge-gray' }
      return '<span class="badge ' + (cls[status] || 'badge-blue') + '">' + status + '</span>'
    }

    function showCreateModal() {
      var modal = document.createElement('div')
      modal.className = 'modal-overlay'
      modal.innerHTML = '<div class="modal">' +
        '<div class="modal-header"><h2>New Goal</h2><button class="modal-close" id="modal-close">&times;</button></div>' +
        '<div class="modal-body">' +
          '<div class="form-group"><label class="form-label">Title</label><input class="form-input" id="f-title" placeholder="What are we trying to achieve?"></div>' +
          '<div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="f-desc" placeholder="Details..."></textarea></div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
            '<div class="form-group"><label class="form-label">Level</label><select class="form-select" id="f-level">' +
              '<option value="company" selected>Company</option><option value="team">Team</option><option value="individual">Individual</option></select></div>' +
            '<div class="form-group"><label class="form-label">Owner</label><select class="form-select" id="f-owner">' +
              '<option value="">None</option>' + agents.map(function(a) { return '<option value="' + a.id + '">' + a.name + '</option>' }).join('') + '</select></div>' +
          '</div>' +
        '</div>' +
        '<div class="modal-footer"><button class="btn-cancel" id="modal-cancel">Cancel</button><button class="btn-primary" id="modal-create">Create Goal</button></div>' +
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

        var id = 'g-' + Date.now()
        var now = new Date().toISOString()
        var goal = {
          '@id': '#goal-' + id, '@type': 'Goal',
          id: id, title: title,
          description: modal.querySelector('#f-desc').value.trim() || null,
          level: modal.querySelector('#f-level').value,
          status: 'active',
          ownerAgentId: modal.querySelector('#f-owner').value || null,
          parentId: null,
          createdAt: now, updatedAt: now
        }

        var btn = modal.querySelector('#modal-create')
        btn.textContent = 'Creating...'; btn.disabled = true

        try {
          await fetch(window.__getDB() + '/goals/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/ld+json' },
            body: JSON.stringify(goal)
          })
          data.goals.push(goal)
          goals = data.goals
          close()
          renderGoals()
        } catch (err) { btn.textContent = 'Error — retry'; btn.disabled = false }
      })
    }

    function showEditModal(g) {
      var modal = document.createElement('div')
      modal.className = 'modal-overlay'
      modal.innerHTML = '<div class="modal">' +
        '<div class="modal-header"><h2>Edit Goal</h2><button class="modal-close" id="modal-close">&times;</button></div>' +
        '<div class="modal-body">' +
          '<div class="form-group"><label class="form-label">Title</label><input class="form-input" id="f-title" value="' + (g.title || '').replace(/"/g, '&quot;') + '"></div>' +
          '<div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="f-desc">' + (g.description || '') + '</textarea></div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
            '<div class="form-group"><label class="form-label">Status</label><select class="form-select" id="f-status">' +
              ['active','completed','paused','archived'].map(function(s) { return '<option value="' + s + '"' + (g.status === s ? ' selected' : '') + '>' + s + '</option>' }).join('') + '</select></div>' +
            '<div class="form-group"><label class="form-label">Owner</label><select class="form-select" id="f-owner">' +
              '<option value="">None</option>' + agents.map(function(a) { return '<option value="' + a.id + '"' + (g.ownerAgentId === a.id ? ' selected' : '') + '>' + a.name + '</option>' }).join('') + '</select></div>' +
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
        Object.assign(g, {
          title: title,
          description: modal.querySelector('#f-desc').value.trim() || null,
          status: modal.querySelector('#f-status').value,
          ownerAgentId: modal.querySelector('#f-owner').value || null,
          updatedAt: new Date().toISOString()
        })
        await fetch(window.__getDB() + '/goals/' + g.id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/ld+json' },
          body: JSON.stringify(g)
        })
        close()
        renderGoals()
      })
    }

    async function deleteGoal(g) {
      if (!confirm('Delete goal "' + g.title + '"?')) return
      await fetch(window.__getDB() + '/goals/' + g.id, { method: 'DELETE' })
      data.goals = data.goals.filter(function(x) { return x.id !== g.id })
      goals = data.goals
      renderGoals()
    }

    function renderGoals() {
      render(container, html`
        <div class="row-between mb">
          <h1>Goals (${goals.length})</h1>
          <button class="btn-primary" onclick="${showCreateModal}">+ New Goal</button>
        </div>

        ${goals.length === 0 ? html`<div class="empty">No goals defined yet</div>` : ''}

        <div class="grid" style="gap: 20px">
          ${goals.map(function(g) {
            var gProjects = projectsForGoal(g.id)
            var gIssues = issuesForGoal(g.id)
            var done = gIssues.filter(function(i) { return i.status === 'done' || i.status === 'completed' }).length

            return html`<div class="card" style="padding: 20px">
              <div class="row-between" style="margin-bottom: 12px">
                <div class="row">
                  <span style="font-size: 24px">🎯</span>
                  <div>
                    <div style="font-size: 18px; font-weight: 700">${g.title}</div>
                    <div class="text-sm text-muted">${g.level} goal${g.description ? ' — ' + g.description : ''}</div>
                  </div>
                </div>
                <div class="row" style="gap: 6px">
                  <span innerHTML="${statusBadge(g.status)}"></span>
                  <button class="btn btn-default" onclick="${function(e) { e.stopPropagation(); showEditModal(g) }}" style="padding: 4px 10px; font-size: 11px">Edit</button>
                  <button class="btn btn-default" onclick="${function(e) { e.stopPropagation(); deleteGoal(g) }}" style="padding: 4px 10px; font-size: 11px; color: var(--red)">Delete</button>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px">
                <div class="card metric" style="padding: 12px">
                  <div class="metric-value" style="font-size: 24px">${gProjects.length}</div>
                  <div class="metric-label">Projects</div>
                </div>
                <div class="card metric" style="padding: 12px">
                  <div class="metric-value" style="font-size: 24px">${gIssues.length}</div>
                  <div class="metric-label">Issues</div>
                </div>
                <div class="card metric" style="padding: 12px">
                  <div class="metric-value" style="font-size: 24px">${done}</div>
                  <div class="metric-label">Done</div>
                </div>
              </div>

              ${gProjects.length > 0 ? html`<div>
                <h2 style="font-size: 13px">Projects</h2>
                ${gProjects.map(function(p) {
                  return html`<div class="row clickable" onclick="${function() { nav('projectDetail', p.name, { projectId: p.id }) }}" style="padding: 6px 0; border-bottom: 1px solid var(--border)">
                    <div style="${'width: 3px; height: 16px; border-radius: 1px; background:' + (p.color || 'var(--accent)')}" ></div>
                    <span class="text-sm">${p.name}</span>
                    <span class="text-xs text-muted">· ${(p.status || '—').replace(/_/g, ' ')}</span>
                  </div>`
                })}
              </div>` : ''}

              <div class="text-xs text-muted" style="margin-top: 8px">
                Owner: ${g.ownerAgentId
                  ? html`<span class="clickable" onclick="${function() { nav('agentDetail', agentName(g.ownerAgentId), { agentId: g.ownerAgentId }) }}">${agentName(g.ownerAgentId)}</span>`
                  : '—'}
              </div>
            </div>`
          })}
        </div>
      `)
    }

    renderGoals()
  }
}
