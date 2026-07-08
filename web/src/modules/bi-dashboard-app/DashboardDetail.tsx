import React, { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost, apiDelete } from '../../api'
import { ChartCard, queryBrowserWorkitemsOnesql } from './ChartCard'
import { AddCardModal } from './AddCardModal'

const GRID_SIZE = 48
const VIEW_CARD_GAP = 12
const DEFAULT_CANVAS_WIDTH = 980
const DEFAULT_CANVAS_HEIGHT = 560

const S: any = {
  container: { background: '#f5f5f5', minHeight: '100vh' },
  header: { background: '#fff', padding: '12px 24px', borderBottom: '1px solid #e8e8e8', display: 'flex', alignItems: 'center', gap: 12 },
  title: { fontSize: 18, fontWeight: 600, margin: 0, flex: 1 },
  btn: (p: boolean) => ({ padding: '6px 16px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, background: p ? '#1677ff' : '#f0f0f0', color: p ? '#fff' : '#333' }),
  content: { padding: 16 },
  boardScroll: { overflow: 'auto', border: '1px solid #d9dfe8', borderRadius: 8, background: '#f7f9fc' },
  boardScrollView: { overflow: 'auto', border: 'none', borderRadius: 0, background: '#f5f5f5' },
  board: {
    position: 'relative' as any,
    backgroundColor: '#f7f9fc',
    backgroundImage: 'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)',
    backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
  },
  boardView: {
    position: 'relative' as any,
    backgroundColor: '#f5f5f5',
  },
  cardFrame: { position: 'absolute' as any, boxSizing: 'border-box' as any },
  cardFrameView: { position: 'absolute' as any, boxSizing: 'border-box' as any, padding: VIEW_CARD_GAP / 2 },
  resizeHandle: {
    position: 'absolute' as any,
    right: 8,
    bottom: 8,
    width: 16,
    height: 16,
    borderRight: '2px solid #8aa4c8',
    borderBottom: '2px solid #8aa4c8',
    borderRadius: 2,
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
  onOpenAiReport?: () => void
  reloadToken?: number
}

export const DashboardDetail: React.FC<Props> = ({ dashboardUuid, onBack, onOpenAiReport, reloadToken = 0 }) => {
  const [dashboard, setDashboard] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [showAddCard, setShowAddCard] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [localLayouts, setLocalLayouts] = useState<Record<string, any>>({})
  const [snapshots, setSnapshots] = useState<Record<string, any>>({})
  const [refreshingSnapshot, setRefreshingSnapshot] = useState(false)

  const loadSnapshots = useCallback(async () => {
    try {
      const res = await apiGet(`/bi/dashboard/${dashboardUuid}/snapshots`)
      setSnapshots(res.data?.snapshots || {})
    } catch (e: any) {
      setMsg(e.message || '加载快照失败')
    }
  }, [dashboardUuid])

  const loadDetail = useCallback(async () => {
    try {
      const res = await apiGet(`/bi/dashboard/${dashboardUuid}`)
      setDashboard(res.data)
      await loadSnapshots()
    } catch (e: any) { setMsg(e.message) }
    finally { setLoading(false) }
  }, [dashboardUuid, loadSnapshots])

  useEffect(() => { loadDetail() }, [loadDetail, reloadToken])

  const cards: any[] = dashboard ? JSON.parse(dashboard.cards_json || '[]') : []

  function getDefaultLayout(card: any, index: number): any {
    const w = 8
    const h = card.chart_type === 'number' ? 4 : card.chart_type === 'bar' || card.chart_type === 'table' ? 8 : 6
    return {
      x: (index % 2) * 9,
      y: Math.floor(index / 2) * 9,
      w,
      h,
      grid_size: GRID_SIZE,
    }
  }

  function normalizeLayout(card: any, index: number): any {
    const layout = card.layout || {}
    let x = Number(layout.x) || 0
    let y = Number(layout.y) || 0
    let w = Number(layout.w) || 0
    let h = Number(layout.h) || 0
    if (layout.grid_size !== GRID_SIZE && (w >= 10 || h >= 9 || x >= 10 || y >= 10)) {
      x = Math.round(x / 2)
      y = Math.round(y / 2)
      w = Math.round(w / 2)
      h = Math.round(h / 2)
    }
    if (w < 4 || h < 3) return getDefaultLayout(card, index)
    return {
      x: Math.max(0, Math.round(x)),
      y: Math.max(0, Math.round(y)),
      w: Math.max(4, Math.round(w)),
      h: Math.max(3, Math.round(h)),
      grid_size: GRID_SIZE,
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

  function intersects(a: any, b: any): boolean {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  }

  function normalizeResolvedLayout(layout: any): any {
    return {
      ...layout,
      x: Math.max(0, Math.round(layout.x || 0)),
      y: Math.max(0, Math.round(layout.y || 0)),
      w: Math.max(4, Math.round(layout.w || 4)),
      h: Math.max(3, Math.round(layout.h || 3)),
      grid_size: GRID_SIZE,
    }
  }

  function resolveLayoutCollisions(layouts: Record<string, any>, activeUuid: string): Record<string, any> {
    const next: Record<string, any> = {}
    for (const [uuid, layout] of Object.entries(layouts)) next[uuid] = normalizeResolvedLayout(layout)

    const order = cards
      .map((card: any) => card.card_uuid)
      .filter((uuid: string) => uuid !== activeUuid)
      .sort((a: string, b: string) => {
        const la = next[a] || {}
        const lb = next[b] || {}
        return (la.y - lb.y) || (la.x - lb.x)
      })

    const placed = [activeUuid]
    for (const uuid of order) {
      let layout = { ...next[uuid] }
      let moved = true
      while (moved) {
        moved = false
        for (const placedUuid of placed) {
          const blocker = next[placedUuid]
          if (!blocker || !intersects(layout, blocker)) continue
          layout = { ...layout, y: blocker.y + blocker.h }
          moved = true
        }
      }
      next[uuid] = normalizeResolvedLayout(layout)
      placed.push(uuid)
    }
    return next
  }

  function getAllLayouts(): Record<string, any> {
    const layouts: Record<string, any> = {}
    cards.forEach((card: any, index: number) => {
      layouts[card.card_uuid] = getCardLayout(card, index)
    })
    return layouts
  }

  function getNextCardY(): number {
    return cards.reduce((bottom: number, card: any, index: number) => {
      const layout = getCardLayout(card, index)
      return Math.max(bottom, layout.y + layout.h)
    }, 0) + 1
  }

  async function saveResolvedLayouts(layouts: Record<string, any>) {
    try {
      await Promise.all(
        cards.map((card: any) => apiPost(`/bi/dashboard/${dashboardUuid}/card/${card.card_uuid}`, {
          layout: layouts[card.card_uuid],
        })),
      )
    } catch (e: any) {
      setMsg(e.message || '保存卡片布局失败')
    }
  }

  function startDrag(card: any, index: number, e: React.MouseEvent) {
    if (e.button !== 0) return
    e.preventDefault()
    const base = getCardLayout(card, index)
    const startX = e.clientX
    const startY = e.clientY
    let latest = getAllLayouts()
    const previousUserSelect = document.body.style.userSelect
    document.body.style.userSelect = 'none'

    const onMove = (event: MouseEvent) => {
      const next = {
        ...base,
        x: Math.max(0, base.x + Math.round((event.clientX - startX) / GRID_SIZE)),
        y: Math.max(0, base.y + Math.round((event.clientY - startY) / GRID_SIZE)),
      }
      const resolved = resolveLayoutCollisions({ ...getAllLayouts(), [card.card_uuid]: next }, card.card_uuid)
      latest = resolved
      setLocalLayouts(resolved)
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.userSelect = previousUserSelect
      saveResolvedLayouts(latest)
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
    const minH = card.chart_type === 'number' ? 3 : 4
    let latest = getAllLayouts()
    const previousUserSelect = document.body.style.userSelect
    document.body.style.userSelect = 'none'

    const onMove = (event: MouseEvent) => {
      const next = {
        ...base,
        w: Math.max(4, base.w + Math.round((event.clientX - startX) / GRID_SIZE)),
        h: Math.max(minH, base.h + Math.round((event.clientY - startY) / GRID_SIZE)),
      }
      const resolved = resolveLayoutCollisions({ ...getAllLayouts(), [card.card_uuid]: next }, card.card_uuid)
      latest = resolved
      setLocalLayouts(resolved)
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.userSelect = previousUserSelect
      saveResolvedLayouts(latest)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const canvasSize = cards.reduce(
    (size: any, card: any, index: number) => {
      const layout = getCardLayout(card, index)
      return {
        width: Math.max(size.width, (layout.x + layout.w) * GRID_SIZE + (isEditing ? GRID_SIZE : 0)),
        height: Math.max(size.height, (layout.y + layout.h) * GRID_SIZE + (isEditing ? GRID_SIZE : 0)),
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

  function enterEditing() {
    setIsEditing(true)
  }

  function exitEditing() {
    setIsEditing(false)
    setShowAddCard(false)
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

  async function handleRefreshSnapshot() {
    if (cards.length === 0) return
    setRefreshingSnapshot(true)
    setMsg('')
    const nextSnapshots: any[] = []
    for (const card of cards) {
      try {
        const query = JSON.parse(card.query_json || '{}')
        if (card.dataset_uuid !== 'default_issue_dataset') {
          throw new Error('首期快照刷新仅支持默认工作项数据集')
        }
        const data = await queryBrowserWorkitemsOnesql(card.chart_type, query)
        nextSnapshots.push({ card_uuid: card.card_uuid, status: 'success', data })
      } catch (e: any) {
        nextSnapshots.push({
          card_uuid: card.card_uuid,
          status: 'failed',
          data: { rows: [] },
          error: e.message || '刷新失败',
        })
      }
    }
    try {
      await apiPost(`/bi/dashboard/${dashboardUuid}/snapshots`, { snapshots: nextSnapshots })
      await loadSnapshots()
    } catch (e: any) {
      setMsg(e.message || '保存快照失败')
    } finally {
      setRefreshingSnapshot(false)
    }
  }

  if (loading) return <div style={S.empty}>加载中...</div>

  return (
    <div style={S.container}>
      <div style={S.header}>
        <button style={S.btn(false)} onClick={onBack}>← 返回</button>
        <h1 style={S.title}>{dashboard?.name || '仪表盘'}</h1>
        {onOpenAiReport && <button style={S.btn(true)} onClick={onOpenAiReport}>AI 生成卡片</button>}
        {isEditing && <button style={S.btn(true)} onClick={() => setShowAddCard(true)}>+ 添加卡片</button>}
        <button style={S.btn(false)} onClick={handleRefreshSnapshot} disabled={refreshingSnapshot}>
          {refreshingSnapshot ? '刷新快照中...' : '刷新快照'}
        </button>
        <button style={S.btn(false)} onClick={() => loadDetail()}>重新加载</button>
        <button style={S.btn(isEditing)} onClick={isEditing ? exitEditing : enterEditing}>
          {isEditing ? '完成编辑' : '高级编辑'}
        </button>
      </div>
      <div style={S.content}>
        {msg && <div style={S.msg}>{msg}</div>}
        {cards.length === 0 ? (
          <div style={S.empty}>
            <p>暂无卡片，点击「+ 添加卡片」创建</p>
          </div>
        ) : (
          <div style={isEditing ? S.boardScroll : S.boardScrollView}>
            <div
              style={{
                ...(isEditing ? S.board : S.boardView),
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
                      ...(isEditing ? S.cardFrame : S.cardFrameView),
                      left: layout.x * GRID_SIZE,
                      top: layout.y * GRID_SIZE,
                      width: layout.w * GRID_SIZE,
                      height: layout.h * GRID_SIZE,
                    }}
                  >
                    <ChartCard
                      card={card}
                      dashboardUuid={dashboardUuid}
                      editable={isEditing}
                      snapshotData={snapshots[card.card_uuid]?.data}
                      snapshotStatus={snapshots[card.card_uuid]?.status}
                      snapshotError={snapshots[card.card_uuid]?.error}
                      onDelete={() => handleDeleteCard(card.card_uuid)}
                      onCopy={() => handleCopyCard(card)}
                      onDragStart={isEditing ? (e) => startDrag(card, index, e) : undefined}
                    />
                    {isEditing && <div style={S.resizeHandle} onMouseDown={(e) => startResize(card, index, e)} />}
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
