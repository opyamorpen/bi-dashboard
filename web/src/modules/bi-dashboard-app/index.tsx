import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { apiGet, apiPost, apiDelete } from '../../api'
import { DashboardDetail } from './DashboardDetail'

const S: any = {
  container: { background: '#f5f5f5', minHeight: '100vh', padding: 0 },
  header: {
    background: '#fff',
    padding: '16px 24px',
    borderBottom: '1px solid #e8e8e8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 20, fontWeight: 600, margin: 0 },
  content: { padding: 24 },
  card: {
    background: '#fff',
    borderRadius: 8,
    border: '1px solid #e8e8e8',
    padding: 20,
    marginBottom: 16,
    cursor: 'pointer',
    transition: 'box-shadow 0.2s',
  },
  cardHover: { boxShadow: '0 2px 8px rgba(0,0,0,0.12)' },
  cardTitle: { fontSize: 16, fontWeight: 600, marginBottom: 8 },
  cardMeta: { fontSize: 12, color: '#999' },
  btn: (primary: boolean) => ({
    padding: '8px 20px',
    borderRadius: 4,
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    background: primary ? '#1677ff' : '#f0f0f0',
    color: primary ? '#fff' : '#333',
  }),
  empty: { textAlign: 'center', padding: 60, color: '#999' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 },
  input: {
    padding: '8px 12px',
    borderRadius: 4,
    border: '1px solid #d9d9d9',
    fontSize: 14,
    width: '100%',
    boxSizing: 'border-box' as any,
  },
  label: { fontSize: 13, fontWeight: 500, marginBottom: 6, display: 'block' },
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
  modal: { background: '#fff', borderRadius: 8, padding: 24, width: 400, maxWidth: '90vw' },
  wideModal: {
    background: '#fff',
    borderRadius: 8,
    padding: 0,
    width: 820,
    maxWidth: '92vw',
    height: '86vh',
    maxHeight: '86vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as any,
  },
  msg: {
    fontSize: 13,
    padding: '8px 12px',
    borderRadius: 4,
    margin: '8px 0',
    background: '#fff2f0',
    color: '#ff4d4f',
    border: '1px solid #ffccc7',
  },
  textarea: {
    padding: '8px 12px',
    borderRadius: 4,
    border: '1px solid #d9d9d9',
    fontSize: 14,
    width: '100%',
    minHeight: 120,
    boxSizing: 'border-box' as any,
    resize: 'vertical' as any,
  },
  btnRow: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  section: { marginBottom: 16 },
  draftCard: {
    border: '1px solid #e8e8e8',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    background: '#fafafa',
  },
  chatHeader: {
    padding: '18px 22px',
    borderBottom: '1px solid #f0f0f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatTitle: { fontSize: 18, fontWeight: 600, margin: 0 },
  chatStream: { flex: 1, overflow: 'auto', padding: '18px 22px', background: '#fff' },
  chatMsgWrap: (role: string) => ({
    display: 'flex',
    justifyContent: role === 'user' ? 'flex-end' : 'flex-start',
    marginBottom: 12,
  }),
  chatMsg: (role: string) => ({
    maxWidth: '78%',
    whiteSpace: 'pre-wrap' as any,
    lineHeight: 1.65,
    padding: '10px 12px',
    borderRadius: 10,
    background: role === 'user' ? '#e6f4ff' : role === 'process' ? '#fafafa' : '#f6ffed',
    border: role === 'process' ? '1px solid #e8e8e8' : 'none',
    color: '#333',
    fontSize: 13,
  }),
  thinkingBox: {
    marginTop: 10,
    borderTop: '1px solid rgba(0,0,0,0.08)',
    paddingTop: 8,
    color: '#4e5969',
    fontSize: 12,
  },
  thinkingSummary: {
    cursor: 'pointer',
    color: '#4e5969',
    fontWeight: 500,
    outline: 'none',
  },
  thinkingContent: { marginTop: 8, lineHeight: 1.6 },
  miniGrid: { display: 'grid', gridTemplateColumns: '96px 1fr', gap: '4px 8px', marginTop: 8 },
  miniLabel: { color: '#86909c' },
  chatImage: {
    display: 'block',
    width: 180,
    maxWidth: '100%',
    maxHeight: 120,
    objectFit: 'cover' as any,
    borderRadius: 8,
    border: '1px solid #d9e6f2',
    marginTop: 8,
  },
  chatImageName: { display: 'block', marginTop: 4, fontSize: 12, color: '#4e5969' },
  composer: { borderTop: '1px solid #f0f0f0', padding: 14, background: '#fff' },
  composerBox: { border: '1px solid #d9d9d9', borderRadius: 10, padding: 10, background: '#fff' },
  composerInput: {
    width: '100%',
    minHeight: 64,
    maxHeight: 160,
    resize: 'vertical' as any,
    border: 'none',
    outline: 'none',
    fontSize: 14,
    lineHeight: 1.6,
    boxSizing: 'border-box' as any,
  },
  composerFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  composerLeft: { display: 'flex', alignItems: 'center', gap: 8 },
  plusBtn: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    border: '1px solid #d9d9d9',
    background: '#fff',
    cursor: 'pointer',
    fontSize: 20,
    lineHeight: '26px',
    color: '#4e5969',
  },
  attachmentChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    border: '1px solid #e8e8e8',
    borderRadius: 999,
    padding: '4px 8px',
    fontSize: 12,
    color: '#4e5969',
    background: '#fafafa',
  },
  dialogMsg: {
    margin: '0 22px 10px',
    padding: '8px 10px',
    borderRadius: 6,
    background: '#fff2f0',
    border: '1px solid #ffccc7',
    color: '#cf1322',
    fontSize: 12,
  },
  statusPill: { fontSize: 12, color: '#86909c', marginRight: 8 },
  sendBtn: {
    padding: '7px 16px',
    borderRadius: 8,
    border: 'none',
    background: '#1677ff',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
  },
  confirmCard: {
    margin: '0 22px 18px',
    padding: 14,
    border: '1px solid #d9e8ff',
    borderRadius: 8,
    background: '#f7fbff',
  },
  confirmTitle: { fontSize: 15, fontWeight: 600, marginBottom: 10 },
  confirmGrid: { display: 'grid', gridTemplateColumns: '110px 1fr', gap: '6px 10px', fontSize: 13 },
  cardList: { display: 'grid', gap: 8, marginTop: 10 },
  cardItem: { background: '#fff', border: '1px solid #e8eef7', borderRadius: 6, padding: 10 },
  cardItemTitle: { fontWeight: 600, marginBottom: 6 },
  cardItemMeta: { color: '#4e5969', fontSize: 12, lineHeight: 1.6 },
  confirmActions: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
  configRow: {
    display: 'grid',
    gridTemplateColumns: '110px 1fr',
    gap: '8px 10px',
    alignItems: 'center',
  },
  configInput: {
    width: '100%',
    boxSizing: 'border-box' as any,
    border: '1px solid #d9d9d9',
    borderRadius: 6,
    padding: '6px 8px',
    fontSize: 13,
    background: '#fff',
  },
  configSelect: {
    width: '100%',
    boxSizing: 'border-box' as any,
    border: '1px solid #d9d9d9',
    borderRadius: 6,
    padding: '6px 8px',
    fontSize: 13,
    background: '#fff',
  },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  filterEditor: { display: 'grid', gap: 8, marginTop: 10 },
  filterRow: { display: 'grid', gridTemplateColumns: '1fr 1fr 1.3fr auto', gap: 8 },
  validationBox: (status: string) => ({
    marginTop: 10,
    padding: '8px 10px',
    borderRadius: 6,
    fontSize: 12,
    lineHeight: 1.6,
    border: status === 'error' ? '1px solid #ffccc7' : '1px solid #ffe58f',
    background: status === 'error' ? '#fff2f0' : '#fffbe6',
    color: status === 'error' ? '#cf1322' : '#8c6d1f',
  }),
  inlineBtn: {
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: '#1677ff',
    fontSize: 12,
    padding: 0,
  },
  historyPanel: {
    margin: '0 22px 12px',
    borderTop: '1px solid #f0f0f0',
    paddingTop: 10,
  },
  historyTitle: { fontSize: 12, color: '#86909c', marginBottom: 8 },
  historyList: { display: 'flex', gap: 8, overflowX: 'auto' as any, paddingBottom: 2 },
  historyItem: (active: boolean) => ({
    minWidth: 180,
    maxWidth: 260,
    border: active ? '1px solid #1677ff' : '1px solid #e8e8e8',
    borderRadius: 8,
    padding: '8px 10px',
    background: active ? '#e6f4ff' : '#fff',
    cursor: 'pointer',
    textAlign: 'left' as any,
    color: '#1f2329',
  }),
  historyItemTitle: {
    fontSize: 13,
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  historyItemMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#86909c',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
}

const CHART_TYPE_LABELS: Record<string, string> = {
  number: '数字指标卡',
  bar: '柱状图',
  pie: '饼图',
  donut: '环形图',
  table: '明细表格',
}

const FIELD_LABELS: Record<string, string> = {
  uuid: '工作项',
  title: '标题',
  issue_type: '工作项类型',
  status: '状态',
  assignee: '负责人',
  priority: '优先级',
  project_uuid: '项目',
  sprint: '所属迭代',
  created_at: '创建时间',
}

const AGGREGATION_LABELS: Record<string, string> = {
  count: '计数',
  count_distinct: '去重计数',
}

const FILTER_OPERATOR_LABELS: Record<string, string> = {
  eq: '等于',
  neq: '不等于',
  in: '属于',
  not_in: '不属于',
  contains: '包含',
  empty: '为空',
  not_empty: '不为空',
}

const DIMENSION_CHART_TYPES = new Set(['bar', 'pie', 'donut'])
const DEFAULT_METADATA = {
  fields: Object.entries(FIELD_LABELS).map(([key, label]) => ({
    key,
    label,
    type: key === 'created_at' ? 'datetime' : 'text',
    dimension: key !== 'uuid',
    metric: true,
  })),
  chart_types: Object.entries(CHART_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
    requires_dimension: DIMENSION_CHART_TYPES.has(value),
  })),
  aggregations: Object.entries(AGGREGATION_LABELS).map(([value, label]) => ({ value, label })),
  filter_operators: Object.entries(FILTER_OPERATOR_LABELS).map(([value, label]) => ({
    value,
    label,
    needs_value: !['empty', 'not_empty'].includes(value),
    array_value: ['in', 'not_in'].includes(value),
  })),
  default_limits: { number: 100, bar: 15, pie: 8, donut: 8, table: 50 },
  default_layouts: {
    number: { x: 0, y: 0, w: 8, h: 4, grid_size: 48 },
    bar: { x: 0, y: 0, w: 8, h: 8, grid_size: 48 },
    pie: { x: 0, y: 0, w: 8, h: 6, grid_size: 48 },
    donut: { x: 0, y: 0, w: 8, h: 6, grid_size: 48 },
    table: { x: 0, y: 0, w: 8, h: 8, grid_size: 48 },
  },
}

