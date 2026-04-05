#!/usr/bin/env node
/**
 * Taskify Agent — a simple heartbeat loop that picks up issues and works on them.
 *
 * Usage: node agent.mjs [--api http://localhost:3005] [--agent-id a3] [--interval 10]
 */

var API = 'http://localhost:3005/db/taskify'
var AGENT_ID = 'a3'  // Engineer by default
var INTERVAL = 15    // seconds between heartbeats

// Parse CLI args
process.argv.forEach(function(arg, i) {
  if (arg === '--api' && process.argv[i + 1]) API = process.argv[i + 1] + '/db/taskify'
  if (arg === '--agent-id' && process.argv[i + 1]) AGENT_ID = process.argv[i + 1]
  if (arg === '--interval' && process.argv[i + 1]) INTERVAL = parseInt(process.argv[i + 1], 10)
})

async function fetchJSON(url) {
  var res = await fetch(url)
  return res.json()
}

async function putJSON(url, data) {
  await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/ld+json' },
    body: JSON.stringify(data)
  })
}

async function logActivity(action, entityType, entityId) {
  var id = 'ev-' + Date.now()
  await putJSON(API + '/activity/' + id, {
    '@id': '#' + id,
    '@type': 'Activity',
    id: id,
    actorType: 'agent',
    actorId: AGENT_ID,
    action: action,
    entityType: entityType,
    entityId: entityId,
    agentId: AGENT_ID,
    createdAt: new Date().toISOString()
  })
}

async function getAgent() {
  try {
    return await fetchJSON(API + '/agents/' + AGENT_ID)
  } catch (e) {
    return null
  }
}

async function getIssues() {
  var listing = await fetchJSON(API + '/issues/')
  var items = listing.contains || listing['ldp:contains'] || []
  var urls = items.map(function(item) { return typeof item === 'string' ? item : item['@id'] })
  return Promise.all(urls.map(function(url) { return fetchJSON(url) }))
}

async function heartbeat() {
  var agent = await getAgent()
  if (!agent) {
    console.log('[agent] Agent ' + AGENT_ID + ' not found in /db/')
    return
  }

  console.log('[agent] ' + agent.name + ' (' + agent.role + ') — heartbeat')

  // Update heartbeat timestamp
  agent.lastHeartbeatAt = new Date().toISOString()
  agent.updatedAt = agent.lastHeartbeatAt
  agent.status = 'running'
  await putJSON(API + '/agents/' + AGENT_ID, agent)

  // Get all issues
  var issues = await getIssues()

  // Find issues assigned to this agent
  var myIssues = issues.filter(function(i) { return i.assigneeAgentId === AGENT_ID })
  var inProgress = myIssues.filter(function(i) { return i.status === 'in_progress' })
  var todos = myIssues.filter(function(i) { return i.status === 'todo' })

  console.log('[agent] My issues: ' + myIssues.length + ' total, ' + inProgress.length + ' in progress, ' + todos.length + ' todo')

  // If we have an in-progress issue, "work" on it and complete it
  if (inProgress.length > 0) {
    var issue = inProgress[0]
    console.log('[agent] Completing: ' + (issue.identifier || issue.id) + ' — ' + issue.title)

    issue.status = 'done'
    issue.updatedAt = new Date().toISOString()
    var issueId = issue.id || issue['@id'].replace('#issue-', '')
    await putJSON(API + '/issues/' + issueId, issue)
    await logActivity('issue.completed', 'issue', issueId)

    console.log('[agent] ✅ Done: ' + (issue.identifier || issue.id))
    return
  }

  // If we have a todo issue, check it out
  if (todos.length > 0) {
    var issue = todos[0]
    console.log('[agent] Checking out: ' + (issue.identifier || issue.id) + ' — ' + issue.title)

    issue.status = 'in_progress'
    issue.updatedAt = new Date().toISOString()
    var issueId = issue.id || issue['@id'].replace('#issue-', '')
    await putJSON(API + '/issues/' + issueId, issue)
    await logActivity('issue.checked_out', 'issue', issueId)

    console.log('[agent] 📥 Checked out: ' + (issue.identifier || issue.id))
    return
  }

  // Nothing to do
  console.log('[agent] No work to do — going idle')
  agent.status = 'idle'
  agent.updatedAt = new Date().toISOString()
  await putJSON(API + '/agents/' + AGENT_ID, agent)
}

// Main loop
console.log('[agent] Starting agent ' + AGENT_ID)
console.log('[agent] API: ' + API)
console.log('[agent] Heartbeat every ' + INTERVAL + 's')
console.log('')

async function loop() {
  try {
    await heartbeat()
  } catch (err) {
    console.error('[agent] Error:', err.message)
  }
  setTimeout(loop, INTERVAL * 1000)
}

loop()
