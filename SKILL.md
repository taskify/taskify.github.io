# App-to-LOSOS — Translate any app into screens + DB

> A repeatable pattern for converting existing applications into lightweight LOSOS panes backed by a document database. No build step. No framework dependencies.

## Overview

Any CRUD application can be decomposed into **entities**, **relationships**, and **5 screen types**. This skill automates that translation into a LOSOS pane-based UI with optional MongoDB persistence.

The formula: for N entity types, expect **~140N + 310 lines** for a full read-only UI, or **~210N + 400 lines** with forms and actions.

## Step 1: Extract Entities

Identify every noun in the existing app. Sources to check:

- API endpoints (`GET /api/things` → `Thing` entity)
- Database tables/collections
- UI navigation items
- TypeScript types or model files

```
Example (project management app):
  Entities: Agent, Issue, Project, Goal, Activity, Company
  
Example (e-commerce app):
  Entities: Product, Order, Customer, Review, Category, Cart
```

Each entity becomes:
- One **Mongo collection** (or JSON-LD document)
- One **list pane** file
- One **detail pane** file
- One sidebar nav item

## Step 2: Classify Screens

Every screen in any app is one of 5 types:

| Type | Purpose | Template | Lines |
|---|---|---|---|
| **Dashboard** | Aggregate metrics + recent items from multiple entities | `dashboard-pane.js` | ~100 |
| **List** | Filterable table or card grid of one entity type | `list-pane.js` | ~60 |
| **Detail** | Single entity with properties + related entities | `detail-pane.js` | ~80 |
| **Form** | Create or edit an entity | `form-pane.js` | ~70 |
| **Activity** | Chronological event stream | `activity-pane.js` | ~50 |

To classify an existing app's screens, look at each page and ask:
- Does it show multiple entity types? → **Dashboard**
- Does it show a list of one type? → **List**
- Does it show one item in depth? → **Detail**
- Does it have input fields? → **Form**
- Does it show a timeline? → **Activity**

## Step 3: Map Relationships

Draw which entities reference which. This drives cross-navigation.

```
Format: Entity → Entity (via fieldName)

Example:
  Issue → Project (projectId)
  Issue → Agent (assigneeId)
  Project → Goal (goalId)
  Agent → Agent (reportsTo)
  Activity → Agent (actorId)
```

Each relationship means:
- The parent's detail pane shows a list of children
- The child's detail pane shows a clickable link to the parent
- Clicking navigates via `nav('entityDetail', name, { entityId: id })`

## Step 4: Define Data Shape

Each entity is a flat JSON document with these required fields:

```js
{
  id: "unique-id",        // unique identifier
  // type is implicit from the collection/pane
  name: "Display Name",   // or title — what shows in lists
  status: "active",       // for badges and filtering
  createdAt: "ISO-date",
  updatedAt: "ISO-date",
  // ... domain-specific fields
  // ... relationship fields as foreignId references
}
```

### Mock data pattern

For prototyping, define all data inline in index.html:

```js
window.__data = {
  things: [
    { id: "t1", name: "First", status: "active", categoryId: "c1", ... },
    { id: "t2", name: "Second", status: "done", categoryId: "c1", ... }
  ],
  categories: [
    { id: "c1", name: "Main", ... }
  ],
  activity: [
    { id: "e1", action: "thing.created", entityType: "thing", actorId: "u1", createdAt: "..." }
  ]
}
```

## Step 5: Build Panes from Templates

### Shell — index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>My App</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>

<div id="app">
  <nav id="sidebar">
    <div class="sb-logo">App Name</div>
    <div class="sb-section">Overview</div>
    <div class="sb-item active" data-nav="dashboard">📊 Dashboard</div>
    <div class="sb-item" data-nav="activity">📡 Activity</div>
    <div class="sb-section">Data</div>
    <!-- One sb-item per entity type -->
    <div class="sb-item" data-nav="things">📋 Things <span class="sb-count" id="sb-things-count"></span></div>
    <div class="sb-item" data-nav="categories">📁 Categories</div>
  </nav>
  <div id="main">
    <div id="breadcrumbs"></div>
    <div id="content"></div>
  </div>
</div>

<script>
// Mock data — replace with API calls for persistence
window.__data = { /* ... entity arrays ... */ }

// Sidebar counts
var d = window.__data
document.getElementById('sb-things-count').textContent = d.things.length
</script>

