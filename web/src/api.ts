// BI 仪表盘 — 共享 API 层

function getHeader(headers: any, key: string): string {
  if (!headers) return ''
  return headers[key] || headers[key.toLowerCase()] || headers[key.toUpperCase()] || ''
}

export function getTeamUUID(): string {
  try {
    const env = (window as any).__ONES_MF_ENV__
    if (env?.request?.headers) {
      const h = getHeader(env.request.headers, 'Ones-Check-Id')
      if (h) return h
    }
    if (env?.teamUUID) return env.teamUUID
    if (env?.team_uuid) return env.team_uuid
    if (env?.contextStore?.teamInfo?.uuid) return env.contextStore.teamInfo.uuid
  } catch {}
  try {
    const store = (window as any).__ONES_STORE__
    const uuid = store?.getState?.()?.contextStore?.teamInfo?.uuid
    if (uuid) return uuid
  } catch {}
  {
    const urls: string[] = []
    try { urls.push(window.location.href) } catch {}
    try { urls.push(window.location.pathname) } catch {}
    try {
      for (let i = 0; i < document.scripts.length; i++) {
        urls.push(document.scripts[i].src || '')
      }
    } catch {}
    for (const value of urls) {
      if (!value) continue
      const m = value.match(/\/plugin\/([^/]+)\/([^/]+)\/([^/]+)\//)
      if (m) return m[2]
    }
  }
  try {
    const m = window.parent.location.hash.match(/\/team\/([A-Za-z0-9]+)/)
    if (m?.[1]) return m[1]
  } catch {}
  return ''
}

function getApiAppID(): string {
  try {
    const env = (window as any).__ONES_MF_ENV__ || {}
    if (env.pluginID) return env.pluginID
    if (env.appID) return env.appID
  } catch {}
  {
    const urls: string[] = []
    try { urls.push(window.location.href) } catch {}
    try { urls.push(window.location.pathname) } catch {}
    try {
      for (let i = 0; i < document.scripts.length; i++) {
        urls.push(document.scripts[i].src || '')
      }
    } catch {}
    for (const value of urls) {
      if (!value) continue
      const m = value.match(/\/plugin\/([^/]+)\/([^/]+)\/([^/]+)\//)
      if (m) return m[3]
    }
  }
  return 'bi_dash001'
}

export class BiApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'BiApiError'
    this.status = status
  }
}

function buildUrl(endpoint: string): string {
  const tu = getTeamUUID()
  if (!tu) throw new BiApiError('未获取到团队 UUID', 0)
  return `/project/api/project/team/${tu}${endpoint}`
}

export async function apiGet(endpoint: string): Promise<any> {
  const url = buildUrl(endpoint)
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Ones-Plugin-Id': getApiAppID() },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new BiApiError(`HTTP ${res.status} ${text.substring(0, 500)}`, res.status)
  }
  const json = await res.json()
  return json.body || json.data || json
}

export async function apiPost(endpoint: string, body: any): Promise<any> {
  const url = buildUrl(endpoint)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Ones-Plugin-Id': getApiAppID() },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new BiApiError(`HTTP ${res.status} ${text.substring(0, 500)}`, res.status)
  }
  const json = await res.json()
  return json.body || json.data || json
}

export async function apiDelete(endpoint: string): Promise<any> {
  const url = buildUrl(endpoint)
  const res = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Ones-Plugin-Id': getApiAppID() },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new BiApiError(`HTTP ${res.status} ${text.substring(0, 500)}`, res.status)
  }
  const json = await res.json()
  return json.body || json.data || json
}
