import { Logger } from '@ones-op/node-logger'
import { storage } from '@ones-op/sdk/node'
import type { PluginResponse } from '@ones-op/node-types'
import { FetchAsAdmin, OPFetch } from '@ones-op/fetch'

// ============================================================
// 实体引用
// ============================================================
const dashboardEntity = storage.entity('bi_dashboard')
const datasetEntity = storage.entity('bi_dataset')
const auditLog = storage.entity('bi_audit_log')

const DEFAULT_DATASET_UUID = 'default_issue_dataset'
const DEFAULT_ISSUE_FIELDS = [
  { key: 'uuid', label: '工作项UUID', type: 'text', dimension: false, metric: false },
  { key: 'title', label: '标题', type: 'text', dimension: true, metric: false },
  { key: 'issue_type', label: '工作项类型', type: 'text', dimension: true, metric: false },
  { key: 'status', label: '状态', type: 'text', dimension: true, metric: false },
  { key: 'assignee', label: '负责人', type: 'text', dimension: true, metric: false },
  { key: 'priority', label: '优先级', type: 'text', dimension: true, metric: false },
  { key: 'project_uuid', label: '项目', type: 'text', dimension: true, metric: false },
  { key: 'created_at', label: '创建时间', type: 'datetime', dimension: true, metric: false },
]

const FIELD_ALIASES: Record<string, string[]> = {
  uuid: ['uuid', 'key'],
  title: ['title', 'name', 'summary'],
  issue_type: ['issue_type', 'issue_type_name', 'issueType', 'type', 'type_name'],
  status: ['status', 'status_name', 'statusName', 'state'],
  assignee: ['assignee', 'assignee_name', 'assigneeName', 'assign', 'owner', 'owner_name'],
  priority: ['priority', 'priority_name', 'priorityName'],
  project_uuid: ['project_uuid', 'projectUUID', 'project', 'project_name', 'projectName'],
  created_at: ['created_at', 'create_time', 'createdTime', 'server_create_stamp'],
}

function getDefaultIssueDataset(teamUUID: string) {
  return {
    dataset_uuid: DEFAULT_DATASET_UUID,
    team_uuid: teamUUID,
    name: '默认工作项数据集',
    source_type: 'issue',
    owner_uuid: '',
    field_config_json: JSON.stringify(DEFAULT_ISSUE_FIELDS),
    base_filter_json: '{}',
    description: '系统默认工作项数据集，可用于工作项数量、状态、负责人等基础分析。',
    created_by: '',
    created_at: 0,
    updated_at: 0,
  }
}

async function getDatasetOrDefault(datasetUuid: string, teamUUID: string) {
  if (datasetUuid === DEFAULT_DATASET_UUID) return getDefaultIssueDataset(teamUUID)
  return (await datasetEntity.get(datasetUuid)) as any
}

function readField(row: any, key: string): any {
  if (!row) return ''
  const aliases = FIELD_ALIASES[key] || [key]
  for (const alias of aliases) {
    const value = row[alias]
    if (value !== undefined && value !== null && value !== '') {
      if (typeof value === 'object') return value.name || value.title || value.uuid || value.value || ''
      return value
    }
  }
  const nested = row[key]
  if (nested && typeof nested === 'object') return nested.name || nested.uuid || nested.value || ''
  return ''
}

function normalizeIssueRow(raw: any): any {
  const src = raw?.item || raw?.task || raw?.issue || raw || {}
  const row: any = {}
  for (const field of DEFAULT_ISSUE_FIELDS) row[field.key] = readField(src, field.key)
  row.uuid = row.uuid || src.uuid || src.key || ''
  row.title = row.title || src.name || src.summary || row.uuid || '-'
  return row
}

// ============================================================
// 工具函数
// ============================================================

async function qAll(e: any, filter?: (v: any) => boolean) {
  const allItems: any[] = []
  let cursor: string | null = null
  let safety = 0
  while (safety < 100) {
    safety++
    const q = e.query().limit(200)
    if (cursor) q.cursor(cursor)
    const result = await q.getMany()
    if (!result || !Array.isArray(result.data)) break
    for (const d of result.data) {
      allItems.push({ _key: d.key, ...(d.value || {}) })
    }
    const pi = result.page_info
    if (pi?.has_more && pi?.end_cursor) {
      cursor = pi.end_cursor
    } else {
      break
    }
  }
  return filter ? allItems.filter((d: any) => filter(d)) : allItems
}