<script type="module">
import { html, render } from './losos/html.js'

// Import panes
var panes = {}
panes.dashboard = (await import('./panes/dashboard-pane.js')).default
panes.things = (await import('./panes/things-pane.js')).default
panes.thingDetail = (await import('./panes/thing-detail-pane.js')).default
panes.categories = (await import('./panes/categories-pane.js')).default
panes.categoryDetail = (await import('./panes/category-detail-pane.js')).default
panes.activity = (await import('./panes/activity-pane.js')).default

// Navigation
var content = document.getElementById('content')
var breadcrumbsEl = document.getElementById('breadcrumbs')
var navStack = []

// List of sidebar (top-level) nav keys
var sidebarKeys = ['dashboard', 'activity', 'things', 'categories']

function navigate(paneKey, label, context) {
  var entry = { pane: paneKey, label: label, context: context || {} }
  if (sidebarKeys.indexOf(paneKey) !== -1) {
    navStack = [entry]
  } else {
    navStack.push(entry)
  }
  renderContent()
  renderBreadcrumbs()
  updateSidebar(navStack[0].pane)
}

function navigateBack(toIndex) {
  navStack = navStack.slice(0, toIndex + 1)
  renderContent()
  renderBreadcrumbs()
  updateSidebar(navStack[0].pane)
}

function renderContent() {
  var current = navStack[navStack.length - 1]
  content.innerHTML = ''
  var pane = panes[current.pane]
  if (pane && pane.render) pane.render(null, null, content, current.context)
}

function renderBreadcrumbs() {
  breadcrumbsEl.innerHTML = ''
  navStack.forEach(function(entry, idx) {
    if (idx > 0) {
      var sep = document.createElement('span')
      sep.className = 'bc-sep'
      sep.textContent = '/'
      breadcrumbsEl.appendChild(sep)
    }
    var span = document.createElement('span')
    span.textContent = entry.label
    if (idx === navStack.length - 1) {
      span.className = 'bc-current'
    } else {
      span.addEventListener('click', function() { navigateBack(idx) })
    }
    breadcrumbsEl.appendChild(span)
  })
}

function updateSidebar(activePane) {
  document.querySelectorAll('.sb-item').forEach(function(el) {
    el.classList.toggle('active', el.dataset.nav === activePane)
  })
}

window.__nav = navigate

// Sidebar clicks
document.querySelectorAll('.sb-item').forEach(function(el) {
  el.addEventListener('click', function() {
    navigate(el.dataset.nav, el.textContent.trim().replace(/\d+$/, '').trim())
  })
})

// Boot
navigate('dashboard', 'Dashboard')
</script>

</body>
</html>
```

### List Pane Template

```js
// panes/things-pane.js
import { html, render } from '../losos/html.js'

export default {
  label: 'Things',

  render(subject, lionStore, container, context) {
    var data = window.__data
    var nav = window.__nav
    var items = data.things || []
    var filter = 'all'

    function statusBadge(status) {
      var cls = { active: 'badge-green', done: 'badge-green',
                  paused: 'badge-yellow', error: 'badge-red' }
      return '<span class="badge ' + (cls[status] || 'badge-gray') + '">'
        + status.replace(/_/g, ' ') + '</span>'
    }

    function timeAgo(d) {
      if (!d) return '—'
      var s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
      if (s < 60) return s + 's ago'
      if (s < 3600) return Math.floor(s / 60) + 'm ago'
      if (s < 86400) return Math.floor(s / 3600) + 'h ago'
      return Math.floor(s / 86400) + 'd ago'
    }

    function renderList() {
      var filtered = filter === 'all' ? items
        : items.filter(function(i) { return i.status === filter })

      render(container, html`
        <h1>Things (${items.length})</h1>

        <div class="row mb" style="gap: 4px">
          ${['all', 'active', 'done'].map(function(f) {
            var count = f === 'all' ? items.length
              : items.filter(function(i) { return i.status === f }).length
            return html`<button onclick="${function() { filter = f; renderList() }}"
              style="${'padding:6px 14px;border-radius:6px;border:1px solid var(--border);font-size:12px;cursor:pointer;background:' + (filter === f ? 'var(--accent)' : 'var(--bg2)') + ';color:' + (filter === f ? '#fff' : 'var(--fg2)')}"
            >${f} (${count})</button>`
          })}
        </div>

        <div class="card">
          <table>
            <thead><tr><th>Name</th><th>Status</th><th>Updated</th></tr></thead>
            <tbody>
              ${filtered.map(function(item) {
                return html`<tr class="clickable" onclick="${function() {
                  nav('thingDetail', item.name, { thingId: item.id })
                }}">
                  <td>${item.name}</td>
                  <td innerHTML="${statusBadge(item.status)}"></td>
                  <td class="text-xs text-muted">${timeAgo(item.updatedAt)}</td>
                </tr>`
              })}
            </tbody>
          </table>
        </div>
      `)
    }

    renderList()
  }
}
```

### Detail Pane Template

```js
// panes/thing-detail-pane.js
import { html, render } from '../losos/html.js'

