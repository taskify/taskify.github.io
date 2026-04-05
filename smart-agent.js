#!/usr/bin/env node
/**
 * Taskify Smart Agent — picks up issues, asks GLM-5 for advice, writes comments.
 *
 * Usage: node smart-agent.js [--interval 30] [--api http://localhost:3005]
 *
 * Requires: ZAI_API_KEY env var (id.secret format from z.ai)
 */

import jwt from 'jsonwebtoken'

var API = 'http://localhost:3005/db/taskify'
var AGENT_ID = 'a3'
var INTERVAL = 30

// Parse CLI args
process.argv.forEach(function(arg, i) {
  if (arg === '--api' && process.argv[i + 1]) API = process.argv[i + 1]
  if (arg === '--agent-id' && process.argv[i + 1]) AGENT_ID = process.argv[i + 1]
  if (arg === '--interval' && process.argv[i + 1]) INTERVAL = parseInt(process.argv[i + 1], 10)
})

// --- GLM-5 client ---
var ZAI_KEY = process.env.ZAI_API_KEY || process.env.Z_API_KEY
if (!ZAI_KEY) {
  console.error('[agent] ZAI_API_KEY or Z_API_KEY env var required')
  process.exit(1)
}

async function askGLM(prompt) {
  var [kid, secret] = ZAI_KEY.split('.')
  var token = jwt.sign(
    { api_key: kid, exp: Math.floor(Date.now() / 1000) + 3600, timestamp: Date.now() },
    secret,
    { algorithm: 'HS256', header: { alg: 'HS256', sign_type: 'SIGN', kid: kid } }
  )

  var res = await fetch('https://api.z.ai/api/coding/paas/v4/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'glm-5',
      messages: [
        { role: 'system', content: 'You are an AI agent working for a company. You receive issues and tasks. If the answer is simple and factual, just answer directly. If the task requires planning, provide concise actionable steps. Match the depth of your response to the complexity of the issue. Keep responses under 200 words.' },
        { role: 'user', content: prompt }
      ]
    })
  })

  var data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.choices[0].message.content
}

// --- DB helpers ---
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

async function getAgent() {
  try { return await fetchJSON(API + '/agents/' + AGENT_ID) }
  catch (e) { return null }
}

async function getIssues() {
  var listing = await fetchJSON(API + '/issues/')
  var items = listing.contains || listing['ldp:contains'] || []
  var urls = items.map(function(item) { return typeof item === 'string' ? item : item['@id'] })
  return Promise.all(urls.map(function(url) { return fetchJSON(url) }))
}

async function getActivity() {
  var listing = await fetchJSON(API + '/activity/')
  var items = listing.contains || listing['ldp:contains'] || []
  var urls = items.map(function(item) { return typeof item === 'string' ? item : item['@id'] })
  return Promise.all(urls.map(function(url) { return fetchJSON(url) }))
}

async function alreadyCommented(issueId) {
  var activity = await getActivity()
  return activity.some(function(a) {
    return a.action === 'issue.commented' && a.actorId === AGENT_ID && a.entityId === issueId
  })
}

async function logActivity(action, entityType, entityId, details) {
  var id = 'ev-' + Date.now()
  await putJSON(API + '/activity/' + id, {
    '@id': '#' + id, '@type': 'Activity',
    id: id, actorType: 'agent', actorId: AGENT_ID,
    action: action, entityType: entityType, entityId: entityId,
    agentId: AGENT_ID, details: details || null,
    createdAt: new Date().toISOString()
  })
}

// --- Main loop ---
async function heartbeat() {
  var agent = await getAgent()
  if (!agent) { console.log('[agent] Agent not found:', AGENT_ID); return }

  console.log('[agent] ' + agent.name + ' — heartbeat')

  // Update status
  agent.lastHeartbeatAt = new Date().toISOString()
  agent.updatedAt = agent.lastHeartbeatAt
  agent.status = 'running'
  await putJSON(API + '/agents/' + AGENT_ID, agent)

  // Get my issues
  var issues = await getIssues()
  var myIssues = issues.filter(function(i) { return i.assigneeAgentId === AGENT_ID })
  var todos = myIssues.filter(function(i) { return i.status === 'todo' })
  var inProgress = myIssues.filter(function(i) { return i.status === 'in_progress' })

  console.log('[agent] Issues: ' + myIssues.length + ' total, ' + todos.length + ' todo, ' + inProgress.length + ' in progress')

  // Pick an issue to work on
  var issue = inProgress[0] || todos[0]
  if (!issue) {
    console.log('[agent] No work to do — going idle')
    agent.status = 'idle'
    agent.updatedAt = new Date().toISOString()
    await putJSON(API + '/agents/' + AGENT_ID, agent)
    return
  }

  // If it's a todo, check it out first
  if (issue.status === 'todo') {
    console.log('[agent] Checking out: ' + (issue.identifier || issue.id) + ' — ' + issue.title)
    issue.status = 'in_progress'
    issue.updatedAt = new Date().toISOString()
    await putJSON(API + '/issues/' + issue.id, issue)
    await logActivity('issue.checked_out', 'issue', issue.id)
  }

  // Skip if already commented
  if (await alreadyCommented(issue.id)) {
    console.log('[agent] Already commented on ' + (issue.identifier || issue.id) + ' — skipping')
    return
  }

  // Ask GLM-5 for advice
  console.log('[agent] Thinking about: ' + issue.title)
  var prompt = 'I am working on this issue:\n\n' +
    'Title: ' + issue.title + '\n' +
    (issue.description ? 'Description: ' + issue.description + '\n' : '') +
    'Priority: ' + (issue.priority || 'medium') + '\n\n' +
    'Please help with this issue.'

  try {
    var response = await askGLM(prompt)
    console.log('[agent] GLM-5 says:\n' + response.slice(0, 200) + (response.length > 200 ? '...' : ''))

    // Write the response as a comment/note on the issue
    var commentId = 'comment-' + Date.now()
    await putJSON(API + '/activity/' + commentId, {
      '@id': '#' + commentId, '@type': 'Activity',
      id: commentId, actorType: 'agent', actorId: AGENT_ID,
      action: 'issue.commented', entityType: 'issue', entityId: issue.id,
      agentId: AGENT_ID,
      details: { comment: response, issueId: issue.id, issueTitle: issue.title },
      createdAt: new Date().toISOString()
    })

    console.log('[agent] ✅ Comment posted on ' + (issue.identifier || issue.id))

    // Mark issue done
    issue.status = 'done'
    issue.updatedAt = new Date().toISOString()
    await putJSON(API + '/issues/' + issue.id, issue)
    console.log('[agent] ✅ Issue marked done')
  } catch (err) {
    console.error('[agent] GLM-5 error:', err.message)
  }
}

// --- Start ---
console.log('[agent] Starting smart agent ' + AGENT_ID)
console.log('[agent] API: ' + API)
console.log('[agent] LLM: GLM-5 via z.ai')
console.log('[agent] Heartbeat every ' + INTERVAL + 's')
console.log('')

async function loop() {
  try { await heartbeat() }
  catch (err) { console.error('[agent] Error:', err.message) }
  setTimeout(loop, INTERVAL * 1000)
}

loop()
