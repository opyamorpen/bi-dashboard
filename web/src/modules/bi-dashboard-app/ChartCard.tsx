import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { apiPost, getTeamUUID } from '../../api'

const S: any = {
  card: { background: '#fff', borderRadius: 8, border: '1px solid #e8e8e8', overflow: 'hidden' },
  cardHeader: { padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 14, fontWeight: 600 },
  headerActions: { display: 'flex', alignItems: 'center', gap: 8 },
  actionBtn: { border: 'none', background: 'transparent', cursor: 'pointer', color: '#1677ff', fontSize: 12, padding: 0 },
  cardBody: { padding: 16 },
  cardMeta: { marginTop: 12, paddingTop: 10, borderTop: '1px solid #f5f5f5', color: '#999', fontSize: 12, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' as any },
  loading: { textAlign: 'center', padding: 40, color: '#999', fontSize: 13 },
  error: { textAlign: 'center', padding: 40, color: '#ff4d4f', fontSize: 13 },
  retryBtn: { marginLeft: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: '#1677ff', fontSize: 13, padding: 0 },
  empty: { textAlign: 'center', padding: 40, color: '#ccc', fontSize: 13 },
  numberValue: { fontSize: 36, fontWeight: 700, color: '#1677ff', textAlign: 'center' as any },
  numberLabel: { fontSize: 12, color: '#999', textAlign: 'center' as any, marginTop: 4 },
  barRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 13 },
  barLabel: { width: 100, textAlign: 'right' as any, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 },
  barTrack: { flex: 1, height: 20, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', background: '#1677ff', borderRadius: 4, transition: 'width 0.3s' },
  barValue: { width: 48, textAlign: 'right' as any, fontWeight: 600, flexShrink: 0 },
  pieWrap: { display: 'flex', gap: 18, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' as any },
  pie: { width: 150, height: 150, borderRadius: '50%', flexShrink: 0 },
  legend: { minWidth: 160, maxWidth: 280 },
  legendRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 13 },
  legendDot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  legendLabel: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  legendValue: { fontWeight: 600, color: '#333' },
  table: { width: '100%', borderCollapse: 'collapse' as any, fontSize: 13 },
  th: { padding: '6px 8px', borderBottom: '2px solid #e8e8e8', textAlign: 'left' as any, fontSize: 12, color: '#666', fontWeight: 600 },
  td: { padding: '6px 8px', borderBottom: '1px solid #f0f0f0' },
  deleteBtn: { border: 'none', background: 'transparent', cursor: 'pointer', color: '#ff4d4f', fontSize: 12, padding: 0 },
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
  onDelete: () => void
  onCopy: () => void
}

const ONESQL_FIELD_MAP: Record<string, string> = {
  uuid: 'uuid',
  title: 'field001',
  issue_type: 'field007',
  status: 'field005',
  assignee: 'field004',
  priority: 'field012',
  project_uuid: 'field006',
  created_at: 'field009',
}

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
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")
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
    else if (f.operator === 'in') {
      const values = Array.isArray(f.value) ? f.value : []
      parts.push(`${field} IN (${values.map((v: any) => `'${escapeOnesqlValue(v)}'`).join(',')})`)
    } else if (f.operator === 'like') {
      parts.push(`${field} LIKE '%${escapeOnesqlValue(f.value)}%'`)
    } else if (f.operator === 'gte') {
      parts.push(`${field} >= '${escapeOnesqlValue(f.value)}'`)
    } else if (f.operator === 'lte') {
      parts.push(`${field} <= '${escapeOnesqlValue(f.value)}'`)
    }
  }
  return parts.length > 0 ? ` where ${parts.join(' AND ')}` : ''
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

function normalizeWorkitemItem(item: any): any {
  return {
    uuid: item.uuid || '',
    title: item.field001 || item.title || item.name || item.uuid || '-',
    issue_type: item.field007?.name || '',
    status: item.field005?.name || '',
    assignee: item.field004?.name || '',
    priority: item.field012?.name || '',
    project_uuid: item.field006?.uuid || '',
    created_at: item.field009 || '',
  }
}

function readAggregateValue(row: any, key: string): any {
  const value = row[key]
  if (value && typeof value === 'object') return value.name || value.uuid || value.value || '未设置'
  return value || '未设置'
}

