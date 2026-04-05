import { html, render } from '../losos/html.js'

export default {
  label: 'Projects',
  icon: '📁',

  render(subject, lionStore, container, context) {
    var data = window.__paperclip
    var nav = window.__nav
    var projects = data.projects || []
    var issues = data.issues || []
    var agents = data.agents || []
    var goals = data.goals || []

    function issuesForProject(pid) {
      return issues.filter(function(i) { return i.projectId === pid })
    }

    function agentName(id) {
      if (!id) return '—'
      var a = agents.find(function(x) { return x.id === id })
      return a ? a.name : '—'
    }

    function statusBadge(status) {
      var cls = { in_progress: 'badge-blue', active: 'badge-green', completed: 'badge-green',
                  paused: 'badge-yellow', archived: 'badge-gray', planned: 'badge-gray' }
      return '<span class="badge ' + (cls[status] || 'badge-gray') + '">' + (status || '—').replace(/_/g, ' ') + '</span>'
    }

    function showCreateModal() {
      var modal = document.createElement('div')
      modal.className = 'modal-overlay'
      modal.innerHTML = '<div class="modal">' +
        '<div class="modal-header"><h2>New Project</h2><button class="modal-close" id="modal-close">&times;</button></div>' +
        '<div class="modal-body">' +
          '<div class="form-group"><label class="form-label">Name</label><input class="form-input" id="f-name" placeholder="Project name"></div>' +
          '<div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="f-desc" placeholder="What is this project about?"></textarea></div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
            '<div class="form-group"><label class="form-label">Status</label><select class="form-select" id="f-status">' +
              ['planned','in_progress','completed','paused','archived'].map(function(s) { return '<option value="' + s + '"' + (s === 'planned' ? ' selected' : '') + '>' + s.replace(/_/g, ' ') + '</option>' }).join('') + '</select></div>' +
            '<div class="form-group"><label class="form-label">Color</label><input class="form-input" id="f-color" type="color" value="#6366f1"></div>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
            '<div class="form-group"><label class="form-label">Lead Agent</label><select class="form-select" id="f-lead">' +
              '<option value="">None</option>' + agents.map(function(a) { return '<option value="' + a.id + '">' + a.name + '</option>' }).join('') + '</select></div>' +
            '<div class="form-group"><label class="form-label">Goal</label><select class="form-select" id="f-goal">' +
              '<option value="">None</option>' + goals.map(function(g) { return '<option value="' + g.id + '">' + g.title + '</option>' }).join('') + '</select></div>' +
          '</div>' +
        '</div>' +
        '<div class="modal-footer"><button class="btn-cancel" id="modal-cancel">Cancel</button><button class="btn-primary" id="modal-create">Create Project</button></div>' +
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

        var id = 'p-' + Date.now()
        var now = new Date().toISOString()
        var goalId = modal.querySelector('#f-goal').value || null
        var goal = goalId ? goals.find(function(g) { return g.id === goalId }) : null
        var project = {
          '@id': '#project-' + id, '@type': 'Project',
          id: id, name: name,
          description: modal.querySelector('#f-desc').value.trim() || null,
          status: modal.querySelector('#f-status').value,
          color: modal.querySelector('#f-color').value,
          leadAgentId: modal.querySelector('#f-lead').value || null,
          goalId: goalId, goalIds: goalId ? [goalId] : [],
          goals: goal ? [{ id: goal.id, title: goal.title }] : [],
          workspaces: [],
          createdAt: now, updatedAt: now
        }

        var btn = modal.querySelector('#modal-create')
        btn.textContent = 'Creating...'; btn.disabled = true

        try {
          await fetch(window.__getDB() + '/projects/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/ld+json' },
            body: JSON.stringify(project)
          })
          data.projects.push(project)
          projects = data.projects
          document.getElementById('sb-projects-count').textContent = projects.length
          close()
          renderProjects()
        } catch (err) { btn.textContent = 'Error — retry'; btn.disabled = false }
      })
    }

    function renderProjects() {
      render(container, html`
        <div class="row-between mb">
          <h1>Projects (${projects.length})</h1>
          <button class="btn-primary" onclick="${showCreateModal}">+ New Project</button>
        </div>

        <div class="grid grid-2">
          ${projects.map(function(p) {
            var pIssues = issuesForProject(p.id)
            var done = pIssues.filter(function(i) { return i.status === 'done' || i.status === 'completed' }).length
            var total = pIssues.length
            var pct = total > 0 ? Math.round(done / total * 100) : 0

            return html`<div class="card clickable" onclick="${function() { nav('projectDetail', p.name, { projectId: p.id }) }}">
              <div class="row-between" style="margin-bottom: 12px">
                <div class="row">
                  <div style="${'width: 4px; height: 32px; border-radius: 2px; background:' + (p.color || 'var(--accent)')}" ></div>
                  <div>
                    <div style="font-weight: 600; font-size: 14px">${p.name}</div>
                    <div class="text-xs text-muted">${p.description || 'No description'}</div>
                  </div>
                </div>
                <span innerHTML="${statusBadge(p.status)}"></span>
              </div>
              ${p.goals && p.goals.length ? html`<div style="margin-bottom: 10px">
                ${p.goals.map(function(g) { return html`<span class="badge badge-purple" style="margin-right: 4px">🎯 ${g.title}</span>` })}
              </div>` : ''}
              <div style="margin-bottom: 10px">
                <div class="row-between text-xs text-muted" style="margin-bottom: 4px">
                  <span>${done}/${total} issues done</span><span>${pct}%</span>
                </div>
                <div style="height: 4px; background: var(--bg3); border-radius: 2px; overflow: hidden">
                  <div style="${'height: 100%; background: var(--accent); border-radius: 2px; width:' + pct + '%'}"></div>
                </div>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px">
                <div><span class="text-muted">Lead</span><div class="text-fg2">${agentName(p.leadAgentId)}</div></div>
                <div><span class="text-muted">Workspaces</span><div class="text-fg2">${(p.workspaces || []).length}</div></div>
              </div>
            </div>`
          })}
        </div>
        ${projects.length === 0 ? html`<div class="empty">No projects yet</div>` : ''}
      `)
    }

    renderProjects()
  }
}
