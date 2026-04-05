import { html, render } from '../losos/html.js'

export default {
  label: 'Project',
  icon: '📁',

  render(subject, lionStore, container, context) {
    var data = window.__paperclip
    var nav = window.__nav
    var project = data.projects.find(function(p) { return p.id === context.projectId })
    if (!project) { container.innerHTML = '<div class="empty">Project not found</div>'; return }

    var agents = data.agents
    var goals = data.goals || []

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
                  todo: 'badge-gray', cancelled: 'badge-gray', active: 'badge-green',
                  planned: 'badge-gray', paused: 'badge-yellow', archived: 'badge-gray' }
      return '<span class="badge ' + (cls[status] || 'badge-gray') + '">' + (status || '—').replace(/_/g, ' ') + '</span>'
    }

    async function deleteProject() {
      if (!confirm('Delete project ' + project.name + '?')) return
      await fetch(window.__getDB() + '/projects/' + project.id, { method: 'DELETE' })
      data.projects = data.projects.filter(function(p) { return p.id !== project.id })
      document.getElementById('sb-projects-count').textContent = data.projects.length
      nav('projects', 'Projects')
    }

    function showEditModal() {
      var modal = document.createElement('div')
      modal.className = 'modal-overlay'
      modal.innerHTML = '<div class="modal">' +
        '<div class="modal-header"><h2>Edit Project</h2><button class="modal-close" id="modal-close">&times;</button></div>' +
        '<div class="modal-body">' +
          '<div class="form-group"><label class="form-label">Name</label><input class="form-input" id="f-name" value="' + (project.name || '').replace(/"/g, '&quot;') + '"></div>' +
          '<div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="f-desc">' + (project.description || '') + '</textarea></div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
            '<div class="form-group"><label class="form-label">Status</label><select class="form-select" id="f-status">' +
              ['planned','in_progress','completed','paused','archived'].map(function(s) { return '<option value="' + s + '"' + (project.status === s ? ' selected' : '') + '>' + s.replace(/_/g, ' ') + '</option>' }).join('') + '</select></div>' +
            '<div class="form-group"><label class="form-label">Color</label><input class="form-input" id="f-color" type="color" value="' + (project.color || '#6366f1') + '"></div>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
            '<div class="form-group"><label class="form-label">Lead Agent</label><select class="form-select" id="f-lead">' +
              '<option value="">None</option>' + agents.map(function(a) { return '<option value="' + a.id + '"' + (project.leadAgentId === a.id ? ' selected' : '') + '>' + a.name + '</option>' }).join('') + '</select></div>' +
            '<div class="form-group"><label class="form-label">Goal</label><select class="form-select" id="f-goal">' +
              '<option value="">None</option>' + goals.map(function(g) { return '<option value="' + g.id + '"' + (project.goalId === g.id ? ' selected' : '') + '>' + g.title + '</option>' }).join('') + '</select></div>' +
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
        var goalId = modal.querySelector('#f-goal').value || null
        var goal = goalId ? goals.find(function(g) { return g.id === goalId }) : null
        Object.assign(project, {
          name: name,
          description: modal.querySelector('#f-desc').value.trim() || null,
          status: modal.querySelector('#f-status').value,
          color: modal.querySelector('#f-color').value,
          leadAgentId: modal.querySelector('#f-lead').value || null,
          goalId: goalId, goalIds: goalId ? [goalId] : [],
          goals: goal ? [{ id: goal.id, title: goal.title }] : [],
          updatedAt: new Date().toISOString()
        })
        await fetch(window.__getDB() + '/projects/' + project.id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/ld+json' },
          body: JSON.stringify(project)
        })
        close()
        renderDetail()
      })
    }

    function renderDetail() {
      var issues = data.issues.filter(function(i) { return i.projectId === project.id })
      var lead = project.leadAgentId ? agents.find(function(a) { return a.id === project.leadAgentId }) : null
      var done = issues.filter(function(i) { return i.status === 'done' || i.status === 'completed' }).length
      var total = issues.length
      var pct = total > 0 ? Math.round(done / total * 100) : 0
      var teamIds = {}
      issues.forEach(function(i) { if (i.assigneeAgentId) teamIds[i.assigneeAgentId] = true })
      var team = agents.filter(function(a) { return teamIds[a.id] })

      render(container, html`
        <div class="row-between" style="margin-bottom: 24px">
          <div class="row" style="gap: 12px">
            <div style="${'width: 6px; height: 40px; border-radius: 3px; background:' + (project.color || 'var(--accent)')}"></div>
            <div>
              <h1 style="margin-bottom: 2px">${project.name}</h1>
              <div class="row" style="gap: 8px">
                <span class="text-sm text-muted">${project.description || ''}</span>
                <span innerHTML="${statusBadge(project.status)}"></span>
              </div>
            </div>
          </div>
          <div class="row" style="gap: 6px">
            <button class="btn btn-default" onclick="${showEditModal}">Edit</button>
            <button class="btn btn-default" style="color: var(--red)" onclick="${deleteProject}">Delete</button>
          </div>
        </div>

        <div class="grid grid-3 mb">
          <div class="card metric">
            <div class="metric-value" style="font-size: 24px">${total}</div>
            <div class="metric-label">Total Issues</div>
          </div>
          <div class="card metric">
            <div class="metric-value" style="font-size: 24px">${done}</div>
            <div class="metric-label">Done</div>
          </div>
          <div class="card metric">
            <div class="metric-value" style="font-size: 24px">${pct}%</div>
            <div class="metric-label">Complete</div>
          </div>
        </div>

        <div style="margin-bottom: 24px">
          <div class="row-between text-xs text-muted" style="margin-bottom: 4px"><span>Progress</span><span>${done}/${total}</span></div>
          <div style="height: 6px; background: var(--bg3); border-radius: 3px; overflow: hidden">
            <div style="${'height: 100%; border-radius: 3px; background:' + (project.color || 'var(--accent)') + '; width:' + pct + '%'}"></div>
          </div>
        </div>

        <div class="grid grid-2 mb">
          <div>
            <h2>Team (${team.length})</h2>
            <div class="card">
              ${lead ? html`<div class="row clickable" onclick="${function() { nav('agentDetail', lead.name, { agentId: lead.id }) }}" style="padding: 8px 0; border-bottom: 1px solid var(--border)">
                <span class="icon-circle" style="width: 28px; height: 28px; font-size: 12px">${lead.name.charAt(0)}</span>
                <div><div class="text-sm" style="font-weight: 500">${lead.name}</div><div class="text-xs text-muted">Lead</div></div>
              </div>` : ''}
              ${team.filter(function(a) { return !lead || a.id !== lead.id }).map(function(a) {
                return html`<div class="row clickable" onclick="${function() { nav('agentDetail', a.name, { agentId: a.id }) }}" style="padding: 8px 0; border-bottom: 1px solid var(--border)">
                  <span class="icon-circle" style="width: 28px; height: 28px; font-size: 12px">${a.name.charAt(0)}</span>
                  <div><div class="text-sm">${a.name}</div><div class="text-xs text-muted">${a.role || '—'}</div></div>
                </div>`
              })}
              ${team.length === 0 && !lead ? html`<div class="text-muted text-sm" style="padding: 8px 0">No team members</div>` : ''}
            </div>
          </div>
          <div>
            ${project.goals && project.goals.length ? html`<div style="margin-bottom: 16px">
              <h2>Goals</h2>
              <div class="card">
                ${project.goals.map(function(g) { return html`<div class="row" style="padding: 6px 0"><span>🎯</span><span class="text-sm">${g.title}</span></div>` })}
              </div>
            </div>` : ''}
            <h2>Workspaces</h2>
            <div class="card">
              ${(project.workspaces || []).length === 0
                ? html`<div class="text-muted text-sm" style="padding: 8px 0">No workspaces</div>`
                : html`<div class="text-sm text-fg2">${(project.workspaces || []).length} workspace(s)</div>`}
            </div>
          </div>
        </div>

        <h2>Issues (${issues.length})</h2>
        <div class="card">
          <table>
            <tr><th></th><th>Issue</th><th>Assignee</th><th>Status</th><th>Updated</th></tr>
            
              ${issues.map(function(i) {
                var a = i.assigneeAgentId ? agents.find(function(x) { return x.id === i.assigneeAgentId }) : null
                return html`<tr class="clickable" onclick="${function() { nav('issueDetail', i.identifier, { issueId: i.id }) }}">
                  <td class="text-sm">${i.priority === 'high' || i.priority === 'urgent' ? '🔴' : i.priority === 'medium' ? '🟡' : '⚪'}</td>
                  <td><span class="text-muted text-xs">${i.identifier} </span><span class="text-sm">${i.title}</span></td>
                  <td class="text-sm text-fg2">${a ? a.name : '—'}</td>
                  <td innerHTML="${statusBadge(i.status)}"></td>
                  <td class="text-xs text-muted">${timeAgo(i.updatedAt)}</td>
                </tr>`
              })}
              ${issues.length === 0 ? html`<tr><td colspan="5" class="text-muted" style="text-align: center; padding: 16px">No issues</td></tr>` : ''}
            
          </table>
        </div>
      `)
    }

    renderDetail()
  }
}