export default {
  label: 'Thing',

  render(subject, lionStore, container, context) {
    var data = window.__data
    var nav = window.__nav
    var item = data.things.find(function(t) { return t.id === context.thingId })
    if (!item) { container.innerHTML = '<div class="empty">Not found</div>'; return }

    // Resolve relationships
    var category = item.categoryId
      ? data.categories.find(function(c) { return c.id === item.categoryId })
      : null
    var children = data.otherThings.filter(function(o) {
      return o.parentId === item.id
    })

    function statusBadge(status) {
      var cls = { active: 'badge-green', done: 'badge-green',
                  paused: 'badge-yellow', error: 'badge-red' }
      return '<span class="badge ' + (cls[status] || 'badge-gray') + '">'
        + status.replace(/_/g, ' ') + '</span>'
    }

    function timeAgo(d) {
      if (!d) return '—'
      var s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
      if (s < 60) return s + 's ago'
      if (s < 3600) return Math.floor(s / 60) + 'm ago'
      if (s < 86400) return Math.floor(s / 3600) + 'h ago'
      return Math.floor(s / 86400) + 'd ago'
    }

    render(container, html`
      <div class="row" style="gap: 8px; margin-bottom: 8px">
        <span innerHTML="${statusBadge(item.status)}"></span>
      </div>

      <h1>${item.name}</h1>

      <div class="grid grid-2 mb">
        <div>
          <h2>Details</h2>
          <div class="card">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px">
              <div>
                <span class="text-muted text-xs">Category</span>
                <div>${category
                  ? html`<span class="clickable text-fg2" onclick="${function() {
                      nav('categoryDetail', category.name, { categoryId: category.id })
                    }}">${category.name}</span>`
                  : html`<span class="text-fg2">—</span>`}</div>
              </div>
              <div>
                <span class="text-muted text-xs">Created</span>
                <div class="text-fg2">${timeAgo(item.createdAt)}</div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2>Related (${children.length})</h2>
          <div class="card">
            ${children.length === 0
              ? html`<div class="text-muted text-sm" style="padding:8px 0">None</div>`
              : ''}
            ${children.map(function(c) {
              return html`<div class="row clickable" onclick="${function() {
                nav('otherDetail', c.name, { otherId: c.id })
              }}" style="padding:8px 0;border-bottom:1px solid var(--border)">
                <span class="text-sm">${c.name}</span>
                <span innerHTML="${statusBadge(c.status)}"></span>
              </div>`
            })}
          </div>
        </div>
      </div>
    `)
  }
}
```

### Dashboard Pane Template

```js
// panes/dashboard-pane.js
import { html, render } from '../losos/html.js'

export default {
  label: 'Dashboard',

  render(subject, lionStore, container, context) {
    var data = window.__data
    var nav = window.__nav

    // Compute metrics from all entity types
    var things = data.things || []
    var categories = data.categories || []
    var active = things.filter(function(t) { return t.status === 'active' }).length
    var recent = things.slice(0, 5)

    function statusBadge(status) {
      var cls = { active: 'badge-green', done: 'badge-green',
                  paused: 'badge-yellow', error: 'badge-red' }
      return '<span class="badge ' + (cls[status] || 'badge-gray') + '">'
        + status.replace(/_/g, ' ') + '</span>'
    }

    render(container, html`
      <h1>Dashboard</h1>

      <div class="grid grid-3 mb">
        <div class="card metric clickable" onclick="${function() { nav('things', 'Things') }}">
          <div class="metric-value">${things.length}</div>
          <div class="metric-label">Things</div>
        </div>
        <div class="card metric">
          <div class="metric-value">${active}</div>
          <div class="metric-label">Active</div>
        </div>
        <div class="card metric clickable" onclick="${function() { nav('categories', 'Categories') }}">
          <div class="metric-value">${categories.length}</div>
          <div class="metric-label">Categories</div>
        </div>
      </div>

      <h2>Recent Things</h2>
      <div class="card">
        <table>
          <thead><tr><th>Name</th><th>Status</th></tr></thead>
          <tbody>
            ${recent.map(function(t) {
              return html`<tr class="clickable" onclick="${function() {
                nav('thingDetail', t.name, { thingId: t.id })
              }}">
                <td>${t.name}</td>
                <td innerHTML="${statusBadge(t.status)}"></td>
              </tr>`
            })}
          </tbody>
        </table>
      </div>
    `)
  }
}
```

