import React, { useState, useEffect } from 'react'
import { apiGet, apiPost } from '../../api'

const S: any = {
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.45)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    background: '#fff',
    borderRadius: 8,
    padding: 24,
    width: 480,
    maxWidth: '90vw',
    maxHeight: '80vh',
    overflow: 'auto',
  },
  label: { fontSize: 13, fontWeight: 500, marginBottom: 6, display: 'block' },
  input: {
    padding: '8px 12px',
    borderRadius: 4,
    border: '1px solid #d9d9d9',
    fontSize: 14,
    width: '100%',
    boxSizing: 'border-box' as any,
  },
  select: {
    padding: '8px 12px',
    borderRadius: 4,
    border: '1px solid #d9d9d9',
    fontSize: 14,
    width: '100%',
    boxSizing: 'border-box' as any,
  },
  helpText: { marginTop: 4, color: '#999', fontSize: 12 },
  btn: (p: boolean) => ({
    padding: '8px 20px',
    borderRadius: 4,
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    background: p ? '#1677ff' : '#f0f0f0',
    color: p ? '#fff' : '#333',
  }),
  section: { marginBottom: 16 },
  dimRow: { display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' },
}

const CHART_TYPES = [
  { value: 'number', label: '数字指标卡' },
  { value: 'bar', label: '柱状图' },
  { value: 'pie', label: '饼图' },
  { value: 'donut', label: '环形图' },
  { value: 'table', label: '表格' },
]

const DIMENSION_CHART_TYPES = new Set(['bar', 'pie', 'donut'])
const LIMIT_CHART_TYPES = new Set(['bar', 'pie', 'donut', 'table'])

function getDefaultLimit(chartType: string): number {
  if (chartType === 'bar') return 15
  if (chartType === 'pie' || chartType === 'donut') return 8
  if (chartType === 'table') return 50
  return 100
}

function pickDefaultDimension(fields: any[]): string {
  const preferred = ['status', 'issue_type', 'assignee', 'project_uuid']
  for (const key of preferred) {
    if (fields.some((f: any) => f.key === key && f.dimension)) return key
  }
  return fields.find((x: any) => x.dimension)?.key || ''
}

interface Props {
  datasets: any[]
  onAdd: (config: any) => void
  onCancel: () => void
}

export const AddCardModal: React.FC<Props> = ({ datasets: propDatasets, onAdd, onCancel }) => {
  const [title, setTitle] = useState('新卡片')
  const [chartType, setChartType] = useState('number')
  const [datasetUuid, setDatasetUuid] = useState('')
  const [datasets, setDatasets] = useState<any[]>(propDatasets)
  const [fields, setFields] = useState<any[]>([])
  const [selectedDim, setSelectedDim] = useState('')
  const [metricAgg, setMetricAgg] = useState('count')
  const [topN, setTopN] = useState(getDefaultLimit('number'))
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (datasets.length === 0) {
      apiGet('/bi/datasets')
        .then((res: any) => {
          const list = res.data || []
          setDatasets(list)
          if (list.length > 0) setDatasetUuid(list[0].dataset_uuid)
        })
        .catch((e: any) => setLoadError(e.message || '加载数据集失败'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!datasetUuid) return
    apiGet(`/bi/dataset/${datasetUuid}`)
      .then((res: any) => {
        const f = JSON.parse(res.data?.field_config_json || '[]')
        setFields(f)
        const defaultDim = pickDefaultDimension(f)
        if (defaultDim) setSelectedDim(defaultDim)
      })
      .catch((e: any) => setLoadError(e.message || '加载数据集字段失败'))
  }, [datasetUuid])

  useEffect(() => {
    if (!DIMENSION_CHART_TYPES.has(chartType)) return
    if (selectedDim) return
    const defaultDim = pickDefaultDimension(fields)
    if (defaultDim) setSelectedDim(defaultDim)
  }, [chartType, fields, selectedDim])

  useEffect(() => {
    setTopN(getDefaultLimit(chartType))
  }, [chartType])

  const dimFields = fields.filter((f: any) => f.dimension)
  const metricFields = fields.filter((f: any) => f.metric)

  function handleAdd() {
    if (!datasetUuid) {
      setLoadError('请先选择数据集')
      return
    }
    onAdd({
      title: title.trim() || '未命名卡片',
      chart_type: chartType,
      dataset_uuid: datasetUuid,
      query: {
        metrics: [{ name: 'count', aggregation: metricAgg, field_key: '*' }],
        dimensions:
          !DIMENSION_CHART_TYPES.has(chartType) || !selectedDim
            ? []
            : [{ field_key: selectedDim, name: selectedDim }],
        filters: [],
        sort: [],
        limit: Math.min(Math.max(Number(topN) || getDefaultLimit(chartType), 1), 1000),
      },
      style: {},
      layout: { x: 0, y: 0, w: 6, h: 4 },
    })
  }

  return (
    <div style={S.modalOverlay} onClick={onCancel}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: 16 }}>添加卡片</h3>
        <div style={S.section}>
          <label style={S.label}>卡片标题</label>
          <input style={S.input} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div style={S.section}>
          <label style={S.label}>图表类型</label>
          <select style={S.select} value={chartType} onChange={(e) => setChartType(e.target.value)}>
            {CHART_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div style={S.section}>
          <label style={S.label}>数据集</label>
          <select
            style={S.select}
            value={datasetUuid}
            onChange={(e) => setDatasetUuid(e.target.value)}
          >
            {datasets.length === 0 && <option value="">暂无可用数据集</option>}
            {datasets.map((d: any) => (
              <option key={d.dataset_uuid} value={d.dataset_uuid}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        {loadError && <div style={{ color: '#ff4d4f', fontSize: 13, marginBottom: 12 }}>{loadError}</div>}
        {DIMENSION_CHART_TYPES.has(chartType) && (
          <div style={S.section}>
            <label style={S.label}>分组维度</label>
            <select
              style={S.select}
              value={selectedDim}
              onChange={(e) => setSelectedDim(e.target.value)}
            >
              <option value="">无</option>
              {dimFields.map((f: any) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div style={S.section}>
          <label style={S.label}>聚合方式</label>
          <select style={S.select} value={metricAgg} onChange={(e) => setMetricAgg(e.target.value)}>
            <option value="count">计数</option>
            <option value="sum">求和</option>
            <option value="avg">平均</option>
          </select>
        </div>
        {LIMIT_CHART_TYPES.has(chartType) && (
          <div style={S.section}>
            <label style={S.label}>展示数量</label>
            <input
              style={S.input}
              type="number"
              min={1}
              max={1000}
              value={topN}
              onChange={(e) => setTopN(Math.min(Math.max(Number(e.target.value) || 1, 1), 1000))}
            />
            <div style={S.helpText}>用于控制 Top N 分组或表格明细条数。</div>
          </div>
        )}
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button style={S.btn(false)} onClick={onCancel}>
            取消
          </button>
          <button style={S.btn(true)} onClick={handleAdd} disabled={!datasetUuid}>
            添加
          </button>
        </div>
      </div>
    </div>
  )
}
