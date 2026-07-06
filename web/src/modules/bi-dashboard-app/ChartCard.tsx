import React, { useState, useEffect } from 'react'
import { apiPost } from '../../api'

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
  table: { width: '100%', borderCollapse: 'collapse' as any, fontSize: 13 },
  th: { padding: '6px 8px', borderBottom: '2px solid #e8e8e8', textAlign: 'left' as any, fontSize: 12, color: '#666', fontWeight: 600 },
  td: { padding: '6px 8px', borderBottom: '1px solid #f0f0f0' },
  deleteBtn: { border: 'none', background: 'transparent', cursor: 'pointer', color: '#ff4d4f', fontSize: 12, padding: 0 },
}

interface Props {
  card: any
  dashboardUuid: string
  onDelete: () => void
}

export const ChartCard: React.FC<Props> = ({ card, dashboardUuid, onDelete }) => {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const query = JSON.parse(card.query_json || '{}')

  async function loadData() {
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
      setData(res.data)
    } catch (e: any) {
      setError(e.message || '查询失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [card.card_uuid, card.query_json])

  function renderChart() {
    if (loading) return <div style={S.loading}>加载中...</div>
    if (error) return <div style={S.error}>{error}</div>
    if (!data || !data.rows || data.rows.length === 0) return <div style={S.empty}>暂无数据</div>

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