function labelOf(map: Record<string, string>, key: any, empty = '未指定'): string {
  if (key === null || key === undefined || key === '') return empty
  return map[String(key)] || String(key)
}

function getMetadataValue(metadata: any): any {
  return {
    ...DEFAULT_METADATA,
    ...(metadata || {}),
    fields: Array.isArray(metadata?.fields) ? metadata.fields : DEFAULT_METADATA.fields,
    chart_types: Array.isArray(metadata?.chart_types)
      ? metadata.chart_types
      : DEFAULT_METADATA.chart_types,
    aggregations: Array.isArray(metadata?.aggregations)
      ? metadata.aggregations
      : DEFAULT_METADATA.aggregations,
    filter_operators: Array.isArray(metadata?.filter_operators)
      ? metadata.filter_operators
      : DEFAULT_METADATA.filter_operators,
    default_limits: metadata?.default_limits || DEFAULT_METADATA.default_limits,
    default_layouts: metadata?.default_layouts || DEFAULT_METADATA.default_layouts,
  }
}

function getDefaultLimit(chartType: string, metadata: any): number {
  return (
    Number(getMetadataValue(metadata).default_limits?.[chartType]) ||
    (chartType === 'table' ? 50 : 15)
  )
}

function getDefaultLayout(chartType: string, metadata: any): any {
  return (
    getMetadataValue(metadata).default_layouts?.[chartType] ||
    DEFAULT_METADATA.default_layouts[chartType as keyof typeof DEFAULT_METADATA.default_layouts] ||
    DEFAULT_METADATA.default_layouts.bar
  )
}

