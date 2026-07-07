import React, { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost, apiDelete } from '../../api'
import { ChartCard } from './ChartCard'
import { AddCardModal } from './AddCardModal'

const GRID_SIZE = 24
const CARD_INSET = 8
const DEFAULT_CANVAS_WIDTH = 980
const DEFAULT_CANVAS_HEIGHT = 560

const S: any = {
  container: { background: '#f5f5f5', minHeight: '100vh' },
  header: { background: '#fff', padding: '12px 24px', borderBottom: '1px solid #e8e8e8', display: 'flex', alignItems: 'center', gap: 12 },
  title: { fontSize: 18, fontWeight: 600, margin: 0, flex: 1 },
  btn: (p: boolean) => ({ padding: '6px 16px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, background: p ? '#1677ff' : '#f0f0f0', color: p ? '#fff' : '#333' }),
  content: { padding: 16 },
  boardScroll: { overflow: 'auto', border: '1px solid #d9dfe8', borderRadius: 8, background: '#f7f9fc' },
  board: {
    position: 'relative' as any,
    backgroundColor: '#f7f9fc',
    backgroundImage: 'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)',
    backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
  },
  cardFrame: { position: 'absolute' as any, boxSizing: 'border-box' as any },
  resizeHandle: {
    position: 'absolute' as any,
    right: 4,
    bottom: 4,
    width: 14,
    height: 14,
    borderRight: '2px solid #8aa4c8',
    borderBottom: '2px solid #8aa4c8',
    cursor: 'nwse-resize',
    zIndex: 2,
  },
  card: { background: '#fff', borderRadius: 8, border: '1px solid #e8e8e8', overflow: 'hidden' },
  cardHeader: { padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 14, fontWeight: 600 },
  cardBody: { padding: 16 },
  msg: { fontSize: 13, padding: '8px 12px', borderRadius: 4, margin: '8px 0', background: '#fff2f0', color: '#ff4d4f', border: '1px solid #ffccc7' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { background: '#fff', borderRadius: 8, padding: 24, width: 480, maxWidth: '90vw', maxHeight: '80vh', overflow: 'auto' },
  label: { fontSize: 13, fontWeight: 500, marginBottom: 6, display: 'block' },
  input: { padding: '8px 12px', borderRadius: 4, border: '1px solid #d9d9d9', fontSize: 14, width: '100%', boxSizing: 'border-box' as any },
  select: { padding: '8px 12px', borderRadius: 4, border: '1px solid #d9d9d9', fontSize: 14, width: '100%', boxSizing: 'border-box' as any },
  empty: { textAlign: 'center', padding: 40, color: '#999' },
}

interface Props {
  dashboardUuid: string
  onBack: () => void
}

export const DashboardDetail: React.FC<Props> = ({ dashboardUuid, onBack }) => {
  const [dashboard, setDashboard] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [showAddCard, setShowAddCard] = useState(false)
  const [localLayouts, setLocalLayouts] = useState<Record<string, any>>({})

  const loadDetail = useCallback(async () => {
    try {
      const res = await apiGet(`/bi/dashboard/${dashboardUuid}`)
      setDashboard(res.data)
    } catch (e: any) { setMsg(e.message) }
    finally { setLoading(false) }
  }, [dashboardUuid])

  useEffect(() => { loadDetail() }, [loadDetail])

  const cards: any[] = dashboard ? JSON.parse(dashboard.cards_json || '[]') : []

  function getDefaultLayout(card: any, index: number): any {
    const w = 16
    const h = card.chart_type === 'number' ? 9 : card.chart_type === 'bar' || card.chart_type === 'table' ? 16 : 12
    return {
      x: (index % 2) * 17,
      y: Math.floor(index / 2) * 17,
      w,
      h,
    }
  }

  function normalizeLayout(card: any, index: number): any {
    const layout = card.layout || {}
    const w = Number(layout.w) || 0
    const h = Number(layout.h) || 0
    if (w < 10 || h < 7) return getDefaultLayout(card, index)
    return {
      x: Math.max(0, Math.round(Number(layout.x) || 0)),
      y: Math.max(0, Math.round(Number(layout.y) || 0)),
      w: Math.max(10, Math.round(w)),
      h: Math.max(7, Math.round(h)),
    }
  }

  useEffect(() => {
    const next: Record<string, any> = {}
    cards.forEach((card: any, index: number) => {
      next[card.card_uuid] = normalizeLayout(card, index)
    })
    setLocalLayouts(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboard?.cards_json])

  function getCardLayout(card: any, index: number): any {
    return localLayouts[card.card_uuid] || normalizeLayout(card, index)
  }

  function getNextCardY(): number {
    return cards.reduce((bottom: number, card: any, index: number) => {
      const layout = getCardLayout(card, index)
      return Math.max(bottom, layout.y + layout.h)
    }, 0) + 1
  }

  async function saveCardLayout(card: any, layout: any) {
    try {
      await apiPost(`/bi/dashboard/${dashboardUuid}/card/${card.card_uuid}`, { layout })
    } catch (e: any) {
      setMsg(e.message || '保存卡片布局失败')
    }
  }

  function updateLocalLayout(cardUuid: string, layout: any) {
    setLocalLayouts((prev) => ({ ...prev, [cardUuid]: layout }))
  }

  function startDrag(card: any, index: number, e: React.MouseEvent) {
    if (e.button !== 0) return
    e.preventDefault()
    const base = getCardLayout(card, index)
    const startX = e.clientX
    const startY = e.clientY
    let latest = base
    const previousUserSelect = document.body.style.userSelect
    document.body.style.userSelect = 'none'

    const onMove = (event: MouseEvent) => {
      const next = {
        ...base,
        x: Math.max(0, base.x + Math.round((event.clientX - startX) / GRID_SIZE)),
        y: Math.max(0, base.y + Math.round((event.clientY - startY) / GRID_SIZE)),
      }
      latest = next
      updateLocalLayout(card.card_uuid, next)
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.userSelect = previousUserSelect
      saveCardLayout(card, latest)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  function startResize(card: any, index: number, e: React.MouseEvent) {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    const base = getCardLayout(card, index)
    const startX = e.clientX
    const startY = e.clientY
    const minH = card.chart_type === 'number' ? 7 : 9
    let latest = base
    const previousUserSelect = document.body.style.userSelect
    document.body.style.userSelect = 'none'

    const onMove = (event: MouseEvent) => {
      const next = {
        ...base,
        w: Math.max(10, base.w + Math.round((event.clientX - startX) / GRID_SIZE)),
        h: Math.max(minH, base.h + Math.round((event.clientY - startY) / GRID_SIZE)),
      }
      latest = next
      updateLocalLayout(card.card_uuid, next)
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.userSelect = previousUserSelect
      saveCardLayout(card, latest)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const canvasSize = cards.reduce(
    (size: any, card: any, index: number) => {
      const layout = getCardLayout(card, index)
      return {
        width: Math.max(size.width, (layout.x + layout.w) * GRID_SIZE + GRID_SIZE),
        height: Math.max(size.height, (layout.y + layout.h) * GRID_SIZE + GRID_SIZE),
      }
    },
    { width: DEFAULT_CANVAS_WIDTH, height: DEFAULT_CANVAS_HEIGHT },
  )

  async function handleAddCard(config: any) {
    try {
      await apiPost(`/bi/dashboard/${dashboardUuid}/card`, {
        ...config,
        layout: {
          ...(config.layout || getDefaultLayout({ chart_type: config.chart_type }, cards.length)),
          x: 0,
          y: getNextCardY(),
        },
      })
      setShowAddCard(false)
      await loadDetail()
    } catch (e: any) { setMsg(e.message) }
  }

  async function handleDeleteCard(cardUuid: string) {
    if (!confirm('确认删除此卡片？')) return
    try {
      await apiDelete(`/bi/dashboard/${dashboardUuid}/card/${cardUuid}`)
      await loadDetail()
    } catch (e: any) { setMsg(e.message) }
  }

  async function handleCopyCard(card: any) {
    try {
      await apiPost(`/bi/dashboard/${dashboardUuid}/card`, {
        title: `${card.title || '未命名卡片'} 副本`,
        chart_type: card.chart_type,
        dataset_uuid: card.dataset_uuid,
        query: JSON.parse(card.query_json || '{}'),
        style: JSON.parse(card.style_json || '{}'),
        layout: {
          ...getCardLayout(card, cards.findIndex((item: any) => item.card_uuid === card.card_uuid)),
          x: getCardLayout(card, cards.findIndex((item: any) => item.card_uuid === card.card_uuid)).x + 1,
          y: getCardLayout(card, cards.findIndex((item: any) => item.card_uuid === card.card_uuid)).y + 1,
        },
      })
      await loadDetail()
    } catch (e: any) { setMsg(e.message) }
  }

  if (loading) return <div style={S.empty}>加载中...</div>

  return (
    <div style={S.container}>
      <div style={S.header}>
        <button style={S.btn(false)} onClick={onBack}>← 返回</button>
        <h1 style={S.title}>{dashboard?.name || '仪表盘'}</h1>
        <button style={S.btn(true)} onClick={() => setShowAddCard(true)}>+ 添加卡片</button>
        <button style={S.btn(false)} onClick={() => loadDetail()}>刷新</button>
      </div>
      <div style={S.content}>
        {msg && <div style={S.msg}>{msg}</div>}
        {cards.length === 0 ? (
          <div style={S.empty}>
            <p>暂无卡片，点击「+ 添加卡片」创建</p>
          </div>
        ) : (
          <div style={S.boardScroll}>
            <div
              style={{
                ...S.board,
                minWidth: canvasSize.width,
                height: canvasSize.height,
              }}
            >
            {cards.map((card: any, index: number) => (
              (() => {
                const layout = getCardLayout(card, index)
                return (
                  <div
                    key={card.card_uuid}
                    style={{
                      ...S.cardFrame,
                      left: layout.x * GRID_SIZE,
                      top: layout.y * GRID_SIZE,
                      width: layout.w * GRID_SIZE - CARD_INSET,
                      height: layout.h * GRID_SIZE - CARD_INSET,
                    }}
                  >
                    <ChartCard
                      card={card}
                      dashboardUuid={dashboardUuid}
                      onDelete={() => handleDeleteCard(card.card_uuid)}
                      onCopy={() => handleCopyCard(card)}
                      onDragStart={(e) => startDrag(card, index, e)}
                    />
                    <div style={S.resizeHandle} onMouseDown={(e) => startResize(card, index, e)} />
                  </div>
                )
              })()
            ))}
            </div>
          </div>
        )}
      </div>
      {showAddCard && (
        <AddCardModal datasets={[]} onAdd={handleAddCard} onCancel={() => setShowAddCard(false)} />
      )}
    </div>
  )
}