### Activity Pane Template

```js
// panes/activity-pane.js
import { html, render } from '../losos/html.js'

export default {
  label: 'Activity',

  render(subject, lionStore, container, context) {
    var data = window.__data
    var nav = window.__nav
    var events = data.activity || []

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
      if (action.includes('deleted') || action.includes('cancelled')) return '🚫'
      if (action.includes('updated')) return '✏️'
      return '•'
    }

    render(container, html`
      <h1>Activity (${events.length})</h1>
      <div class="card">
        ${events.length === 0
          ? html`<div class="text-muted" style="padding:24px;text-align:center">No activity</div>`
          : ''}
        ${events.map(function(e, idx) {
          return html`<div class="row-between" style="${'padding:10px 0;border-bottom:'
            + (idx < events.length - 1 ? '1px solid var(--border)' : 'none')}">
            <div class="row" style="gap:10px">
              <span>${actionIcon(e.action)}</span>
              <span class="text-sm">${e.action.replace(/\./g, ' → ')}</span>
              <span class="text-xs text-muted">${e.entityType}</span>
            </div>
            <span class="text-xs text-muted">${timeAgo(e.createdAt)}</span>
          </div>`
        })}
      </div>
    `)
  }
}
```

## Step 6: Polished Styles

Use one CSS file with CSS variables for theming. The polished version adds Inter font, subtle shadows, transitions, and proper badge dots.

### Design tokens

Adjust `--accent` for your brand. Switch to the dark block by uncommenting it.

```css
/* Add to <head>: */
/* <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"> */

:root {
  /* Light mode */
  --bg: #ffffff; --bg2: #fafafa; --bg3: #f4f4f5;
  --fg: #09090b; --fg2: #3f3f46; --fg3: #a1a1aa;
  --accent: #6366f1; --accent2: #4f46e5; --accent-soft: #eef2ff;
  --green: #16a34a; --green-soft: #f0fdf4;
  --yellow: #ca8a04; --yellow-soft: #fefce8;
  --red: #dc2626; --red-soft: #fef2f2;
  --blue: #2563eb; --blue-soft: #eff6ff;
  --border: #e4e4e7; --border2: #d4d4d8;
  --radius: 10px; --sidebar-w: 240px;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
  --shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05);
}

/* Dark mode alternative:
:root {
  --bg: #09090b; --bg2: #18181b; --bg3: #27272a;
  --fg: #fafafa; --fg2: #a1a1aa; --fg3: #71717a;
  --accent: #6366f1; --accent2: #818cf8; --accent-soft: #1e1b4b;
  --green: #22c55e; --green-soft: #052e16;
  --yellow: #eab308; --yellow-soft: #422006;
  --red: #ef4444; --red-soft: #450a0a;
  --blue: #3b82f6; --blue-soft: #172554;
  --border: #27272a; --border2: #3f3f46;
  --radius: 10px; --sidebar-w: 240px;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.2);
  --shadow: 0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2);
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.4), 0 2px 4px -2px rgba(0,0,0,0.3);
} */
```

### Base styles

```css
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
       background: var(--bg); color: var(--fg); line-height: 1.5;
       -webkit-font-smoothing: antialiased; }
```

### Layout

The topbar wraps a hamburger button (hidden on desktop) and the breadcrumb trail.
Breadcrumbs are rendered into `#breadcrumbs` — keep the hamburger in a sibling element
so pane rendering can't wipe it out.

```html
<div id="topbar">
  <button id="hamburger">☰</button>
  <div id="breadcrumbs"></div>
</div>
```