function parseFilterValue(operator: string, value: any): any {
  if (operator === 'empty' || operator === 'not_empty') return ''
  if (operator === 'in' || operator === 'not_in') {
    if (Array.isArray(value)) return value
    return String(value || '')
      .split(/[,，、]/)
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return value ?? ''
}

function validateDraftClient(draft: any, metadata: any): any {
  if (!draft) return null
  const meta = getMetadataValue(metadata)
  const fields = new Set((meta.fields || []).map((field: any) => field.key))
  const chartTypes = new Set((meta.chart_types || []).map((item: any) => item.value))
  const aggregations = new Set((meta.aggregations || []).map((item: any) => item.value))
  const operators = new Set((meta.filter_operators || []).map((item: any) => item.value))
  const errors: string[] = []
  const warnings: string[] = []

  ;(draft.filters || []).forEach((filter: any, index: number) => {
    if (!fields.has(filter.field_key)) errors.push(`筛选条件 ${index + 1} 的字段不支持。`)
    if (!operators.has(filter.operator)) errors.push(`筛选条件 ${index + 1} 的操作符不支持。`)
  })
  ;(draft.cards || []).forEach((card: any, index: number) => {
    if (!chartTypes.has(card.chart_type)) errors.push(`卡片 ${index + 1} 的图表类型不支持。`)
    if (!aggregations.has(card.metric?.aggregation))
      errors.push(`卡片 ${index + 1} 的聚合方式不支持。`)
    if (!fields.has(card.metric?.field_key)) errors.push(`卡片 ${index + 1} 的指标字段不支持。`)
    if (DIMENSION_CHART_TYPES.has(card.chart_type) && !card.dimension?.field_key) {
      errors.push(`卡片 ${index + 1} 需要选择分析维度。`)
    }
    if (card.dimension?.field_key && !fields.has(card.dimension.field_key)) {
      errors.push(`卡片 ${index + 1} 的维度字段不支持。`)
    }
  })
  if (!Array.isArray(draft.cards) || draft.cards.length === 0) warnings.push('当前草稿没有卡片。')
  return {
    ok: errors.length === 0,
    status: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'ok',
    errors,
    warnings,
    corrections: [],
  }
}

function formatDraftSummary(draft: any): string {
  if (!draft) return '已生成报表卡片草稿。'
  const filters = formatFilters(draft.filters || [])
  const scope =
    Object.keys(draft.data_scope || {}).length > 0
      ? JSON.stringify(draft.data_scope)
      : '默认工作项数据集'
  const cards = (draft.cards || [])
    .map((card: any, index: number) => {
      const metric = formatMetric(card.metric)
      const dimension = formatDimension(card)
      return `${index + 1}. ${card.title}：${labelOf(CHART_TYPE_LABELS, card.chart_type)}，指标 ${metric}，维度 ${dimension}`
    })
    .join('\n')
  return [
    `我理解的卡片需求：${draft.title}`,
    draft.description ? `说明：${draft.description}` : '',
    `数据范围：${scope}`,
    `筛选条件：${filters}`,
    `卡片设计：\n${cards || '暂无卡片'}`,
    '可以继续告诉我如何调整，确认后我会把这些卡片添加到当前仪表盘。',
  ]
    .filter(Boolean)
    .join('\n')
}

function formatDraftValue(value: any, empty = '未指定'): string {
  if (value === null || value === undefined || value === '') return empty
  if (Array.isArray(value)) return value.length > 0 ? JSON.stringify(value) : empty
  if (typeof value === 'object') {
    const keys = Object.keys(value)
    return keys.length > 0 ? JSON.stringify(value) : empty
  }
  return String(value)
}

function formatMetric(metric: any): string {
  const aggregation = labelOf(AGGREGATION_LABELS, metric?.aggregation || 'count')
  const field = labelOf(FIELD_LABELS, metric?.field_key || 'uuid')
  return `${aggregation} / ${field}`
}

function formatDimension(card: any): string {
  if (card.chart_type === 'number') return '无，数字指标卡展示总值'
  const fieldKey = card.dimension?.field_key
  return fieldKey ? labelOf(FIELD_LABELS, fieldKey) : '无'
}

function formatFilters(filters: any[]): string {
  if (!Array.isArray(filters) || filters.length === 0) return '无'
  return filters
    .map((filter: any) => {
      const field = labelOf(FIELD_LABELS, filter.field_key)
      const operator = labelOf(FILTER_OPERATOR_LABELS, filter.operator)
      if (filter.operator === 'empty' || filter.operator === 'not_empty')
        return `${field} ${operator}`
      const value = Array.isArray(filter.value)
        ? filter.value.join('、')
        : String(filter.value ?? '')
      return `${field} ${operator} ${value}`
    })
    .join('；')
}

function formatLayout(layout: any): string {
  if (!layout) return '自动追加到当前仪表盘底部'
  return `${Number(layout.w) || 8} × ${Number(layout.h) || 6} 格，添加时自动避开已有卡片`
}

const DraftConfirmCard: React.FC<any> = ({
  draft,
  validation,
  metadata,
  aiBusy,
  onConfirm,
  onDraftChange,
}) => {
  if (!draft) return null
  const meta = getMetadataValue(metadata)
  const cards = Array.isArray(draft.cards) ? draft.cards : []
  const cardCount = Math.max(cards.length, 1)
  const currentValidation = validation || validateDraftClient(draft, meta)
  const hasValidationMessages =
    currentValidation &&
    currentValidation.status !== 'ok' &&
    ((currentValidation.errors || []).length > 0 ||
      (currentValidation.warnings || []).length > 0 ||
      (currentValidation.corrections || []).length > 0)
  const dimensionFields = meta.fields.filter((field: any) => field.dimension)
  const metricFields = meta.fields.filter((field: any) => field.metric)

  function patchDraft(patch: any) {
    onDraftChange({ ...draft, ...patch })
  }

  function patchCard(index: number, patch: any) {
    const nextCards = cards.map((card: any, cardIndex: number) => {
      if (cardIndex !== index) return card
      const next = { ...card, ...patch }
      if (!DIMENSION_CHART_TYPES.has(next.chart_type)) delete next.dimension
      if (!next.metric)
        next.metric = { name: '工作项数量', aggregation: 'count', field_key: 'uuid' }
      next.limit = Math.min(
        Math.max(Number(next.limit) || getDefaultLimit(next.chart_type, meta), 1),
        1000,
      )
      next.layout = next.layout || getDefaultLayout(next.chart_type, meta)
      return next
    })
    patchDraft({ cards: nextCards })
  }

  function patchCardMetric(index: number, patch: any) {
    const card = cards[index] || {}
    patchCard(index, {
      metric: {
        name: card.metric?.name || '工作项数量',
        aggregation: card.metric?.aggregation || 'count',
        field_key: card.metric?.field_key || 'uuid',
        ...patch,
      },
    })
  }

  function patchFilter(index: number, patch: any) {
    const nextFilters = (draft.filters || []).map((filter: any, filterIndex: number) => {
      if (filterIndex !== index) return filter
      const next = { ...filter, ...patch }
      next.value = parseFilterValue(next.operator, next.value)
      return next
    })
    patchDraft({ filters: nextFilters })
  }

  function addFilter() {
    const firstField = meta.fields.find((field: any) => field.key !== 'uuid') || meta.fields[0]
    patchDraft({
      filters: [
        ...(draft.filters || []),
        { field_key: firstField?.key || 'status', operator: 'eq', value: '' },
      ],
    })
  }

  function removeFilter(index: number) {
    patchDraft({
      filters: (draft.filters || []).filter((_: any, itemIndex: number) => itemIndex !== index),
    })
  }

  return (
    <div style={S.confirmCard}>
      <div style={S.confirmTitle}>卡片配置确认</div>
      <div style={S.confirmGrid}>
        <div style={S.miniLabel}>需求标题</div>
        <input
          style={S.configInput}
          value={draft.title || ''}
          onChange={(e) => patchDraft({ title: e.target.value })}
        />
        <div style={S.miniLabel}>新增数量</div>
        <div>{cardCount} 张卡片，添加到当前仪表盘</div>
        <div style={S.miniLabel}>数据范围</div>
        <div>{formatDraftValue(draft.data_scope, '默认工作项数据集')}</div>
        <div style={S.miniLabel}>筛选条件</div>
        <div>{formatFilters(draft.filters || [])}</div>
      </div>
      <div style={S.filterEditor}>
        {(draft.filters || []).map((filter: any, index: number) => {
          const operator = meta.filter_operators.find((item: any) => item.value === filter.operator)
          return (
            <div key={index} style={S.filterRow}>
              <select
                style={S.configSelect}
                value={filter.field_key || ''}
                onChange={(e) => patchFilter(index, { field_key: e.target.value })}
              >
                {meta.fields.map((field: any) => (
                  <option key={field.key} value={field.key}>
                    {field.label}
                  </option>
                ))}
              </select>
              <select
                style={S.configSelect}
                value={filter.operator || 'eq'}
                onChange={(e) => patchFilter(index, { operator: e.target.value })}
              >
                {meta.filter_operators.map((item: any) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <input
                style={S.configInput}
                value={Array.isArray(filter.value) ? filter.value.join('、') : filter.value || ''}
                disabled={operator && operator.needs_value === false}
                onChange={(e) => patchFilter(index, { value: e.target.value })}
              />
              <button style={S.inlineBtn} onClick={() => removeFilter(index)}>
                删除
              </button>
            </div>
          )
        })}
        <div>
          <button style={S.inlineBtn} onClick={addFilter}>
            + 添加筛选条件
          </button>
        </div>
      </div>
      <div style={S.cardList}>
        {cards.map((card: any, index: number) => (
          <div key={index} style={S.cardItem}>
            <div style={{ ...S.cardItemTitle, marginBottom: 10 }}>{index + 1}. 卡片配置</div>
            <div style={S.configRow}>
              <div style={S.miniLabel}>标题</div>
              <input
                style={S.configInput}
                value={card.title || ''}
                onChange={(e) => patchCard(index, { title: e.target.value })}
              />
              <div style={S.miniLabel}>图表类型</div>
              <select
                style={S.configSelect}
                value={card.chart_type || 'number'}
                onChange={(e) => {
                  const nextChartType = e.target.value
                  const firstDimension = dimensionFields[0]
                  patchCard(index, {
                    chart_type: nextChartType,
                    limit: getDefaultLimit(nextChartType, meta),
                    layout: getDefaultLayout(nextChartType, meta),
                    dimension:
                      DIMENSION_CHART_TYPES.has(nextChartType) && !card.dimension?.field_key
                        ? {
                            field_key: firstDimension?.key || '',
                            name: firstDimension?.label || '',
                          }
                        : card.dimension,
                  })
                }}
              >
                {meta.chart_types.map((item: any) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <div style={S.miniLabel}>指标</div>
              <div style={S.twoCol}>
                <select
                  style={S.configSelect}
                  value={card.metric?.aggregation || 'count'}
                  onChange={(e) => patchCardMetric(index, { aggregation: e.target.value })}
                >
                  {meta.aggregations.map((item: any) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <select
                  style={S.configSelect}
                  value={card.metric?.field_key || 'uuid'}
                  onChange={(e) => patchCardMetric(index, { field_key: e.target.value })}
                >
                  {metricFields.map((field: any) => (
                    <option key={field.key} value={field.key}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={S.miniLabel}>维度</div>
              <select
                style={S.configSelect}
                value={card.dimension?.field_key || ''}
                disabled={!DIMENSION_CHART_TYPES.has(card.chart_type)}
                onChange={(e) =>
                  patchCard(index, {
                    dimension: e.target.value
                      ? {
                          field_key: e.target.value,
                          name:
                            dimensionFields.find((field: any) => field.key === e.target.value)
                              ?.label || e.target.value,
                        }
                      : undefined,
                  })
                }
              >
                <option value="">无</option>
                {dimensionFields.map((field: any) => (
                  <option key={field.key} value={field.key}>
                    {field.label}
                  </option>
                ))}
              </select>
              <div style={S.miniLabel}>TopN/行数</div>
              <input
                style={S.configInput}
                type="number"
                min={1}
                max={1000}
                value={card.limit || getDefaultLimit(card.chart_type, meta)}
                onChange={(e) => patchCard(index, { limit: Number(e.target.value) || 1 })}
              />
            </div>
            <div style={S.cardItemMeta}>
              数据集：默认工作项数据集；图表：{labelOf(CHART_TYPE_LABELS, card.chart_type)}；指标：
              {formatMetric(card.metric)}；维度：{formatDimension(card)}；TopN/明细行数：
              {card.limit || (card.chart_type === 'table' ? 50 : 15)}；推荐尺寸：
              {formatLayout(card.layout)}
            </div>
          </div>
        ))}
      </div>
      {hasValidationMessages && (
        <div style={S.validationBox(currentValidation.status)}>
          {(currentValidation.errors || []).map((item: string, index: number) => (
            <div key={`e-${index}`}>错误：{item}</div>
          ))}
          {(currentValidation.warnings || []).map((item: string, index: number) => (
            <div key={`w-${index}`}>提示：{item}</div>
          ))}
          {(currentValidation.corrections || []).map((item: string, index: number) => (
            <div key={`c-${index}`}>修正：{item}</div>
          ))}
        </div>
      )}
      <div style={S.confirmActions}>
        <button
          style={S.btn(true)}
          onClick={onConfirm}
          disabled={aiBusy || currentValidation?.status === 'error'}
        >
          添加 {cardCount} 张卡片到当前仪表盘
        </button>
      </div>
    </div>
  )
}

const ThinkingDetails: React.FC<any> = ({ message }) => {
  const hasThinking =
    message.thinking_summary ||
    Object.values(message.confirmed || {}).some((value: any) => Boolean(value)) ||
    (message.missing || []).length > 0
  if (!hasThinking) return null
  return (
    <details style={S.thinkingBox}>
      <summary style={S.thinkingSummary}>分析过程摘要</summary>
      <div style={S.thinkingContent}>
        {message.thinking_summary && <div>{message.thinking_summary}</div>}
        {message.confirmed && (
          <div style={S.miniGrid}>
            <div style={S.miniLabel}>数据范围</div>
            <div>{message.confirmed.data_scope || '未确认'}</div>
            <div style={S.miniLabel}>图表类型</div>
            <div>{message.confirmed.chart_type || '未确认'}</div>
            <div style={S.miniLabel}>分析指标</div>
            <div>{message.confirmed.metrics || '未确认'}</div>
            <div style={S.miniLabel}>分析维度</div>
            <div>{message.confirmed.dimensions || '未确认'}</div>
            <div style={S.miniLabel}>筛选条件</div>
            <div>{message.confirmed.filters || '未确认'}</div>
          </div>
        )}
        {(message.missing || []).length > 0 && (
          <div style={{ marginTop: 8 }}>待确认：{message.missing.join('；')}</div>
        )}
      </div>
    </details>
  )
}

const AiReportDialogContent: React.FC<any> = ({
  aiSessionUuid,
  aiHistory,
  aiBusy,
  aiDraft,
  aiValidation,
  aiMetadata,
  aiImage,
  aiMessages,
  aiPrompt,
  aiError,
  setAiImage,
  setAiPrompt,
  setAiError,
  handleGenerateDraft,
  handleCreateFromDraft,
  handleResetAiSession,
  handlePickImage,
  handlePasteImage,
  handleSelectAiSession,
  handleDraftChange,
  onCancel,
}) => {
  const fileInputId = 'bi-ai-image-input'
  const statusText = aiBusy
    ? '正在分析'
    : aiDraft
      ? '草稿待确认'
      : aiMessages.length > 0
        ? '持续对话'
        : '等待输入'

  return (
    <>
      <div style={S.chatHeader}>
        <h3 style={S.chatTitle}>AI 报表卡片需求对话</h3>
        <button style={S.btn(false)} onClick={onCancel}>
          关闭
        </button>
      </div>
      {aiError && <div style={S.dialogMsg}>{aiError}</div>}
      <div style={S.chatStream}>
        {aiMessages.length === 0 && (
          <div style={S.chatMsgWrap('assistant')}>
            <div style={S.chatMsg('assistant')}>
              描述你想在当前仪表盘里添加的报表卡片。可以直接粘贴截图，我会先分析需求，再根据你的多轮调整生成最终卡片草稿。
            </div>
          </div>
        )}
        {aiMessages.map((item: any, index: number) => (
          <div key={index} style={S.chatMsgWrap(item.role)}>
            <div style={S.chatMsg(item.role)}>
              <strong>{item.role === 'user' ? '用户' : 'AI'}：</strong>
              {item.content}
              {(item.images || []).map((image: any, imageIndex: number) => (
                <span key={`${index}-${imageIndex}`}>
                  {image.data_url && (
                    <img src={image.data_url} alt={image.name || '图片'} style={S.chatImage} />
                  )}
                  <span style={S.chatImageName}>{image.name || '图片'}</span>
                </span>
              ))}
              {item.role === 'assistant' && <ThinkingDetails message={item} />}
            </div>
          </div>
        ))}
      </div>
      <DraftConfirmCard
        draft={aiDraft}
        validation={aiValidation}
        metadata={aiMetadata}
        aiBusy={aiBusy}
        onConfirm={handleCreateFromDraft}
        onDraftChange={handleDraftChange}
      />
      {aiHistory.length > 0 && (
        <div style={S.historyPanel}>
          <div style={S.historyTitle}>历史会话</div>
          <div style={S.historyList}>
            {aiHistory.map((session: any) => (
              <button
                key={session.session_uuid}
                style={S.historyItem(session.session_uuid === aiSessionUuid)}
                onClick={() => handleSelectAiSession(session.session_uuid)}
                disabled={aiBusy}
              >
                <div style={S.historyItemTitle}>{session.title || '未命名对话'}</div>
                <div style={S.historyItemMeta}>
                  {session.message_count || 0} 条消息
                  {session.has_draft ? ' / 有草稿' : ''}
                </div>
                {session.preview && <div style={S.historyItemMeta}>{session.preview}</div>}
              </button>
            ))}
          </div>
        </div>
      )}
      <div style={S.composer}>
        <div style={S.composerBox}>
          <textarea
            style={S.composerInput}
            value={aiPrompt}
            onChange={(e) => {
              setAiPrompt(e.target.value)
              setAiError('')
            }}
            onPaste={handlePasteImage}
            placeholder={aiDraft ? '继续输入调整指令...' : '输入报表卡片需求，或直接粘贴截图...'}
          />
          <div style={S.composerFooter}>
            <div style={S.composerLeft}>
              <label htmlFor={fileInputId} style={S.plusBtn}>
                +
              </label>
              <input
                id={fileInputId}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => handlePickImage(e.target.files?.[0])}
              />
              {aiImage?.name && (
                <span style={S.attachmentChip}>
                  图片：{aiImage.name}
                  <button
                    style={{
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      color: '#86909c',
                    }}
                    onClick={() => setAiImage(null)}
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
            <div>
              <span style={S.statusPill}>{statusText}</span>
              {aiDraft && (
                <button style={{ ...S.btn(false), marginRight: 8 }} onClick={handleResetAiSession}>
                  重新开始
                </button>
              )}
              <button style={S.sendBtn} onClick={handleGenerateDraft} disabled={aiBusy}>
                {aiBusy ? '发送中...' : '发送'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

const App: React.FC = () => {
  const [dashboards, setDashboards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showAiReport, setShowAiReport] = useState(false)
  const [newName, setNewName] = useState('')
  const [currentUuid, setCurrentUuid] = useState('')
  const [detailReloadToken, setDetailReloadToken] = useState(0)
  const [detailNotice, setDetailNotice] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiImage, setAiImage] = useState<any>(null)
  const [aiSessionUuid, setAiSessionUuid] = useState('')
  const [aiHistory, setAiHistory] = useState<any[]>([])
  const [aiHistoryItems, setAiHistoryItems] = useState<any[]>([])
  const [aiDraft, setAiDraft] = useState<any>(null)
  const [aiValidation, setAiValidation] = useState<any>(null)
  const [aiMetadata, setAiMetadata] = useState<any>(null)
  const [aiMessages, setAiMessages] = useState<any[]>([])
  const [aiError, setAiError] = useState('')
  const [aiBusy, setAiBusy] = useState(false)

  async function loadList() {
    setLoading(true)
    try {
      const res = await apiGet('/bi/dashboards')
      setDashboards(res.data || [])
    } catch (e: any) {
      setMsg(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadList()
  }, [])

  function makeAiSessionUuid(): string {
    return `ai_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
  }

  function applyAiSessionResponse(data: any) {
    setAiHistory(Array.isArray(data?.sessions) ? data.sessions : [])
    setAiHistoryItems(Array.isArray(data?.session_items) ? data.session_items : [])
  }

  async function loadAiMetadata() {
    if (aiMetadata) return aiMetadata
    const res = await apiGet('/bi/metadata')
    const metadata = res.data || {}
    setAiMetadata(metadata)
    return metadata
  }

  function handleDraftChange(nextDraft: any) {
    setAiDraft(nextDraft)
    setAiValidation(validateDraftClient(nextDraft, aiMetadata))
  }

  async function saveAiSession(messages: any[], draft: any, sessionUuid = aiSessionUuid) {
    if (!currentUuid) return
    if (!sessionUuid && messages.length === 0 && !draft) return
    try {
      const res = await apiPost(`/bi/dashboard/${currentUuid}/ai/session`, {
        session_uuid: sessionUuid || makeAiSessionUuid(),
        messages,
        draft,
      })
      applyAiSessionResponse(res.data || {})
    } catch {
      /* 会话保存失败不阻塞主流程 */
    }
  }

  async function openAiReport() {
    const sessionUuid = makeAiSessionUuid()
    setAiSessionUuid(sessionUuid)
    setAiPrompt('')
    setAiImage(null)
    setAiDraft(null)
    setAiValidation(null)
    setAiMessages([])
    setAiError('')
    setShowAiReport(true)
    if (!currentUuid) return
    try {
      await loadAiMetadata()
      const res = await apiGet(`/bi/dashboard/${currentUuid}/ai/session`)
      applyAiSessionResponse(res.data || {})
    } catch (e: any) {
      setAiError(e.message || '加载历史对话失败')
    }
  }

  async function handleResetAiSession() {
    const sessionUuid = makeAiSessionUuid()
    setAiSessionUuid(sessionUuid)
    setAiDraft(null)
    setAiValidation(null)
    setAiMessages([])
    setAiPrompt('')
    setAiImage(null)
    setAiError('')
  }

  function handleSelectAiSession(sessionUuid: string) {
    const session = aiHistoryItems.find((item: any) => item.session_uuid === sessionUuid)
    if (!session) return
    setAiSessionUuid(session.session_uuid)
    setAiMessages(Array.isArray(session.messages) ? session.messages : [])
    setAiDraft(session.draft || null)
    setAiValidation(validateDraftClient(session.draft || null, aiMetadata))
    setAiPrompt('')
    setAiImage(null)
    setAiError('')
  }

  async function handleCreate() {
    if (!newName.trim()) return
    try {
      await apiPost('/bi/dashboard', { name: newName.trim() })
      setShowCreate(false)
      setNewName('')
      await loadList()
    } catch (e: any) {
      setMsg(e.message)
    }
  }

  async function handleDelete(uuid: string, name: string) {
    if (!confirm(`确认删除仪表盘「${name}」？`)) return
    try {
      await apiDelete(`/bi/dashboard/${uuid}`)
      await loadList()
    } catch (e: any) {
      setMsg(e.message)
    }
  }

  function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('读取图片失败'))
      reader.readAsDataURL(file)
    })
  }

  async function handlePickImage(file?: File) {
    if (!file) {
      setAiImage(null)
      return
    }
    const dataUrl = await fileToDataUrl(file)
    setAiImage({ name: file.name, mime_type: file.type, data_url: dataUrl })
  }

  async function handlePasteImage(e: React.ClipboardEvent) {
    const items = Array.from(e.clipboardData?.items || [])
    const imageItem = items.find((item) => item.type.startsWith('image/'))
    if (!imageItem) return
    const file = imageItem.getAsFile()
    if (!file) return
    e.preventDefault()
    await handlePickImage(file)
  }

  async function handleGenerateDraft() {
    const requestImage = aiImage
    if (!aiPrompt.trim() && !requestImage?.data_url) {
      setAiError(aiDraft ? '请输入调整指令或添加图片' : '请输入报表需求或添加图片')
      return
    }
    const userText = aiPrompt.trim() || '请分析这张图片里的报表需求'
    setAiBusy(true)
    setAiError('')
    const userMessage = {
      role: 'user',
      content: userText,
      images: requestImage?.data_url ? [requestImage] : [],
    }
    const nextMessages = [...aiMessages, userMessage]
    setAiMessages(nextMessages)
    setAiPrompt('')
    setAiImage(null)
    try {
      const res = await apiPost('/bi/ai/report-draft', {
        prompt: userText,
        image: requestImage,
        current_draft: aiDraft,
        history: nextMessages,
      })
      const result = res.data || {}
      const draft = result.status === 'ready' ? result.draft : aiDraft
      const validation = result.validation || validateDraftClient(draft, aiMetadata)
      const assistantText =
        result.reply ||
        (draft ? '已整理出报表配置草稿，请确认是否添加。' : '我需要继续确认报表需求。')
      const savedMessages = [
        ...nextMessages,
        {
          role: 'assistant',
          content: assistantText,
          thinking_summary: result.thinking_summary || '',
          confirmed: result.confirmed || {},
          missing: result.missing || [],
        },
      ]
      setAiDraft(draft)
      setAiValidation(validation)
      setAiMessages(savedMessages)
      await saveAiSession(savedMessages, draft)
    } catch (e: any) {
      const errorText = e.message || '生成报表草稿失败'
      const failedMessages = [
        ...nextMessages,
        {
          role: 'assistant',
          content: `这次请求没有成功：${errorText}\n可以直接继续补充需求，或稍后重试。`,
          thinking_summary: 'AI 服务调用失败，当前对话内容已保留，未生成新的报表配置。',
          confirmed: {},
          missing: ['需要重新发送或补充需求'],
        },
      ]
      setAiError(errorText)
      setAiMessages(failedMessages)
      setAiValidation(validateDraftClient(aiDraft, aiMetadata))
      await saveAiSession(failedMessages, aiDraft)
    } finally {
      setAiBusy(false)
    }
  }

  async function handleCreateFromDraft() {
    if (!aiDraft || !currentUuid) return
    const validation = validateDraftClient(aiDraft, aiMetadata)
    if (validation?.status === 'error') {
      setAiValidation(validation)
      setAiError('当前报表配置仍有错误，请先在确认卡中修正。')
      return
    }
    setAiBusy(true)
    try {
      const res = await apiPost('/bi/report/from-draft', {
        draft: aiDraft,
        dashboard_uuid: currentUuid,
      })
      const count = res.data?.card_count || aiDraft.cards?.length || 1
      setShowAiReport(false)
      setAiDraft(null)
      setAiValidation(null)
      setAiMessages([])
      setAiPrompt('')
      setAiImage(null)
      setAiError('')
      setDetailNotice(`已新增 ${count} 张 AI 报表卡片，建议刷新快照查看真实数据`)
      setDetailReloadToken((value) => value + 1)
    } catch (e: any) {
      if (e?.response?.validation) setAiValidation(e.response.validation)
      setAiError(e.message || '添加 AI 卡片失败')
    } finally {
      setAiBusy(false)
    }
  }

  if (currentUuid) {
    return (
      <>
        <DashboardDetail
          dashboardUuid={currentUuid}
          reloadToken={detailReloadToken}
          notice={detailNotice}
          onOpenAiReport={openAiReport}
          onBack={() => {
            setCurrentUuid('')
            loadList()
          }}
        />
        {showAiReport && (
          <div style={S.modalOverlay} onClick={() => setShowAiReport(false)}>
            <div style={S.wideModal} onClick={(e) => e.stopPropagation()}>
              <AiReportDialogContent
                aiSessionUuid={aiSessionUuid}
                aiHistory={aiHistory}
                aiBusy={aiBusy}
                aiDraft={aiDraft}
                aiValidation={aiValidation}
                aiMetadata={aiMetadata}
                aiImage={aiImage}
                aiMessages={aiMessages}
                aiPrompt={aiPrompt}
                aiError={aiError}
                setAiImage={setAiImage}
                setAiPrompt={setAiPrompt}
                setAiError={setAiError}
                handleGenerateDraft={handleGenerateDraft}
                handleCreateFromDraft={handleCreateFromDraft}
                handleResetAiSession={handleResetAiSession}
                handlePickImage={handlePickImage}
                handlePasteImage={handlePasteImage}
                handleSelectAiSession={handleSelectAiSession}
                handleDraftChange={handleDraftChange}
                onCancel={() => setShowAiReport(false)}
              />
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <div style={S.container}>
      <div style={S.header}>
        <h1 style={S.title}>固定报表中心</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={S.btn(true)} onClick={() => setShowCreate(true)}>
            新建仪表盘
          </button>
        </div>
      </div>
      <div style={S.content}>
        {msg && <div style={S.msg}>{msg}</div>}
        {loading ? (
          <div style={S.empty}>加载中...</div>
        ) : dashboards.length === 0 ? (
          <div style={S.empty}>
            <p>暂无仪表盘</p>
            <button style={S.btn(true)} onClick={() => setShowCreate(true)}>
              创建第一个仪表盘
            </button>
          </div>
        ) : (
          <div style={S.grid}>
            {dashboards.map((d: any) => (
              <div
                key={d.dashboard_uuid}
                style={S.card}
                onClick={() => setCurrentUuid(d.dashboard_uuid)}
              >
                <div style={S.cardTitle}>{d.name}</div>
                <div style={S.cardMeta}>
                  更新于 {d.updated_at ? new Date(d.updated_at).toLocaleString('zh-CN') : '-'}
                </div>
                <div
                  style={{ marginTop: 12, display: 'flex', gap: 8 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    style={{ ...S.btn(false), fontSize: 12, padding: '4px 12px' }}
                    onClick={() => setCurrentUuid(d.dashboard_uuid)}
                  >
                    查看
                  </button>
                  <button
                    style={{ ...S.btn(false), fontSize: 12, padding: '4px 12px', color: '#ff4d4f' }}
                    onClick={() => handleDelete(d.dashboard_uuid, d.name)}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {showCreate && (
        <div style={S.modalOverlay} onClick={() => setShowCreate(false)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16 }}>新建仪表盘</h3>
            <label style={S.label}>名称</label>
            <input
              style={S.input}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="输入仪表盘名称"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate()
              }}
            />
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button style={S.btn(false)} onClick={() => setShowCreate(false)}>
                取消
              </button>
              <button style={S.btn(true)} onClick={handleCreate}>
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

ReactDOM.render(<App />, document.getElementById('ones-mf-root'))
