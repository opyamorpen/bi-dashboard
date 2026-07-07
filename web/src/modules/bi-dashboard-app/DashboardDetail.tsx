import React, { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost, apiDelete } from '../../api'
import { ChartCard } from './ChartCard'
import { AddCardModal } from './AddCardModal'

const S: any = {
  container: { background: '#f5f5f5', minHeight: '100vh' },
  header: { background: '#fff', padding: '12px 24px', borderBottom: '1px solid #e8e8e8', display: 'flex', alignItems: 'center', gap: 12 },
  title: { fontSize: 18, fontWeight: 600, margin: 0, flex: 1 },
  btn: (p: boolean) => ({ padding: '6px 16px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, background: p ? '#1677ff' : '#f0f0f0', color: p ? '#fff' : '#333' }),
  content: { padding: 16 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 12 },
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
  const [editing, setEditing] = useState(false)
  const [showAddCard, setShowAddCard] = useState(false)

  const loadDetail = useCallback(async () => {
    try {
      const res = await apiGet(`/bi/dashboard/${dashboardUuid}`)
      setDashboard(res.data)
    } catch (e: any) { setMsg(e.message) }
    finally { setLoading(false) }
  }, [dashboardUuid])

  useEffect(() => { loadDetail() }, [loadDetail])

  const cards: any[] = dashboard ? JSON.parse(dashboard.cards_json || '[]') : []

  async function handleAddCard(config: any) {
    try {
      await apiPost(`/bi/dashboard/${dashboardUuid}/card`, config)
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
          <div style={S.grid}>
            {cards.map((card: any) => (
              <ChartCard key={card.card_uuid} card={card} dashboardUuid={dashboardUuid} onDelete={() => handleDeleteCard(card.card_uuid)} />
            ))}
          </div>
        )}
      </div>
      {showAddCard && (
        <AddCardModal datasets={[]} onAdd={handleAddCard} onCancel={() => setShowAddCard(false)} />
      )}
    </div>
  )
}
