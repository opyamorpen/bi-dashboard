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
  { value: 'table', label: '表格' },
]

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

  useEffect(() => {
    if (datasets.length === 0) {
      apiGet('/bi/datasets')
        .then((res: any) => {
          const list = res.data || []
          setDatasets(list)
          if (list.length > 0) setDatasetUuid(list[0].dataset_uuid)
        })
        .catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!datasetUuid) return
    apiGet(`/bi/dataset/${datasetUuid}`)
      .then((res: any) => {
        const f = JSON.parse(res.data?.field_config_json || '[]')
        setFields(f)
        const firstDim = f.find((x: any) => x.dimension)
        if (firstDim) setSelectedDim(firstDim.key)
      })
      .catch(() => {})
  }, [datasetUuid])

  const dimFields = fields.filter((f: any) => f.dimension)
  const metricFields = fields.filter((f: any) => f.metric)

  function handleAdd() {
    onAdd({
      title: title.trim() || '未命名卡片',
      chart_type: chartType,
      dataset_uuid: datasetUuid,
      query: {
        metrics: [{ name: 'count', aggregation: metricAgg, field_key: '*' }],
        dimensions: selectedDim ? [{ field_key: selectedDim, name: selectedDim }] : [],
        filters: [],
        sort: [],
        limit: 100,
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
            {datasets.map((d: any) => (
              <option key={d.dataset_uuid} value={d.dataset_uuid}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        {chartType !== 'number' && (
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
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button style={S.btn(false)} onClick={onCancel}>
            取消
          </button>
          <button style={S.btn(true)} onClick={handleAdd}>
            添加
          </button>
        </div>
      </div>
    </div>
  )
}
