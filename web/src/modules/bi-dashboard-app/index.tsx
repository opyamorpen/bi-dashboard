import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { apiGet, apiPost, apiDelete, getTeamUUID, BiApiError } from '../../api'
import { DashboardDetail } from './DashboardDetail'

const S: any = {
  container: { background: '#f5f5f5', minHeight: '100vh', padding: 0 },
  header: { background: '#fff', padding: '16px 24px', borderBottom: '1px solid #e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 20, fontWeight: 600, margin: 0 },
  content: { padding: 24 },
  card: { background: '#fff', borderRadius: 8, border: '1px solid #e8e8e8', padding: 20, marginBottom: 16, cursor: 'pointer', transition: 'box-shadow 0.2s' },
  cardHover: { boxShadow: '0 2px 8px rgba(0,0,0,0.12)' },
  cardTitle: { fontSize: 16, fontWeight: 600, marginBottom: 8 },
  cardMeta: { fontSize: 12, color: '#999' },
  btn: (primary: boolean) => ({ padding: '8px 20px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, background: primary ? '#1677ff' : '#f0f0f0', color: primary ? '#fff' : '#333' }),
  empty: { textAlign: 'center', padding: 60, color: '#999' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 },
  input: { padding: '8px 12px', borderRadius: 4, border: '1px solid #d9d9d9', fontSize: 14, width: '100%', boxSizing: 'border-box' as any },
  label: { fontSize: 13, fontWeight: 500, marginBottom: 6, display: 'block' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { background: '#fff', borderRadius: 8, padding: 24, width: 400, maxWidth: '90vw' },
  msg: { fontSize: 13, padding: '8px 12px', borderRadius: 4, margin: '8px 0', background: '#fff2f0', color: '#ff4d4f', border: '1px solid #ffccc7' },
}

const App: React.FC = () => {
  const [dashboards, setDashboards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [currentUuid, setCurrentUuid] = useState('')

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

  useEffect(() => { loadList() }, [])

  async function handleCreate() {
    if (!newName.trim()) return
    try {
      await apiPost('/bi/dashboard', { name: newName.trim() })
      setShowCreate(false)
      setNewName('')
      await loadList()
    } catch (e: any) { setMsg(e.message) }
  }

  async function handleDelete(uuid: string, name: string) {
    if (!confirm(`确认删除仪表盘「${name}」？`)) return
    try {
      await apiDelete(`/bi/dashboard/${uuid}`)
      await loadList()
    } catch (e: any) { setMsg(e.message) }
  }

  if (currentUuid) {
    return <DashboardDetail dashboardUuid={currentUuid} onBack={() => { setCurrentUuid(''); loadList() }} />
  }

  return (
    <div style={S.container}>
      <div style={S.header}>
        <h1 style={S.title}>BI 仪表盘</h1>
        <button style={S.btn(true)} onClick={() => setShowCreate(true)}>+ 新建仪表盘</button>
      </div>
      <div style={S.content}>
        {msg && <div style={S.msg}>{msg}</div>}
        {loading ? (
          <div style={S.empty}>加载中...</div>
        ) : dashboards.length === 0 ? (
          <div style={S.empty}>
            <p>暂无仪表盘</p>
            <button style={S.btn(true)} onClick={() => setShowCreate(true)}>创建第一个仪表盘</button>
          </div>
        ) : (
          <div style={S.grid}>
            {dashboards.map((d: any) => (
              <div key={d.dashboard_uuid} style={S.card} onClick={() => setCurrentUuid(d.dashboard_uuid)}>
                <div style={S.cardTitle}>{d.name}</div>
                <div style={S.cardMeta}>
                  更新于 {d.updated_at ? new Date(d.updated_at).toLocaleString('zh-CN') : '-'}
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }} onClick={(e) => e.stopPropagation()}>
                  <button style={{ ...S.btn(false), fontSize: 12, padding: '4px 12px' }} onClick={() => setCurrentUuid(d.dashboard_uuid)}>查看</button>
                  <button style={{ ...S.btn(false), fontSize: 12, padding: '4px 12px', color: '#ff4d4f' }} onClick={() => handleDelete(d.dashboard_uuid, d.name)}>删除</button>
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
            <input style={S.input} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="输入仪表盘名称" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }} />
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button style={S.btn(false)} onClick={() => setShowCreate(false)}>取消</button>
              <button style={S.btn(true)} onClick={handleCreate}>创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

ReactDOM.render(<App />, document.getElementById('ones-mf-root'))