```css
#app { display: flex; min-height: 100vh; }
#sidebar { width: var(--sidebar-w); background: var(--bg); border-right: 1px solid var(--border);
           position: fixed; top: 0; left: 0; bottom: 0; overflow-y: auto;
           display: flex; flex-direction: column; }
#main { margin-left: var(--sidebar-w); flex: 1; min-width: 0; min-height: 100vh;
        background: var(--bg); }
#topbar { display: flex; align-items: center; border-bottom: 1px solid var(--border);
          background: var(--bg); position: sticky; top: 0; z-index: 10; }
#breadcrumbs { padding: 12px 32px; font-size: 13px; color: var(--fg3);
               display: flex; align-items: center; gap: 8px; flex: 1; }
#breadcrumbs span { cursor: pointer; color: var(--fg3); transition: color 0.15s; }
#breadcrumbs span:hover { color: var(--accent2); }
#breadcrumbs .bc-current { color: var(--fg); cursor: default; font-weight: 500; }
#breadcrumbs .bc-current:hover { color: var(--fg); }
#breadcrumbs .bc-sep { color: var(--border2); cursor: default; font-size: 11px; }
#content { padding: 32px; max-width: 1000px; }
```

### Sidebar

```css
.sb-logo { padding: 20px 24px; font-weight: 700; font-size: 16px; letter-spacing: -0.02em;
           border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px; }
.sb-logo-icon { width: 28px; height: 28px; background: var(--accent); border-radius: 8px;
                display: flex; align-items: center; justify-content: center;
                font-size: 14px; box-shadow: var(--shadow-sm); }
.sb-nav { padding: 12px 12px; flex: 1; }
.sb-section { padding: 16px 12px 6px; font-size: 10px; text-transform: uppercase;
              letter-spacing: 0.1em; color: var(--fg3); font-weight: 600; }
.sb-section:first-child { padding-top: 4px; }
.sb-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; font-size: 13px;
           color: var(--fg2); cursor: pointer; border-radius: 8px; transition: all 0.15s;
           font-weight: 450; margin-bottom: 2px; }
.sb-item:hover { background: var(--bg3); color: var(--fg); }
.sb-item.active { background: var(--accent-soft); color: var(--accent2); font-weight: 600; }
.sb-item-icon { width: 20px; text-align: center; font-size: 14px; }
.sb-count { margin-left: auto; font-size: 11px; font-weight: 500; color: var(--fg3);
            background: var(--bg3); padding: 1px 8px; border-radius: 9999px; }
.sb-item.active .sb-count { background: var(--accent)18; color: var(--accent2); }
.sb-footer { padding: 16px 24px; border-top: 1px solid var(--border); font-size: 11px;
             color: var(--fg3); }
```

### Components

