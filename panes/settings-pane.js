export default {
  label: 'Settings',
  icon: '⚙️',

  render(subject, lionStore, container, context) {
    var data = window.__paperclip
    var company = data.company
    var agents = data.agents || []
    var issues = data.issues || []
    var projects = data.projects || []
    var goals = data.goals || []

    var totalBudget = agents.reduce(function(sum, a) { return sum + (a.budgetMonthlyCents || 0) }, 0)
    var totalSpent = agents.reduce(function(sum, a) { return sum + (a.spentMonthlyCents || 0) }, 0)

    var currentDB = window.__getDB()
    var isLive = window.__isLive()
    // Extract short name from path like /db/taskify
    var dbName = currentDB.replace(/^\/db\//, '')

    function statusOptions() {
      return ['active', 'paused', 'archived'].map(function(s) {
        return '<option value="' + s + '"' + (company.status === s ? ' selected' : '') + '>' + s + '</option>'
      }).join('')
    }

    function created() {
      if (!company.createdAt) return '—'
      return new Date(company.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    }

    container.innerHTML =
      '<h1>Company Settings</h1>' +

      // Database section
      '<h2>Database</h2>' +
      '<div class="card mb">' +
        '<div style="display:grid;grid-template-columns:1fr auto;gap:12px;align-items:end">' +
          '<div class="form-group" style="margin:0">' +
            '<label class="form-label">Database URL</label>' +
              '<input class="form-input" id="f-db" value="' + currentDB + '" placeholder="e.g. my-company or https://server.com/db/my-company" style="font-family:monospace">' +
            '<div class="text-xs text-muted" style="margin-top:4px">Short name for local, or full URL for remote server.</div>' +
          '</div>' +
          '<button class="btn-primary" id="switch-db-btn">Switch</button>' +
        '</div>' +
        '<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">' +
          '<div class="row" style="gap:8px">' +
            '<span class="status-dot ' + (isLive ? 'status-active' : 'status-idle') + '"></span>' +
            '<span class="text-sm">' + (isLive ? 'Connected to <strong>' + currentDB + '</strong>' : 'Using demo data (no database connection)') + '</span>' +
          '</div>' +
        '</div>' +
      '</div>' +

      // Company info
      '<div class="grid grid-2 mb">' +
        '<div>' +
          '<h2>Company Info</h2>' +
          '<div class="card"><div style="display:grid;gap:16px">' +
            '<div class="form-group" style="margin:0"><label class="form-label">Company Name</label>' +
              '<input class="form-input" id="f-name" value="' + (company.name || '').replace(/"/g, '&quot;') + '"></div>' +
            '<div class="form-group" style="margin:0"><label class="form-label">GitHub Org</label>' +
              '<div class="row" style="gap:8px">' +
                '<span class="text-muted text-sm" style="white-space:nowrap">github.com/</span>' +
                '<input class="form-input" id="f-github-org" value="' + (company.githubOrg || '').replace(/"/g, '&quot;') + '" placeholder="e.g. taskify" style="font-family:monospace">' +
              '</div></div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
              '<div class="form-group" style="margin:0"><label class="form-label">Issue Prefix</label>' +
                '<input class="form-input" id="f-prefix" value="' + (company.issuePrefix || '') + '" placeholder="e.g. NOS" maxlength="6"></div>' +
              '<div class="form-group" style="margin:0"><label class="form-label">Status</label>' +
                '<select class="form-select" id="f-status">' + statusOptions() + '</select></div>' +
            '</div>' +
            '<div style="display:flex;justify-content:flex-end">' +
              '<button class="btn-primary" id="save-btn">Save Changes</button></div>' +
          '</div></div>' +
        '</div>' +
        '<div>' +
          '<h2>Overview</h2>' +
          '<div class="card"><div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:13px">' +
            '<div><span class="text-muted text-xs">Agents</span><div style="font-size:20px;font-weight:700">' + agents.length + '</div></div>' +
            '<div><span class="text-muted text-xs">Issues</span><div style="font-size:20px;font-weight:700">' + issues.length + '</div></div>' +
            '<div><span class="text-muted text-xs">Projects</span><div style="font-size:20px;font-weight:700">' + projects.length + '</div></div>' +
            '<div><span class="text-muted text-xs">Goals</span><div style="font-size:20px;font-weight:700">' + goals.length + '</div></div>' +
            '<div><span class="text-muted text-xs">Monthly Budget</span><div style="font-size:20px;font-weight:700">$' + (totalBudget / 100).toFixed(0) + '</div></div>' +
            '<div><span class="text-muted text-xs">Monthly Spent</span><div style="font-size:20px;font-weight:700;color:' + (totalSpent > totalBudget ? 'var(--red)' : 'var(--fg)') + '">$' + (totalSpent / 100).toFixed(0) + '</div></div>' +
          '</div></div>' +
          '<h2 style="margin-top:20px">Created</h2>' +
          '<div class="card"><div class="text-sm text-fg2">' + created() + '</div></div>' +
        '</div>' +
      '</div>' +

      // Danger zone
      '<h2>Danger Zone</h2>' +
      '<div class="card" style="border-color:var(--red)"><div class="row-between">' +
        '<div><div style="font-weight:600;font-size:14px">Delete Company</div>' +
          '<div class="text-sm text-muted">This will remove all agents, issues, projects, goals, and activity from this database.</div></div>' +
        '<button class="btn btn-default" id="delete-btn" style="color:var(--red);border-color:var(--red)">Delete Everything</button>' +
      '</div></div>'

    // Switch database
    container.querySelector('#switch-db-btn').addEventListener('click', async function() {
      var name = container.querySelector('#f-db').value.trim()
      if (!name) return
      var btn = container.querySelector('#switch-db-btn')
      btn.textContent = 'Switching...'
      btn.disabled = true

      window.__setDB(name)
      try {
        await window.__loadData()
      } catch (e) {
        // No data in this DB yet — start fresh
        window.__paperclip = {
          company: { id: 'c1', name: name, status: 'active', issuePrefix: name.slice(0, 3).toUpperCase() },
          agents: [], issues: [], projects: [], goals: [], activity: []
        }
      }
      // Update sidebar counts
      var d = window.__paperclip
      document.getElementById('sb-agents-count').textContent = d.agents.length
      document.getElementById('sb-issues-count').textContent = d.issues.filter(function(i) { return i.status !== 'done' && i.status !== 'completed' }).length
      document.getElementById('sb-projects-count').textContent = d.projects.length

      window.__nav('dashboard', 'Dashboard')
    })

    // Save company
    container.querySelector('#save-btn').addEventListener('click', async function() {
      var nameEl = container.querySelector('#f-name')
      var name = nameEl.value.trim()
      if (!name) { nameEl.style.borderColor = 'var(--red)'; return }

      company.name = name
      company.githubOrg = container.querySelector('#f-github-org').value.trim() || null
      company.issuePrefix = container.querySelector('#f-prefix').value.trim().toUpperCase() || company.issuePrefix
      company.status = container.querySelector('#f-status').value
      company.updatedAt = new Date().toISOString()

      var btn = container.querySelector('#save-btn')
      btn.textContent = 'Saving...'
      btn.disabled = true

      var dbPath = window.__getDB()
      await fetch(dbPath + '/company/' + (company.id || 'c1'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/ld+json' },
        body: JSON.stringify(company)
      })

      btn.textContent = 'Saved ✓'
      setTimeout(function() { btn.textContent = 'Save Changes'; btn.disabled = false }, 1500)
    })

    // Delete everything
    container.querySelector('#delete-btn').addEventListener('click', async function() {
      if (!confirm('Are you sure? This deletes ALL data in this database.')) return
      if (!confirm('Really? This cannot be undone.')) return

      var btn = container.querySelector('#delete-btn')
      btn.textContent = 'Deleting...'
      btn.disabled = true

      var dbPath = window.__getDB()
      var collections = ['agents', 'issues', 'projects', 'goals', 'activity', 'company']
      for (var col of collections) {
        try {
          var listing = await fetch(dbPath + '/' + col + '/').then(function(r) { return r.json() })
          var items = listing.contains || listing['ldp:contains'] || []
          for (var item of items) {
            var url = typeof item === 'string' ? item : item['@id']
            await fetch(url, { method: 'DELETE' })
          }
        } catch (e) {}
      }

      window.__paperclip = {
        company: { id: 'c1', name: 'New Company', status: 'active', issuePrefix: 'NEW' },
        agents: [], issues: [], projects: [], goals: [], activity: []
      }

      document.getElementById('sb-agents-count').textContent = '0'
      document.getElementById('sb-issues-count').textContent = '0'
      document.getElementById('sb-projects-count').textContent = '0'

      window.__nav('dashboard', 'Dashboard')
    })
  }
}