async function queryBrowserWorkitemsOnesql(chartType: string, query: any): Promise<any> {
  const startedAt = Date.now()
  const metricName = query.metrics?.[0]?.name || 'count'
  const limit = Math.min(Math.max(query.limit || 100, 1), 1000)
  const whereClause = buildWhereClause(query.filters || [])

  if (chartType === 'number' || !query.dimensions?.length) {
    const queryText = `select count() as total_count from issue${whereClause} limit 10000000000`
    const rows = await executeBrowserWorkitemsOnesql(queryText)
    const aggregate = rows.find((r: any) => r.type === 'aggregate' || r.type === 'aggregation')?.aggregate
      || rows.find((r: any) => r.type === 'aggregation')?.aggregation
      || rows[0]?.aggregate
      || rows[0]?.aggregation
      || {}
    const total = Number(aggregate.total_count ?? aggregate[metricName] ?? aggregate.count ?? 0)
    return {
      rows: [{ [metricName]: total }],
      total,
      query_time_ms: Date.now() - startedAt,
      debug: { provider: 'workitems_onesql', query: queryText },
    }
  }

  if (chartType === 'table') {
    const queryText = `select uid(uuid, uuid as path, field001, field007.name, field005.name, field006.uuid, field009) from issue${whereClause} limit 0, ${limit}`
    const rows = await executeBrowserWorkitemsOnesql(queryText)
    const items = rows.filter((r: any) => r.type === 'item').map((r: any) => normalizeWorkitemItem(r.item || {}))
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
  const queryText = `select ${dimField} as ${outKey}, count() as total_count from issue${whereClause} group by ${dimField} limit 0, ${limit}`
  const rows = await executeBrowserWorkitemsOnesql(queryText)
  const aggregates = rows
    .flatMap((r: any) => {
      if (Array.isArray(r.group_aggregate)) return r.group_aggregate
      if (r.type === 'aggregate' || r.type === 'aggregation') return [r.aggregate || r.aggregation || {}]
      return []
    })
    .map((r: any) => ({
      [outKey]: readAggregateValue(r, outKey),
      [metricName]: Number(r[metricName] ?? r.total_count ?? r.count ?? 0),
    }))
    .sort((a: any, b: any) => Number(b[metricName]) - Number(a[metricName]))
  return {
    rows: aggregates,
    total: aggregates.reduce((sum: number, row: any) => sum + (Number(row[metricName]) || 0), 0),
    query_time_ms: Date.now() - startedAt,
    debug: { provider: 'workitems_onesql', query: queryText },
  }
}

function getDataSourceLabel(provider?: string): string {
  if (provider === 'onesql') return 'ONESQL'
  if (provider === 'workitems_onesql') return 'ONESQL（全量真实数据）'
  return '实时查询'
}

export const ChartCard: React.FC<Props> = ({ card, dashboardUuid, onDelete, onCopy }) => {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState('')
  const [queryTimeMs, setQueryTimeMs] = useState<number | null>(null)
  const [dataSource, setDataSource] = useState('实时查询')

  const query = useMemo(() => JSON.parse(card.query_json || '{}'), [card.query_json])

  const loadData = useCallback(async () => {
    if (!card.dataset_uuid) {
      setData(null)
      setError('卡片缺少数据集，请重新创建或编辑卡片')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    const startedAt = Date.now()
    try {
      if (card.dataset_uuid === DEFAULT_DATASET_UUID) {
        const browserOnesqlData = await queryBrowserWorkitemsOnesql(card.chart_type, query)
        setData(browserOnesqlData)
        setQueryTimeMs(browserOnesqlData.query_time_ms ?? Date.now() - startedAt)
        setDataSource(getDataSourceLabel(browserOnesqlData.debug?.provider))
        setLastUpdated(new Date().toLocaleTimeString('zh-CN', { hour12: false }))
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
      setQueryTimeMs(res.data?.query_time_ms ?? Date.now() - startedAt)
      setDataSource(getDataSourceLabel(res.data?.debug?.provider))
      setLastUpdated(new Date().toLocaleTimeString('zh-CN', { hour12: false }))
    } catch (e: any) {
      try {
        if (card.dataset_uuid === DEFAULT_DATASET_UUID) {
          setData(null)
          setError(e.message || '查询失败')
          setQueryTimeMs(Date.now() - startedAt)
          return
        }
        const browserOnesqlData = await queryBrowserWorkitemsOnesql(card.chart_type, query)
        setData(browserOnesqlData)
        setQueryTimeMs(browserOnesqlData.query_time_ms ?? Date.now() - startedAt)
        setDataSource(getDataSourceLabel(browserOnesqlData.debug?.provider))
        setLastUpdated(new Date().toLocaleTimeString('zh-CN', { hour12: false }))
      } catch (fallbackError: any) {
        setData(null)
        setError(
          fallbackError.message
            ? `${fallbackError.message}；后端错误：${e.message || '未知'}`
            : e.message || '查询失败：未获取到全量真实数据',
        )
        setQueryTimeMs(Date.now() - startedAt)
      }
    } finally {
      setLoading(false)
    }
  }, [card.chart_type, card.dataset_uuid, query])

  useEffect(() => { loadData() }, [card.card_uuid, loadData])

  function renderChart() {
    if (loading) return <div style={S.loading}>加载中...</div>
    if (error) return <div style={S.error}>{error}<button style={S.retryBtn} onClick={loadData}>重试</button></div>
    if (!data?.rows || data.rows.length === 0) return <div style={S.empty}>暂无数据</div>

    const rows = data.rows
    const chartType = card.chart_type

    if (chartType === 'number') {
      const total = rows.length > 0 ? (Object.values(rows[0])[0] as any) : 0
      return (
        <div>
          <div style={S.numberValue}>{typeof total === 'number' ? total.toLocaleString() : total}</div>
          <div style={S.numberLabel}>{query.metrics?.[0]?.name || '计数'}</div>
        </div>
      )
    }

    if (chartType === 'bar') {
      const dimKey = query.dimensions?.[0]?.field_key || query.dimensions?.[0]?.name || Object.keys(rows[0])[0]
      const metricKey = query.metrics?.[0]?.name || 'count'
      const maxVal = Math.max(...rows.map((r: any) => Number(r[metricKey]) || 0), 1)
      return (
        <div>
          {rows.slice(0, 15).map((r: any, i: number) => (
            <div key={i} style={S.barRow}>
              <div style={S.barLabel} title={String(r[dimKey] || '-')}>{String(r[dimKey] || '-')}</div>
              <div style={S.barTrack}>
                <div style={{ ...S.barFill, width: `${((Number(r[metricKey]) || 0) / maxVal) * 100}%` }} />
              </div>
              <div style={S.barValue}>{Number(r[metricKey]) || 0}</div>
            </div>
          ))}
        </div>
      )
    }

    if (chartType === 'pie') {
      const dimKey = query.dimensions?.[0]?.field_key || query.dimensions?.[0]?.name || Object.keys(rows[0])[0]
      const metricKey = query.metrics?.[0]?.name || 'count'
      const visibleRows = rows.slice(0, 8)
      const total = visibleRows.reduce((sum: number, r: any) => sum + (Number(r[metricKey]) || 0), 0)
      if (total <= 0) return <div style={S.empty}>暂无数据</div>

      let cursor = 0
      const gradient = visibleRows
        .map((r: any, i: number) => {
          const value = Number(r[metricKey]) || 0
          const start = cursor
          cursor += (value / total) * 100
          return `${CHART_COLORS[i % CHART_COLORS.length]} ${start}% ${cursor}%`
        })
        .join(', ')

      return (
        <div style={S.pieWrap}>
          <div style={{ ...S.pie, background: `conic-gradient(${gradient})` }} />
          <div style={S.legend}>
            {visibleRows.map((r: any, i: number) => {
              const value = Number(r[metricKey]) || 0
              const percent = total > 0 ? Math.round((value / total) * 100) : 0
              return (
                <div key={i} style={S.legendRow}>
                  <span style={{ ...S.legendDot, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span style={S.legendLabel} title={String(r[dimKey] || '-')}>{String(r[dimKey] || '-')}</span>
                  <span style={S.legendValue}>{value} ({percent}%)</span>
                </div>
              )
            })}
          </div>
        </div>
      )
    }

    if (chartType === 'table') {
      const cols = rows.length > 0 ? Object.keys(rows[0]) : []
      return (
        <div style={{ overflowX: 'auto' }}>
          <table style={S.table}>
            <thead><tr>{cols.map((c) => <th key={c} style={S.th}>{c}</th>)}</tr></thead>
            <tbody>
              {rows.slice(0, 50).map((r: any, i: number) => (
                <tr key={i}>{cols.map((c) => <td key={c} style={S.td}>{String(r[c] ?? '-')}</td>)}</tr>
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
      <div style={S.cardHeader}>
        <span style={S.cardTitle}>{card.title}</span>
        <div style={S.headerActions}>
          <button style={S.actionBtn} onClick={loadData} disabled={loading}>刷新</button>
          <button style={S.actionBtn} onClick={onCopy}>复制</button>
          <button style={S.deleteBtn} onClick={onDelete}>删除</button>
        </div>
      </div>
      <div style={S.cardBody}>
        {renderChart()}
        <div style={S.cardMeta}>
          <span>数据源：{dataSource}</span>
          <span>耗时：{queryTimeMs === null ? '-' : `${queryTimeMs}ms`}</span>
          <span>更新：{lastUpdated || '-'}</span>
        </div>
      </div>
    </div>
  )
}