```css
/* Cards */
.card { background: var(--bg); border: 1px solid var(--border); box-shadow: var(--shadow-sm);
        border-radius: var(--radius); padding: 18px; transition: box-shadow 0.2s, border-color 0.2s; }
.card:hover { box-shadow: var(--shadow); border-color: var(--border2); }
.card.clickable:hover { box-shadow: var(--shadow-md); border-color: var(--accent); }

/* Grids */
.grid { display: grid; gap: 16px; }
.grid-2 { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
.grid-3 { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }

/* Badges — include a colored dot via ::before */
.badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px;
         border-radius: 9999px; font-size: 11px; font-weight: 600; }
.badge::before { content: ''; width: 6px; height: 6px; border-radius: 50%;
                 background: currentColor; flex-shrink: 0; }
.badge-green { background: var(--green-soft); color: var(--green); }
.badge-yellow { background: var(--yellow-soft); color: var(--yellow); }
.badge-red { background: var(--red-soft); color: var(--red); }
.badge-blue { background: var(--blue-soft); color: var(--blue); }
.badge-gray { background: var(--bg3); color: var(--fg3); }
.badge-purple { background: var(--accent-soft); color: var(--accent2); }

/* Metrics */
.metric { text-align: center; padding: 24px 16px; }
.metric-value { font-size: 28px; font-weight: 700; letter-spacing: -0.02em; }
.metric-label { font-size: 11px; color: var(--fg3); margin-top: 6px;
                text-transform: uppercase; letter-spacing: 0.06em; font-weight: 500; }

/* Typography */
h1 { font-size: 24px; font-weight: 700; margin-bottom: 20px; letter-spacing: -0.025em; }
h2 { font-size: 14px; font-weight: 600; margin-bottom: 10px; color: var(--fg3);
     text-transform: uppercase; letter-spacing: 0.04em; }
.row { display: flex; align-items: center; gap: 8px; }
.row-between { display: flex; align-items: center; justify-content: space-between; }
.mb { margin-bottom: 28px; }
.text-sm { font-size: 13px; }
.text-xs { font-size: 11px; }
.text-muted { color: var(--fg3); }
.text-fg2 { color: var(--fg2); }

/* Tables */
table { width: 100%; border-collapse: separate; border-spacing: 0; }
th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em;
     color: var(--fg3); padding: 10px 14px; border-bottom: 1px solid var(--border);
     font-weight: 600; background: var(--bg2); }
th:first-child { border-radius: 8px 0 0 0; }
th:last-child { border-radius: 0 8px 0 0; }
td { padding: 11px 14px; border-bottom: 1px solid var(--border); font-size: 13px;
     transition: background 0.1s; }
tr:last-child td { border-bottom: none; }
tr.clickable:hover td { background: var(--accent-soft); }

/* Icons & misc */
.icon-circle { width: 34px; height: 34px; border-radius: 10px; display: flex;
               align-items: center; justify-content: center; font-size: 14px;
               background: var(--bg3); font-weight: 600; color: var(--fg2); }
.empty { text-align: center; padding: 48px; color: var(--fg3); font-size: 14px; }
.clickable { cursor: pointer; }

/* Buttons (for filter bars) */
.btn { padding: 7px 16px; border-radius: 8px; border: 1px solid var(--border); font-size: 12px;
       cursor: pointer; font-weight: 500; transition: all 0.15s; font-family: inherit; }
.btn:hover { border-color: var(--border2); box-shadow: var(--shadow-sm); }
.btn-active { background: var(--accent); color: #fff; border-color: var(--accent); }
.btn-active:hover { background: var(--accent2); }
.btn-default { background: var(--bg); color: var(--fg2); }
```

## Step 6b: Mobile & Responsive

On small screens, hide the sidebar and show a hamburger button that toggles it as an overlay.

### HTML structure

```html
<div id="app">
  <div id="sidebar-overlay" onclick="closeSidebar()"></div>
  <nav id="sidebar">
    <!-- sidebar content -->
  </nav>
  <div id="main">
    <div id="topbar">
      <button id="hamburger">☰</button>
      <div id="breadcrumbs"></div>
    </div>
    <div id="content"></div>
  </div>
</div>
```

### CSS

```css
#hamburger { display: none; background: none; border: none; font-size: 22px; cursor: pointer;
             padding: 8px 16px; color: var(--fg); line-height: 1; }
#sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.3);
                   z-index: 99; }

@media (max-width: 768px) {
  #sidebar { display: none; z-index: 100; box-shadow: var(--shadow-md); }
  #sidebar.open { display: flex; }
  #sidebar-overlay.open { display: block; }
  #main { margin-left: 0; }
  #content { padding: 16px; }
  #breadcrumbs { padding: 10px 16px; }
  #hamburger { display: block; }
  .grid-2, .grid-3 { grid-template-columns: 1fr; }
  .grid-3 { grid-template-columns: repeat(2, 1fr); }
}
```

### JavaScript

```js
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open')
  document.getElementById('sidebar-overlay').classList.remove('open')
}

document.getElementById('hamburger').addEventListener('click', function() {
  document.getElementById('sidebar').classList.toggle('open')
  document.getElementById('sidebar-overlay').classList.toggle('open')
})

// Close sidebar on nav click (mobile)
document.querySelectorAll('.sb-item').forEach(function(el) {
  el.addEventListener('click', function() {
    // ... navigate ...
    closeSidebar()
  })
})
```

### Key rules

- **Keep the hamburger outside `#breadcrumbs`** — breadcrumb rendering replaces innerHTML, so the hamburger must be a sibling in `#topbar`, not a child of `#breadcrumbs`
- **Overlay closes on click** — tapping outside the sidebar dismisses it
- **Nav clicks close sidebar** — after navigating, the overlay auto-closes
- **Grids collapse** — `grid-3` goes to 2 columns, `grid-2` goes to 1 column on mobile
- **768px breakpoint** — adjust if your sidebar is wider than 240px

## Step 7: Add Persistence (MongoDB)

Replace `window.__data` with API-backed data:

### API pattern