function cleanForSet(obj: any): any {
  const out: any = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined) out[k] = v
  }
  return out
}

function makeUuid(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function getOperator(req: any): string {
  if (!req?.headers) return ''
  const h = req.headers
  return h['ones-user-id'] || h['Ones-User-Id'] || h['ONES-USER-ID'] || ''
}

function getParam(req: any, name: string): string {
  if (req.params?.[name]) return req.params?.[name]
  const rawUrl = req.url || req.path || ''
  const qIdx = rawUrl.indexOf('?')
  if (qIdx >= 0) {
    const qs = rawUrl.slice(qIdx + 1)
    for (const pair of qs.split('&')) {
      const eq = pair.indexOf('=')
      const k = eq >= 0 ? pair.slice(0, eq) : pair
      const v = eq >= 0 ? pair.slice(eq + 1) : ''
      if (decodeURIComponent(k) === name) return decodeURIComponent(v)
    }
  }
  const url = rawUrl.split('?')[0]
  const named = url.match(new RegExp(`/${name}/([^/]+)`))
  if (named) return named[1]
  if (name === 'teamUUID') {
    const tm = url.match(/\/team\/([^/]+)/)
    if (tm) return tm[1]
  }
  if (name === 'dashboardUUID') {
    const dm = url.match(/\/dashboard\/([^/]+)/)
    if (dm) return dm[1]
  }
  if (name === 'datasetUUID') {
    const dm = url.match(/\/dataset\/([^/]+)/)
    if (dm) return dm[1]
  }
  if (name === 'cardUUID') {
    const cm = url.match(/\/card\/([^/]+)/)
    if (cm) return cm[1]
  }
  return ''
}

async function writeAudit(
  teamUUID: string,
  objectType: string,
  objectUuid: string,
  action: string,
  operator: string,
  detail: any,
) {
  try {
    const k = `${teamUUID}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    await auditLog.set(
      k,
      cleanForSet({
        log_uuid: k,
        team_uuid: teamUUID,
        object_type: objectType,
        object_uuid: objectUuid,
        action,
        operator_uuid: operator,
        detail_json: typeof detail === 'string' ? detail : JSON.stringify(detail),
        created_at: Date.now(),
      }),
    )
  } catch (e) {
    Logger.error('[BI] writeAudit failed:', e)
  }
}

// ============================================================
// 生命周期
// ============================================================
export function Install() {
  Logger.info('[BI] Install')
}
export function Disable() {
  Logger.info('[BI] Disable')
}
export function UnInstall() {
  Logger.info('[BI] UnInstall')
}

export async function Enable() {
  Logger.info('[BI] Enable — v0.4.18 adds donut chart, configurable Top N display, and exact issue type counts')
}

export function Upgrade(oldVersion: any) {
  Logger.info('[BI] Upgrade from:', JSON.stringify(oldVersion))
}

// ============================================================
// 仪表盘 CRUD
// ============================================================

export async function listDashboards(req: any): Promise<PluginResponse> {
  const teamUUID = getParam(req, 'teamUUID')
  const operator = getOperator(req)
  const all = await qAll(dashboardEntity, (v: any) => v.team_uuid === teamUUID)
  const visible = all.filter(
    (d: any) => d.status !== 'deleted' && (d.owner_uuid === operator || d.status === 'active'),
  )
  visible.sort((a: any, b: any) => (b.updated_at || 0) - (a.updated_at || 0))
  return {
    body: {
      data: visible.map((d: any) => ({
        dashboard_uuid: d.dashboard_uuid,
        name: d.name,
        owner_uuid: d.owner_uuid,
        status: d.status,
        card_count: 0,
        created_at: d.created_at,
        updated_at: d.updated_at,
      })),
    },
  }
}

export async function getDashboard(req: any): Promise<PluginResponse> {
  const dashboardUuid = getParam(req, 'dashboardUUID')
  if (!dashboardUuid) return { body: { error: '缺少 dashboard_uuid' }, statusCode: 400 }
  const d = (await dashboardEntity.get(dashboardUuid)) as any
  if (!d) return { body: { error: '仪表盘不存在' }, statusCode: 404 }
  return {
    body: {
      data: {
        dashboard_uuid: d.dashboard_uuid,
        name: d.name,
        owner_uuid: d.owner_uuid,
        status: d.status,
        config_json: d.config_json || '{}',
        cards_json: d.cards_json || '[]',
        created_at: d.created_at,
        updated_at: d.updated_at,
      },
    },
  }
}

export async function createDashboard(req: any): Promise<PluginResponse> {
  const teamUUID = getParam(req, 'teamUUID')
  const operator = getOperator(req)
  const b = (req.body || {}) as any
  if (!b.name) return { body: { error: '缺少仪表盘名称' }, statusCode: 400 }
  const uuid = makeUuid()
  const now = Date.now()
  await dashboardEntity.set(
    uuid,
    cleanForSet({
      dashboard_uuid: uuid,
      team_uuid: teamUUID,
      name: b.name,
      owner_uuid: operator,
      status: 'active',
      config_json: JSON.stringify(b.config || { layout: 'grid' }),
      cards_json: '[]',
      created_by: operator,
      created_at: now,
      updated_at: now,
    }),
  )
  await writeAudit(teamUUID, 'dashboard', uuid, '创建仪表盘', operator, { name: b.name })
  return { body: { data: { dashboard_uuid: uuid, name: b.name } } }
}

export async function updateDashboard(req: any): Promise<PluginResponse> {
  const dashboardUuid = getParam(req, 'dashboardUUID')
  const operator = getOperator(req)
  const b = (req.body || {}) as any
  if (!dashboardUuid) return { body: { error: '缺少 dashboard_uuid' }, statusCode: 400 }
  const d = (await dashboardEntity.get(dashboardUuid)) as any
  if (!d) return { body: { error: '仪表盘不存在' }, statusCode: 404 }
  const next: any = { ...d, updated_at: Date.now() }
  if (b.name) next.name = b.name
  if (b.config) next.config_json = JSON.stringify(b.config)
  if (b.cards) next.cards_json = JSON.stringify(b.cards)
  if (b.status) next.status = b.status
  await dashboardEntity.set(dashboardUuid, cleanForSet(next))
  await writeAudit(d.team_uuid, 'dashboard', dashboardUuid, '更新仪表盘', operator, {
    name: next.name,
  })
  return { body: { data: { ok: true } } }
}

export async function deleteDashboard(req: any): Promise<PluginResponse> {
  const dashboardUuid = getParam(req, 'dashboardUUID')
  const operator = getOperator(req)
  if (!dashboardUuid) return { body: { error: '缺少 dashboard_uuid' }, statusCode: 400 }
  const d = (await dashboardEntity.get(dashboardUuid)) as any
  if (!d) return { body: { error: '仪表盘不存在' }, statusCode: 404 }
  if (d.owner_uuid !== operator) return { body: { error: '仅所有者可删除' }, statusCode: 403 }
  await dashboardEntity.delete(dashboardUuid)
  await writeAudit(d.team_uuid, 'dashboard', dashboardUuid, '删除仪表盘', operator, {
    name: d.name,
  })
  return { body: { data: { ok: true } } }
}

// ============================================================
// 卡片管理（嵌入仪表盘 cards_json）
// ============================================================

export async function createCard(req: any): Promise<PluginResponse> {
  const dashboardUuid = getParam(req, 'dashboardUUID')
  const operator = getOperator(req)
  const b = (req.body || {}) as any
  if (!dashboardUuid) return { body: { error: '缺少 dashboard_uuid' }, statusCode: 400 }
  if (!b.dataset_uuid) return { body: { error: '缺少 dataset_uuid' }, statusCode: 400 }
  const d = (await dashboardEntity.get(dashboardUuid)) as any
  if (!d) return { body: { error: '仪表盘不存在' }, statusCode: 404 }
  const ds = await getDatasetOrDefault(b.dataset_uuid, d.team_uuid)
  if (!ds) return { body: { error: '数据集不存在' }, statusCode: 404 }
  const cards = JSON.parse(d.cards_json || '[]')
  const cardUuid = makeUuid()
  const newCard = {
    card_uuid: cardUuid,
    title: b.title || '新卡片',
    chart_type: b.chart_type || 'number',
    dataset_uuid: b.dataset_uuid || '',
    query_json: JSON.stringify(b.query || {}),
    style_json: JSON.stringify(b.style || {}),
    layout: b.layout || { x: 0, y: 0, w: 4, h: 3 },
  }
  cards.push(newCard)
  await dashboardEntity.set(
    dashboardUuid,
    cleanForSet({ ...d, cards_json: JSON.stringify(cards), updated_at: Date.now() }),
  )
  await writeAudit(d.team_uuid, 'card', cardUuid, '创建卡片', operator, { title: newCard.title })
  return { body: { data: newCard } }
}

export async function updateCard(req: any): Promise<PluginResponse> {
  const dashboardUuid = getParam(req, 'dashboardUUID')
  const cardUuid = getParam(req, 'cardUUID')
  const operator = getOperator(req)
  const b = (req.body || {}) as any
  const d = (await dashboardEntity.get(dashboardUuid)) as any
  if (!d) return { body: { error: '仪表盘不存在' }, statusCode: 404 }
  const cards = JSON.parse(d.cards_json || '[]')
  const idx = cards.findIndex((c: any) => c.card_uuid === cardUuid)
  if (idx === -1) return { body: { error: '卡片不存在' }, statusCode: 404 }
  if (b.title) cards[idx].title = b.title
  if (b.chart_type) cards[idx].chart_type = b.chart_type
  if (b.dataset_uuid) cards[idx].dataset_uuid = b.dataset_uuid
  if (b.query) cards[idx].query_json = JSON.stringify(b.query)
  if (b.style) cards[idx].style_json = JSON.stringify(b.style)
  if (b.layout) cards[idx].layout = b.layout
  await dashboardEntity.set(
    dashboardUuid,
    cleanForSet({ ...d, cards_json: JSON.stringify(cards), updated_at: Date.now() }),
  )
  return { body: { data: cards[idx] } }
}

export async function deleteCard(req: any): Promise<PluginResponse> {
  const dashboardUuid = getParam(req, 'dashboardUUID')
  const cardUuid = getParam(req, 'cardUUID')
  const operator = getOperator(req)
  const d = (await dashboardEntity.get(dashboardUuid)) as any
  if (!d) return { body: { error: '仪表盘不存在' }, statusCode: 404 }
  const cards = JSON.parse(d.cards_json || '[]')
  const filtered = cards.filter((c: any) => c.card_uuid !== cardUuid)
  await dashboardEntity.set(
    dashboardUuid,
    cleanForSet({ ...d, cards_json: JSON.stringify(filtered), updated_at: Date.now() }),
  )
  return { body: { data: { ok: true } } }
}

// ============================================================
// 数据集 CRUD
// ============================================================

export async function listDatasets(req: any): Promise<PluginResponse> {
  const teamUUID = getParam(req, 'teamUUID')
  const all = await qAll(
    datasetEntity,
    (v: any) => v.team_uuid === teamUUID || v.dataset_uuid === DEFAULT_DATASET_UUID,
  )
  const hasDefault = all.some((d: any) => d.dataset_uuid === DEFAULT_DATASET_UUID)
  const rows = hasDefault ? all : [getDefaultIssueDataset(teamUUID), ...all]
  return {
    body: {
      data: rows.map((d: any) => ({
        dataset_uuid: d.dataset_uuid,
        name: d.name,
        source_type: d.source_type,
        description: d.description,
        field_config_json: d.field_config_json || '[]',
        created_at: d.created_at,
      })),
    },
  }
}

export async function getDataset(req: any): Promise<PluginResponse> {
  const teamUUID = getParam(req, 'teamUUID')
  const datasetUuid = getParam(req, 'datasetUUID')
  const d = await getDatasetOrDefault(datasetUuid, teamUUID)
  if (!d) return { body: { error: '数据集不存在' }, statusCode: 404 }
  return {
    body: {
      data: {
        dataset_uuid: d.dataset_uuid,
        name: d.name,
        source_type: d.source_type,
        field_config_json: d.field_config_json || '[]',
        base_filter_json: d.base_filter_json || '{}',
        description: d.description,
      },
    },
  }
}

export async function createDataset(req: any): Promise<PluginResponse> {
  const teamUUID = getParam(req, 'teamUUID')
  const operator = getOperator(req)
  const b = (req.body || {}) as any
  if (!b.name) return { body: { error: '缺少数据集名称' }, statusCode: 400 }
  const uuid = makeUuid()
  const now = Date.now()

  const fields = b.fields && b.fields.length > 0 ? b.fields : DEFAULT_ISSUE_FIELDS

  await datasetEntity.set(
    uuid,
    cleanForSet({
      dataset_uuid: uuid,
      team_uuid: teamUUID,
      name: b.name,
      source_type: b.source_type || 'issue',
      owner_uuid: operator,
      field_config_json: JSON.stringify(fields),
      base_filter_json: JSON.stringify(b.base_filter || {}),
      description: b.description || '',
      created_by: operator,
      created_at: now,
      updated_at: now,
    }),
  )
  return { body: { data: { dataset_uuid: uuid } } }
}

export async function updateDataset(req: any): Promise<PluginResponse> {
  const datasetUuid = getParam(req, 'datasetUUID')
  const operator = getOperator(req)
  const b = (req.body || {}) as any
  const d = (await datasetEntity.get(datasetUuid)) as any
  if (!d) return { body: { error: '数据集不存在' }, statusCode: 404 }
  const next: any = { ...d, updated_at: Date.now() }
  if (b.name) next.name = b.name
  if (b.fields) next.field_config_json = JSON.stringify(b.fields)
  if (b.base_filter) next.base_filter_json = JSON.stringify(b.base_filter)
  if (b.description !== undefined) next.description = b.description
  await datasetEntity.set(datasetUuid, cleanForSet(next))
  return { body: { data: { ok: true } } }
}

export async function deleteDataset(req: any): Promise<PluginResponse> {
  const datasetUuid = getParam(req, 'datasetUUID')
  if (datasetUuid === DEFAULT_DATASET_UUID)
    return { body: { error: '默认数据集不可删除' }, statusCode: 403 }
  await datasetEntity.delete(datasetUuid)
  return { body: { data: { ok: true } } }
}

// ============================================================
// 查询引擎 — ONESQL Provider
// ============================================================

export async function biQuery(req: any): Promise<PluginResponse> {
  const teamUUID = getParam(req, 'teamUUID')
  const b = (req.body || {}) as any
  const { dataset_uuid, chart_type, metrics, dimensions, filters, sort, limit } = b
  if (!dataset_uuid) return { body: { error: '缺少 dataset_uuid' }, statusCode: 400 }

  const ds = await getDatasetOrDefault(dataset_uuid, teamUUID)
  if (!ds) return { body: { error: '数据集不存在' }, statusCode: 404 }

  try {
    // 构建 ONESQL 查询
    const queryResult = await executeOnesqlQuery(teamUUID, {
      source_type: ds.source_type || 'issue',
      chart_type,
      metrics: metrics || [],
      dimensions: dimensions || [],
      filters: filters || [],
      sort: sort || [],
      limit: limit || 1000,
    })

    return {
      body: {
        data: {
          rows: queryResult.rows,
          total: queryResult.total,
          query_time_ms: queryResult.query_time_ms,
          chart_type,
          dimensions,
          metrics,
          debug: queryResult.debug,
        },
      },
    }
  } catch (e: any) {
    Logger.error('[BI] biQuery error:', e?.response?.data || e?.message || e)
    return {
      body: {
        error: 'ONESQL 查询失败',
        message: e?.message || String(e),
        detail: e?.response?.data || null,
      },
      statusCode: 500,
    }
  }
}

// ============================================================
// ONESQL 统一执行器 — 使用 FetchAsAdmin（自动管理 OAuth token）
// ============================================================
async function executeOnesql(
  teamUUID: string,
  query: string,
  variables: unknown[] = [],
): Promise<{ rows: any[]; debug?: any }> {
  Logger.info(`[BI] ONESQL: ${query}`)
  const res = (await FetchAsAdmin('/openapi/v3alpha/onesql/query', {
    method: 'POST',
    params: { teamID: teamUUID },
    data: { query, variables },
  })) as any

  // 安全提取返回结构（避免 circular reference）
  const resData = res?.data
  const result = resData?.result
  const innerData = resData?.data

  const debug = {
    provider: 'onesql',
    httpStatus: res?.status,
    onesqlResult: result,
    responseKeys: resData ? Object.keys(resData) : null,
    error:
      resData?.error_msg ||
      resData?.error ||
      resData?.message ||
      resData?.reason ||
      resData?.error_code ||
      null,
    errorCode: resData?.error_code || null,
    errorData: resData?.error_data ? JSON.stringify(resData.error_data).slice(0, 500) : null,
    innerKeys: innerData ? Object.keys(innerData) : null,
    innerDataPreview: null as any,
  }

  // 安全序列化 innerData 预览
  try {
    if (innerData) {
      const safe: any = {}
      for (const k of Object.keys(innerData)) {
        const v = (innerData as any)[k]
        if (Array.isArray(v)) {
          safe[k] =
            v.length > 0
              ? `array[${v.length}], first=${JSON.stringify(v[0])?.substring(0, 300)}`
              : '[]'
        } else {
          safe[k] = JSON.stringify(v)?.substring(0, 300)
        }
      }
      debug.innerDataPreview = safe
    }
  } catch {
    /* ignore */
  }

  Logger.info(`[BI] ONESQL debug: ${JSON.stringify(debug)}`)

  // 提取行数据 — 兼容多种返回格式
  let rawRows: any[] = []
  if (innerData) {
    if (Array.isArray(innerData.data)) {
      rawRows = innerData.data
    } else if (Array.isArray(innerData)) {
      rawRows = innerData
    } else if (innerData.aggregation) {
      rawRows = [innerData.aggregation]
    }
  }

  // { type: "item", item: {...} } → 提取 item
  if (rawRows.length > 0 && rawRows[0]?.type === 'item') {
    return {
      rows: rawRows.filter((r: any) => r.type === 'item').map((r: any) => r.item || {}),
      debug,
    }
  }
  // { type: "aggregate", aggregate: {...} } / { type: "aggregation", aggregation: {...} }
  if (rawRows.length > 0 && (rawRows[0]?.type === 'aggregate' || rawRows[0]?.type === 'aggregation')) {
    return { rows: rawRows.map((r: any) => r.aggregate || r.aggregation || {}), debug }
  }
  return { rows: Array.isArray(rawRows) ? rawRows : [], debug }
}

// ONESQL 查询执行器（BI 卡片用）
async function executeOnesqlQuery(
  teamUUID: string,
  params: any,
): Promise<{ rows: any[]; total: number; query_time_ms: number; debug?: any }> {
  const startTime = Date.now()

  // 构建 ONESQL 语句
  const metricExprs = (params.metrics || []).map((m: any) => {
    const agg = m.aggregation || 'count'
    const field = m.field_key || '*'
    if (agg === 'count') return `count(*) as ${m.name || 'count'}`
    if (agg === 'distinct_count') return `count(distinct ${field}) as ${m.name || 'distinct_count'}`
    if (agg === 'sum') return `sum(${field}) as ${m.name || 'sum'}`
    if (agg === 'avg') return `avg(${field}) as ${m.name || 'avg'}`
    if (agg === 'max') return `max(${field}) as ${m.name || 'max'}`
    if (agg === 'min') return `min(${field}) as ${m.name || 'min'}`
    return `count(*) as ${m.name || 'count'}`
  })

  const dimExprs = (params.dimensions || []).map(
    (d: any) => `${d.field_key} as ${d.name || d.field_key}`,
  )
  const selectParts = [...dimExprs, ...metricExprs]
  const groupByParts =
    dimExprs.length > 0 ? `GROUP BY ${dimExprs.map((_, i) => i + 1).join(', ')}` : ''

  const whereParts: string[] = []
  for (const f of params.filters || []) {
    if (f.operator === 'eq') whereParts.push(`${f.field_key} = '${f.value}'`)
    else if (f.operator === 'in')
      whereParts.push(
        `${f.field_key} IN (${(f.value || []).map((v: string) => `'${v}'`).join(',')})`,
      )
    else if (f.operator === 'like') whereParts.push(`${f.field_key} LIKE '%${f.value}%'`)
    else if (f.operator === 'gte') whereParts.push(`${f.field_key} >= '${f.value}'`)
    else if (f.operator === 'lte') whereParts.push(`${f.field_key} <= '${f.value}'`)
  }
  const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : ''

  const sortParts = (params.sort || []).map((s: any) => `${s.field_key} ${s.order || 'desc'}`)
  const orderClause = sortParts.length > 0 ? `ORDER BY ${sortParts.join(', ')}` : ''

  const size = Math.min(params.limit || 1000, 10000)
  const limitClause = `LIMIT 0, ${size}`

  const onesql = `SELECT ${selectParts.join(', ')} FROM issue ${whereClause} ${groupByParts} ${orderClause} ${limitClause}`

  let onesqlResult: { rows: any[]; debug?: any }
  try {
    onesqlResult = await executeOnesql(teamUUID, onesql)
  } catch (e: any) {
    throw new Error(
      `ONESQL 全量查询失败: ${e?.message || String(e)}${
        e?.response?.data ? `; detail=${JSON.stringify(e.response.data).slice(0, 500)}` : ''
      }`,
    )
  }
  if (onesqlResult.debug?.onesqlResult === 'FAIL' && params.source_type === 'issue') {
    throw new Error(
      `ONESQL 全量查询返回 FAIL: ${
        onesqlResult.debug?.error ||
        onesqlResult.debug?.innerDataPreview ||
        JSON.stringify(onesqlResult.debug).slice(0, 500)
      }`,
    )
  }

  return {
    rows: onesqlResult.rows,
    total: onesqlResult.rows.length,
    query_time_ms: Date.now() - startTime,
    debug: onesqlResult.debug,
  }
}

async function fetchIssueRowsByGraphQL(teamUUID: string, limit: number): Promise<any[]> {
  const gqlRes = (await OPFetch(`/project/api/project/team/${teamUUID}/items/graphql?t=bi_issue_fallback`, {
    method: 'POST',
    teamUUID,
    headers: { 'Content-Type': 'application/json' },
    data: {
      query: `{
        tasks(limit: ${Math.min(Math.max(limit, 1), 1000)}) {
          uuid
          name
          title
          project { uuid name key identifier }
          issueType { uuid name }
          status { uuid name }
          assign { uuid name }
          owner { uuid name }
        }
      }`,
      variables: {},
    },
  })) as any
  const raw = gqlRes?.data?.tasks || gqlRes?.data?.data?.tasks || []
  return Array.isArray(raw) ? raw.map(normalizeIssueRow) : []
}

function filterRows(rows: any[], filters: any[]): any[] {
  if (!filters?.length) return rows
  return rows.filter((row) =>
    filters.every((f: any) => {
      const actual = String(readField(row, f.field_key) ?? '')
      if (f.operator === 'eq') return actual === String(f.value ?? '')
      if (f.operator === 'in') return (f.value || []).map(String).includes(actual)
      if (f.operator === 'like') return actual.includes(String(f.value ?? ''))
      if (f.operator === 'gte') return actual >= String(f.value ?? '')
      if (f.operator === 'lte') return actual <= String(f.value ?? '')
      return true
    }),
  )
}

function aggregateIssueRows(rows: any[], params: any): any[] {
  const chartType = params.chart_type || 'number'
  const dimensions = chartType === 'number' ? [] : params.dimensions || []
  const metrics = params.metrics?.length ? params.metrics : [{ name: 'count', aggregation: 'count' }]
  const metricName = metrics[0]?.name || 'count'
  const limit = Math.min(params.limit || 100, 1000)

  if (chartType === 'table') {
    return rows.slice(0, limit)
  }

  if (dimensions.length === 0) {
    return [{ [metricName]: rows.length }]
  }

  const dim = dimensions[0]
  const dimKey = dim.field_key || dim.name
  const outKey = dim.name || dimKey
  const grouped: Record<string, number> = {}
  for (const row of rows) {
    const key = String(readField(row, dimKey) || '未设置')
    grouped[key] = (grouped[key] || 0) + 1
  }

  let result = Object.entries(grouped).map(([key, count]) => ({
    [outKey]: key,
    [metricName]: count,
  }))
  result = result.sort((a, b) => Number(b[metricName]) - Number(a[metricName]))
  return result.slice(0, limit)
}

async function executeIssueFallbackQuery(
  teamUUID: string,
  params: any,
  onesqlDebug: any,
): Promise<{ rows: any[]; debug: any }> {
  const sourceRows = await fetchIssueRowsByGraphQL(teamUUID, Math.min(params.limit || 100, 1000))
  const filteredRows = filterRows(sourceRows, params.filters || [])
  const rows = aggregateIssueRows(filteredRows, params)
  return {
    rows,
    debug: {
      provider: 'graphql_tasks_fallback',
      source_rows: sourceRows.length,
      filtered_rows: filteredRows.length,
      onesql: onesqlDebug,
    },
  }
}

async function executeIssueFallbackQuerySafely(
  teamUUID: string,
  params: any,
  onesqlDebug: any,
): Promise<{ rows: any[]; debug: any }> {
  try {
    return await executeIssueFallbackQuery(teamUUID, params, onesqlDebug)
  } catch (e: any) {
    Logger.info('[BI] backend GraphQL fallback failed:', e?.response?.data || e?.message || e)
    return {
      rows: [],
      debug: {
        provider: 'graphql_tasks_fallback_failed',
        source_rows: 0,
        filtered_rows: 0,
        error: e?.message || String(e),
        detail: e?.response?.data || null,
        onesql: onesqlDebug,
      },
    }
  }
}

// ============================================================
// 下钻明细
// ============================================================

export async function biDetail(req: any): Promise<PluginResponse> {
  const teamUUID = getParam(req, 'teamUUID')
  const b = (req.body || {}) as any
  const { dataset_uuid, filters, page, page_size } = b
  if (!dataset_uuid) return { body: { error: '缺少 dataset_uuid' }, statusCode: 400 }

  const ds = await getDatasetOrDefault(dataset_uuid, teamUUID)
  if (!ds) return { body: { error: '数据集不存在' }, statusCode: 404 }

  const pageNum = page || 1
  const pageSize = Math.min(page_size || 50, 200)
  const offset = (pageNum - 1) * pageSize

  // 构建明细查询
  const whereParts: string[] = []
  for (const f of filters || []) {
    if (f.operator === 'eq') whereParts.push(`${f.field_key} = '${f.value}'`)
    else if (f.operator === 'in')
      whereParts.push(
        `${f.field_key} IN (${(f.value || []).map((v: string) => `'${v}'`).join(',')})`,
      )
    else if (f.operator === 'like') whereParts.push(`${f.field_key} LIKE '%${f.value}%'`)
  }
  const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : ''

  const onesql = `SELECT uuid, title, issue_type, status, assignee, project_uuid, priority, created_at FROM issue ${whereClause} LIMIT ${offset}, ${pageSize}`
  Logger.info(`[BI] detail ONESQL: ${onesql}`)

  try {
    const onesqlResult = await executeOnesql(teamUUID, onesql)
    return {
      body: {
        data: {
          rows: onesqlResult.rows,
          page: pageNum,
          page_size: pageSize,
          total: onesqlResult.rows.length,
        },
      },
    }
  } catch (e: any) {
    Logger.error('[BI] detail ONESQL failed:', e?.message || e)
    return {
      body: {
        error: `ONESQL 查询失败: ${e?.message || String(e)}`,
        detail: e?.response?.data || undefined,
      },
      statusCode: 500,
    }
  }
}

// ============================================================
// 元数据
// ============================================================

export async function getMetadata(req: any): Promise<PluginResponse> {
  const teamUUID = getParam(req, 'teamUUID')

  // 返回可用字段定义
  return {
    body: {
      data: {
        fields: [
          { key: 'title', label: '标题', type: 'text', dimension: false, metric: false },
          { key: 'issue_type', label: '工作项类型', type: 'text', dimension: true, metric: false },
          { key: 'status', label: '状态', type: 'text', dimension: true, metric: false },
          { key: 'assignee', label: '负责人', type: 'user', dimension: true, metric: false },
          { key: 'project', label: '所属项目', type: 'text', dimension: true, metric: false },
          { key: 'sprint', label: '所属迭代', type: 'text', dimension: true, metric: false },
          { key: 'priority', label: '优先级', type: 'text', dimension: true, metric: false },
          { key: 'created_at', label: '创建时间', type: 'date', dimension: true, metric: false },
          {
            key: 'issue_count',
            label: '工作项计数',
            type: 'number',
            dimension: false,
            metric: true,
            aggregation: 'count',
          },
        ],
      },
    },
  }
}

// ============================================================
// 当前用户
// ============================================================

export async function getCurrentUser(req: any): Promise<PluginResponse> {
  const operator = getOperator(req)
  return { body: { data: { uuid: operator, name: '' } } }
}
