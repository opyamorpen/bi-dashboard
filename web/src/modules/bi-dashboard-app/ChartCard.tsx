import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { apiPost, getTeamUUID } from '../../api'

const S: any = {
  card: { background: '#fff', borderRadius: 8, border: '1px solid #e8e8e8', overflow: 'hidden' },
  cardHeader: { padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 14, fontWeight: 600 },
  cardBody: { padding: 16 },
  loading: { textAlign: 'center', padding: 40, color: '#999', fontSize: 13 },
  error: { textAlign: 'center', padding: 40, color: '#ff4d4f', fontSize: 13 },
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

interface Props {
  card: any
  dashboardUuid: string
  onDelete: () => void
}

function readTaskField(task: any, key: string): string {
  const value = task?.[key]
  if (value && typeof value === 'object') return value.name || value.title || value.uuid || ''
  if (value !== undefined && value !== null && value !== '') return String(value)
  if (key === 'issue_type') return task?.issueType?.name || ''
  if (key === 'status') return task?.status?.name || ''
  if (key === 'assignee') return task?.assign?.name || task?.owner?.name || ''
  if (key === 'project_uuid') return task?.project?.name || task?.project?.uuid || ''
  if (key === 'title') return task?.title || task?.name || ''
  return ''
}

function normalizeTask(task: any): any {
  return {
    uuid: task.uuid || '',
    title: task.title || task.name || task.uuid || '-',
    issue_type: task.issueType?.name || '',
    status: task.status?.name || '',
    assignee: task.assign?.name || task.owner?.name || '',
    priority: '',
    project_uuid: task.project?.name || task.project?.uuid || '',
    created_at: '',
  }
}

async function queryTasksFallback(chartType: string, query: any): Promise<any> {
  const teamUUID = getTeamUUID()
  const res = await fetch(`/project/api/project/team/${teamUUID}/items/graphql?t=bi_dashboard_fallback`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `{
        tasks(limit: ${Math.min(query.limit || 100, 1000)}) {
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
    }),
  })
  if (!res.ok) throw new Error(`GraphQL fallback HTTP ${res.status}`)
  const json = await res.json()
  const tasks = Array.isArray(json?.data?.tasks) ? json.data.tasks : []
  const metricName = query.metrics?.[0]?.name || 'count'

  if (chartType === 'table') return { rows: tasks.map(normalizeTask), total: tasks.length }
  if (chartType === 'number') return { rows: [{ [metricName]: tasks.length }], total: tasks.length }

  const dim = query.dimensions?.[0]
  if (!dim) return { rows: [{ [metricName]: tasks.length }], total: tasks.length }

  const dimKey = dim.field_key || dim.name
  const outKey = dim.name || dimKey
  const grouped: Record<string, number> = {}
  for (const task of tasks) {
    const key = readTaskField(task, dimKey) || '未设置'
    grouped[key] = (grouped[key] || 0) + 1
  }
  const rows = Object.entries(grouped)
    .map(([key, count]) => ({ [outKey]: key, [metricName]: count }))
    .sort((a, b) => Number(b[metricName]) - Number(a[metricName]))
  return { rows, total: tasks.length }
}

export const ChartCard: React.FC<Props> = ({ card, dashboardUuid, onDelete }) => {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
    try {
      const res = await apiPost('/bi/query', {
        dataset_uuid: card.dataset_uuid,
        chart_type: card.chart_type,
        metrics: query.metrics || [],
        dimensions: query.dimensions || [],
        filters: query.filters || [],
        sort: query.sort || [],
        limit: query.limit || 100,
      })
      if (
        res.data?.debug?.onesqlResult === 'FAIL' ||
        res.data?.debug?.provider === 'graphql_tasks_fallback_failed'
      ) {
        setData(await queryTasksFallback(card.chart_type, query))
      } else {
        setData(res.data)
      }
    } catch (e: any) {
      try {
        setData(await queryTasksFallback(card.chart_type, query))
      } catch (fallbackError: any) {
        setError(fallbackError.message || e.message || '查询失败')
      }
    } finally {
      setLoading(false)
    }
  }, [card.chart_type, card.dataset_uuid, query])

  useEffect(() => { loadData() }, [card.card_uuid, loadData])

  function renderChart() {
    if (loading) return <div style={S.loading}>加载中...</div>
    if (error) return <div style={S.error}>{error}</div>
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
        <button style={S.deleteBtn} onClick={onDelete}>删除</button>
      </div>
      <div style={S.cardBody}>{renderChart()}</div>
    </div>
  )
}