```js
// In index.html, replace inline data with:
var API = '/api'

async function loadData() {
  var [things, categories, activity] = await Promise.all([
    fetch(API + '/things').then(function(r) { return r.json() }),
    fetch(API + '/categories').then(function(r) { return r.json() }),
    fetch(API + '/activity').then(function(r) { return r.json() })
  ])
  window.__data = { things: things, categories: categories, activity: activity }
}

await loadData()
navigate('dashboard', 'Dashboard')
```

### Mutations

Add write operations in panes:

```js
// Create
async function createThing(fields) {
  var res = await fetch('/api/things', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields)
  })
  var created = await res.json()
  window.__data.things.push(created)
  renderList() // re-render current pane
}

// Update
async function updateThing(id, fields) {
  await fetch('/api/things/' + id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields)
  })
  var thing = window.__data.things.find(function(t) { return t.id === id })
  Object.assign(thing, fields)
  renderList()
}

// Delete
async function deleteThing(id) {
  await fetch('/api/things/' + id, { method: 'DELETE' })
  window.__data.things = window.__data.things.filter(function(t) { return t.id !== id })
  renderList()
}
```

### Express + Mongo API (minimal)

```js
import express from 'express'
import { MongoClient, ObjectId } from 'mongodb'

var app = express()
app.use(express.json())
app.use(express.static('public')) // serve the LOSOS UI

var db = (await MongoClient.connect('mongodb://localhost:27017')).db('myapp')

// Generic CRUD for any collection
function crud(name) {
  app.get('/api/' + name, async (req, res) => {
    res.json(await db.collection(name).find().sort({ updatedAt: -1 }).toArray())
  })
  app.get('/api/' + name + '/:id', async (req, res) => {
    res.json(await db.collection(name).findOne({ _id: new ObjectId(req.params.id) }))
  })
  app.post('/api/' + name, async (req, res) => {
    var doc = { ...req.body, createdAt: new Date(), updatedAt: new Date() }
    var result = await db.collection(name).insertOne(doc)
    res.json({ ...doc, id: result.insertedId })
  })
  app.put('/api/' + name + '/:id', async (req, res) => {
    await db.collection(name).updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { ...req.body, updatedAt: new Date() } }
    )
    res.json({ ok: true })
  })
  app.delete('/api/' + name + '/:id', async (req, res) => {
    await db.collection(name).deleteOne({ _id: new ObjectId(req.params.id) })
    res.json({ ok: true })
  })
}

// One line per entity type
crud('things')
crud('categories')
crud('activity')

app.listen(3000)
```

### Live sync (optional)

Add WebSocket push for multi-client updates:

```js
// Server: broadcast on any mutation
import { WebSocketServer } from 'ws'
var wss = new WebSocketServer({ server })
function broadcast(msg) {
  wss.clients.forEach(function(c) { c.send(JSON.stringify(msg)) })
}

// Client: reload data on push
var ws = new WebSocket('ws://' + location.host)
ws.onmessage = async function() {
  await loadData()
  renderContent() // re-render current pane with fresh data
}
```

## File Structure

```
my-app/
  losos/              ← framework (copy from losos.org/losos/)
    html.js
    store.js
    shell.js
    registry.js
  lion/
    index.js
  panes/              ← one file per view
    dashboard-pane.js
    things-pane.js         ← list
    thing-detail-pane.js   ← detail
    categories-pane.js     ← list
    category-detail-pane.js ← detail
    activity-pane.js
  style.css
  index.html           ← shell + data + navigation
  server.js            ← optional: Express + Mongo API
```

## Checklist for New Projects

1. [ ] List all entity types (nouns in the app)
2. [ ] Map relationships between entities
3. [ ] Create mock data with 3-5 items per entity
4. [ ] Copy losos/ and lion/ framework files
5. [ ] Copy style.css and index.html shell template
6. [ ] Create list pane per entity (from template)
7. [ ] Create detail pane per entity (from template)
8. [ ] Create dashboard pane (aggregate metrics)
9. [ ] Create activity pane (event stream)
10. [ ] Wire sidebar nav items and counts
11. [ ] Add cross-navigation (clickable relationships)
12. [ ] Test all navigation paths and breadcrumbs
13. [ ] Replace mock data with Mongo API (when ready)

## Links

- **LOSOS framework:** https://losos.org/
- **LOSOS SKILL.md:** https://losos.org/SKILL.md
- **Paperclip prototype:** https://melvin.me/public/paperclip/
