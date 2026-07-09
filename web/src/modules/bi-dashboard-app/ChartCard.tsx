import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { apiPost, getTeamUUID } from '../../api'

const S: any = {
  card: {
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #dce3ee',
    boxShadow: '0 8px 22px rgba(15, 23, 42, 0.10), 0 1px 2px rgba(15, 23, 42, 0.06)',
    overflow: 'hidden',
    alignSelf: 'start',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box' as any,
  },
  cardHeader: {
    padding: '12px 16px',
    borderBottom: '1px solid #f0f0f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderDraggable: { cursor: 'move', userSelect: 'none' as any },
  cardTitle: { fontSize: 14, fontWeight: 600 },
  headerActions: { display: 'flex', alignItems: 'center', gap: 8 },
  actionBtn: {
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: '#1677ff',
    fontSize: 12,
    padding: 0,
  },
  cardBody: { padding: 16, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' },
  chartViewport: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto' as any,
    overflowX: 'hidden' as any,
    paddingRight: 4,
  },
  chartViewportCompact: { flex: 1, minHeight: 0, overflow: 'hidden' },
  loading: { textAlign: 'center', padding: 40, color: '#999', fontSize: 13 },
  error: { textAlign: 'center', padding: 40, color: '#ff4d4f', fontSize: 13 },
  retryBtn: {
    marginLeft: 8,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: '#1677ff',
    fontSize: 13,
    padding: 0,
  },
  empty: { textAlign: 'center', padding: 40, color: '#ccc', fontSize: 13 },
  numberValue: { fontSize: 36, fontWeight: 700, color: '#1677ff', textAlign: 'center' as any },
  numberLabel: { fontSize: 12, color: '#999', textAlign: 'center' as any, marginTop: 4 },
  barRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    fontSize: 13,
    minHeight: 20,
  },
  barLabel: {
    width: 100,
    textAlign: 'right' as any,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  barTrack: { flex: 1, height: 20, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', background: '#1677ff', borderRadius: 4, transition: 'width 0.3s' },
  barValue: { width: 48, textAlign: 'right' as any, fontWeight: 600, flexShrink: 0 },
  pieWrap: {
    display: 'flex',
    gap: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap' as any,
  },
  pie: { width: 150, height: 150, borderRadius: '50%', flexShrink: 0 },
  donut: { width: 150, height: 150, borderRadius: '50%', flexShrink: 0 },
  donutInner: { width: 78, height: 78, borderRadius: '50%', background: '#fff' },
  donutCenter: {
    position: 'absolute' as any,
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none' as any,
  },
  legend: { minWidth: 160, maxWidth: 280 },
  legendRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 13 },
  legendDot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  legendLabel: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  legendValue: { fontWeight: 600, color: '#333' },
  table: { width: '100%', borderCollapse: 'collapse' as any, fontSize: 13 },
  th: {
    padding: '6px 8px',
    borderBottom: '2px solid #e8e8e8',
    textAlign: 'left' as any,
    fontSize: 12,
    color: '#666',
    fontWeight: 600,
  },
  td: { padding: '6px 8px', borderBottom: '1px solid #f0f0f0' },
  deleteBtn: {
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: '#ff4d4f',
    fontSize: 12,
    padding: 0,
  },
}

const CHART_COLORS = [
  '#1677ff',
  '#52c41a',
  '#faad14',
  '#eb2f96',
  '#722ed1',
  '#13c2c2',
  '#fa541c',
  '#2f54eb',
]

const DEFAULT_DATASET_UUID = 'default_issue_dataset'

interface Props {
  card: any
  dashboardUuid: string
  editable?: boolean
  snapshotData?: any
  snapshotStatus?: string
  snapshotError?: string
  onDelete: () => void
  onCopy: () => void
  onDragStart?: (e: React.MouseEvent) => void
}

const ONESQL_FIELD_MAP: Record<string, string> = {
  uuid: 'uuid',
  title: 'field001',
  issue_type: 'field007',
  status: 'field005',
  assignee: 'field004',
  priority: 'field012',
  project_uuid: 'field006',
  sprint: 'field011',
  created_at: 'field009',
}

const FIELD_LABEL_MAP: Record<string, string> = {
  uuid: '工作项UUID',
  title: '标题',
  issue_type: '工作项类型',
  status: '状态',
  assignee: '负责人',
  priority: '优先级',
  project_uuid: '项目',
  sprint: '所属迭代',
  created_at: '创建时间',
  count: '计数',
  total_count: '计数',
}

const LABEL_HYDRATION_DIMENSIONS = new Set([
  'issue_type',
  'status',
  'assignee',
  'priority',
  'project_uuid',
  'sprint',
])
const LABEL_HYDRATION_LOOKUP_LIMIT = 50
const dimensionLabelCache = new Map<string, Map<string, string>>()
const ISSUE_TYPE_CACHE_TTL_MS = 5 * 60 * 1000
const issueTypeCountsCache = new Map<string, { expiresAt: number; data: any }>()
let issueTypesCache: { expiresAt: number; data: any[] } | null = null

const DEFAULT_WORKITEM_HIERARCHY = {
  lock_query: '',
  perspective: false,
  flat: false,
  path: { upstream_field: 'field014', downstream_field: 'field114' },
  config: {
    field: 'field007',
    tree: {
      uuids: ['__ALL__'],
      children: [
        {
          uuids: ['__ALL__'],
          children: [
            {
              uuids: ['__ALL__'],
              children: [
                {
                  uuids: ['__ALL__'],
                  children: [
                    {
                      uuids: ['__ALL__'],
                      children: [
                        {
                          uuids: ['__ALL__'],
                          children: [
                            {
                              uuids: ['__ALL__'],
                              children: [
                                {
                                  uuids: ['__ALL__'],
                                  children: [
                                    {
                                      uuids: ['__ALL__'],
                                      children: [{ uuids: ['__ALL__'] }],
                                    },
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
}

function escapeOnesqlValue(value: any): string {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
}

function getOnesqlField(fieldKey: string): string {
  const mapped = ONESQL_FIELD_MAP[fieldKey]
  if (!mapped) throw new Error(`暂不支持字段 ${fieldKey} 的全量查询`)
  return mapped
}

function buildWhereClause(filters: any[] = []): string {
  const parts: string[] = []
  for (const f of filters) {
    const field = getOnesqlField(f.field_key)
    if (f.operator === 'eq') parts.push(`${field} = '${escapeOnesqlValue(f.value)}'`)
    else if (f.operator === 'neq') parts.push(`${field} != '${escapeOnesqlValue(f.value)}'`)
    else if (f.operator === 'in') {
      const values = Array.isArray(f.value) ? f.value : []
      parts.push(`${field} IN (${values.map((v: any) => `'${escapeOnesqlValue(v)}'`).join(',')})`)
    } else if (f.operator === 'not_in') {
      const values = Array.isArray(f.value) ? f.value : []
      parts.push(
        `${field} NOT IN (${values.map((v: any) => `'${escapeOnesqlValue(v)}'`).join(',')})`,
      )
    } else if (f.operator === 'like' || f.operator === 'contains') {
      parts.push(`${field} LIKE '%${escapeOnesqlValue(f.value)}%'`)
    } else if (f.operator === 'empty') {
      parts.push(`(${field} IS NULL OR ${field} = '')`)
    } else if (f.operator === 'not_empty') {
      parts.push(`(${field} IS NOT NULL AND ${field} != '')`)
    } else if (f.operator === 'gte') {
      parts.push(`${field} >= '${escapeOnesqlValue(f.value)}'`)
    } else if (f.operator === 'lte') {
      parts.push(`${field} <= '${escapeOnesqlValue(f.value)}'`)
    }
  }
  return parts.length > 0 ? ` where ${parts.join(' AND ')}` : ''
}

function appendWhereCondition(whereClause: string, condition: string): string {
  return whereClause ? `${whereClause} AND ${condition}` : ` where ${condition}`
}

function parseWorkitemsOnesqlRows(json: any): any[] {
  const rows = json?.data?.data || json?.data || []
  return Array.isArray(rows) ? rows : []
}

async function executeBrowserWorkitemsOnesql(queryText: string): Promise<any[]> {
  const teamUUID = getTeamUUID()
  if (!teamUUID) throw new Error('未获取到团队 UUID，无法执行全量 ONESQL 查询')
  const res = await fetch(`/project/api/ones-project/team/${teamUUID}/workitems/onesql`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json;charset=UTF-8' },
    body: JSON.stringify({ query: queryText, hierarchy: DEFAULT_WORKITEM_HIERARCHY }),
  })
  const text = await res.text()
  let json: any = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    throw new Error(`ONESQL 全量查询返回非 JSON: ${text.substring(0, 300)}`)
  }
  if (!res.ok) throw new Error(`ONESQL 全量查询 HTTP ${res.status}: ${text.substring(0, 500)}`)
  return parseWorkitemsOnesqlRows(json)
}

async function executeBrowserGraphQL(queryText: string): Promise<any> {
  const teamUUID = getTeamUUID()
  if (!teamUUID) throw new Error('未获取到团队 UUID，无法获取工作项类型字典')
  const res = await fetch(`/project/api/project/team/${teamUUID}/items/graphql?t=issueTypes`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json;charset=UTF-8' },
    body: JSON.stringify({ query: queryText, variables: {} }),
  })
  const text = await res.text()
  let json: any = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    throw new Error(`工作项类型字典返回非 JSON: ${text.substring(0, 300)}`)
  }
  if (!res.ok) throw new Error(`工作项类型字典 HTTP ${res.status}: ${text.substring(0, 500)}`)
  return json
}

async function fetchIssueTypes(): Promise<any[]> {
  const now = Date.now()
  if (issueTypesCache && issueTypesCache.expiresAt > now) return issueTypesCache.data

  const json = await executeBrowserGraphQL(
    '{ issueTypes(orderBy: { namePinyin: ASC }) { uuid name } }',
  )
  const issueTypes = json?.data?.issueTypes || json?.body?.data?.issueTypes || []
  if (!Array.isArray(issueTypes)) throw new Error('工作项类型字典格式异常')
  const normalized = issueTypes
    .filter((item: any) => item?.uuid)
    .map((item: any) => ({
      uuid: String(item.uuid),
      name: String(item.name || item.uuid),
    }))
  issueTypesCache = { expiresAt: now + ISSUE_TYPE_CACHE_TTL_MS, data: normalized }
  return normalized
}

function normalizeWorkitemItem(item: any): any {
  return {
    uuid: item.uuid || '',
    title: item.field001 || item.title || item.name || item.uuid || '-',
    issue_type: item.field007?.name || '',
    status: item.field005?.name || '',
    assignee: item.field004?.name || '',
    priority: item.field012?.name || '',
    project_uuid: item.field006?.uuid || '',
    sprint: item.field011?.name || '',
    created_at: item.field009 || '',
  }
}

function readAggregateValue(row: any, key: string): any {
  const value = row[key]
  if (value && typeof value === 'object') return value.name || value.uuid || value.value || '未设置'
  return value || '未设置'
}

function getDimensionOutputKey(query: any, fallback: string): string {
  const dim = query.dimensions?.[0]
  return dim?.name || dim?.field_key || fallback
}

function getDisplayLimit(query: any, chartType: string, fallback: number): number {
  const raw = Number(query.limit)
  const value = Number.isFinite(raw) && raw > 0 ? raw : fallback
  if (chartType === 'table') return Math.min(Math.max(value, 1), 1000)
  return Math.min(Math.max(value, 1), 50)
}

function getChartViewportStyle(chartType: string): any {
  if (chartType === 'bar' || chartType === 'table') return S.chartViewport
  return S.chartViewportCompact
}

function findDisplayName(value: any): string {
  if (!value) return ''
  if (typeof value === 'string') return ''
  if (typeof value !== 'object') return ''
  if (typeof value.name === 'string' && value.name) return value.name
  for (const [key, nested] of Object.entries(value)) {
    if (/name$/i.test(key) && typeof nested === 'string' && nested) return nested
  }
  for (const nested of Object.values(value)) {
    const found = findDisplayName(nested)
    if (found) return found
  }
  return ''
}

function getDimensionLabelCache(dimKey: string): Map<string, string> {
  let cache = dimensionLabelCache.get(dimKey)
  if (!cache) {
    cache = new Map<string, string>()
    dimensionLabelCache.set(dimKey, cache)
  }
  return cache
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = []
  let cursor = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await worker(items[index])
    }
  })
  await Promise.all(runners)
  return results
}

async function fetchDimensionLabel(
  dimKey: string,
  dimField: string,
  value: string,
): Promise<string> {
  if (!value || value === '未设置') return value
  const cache = getDimensionLabelCache(dimKey)
  const cached = cache.get(value)
  if (cached) return cached

  try {
    const queryText = `select uid(uuid, ${dimField}.name) from issue where ${dimField} = '${escapeOnesqlValue(value)}' limit 0, 1`
    const rows = await executeBrowserWorkitemsOnesql(queryText)
    for (const row of rows) {
      if (row?.type !== 'item') continue
      const label = findDisplayName(row.item?.[dimField])
      if (label) {
        cache.set(value, label)
        return label
      }
    }
  } catch {
    /* keep the original value when a label lookup fails */
  }

  cache.set(value, value)
  return value
}

async function hydrateAggregateLabels(
  aggregates: any[],
  dimKey: string,
  dimField: string,
  outKey: string,
): Promise<any[]> {
  if (!LABEL_HYDRATION_DIMENSIONS.has(dimKey) || aggregates.length === 0) return aggregates
  const values = Array.from(
    new Set(
      aggregates
        .map((row: any) => String(row[outKey] || ''))
        .filter((value) => value && value !== '未设置'),
    ),
  ).slice(0, LABEL_HYDRATION_LOOKUP_LIMIT)
  if (values.length === 0) return aggregates

  const entries = await mapWithConcurrency(
    values,
    6,
    async (value) =>
      [value, await fetchDimensionLabel(dimKey, dimField, value)] as [string, string],
  )
  const labels = new Map(entries)
  return aggregates.map((row: any) => ({
    ...row,
    [outKey]: labels.get(String(row[outKey] || '')) || row[outKey],
  }))
}

async function countIssues(whereClause: string, metricName: string): Promise<number> {
  const queryText = `select count() as total_count from issue${whereClause} limit 10000000000`
  const rows = await executeBrowserWorkitemsOnesql(queryText)
  const aggregate =
    rows.find((r: any) => r.type === 'aggregate' || r.type === 'aggregation')?.aggregate ||
    rows.find((r: any) => r.type === 'aggregation')?.aggregation ||
    rows[0]?.aggregate ||
    rows[0]?.aggregation ||
    {}
  return Number(aggregate.total_count ?? aggregate[metricName] ?? aggregate.count ?? 0)
}

async function queryIssueTypeCounts(
  whereClause: string,
  metricName: string,
  outKey: string,
  startedAt: number,
): Promise<any> {
  const cacheKey = JSON.stringify({ whereClause, metricName, outKey })
  const cached = issueTypeCountsCache.get(cacheKey)
  const now = Date.now()
  if (cached && cached.expiresAt > now) return cached.data

  const issueTypes = await fetchIssueTypes()
  const total = await countIssues(whereClause, metricName)
  const typedCounts = await mapWithConcurrency(issueTypes, 8, async (issueType: any) => {
    const typeWhereClause = appendWhereCondition(
      whereClause,
      `field007 = '${escapeOnesqlValue(issueType.uuid)}'`,
    )
    return {
      name: issueType.name,
      count: await countIssues(typeWhereClause, metricName),
    }
  })

  const mergedByName = new Map<string, number>()
  for (const row of typedCounts) {
    const count = Number(row.count) || 0
    if (count <= 0) continue
    mergedByName.set(row.name, (mergedByName.get(row.name) || 0) + count)
  }

  const rows = Array.from(mergedByName.entries())
    .map(([name, count]) => ({ [outKey]: name, [metricName]: count }))
    .sort((a: any, b: any) => Number(b[metricName]) - Number(a[metricName]))

  const knownTotal = rows.reduce((sum: number, row: any) => sum + (Number(row[metricName]) || 0), 0)
  const unknownTotal = Math.max(total - knownTotal, 0)
  if (unknownTotal > 0) {
    rows.push({ [outKey]: '其他/未识别类型', [metricName]: unknownTotal })
  }

  const data = {
    rows,
    total,
    query_time_ms: Date.now() - startedAt,
    debug: { provider: 'workitems_onesql', query: 'issue_type_exact_counts' },
  }
  issueTypeCountsCache.set(cacheKey, { expiresAt: now + ISSUE_TYPE_CACHE_TTL_MS, data })
  return data
}

export async function queryBrowserWorkitemsOnesql(chartType: string, query: any): Promise<any> {
  const startedAt = Date.now()
  const metricName = query.metrics?.[0]?.name || 'count'
  const detailLimit = Math.min(Math.max(query.limit || 100, 1), 1000)
  const aggregateLimit = 1000
  const whereClause = buildWhereClause(query.filters || [])

  if (chartType === 'number' || !query.dimensions?.length) {
    const queryText = `select count() as total_count from issue${whereClause} limit 10000000000`
    const rows = await executeBrowserWorkitemsOnesql(queryText)
    const aggregate =
      rows.find((r: any) => r.type === 'aggregate' || r.type === 'aggregation')?.aggregate ||
      rows.find((r: any) => r.type === 'aggregation')?.aggregation ||
      rows[0]?.aggregate ||
      rows[0]?.aggregation ||
      {}
    const total = Number(aggregate.total_count ?? aggregate[metricName] ?? aggregate.count ?? 0)
    return {
      rows: [{ [metricName]: total }],
      total,
      query_time_ms: Date.now() - startedAt,
      debug: { provider: 'workitems_onesql', query: queryText },
    }
  }

  if (chartType === 'table') {
    const queryText = `select uid(uuid, uuid as path, field001, field007.name, field005.name, field006.uuid, field011.name, field009) from issue${whereClause} limit 0, ${detailLimit}`
    const rows = await executeBrowserWorkitemsOnesql(queryText)
    const items = rows
      .filter((r: any) => r.type === 'item')
      .map((r: any) => normalizeWorkitemItem(r.item || {}))
    return {
      rows: items,
      total: items.length,
      query_time_ms: Date.now() - startedAt,
      debug: { provider: 'workitems_onesql', query: queryText },
    }
  }

  const dim = query.dimensions[0]
  const dimKey = dim.field_key || dim.name
  const dimField = getOnesqlField(dimKey)
  const outKey = dim.name || dimKey
  if (dimKey === 'issue_type') {
    return queryIssueTypeCounts(whereClause, metricName, outKey, startedAt)
  }

  const queryText = `select ${dimField} as ${outKey}, count() as total_count from issue${whereClause} group by ${dimField} limit 0, ${aggregateLimit}`
  const rows = await executeBrowserWorkitemsOnesql(queryText)
  const rawAggregates = rows
    .flatMap((r: any) => {
      if (Array.isArray(r.group_aggregate)) return r.group_aggregate
      if (r.type === 'aggregate' || r.type === 'aggregation')
        return [r.aggregate || r.aggregation || {}]
      return []
    })
    .map((r: any) => ({
      [outKey]: readAggregateValue(r, outKey),
      [metricName]: Number(r[metricName] ?? r.total_count ?? r.count ?? 0),
    }))
    .sort((a: any, b: any) => Number(b[metricName]) - Number(a[metricName]))
  const aggregates = await hydrateAggregateLabels(rawAggregates, dimKey, dimField, outKey)
  return {
    rows: aggregates,
    total: aggregates.reduce((sum: number, row: any) => sum + (Number(row[metricName]) || 0), 0),
    query_time_ms: Date.now() - startedAt,
    debug: { provider: 'workitems_onesql', query: queryText },
  }
}

export const ChartCard: React.FC<Props> = ({
  card,
  dashboardUuid,
  editable = false,
  snapshotData,
  snapshotStatus,
  snapshotError,
  onDelete,
  onCopy,
  onDragStart,
}) => {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const query = useMemo(() => JSON.parse(card.query_json || '{}'), [card.query_json])

  const loadData = useCallback(async () => {
    if (!editable && snapshotStatus === 'success') {
      setData(snapshotData || null)
      setError('')
      setLoading(false)
      return
    }
    if (!editable && snapshotStatus === 'failed') {
      setData(null)
      setError(snapshotError || '快照刷新失败')
      setLoading(false)
      return
    }
    if (!editable && snapshotStatus !== 'success') {
      setData(null)
      setError('')
      setLoading(false)
      return
    }
    if (!card.dataset_uuid) {
      setData(null)
      setError('卡片缺少数据集，请重新创建或编辑卡片')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      if (card.dataset_uuid === DEFAULT_DATASET_UUID) {
        const browserOnesqlData = await queryBrowserWorkitemsOnesql(card.chart_type, query)
        setData(browserOnesqlData)
        return
      }

      const res = await apiPost('/bi/query', {
        dataset_uuid: card.dataset_uuid,
        chart_type: card.chart_type,
        metrics: query.metrics || [],
        dimensions: query.dimensions || [],
        filters: query.filters || [],
        sort: query.sort || [],
        limit: query.limit || 100,
      })
      setData(res.data)
    } catch (e: any) {
      try {
        if (card.dataset_uuid === DEFAULT_DATASET_UUID) {
          setData(null)
          setError(e.message || '查询失败')
          return
        }
        const browserOnesqlData = await queryBrowserWorkitemsOnesql(card.chart_type, query)
        setData(browserOnesqlData)
      } catch (fallbackError: any) {
        setData(null)
        setError(
          fallbackError.message
            ? `${fallbackError.message}；后端错误：${e.message || '未知'}`
            : e.message || '查询失败：未获取到全量真实数据',
        )
      }
    } finally {
      setLoading(false)
    }
  }, [
    card.chart_type,
    card.dataset_uuid,
    editable,
    query,
    snapshotData,
    snapshotError,
    snapshotStatus,
  ])

  useEffect(() => {
    loadData()
  }, [card.card_uuid, loadData])

  function renderChart() {
    if (loading) return <div style={S.loading}>加载中...</div>
    if (error)
      return (
        <div style={S.error}>
          {error}
          <button style={S.retryBtn} onClick={loadData}>
            重试
          </button>
        </div>
      )
    if (!editable && snapshotStatus !== 'success') return <div style={S.empty}>尚未刷新</div>
    if (!data?.rows || data.rows.length === 0) return <div style={S.empty}>暂无数据</div>

    const rows = data.rows
    const chartType = card.chart_type

    if (chartType === 'number') {
      const total = rows.length > 0 ? (Object.values(rows[0])[0] as any) : 0
      return (
        <div>
          <div style={S.numberValue}>
            {typeof total === 'number' ? total.toLocaleString() : total}
          </div>
          <div style={S.numberLabel}>{query.metrics?.[0]?.name || '计数'}</div>
        </div>
      )
    }

    if (chartType === 'bar') {
      const dimKey = getDimensionOutputKey(query, Object.keys(rows[0])[0])
      const metricKey = query.metrics?.[0]?.name || 'count'
      const visibleRows = rows.slice(0, getDisplayLimit(query, chartType, 15))
      const maxVal = Math.max(...visibleRows.map((r: any) => Number(r[metricKey]) || 0), 1)
      return (
        <div>
          {visibleRows.map((r: any, i: number) => (
            <div key={i} style={S.barRow}>
              <div style={S.barLabel} title={String(r[dimKey] || '-')}>
                {String(r[dimKey] || '-')}
              </div>
              <div style={S.barTrack}>
                <div
                  style={{
                    ...S.barFill,
                    width: `${((Number(r[metricKey]) || 0) / maxVal) * 100}%`,
                  }}
                />
              </div>
              <div style={S.barValue}>{Number(r[metricKey]) || 0}</div>
            </div>
          ))}
        </div>
      )
    }

    if (chartType === 'pie' || chartType === 'donut') {
      const dimKey = getDimensionOutputKey(query, Object.keys(rows[0])[0])
      const metricKey = query.metrics?.[0]?.name || 'count'
      const visibleRows = rows.slice(0, getDisplayLimit(query, chartType, 8))
      const total = rows.reduce((sum: number, r: any) => sum + (Number(r[metricKey]) || 0), 0)
      const visibleTotal = visibleRows.reduce(
        (sum: number, r: any) => sum + (Number(r[metricKey]) || 0),
        0,
      )
      const otherTotal = Math.max(total - visibleTotal, 0)
      if (total <= 0) return <div style={S.empty}>暂无数据</div>

      let cursor = 0
      const gradientParts = visibleRows.map((r: any, i: number) => {
        const value = Number(r[metricKey]) || 0
        const start = cursor
        cursor += (value / total) * 100
        return `${CHART_COLORS[i % CHART_COLORS.length]} ${start}% ${cursor}%`
      })
      if (otherTotal > 0 && cursor < 100) gradientParts.push(`#f0f0f0 ${cursor}% 100%`)
      const gradient = gradientParts.join(', ')

      return (
        <div style={S.pieWrap}>
          <div
            style={{
              ...(chartType === 'donut' ? S.donut : S.pie),
              background: `conic-gradient(${gradient})`,
              position: 'relative',
            }}
          >
            {chartType === 'donut' && (
              <div style={S.donutCenter}>
                <div style={S.donutInner} />
              </div>
            )}
          </div>
          <div style={S.legend}>
            {visibleRows.map((r: any, i: number) => {
              const value = Number(r[metricKey]) || 0
              const percent = total > 0 ? Math.round((value / total) * 100) : 0
              return (
                <div key={i} style={S.legendRow}>
                  <span
                    style={{ ...S.legendDot, background: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                  <span style={S.legendLabel} title={String(r[dimKey] || '-')}>
                    {String(r[dimKey] || '-')}
                  </span>
                  <span style={S.legendValue}>
                    {value} ({percent}%)
                  </span>
                </div>
              )
            })}
            {otherTotal > 0 && (
              <div style={S.legendRow}>
                <span style={{ ...S.legendDot, background: '#f0f0f0' }} />
                <span style={S.legendLabel}>其他</span>
                <span style={S.legendValue}>
                  {otherTotal} ({Math.round((otherTotal / total) * 100)}%)
                </span>
              </div>
            )}
          </div>
        </div>
      )
    }

    if (chartType === 'table') {
      const cols = rows.length > 0 ? Object.keys(rows[0]) : []
      const visibleRows = rows.slice(0, getDisplayLimit(query, chartType, 50))
      return (
        <div style={{ overflowX: 'auto' }}>
          <table style={S.table}>
            <thead>
              <tr>
                {cols.map((c) => (
                  <th key={c} style={S.th}>
                    {FIELD_LABEL_MAP[c] || c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r: any, i: number) => (
                <tr key={i}>
                  {cols.map((c) => (
                    <td key={c} style={S.td}>
                      {String(r[c] ?? '-')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    return <div style={S.empty}>不支持的图表类型: {chartType}</div>
  }

  return (
    <div style={S.card}>
      <div
        style={{ ...S.cardHeader, ...(onDragStart ? S.cardHeaderDraggable : {}) }}
        onMouseDown={onDragStart}
      >
        <span style={S.cardTitle}>{card.title}</span>
        {editable && (
          <div style={S.headerActions} onMouseDown={(e) => e.stopPropagation()}>
            <button style={S.actionBtn} onClick={loadData} disabled={loading}>
              刷新
            </button>
            <button style={S.actionBtn} onClick={onCopy}>
              复制
            </button>
            <button style={S.deleteBtn} onClick={onDelete}>
              删除
            </button>
          </div>
        )}
      </div>
      <div style={S.cardBody}>
        <div style={getChartViewportStyle(card.chart_type)}>{renderChart()}</div>
      </div>
    </div>
  )
}
