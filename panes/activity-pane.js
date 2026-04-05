import { html, render } from '../losos/html.js'

export default {
  label: 'Activity',
  icon: '📡',

  render(subject, lionStore, container, context) {
    var data = window.__paperclip
    var nav = window.__nav
    var activity = (data.activity || []).slice().sort(function(a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt)
    })
    var agents = data.agents || []

    function agentName(id) {
      if (!id) return null
      var a = agents.find(function(x) { return x.id === id })
      return a ? a.name : null
    }

    function timeAgo(d) {
      if (!d) return '—'
      var s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
      if (s < 60) return s + 's ago'
      if (s < 3600) return Math.floor(s / 60) + 'm ago'
      if (s < 86400) return Math.floor(s / 3600) + 'h ago'
      return Math.floor(s / 86400) + 'd ago'
    }

    function actionIcon(action) {
      if (action.includes('created')) return '✨'
      if (action.includes('completed') || action.includes('done')) return '✅'
      if (action.includes('error') || action.includes('failed')) return '❌'
      if (action.includes('cancelled')) return '🚫'
      if (action.includes('checked_out')) return '📥'
      if (action.includes('started')) return '▶️'
      if (action.includes('heartbeat')) return '💓'
      if (action.includes('key')) return '🔑'
      return '•'
    }

    function actionColor(action) {
      if (action.includes('error') || action.includes('failed')) return 'var(--red)'
      if (action.includes('created') || action.includes('completed')) return 'var(--green)'
      if (action.includes('cancelled')) return 'var(--fg3)'
      return 'var(--fg2)'
    }

    render(container, html`
      <h1>Activity (${activity.length})</h1>

      <div class="card">
        ${activity.length === 0 ? html`<div class="text-muted" style="padding: 24px; text-align: center">No activity yet</div>` : ''}
        ${activity.map(function(a, idx) {
          var actor = a.actorType === 'agent' ? agentName(a.actorId) : a.actorType === 'user' ? 'Board' : a.actorType
          var agentCtx = a.agentId ? agentName(a.agentId) : null

          return html`<div style="${'padding: 12px 0; border-bottom:' + (idx < activity.length - 1 ? '1px solid var(--border)' : 'none')}">
            <div class="row-between">
              <div class="row" style="gap: 10px">
                <span style="font-size: 16px">${actionIcon(a.action)}</span>
                <div>
                  <div class="row" style="gap: 6px">
                    ${a.actorType === 'agent' && a.actorId
                      ? html`<span class="clickable" style="font-weight: 500; font-size: 13px" onclick="${function() { nav('agentDetail', actor, { agentId: a.actorId }) }}">${actor || 'System'}</span>`
                      : html`<span style="font-weight: 500; font-size: 13px">${actor || 'System'}</span>`}
                    <span style="${'font-size: 13px; color:' + actionColor(a.action)}">${a.action.replace(/\./g, ' → ')}</span>
                  </div>
                  <div class="text-xs text-muted row" style="gap: 8px; margin-top: 2px">
                    <span>${a.entityType.replace(/_/g, ' ')}</span>
                    ${agentCtx && agentCtx !== actor ? html`<span>· agent: ${agentCtx}</span>` : ''}
                  </div>
                  ${a.details && a.details.comment ? html`<div style="margin-top: 6px; padding: 8px 12px; background: var(--bg2); border-radius: 6px; font-size: 13px; line-height: 1.5; white-space: pre-wrap">${a.details.comment}</div>` : ''}
                </div>
              </div>
              <span class="text-xs text-muted">${timeAgo(a.createdAt)}</span>
            </div>
          </div>`
        })}
      </div>
    `)
  }
}
