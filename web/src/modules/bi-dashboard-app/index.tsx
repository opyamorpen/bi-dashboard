import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { apiGet, apiPost, apiDelete } from '../../api'
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
  wideModal: { background: '#fff', borderRadius: 8, padding: 24, width: 720, maxWidth: '92vw', maxHeight: '86vh', overflow: 'auto' },
  msg: { fontSize: 13, padding: '8px 12px', borderRadius: 4, margin: '8px 0', background: '#fff2f0', color: '#ff4d4f', border: '1px solid #ffccc7' },
  textarea: { padding: '8px 12px', borderRadius: 4, border: '1px solid #d9d9d9', fontSize: 14, width: '100%', minHeight: 120, boxSizing: 'border-box' as any, resize: 'vertical' as any },
  btnRow: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  section: { marginBottom: 16 },
  draftCard: { border: '1px solid #e8e8e8', borderRadius: 6, padding: 12, marginBottom: 8, background: '#fafafa' },
}

const App: React.FC = () => {
  const [dashboards, setDashboards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showAiConfig, setShowAiConfig] = useState(false)
  const [showAiReport, setShowAiReport] = useState(false)
  const [newName, setNewName] = useState('')
  const [currentUuid, setCurrentUuid] = useState('')
  const [aiConfig, setAiConfig] = useState<any>({ base_url: '', model: '', supports_vision: true, api_key: '' })
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiImage, setAiImage] = useState<any>(null)
  const [aiDraft, setAiDraft] = useState<any>(null)
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

  useEffect(() => { loadList() }, [])

  async function loadAiConfig() {
    try {
      const res = await apiGet('/bi/ai/config')
      setAiConfig({ ...res.data, api_key: '' })
    } catch (e: any) {
      setMsg(e.message || '加载 AI 配置失败')
    }
  }

  function openAiConfig() {
    loadAiConfig()
    setShowAiConfig(true)
  }

  function openAiReport() {
    setAiPrompt('')
    setAiImage(null)
    setAiDraft(null)
    setShowAiReport(true)
  }

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

  async function handleSaveAiConfig() {
    try {
      await apiPost('/bi/ai/config', aiConfig)
      setShowAiConfig(false)
    } catch (e: any) {
      setMsg(e.message || '保存 AI 配置失败')
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

  async function handleGenerateDraft() {
    if (!aiPrompt.trim()) {
      setMsg('请输入报表需求')
      return
    }
    setAiBusy(true)
    setMsg('')
    try {
      const res = await apiPost('/bi/ai/report-draft', { prompt: aiPrompt.trim(), image: aiImage })
      setAiDraft(res.data?.draft)
    } catch (e: any) {
      setMsg(e.message || '生成报表草稿失败')
    } finally {
      setAiBusy(false)
    }
  }

  async function handleCreateFromDraft() {
    if (!aiDraft) return
    setAiBusy(true)
    try {
      const res = await apiPost('/bi/report/from-draft', { draft: aiDraft })
      const uuid = res.data?.dashboard_uuid
      setShowAiReport(false)
      setAiDraft(null)
      await loadList()
      if (uuid) setCurrentUuid(uuid)
    } catch (e: any) {
      setMsg(e.message || '创建固定报表失败')
    } finally {
      setAiBusy(false)
    }
  }

  if (currentUuid) {
    return <DashboardDetail dashboardUuid={currentUuid} onBack={() => { setCurrentUuid(''); loadList() }} />
  }

  return (
    <div style={S.container}>
      <div style={S.header}>
        <h1 style={S.title}>固定报表中心</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={S.btn(false)} onClick={openAiConfig}>AI 配置</button>
          <button style={S.btn(true)} onClick={openAiReport}>AI 生成报表</button>
          <button style={S.btn(false)} onClick={() => setShowCreate(true)}>手动新建</button>
        </div>
      </div>
      <div style={S.content}>
        {msg && <div style={S.msg}>{msg}</div>}
        {loading ? (
          <div style={S.empty}>加载中...</div>
        ) : dashboards.length === 0 ? (
          <div style={S.empty}>
            <p>暂无仪表盘</p>
            <button style={S.btn(true)} onClick={openAiReport}>生成第一个固定报表</button>
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
      {showAiConfig && (
        <div style={S.modalOverlay} onClick={() => setShowAiConfig(false)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16 }}>AI 配置</h3>
            <div style={S.section}>
              <label style={S.label}>Base URL</label>
              <input style={S.input} value={aiConfig.base_url || ''} onChange={(e) => setAiConfig({ ...aiConfig, base_url: e.target.value })} placeholder="https://api.openai.com/v1" />
            </div>
            <div style={S.section}>
              <label style={S.label}>Model</label>
              <input style={S.input} value={aiConfig.model || ''} onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })} placeholder="gpt-4.1" />
            </div>
            <div style={S.section}>
              <label style={S.label}>API Key</label>
              <input style={S.input} type="password" value={aiConfig.api_key || ''} onChange={(e) => setAiConfig({ ...aiConfig, api_key: e.target.value })} placeholder={aiConfig.has_api_key ? '已配置，留空则不修改' : '请输入 API Key'} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <input type="checkbox" checked={Boolean(aiConfig.supports_vision)} onChange={(e) => setAiConfig({ ...aiConfig, supports_vision: e.target.checked })} />
              支持图片输入
            </label>
            <div style={{ ...S.btnRow, marginTop: 18 }}>
              <button style={S.btn(false)} onClick={() => setShowAiConfig(false)}>取消</button>
              <button style={S.btn(true)} onClick={handleSaveAiConfig}>保存</button>
            </div>
          </div>
        </div>
      )}
      {showAiReport && (
        <div style={S.modalOverlay} onClick={() => setShowAiReport(false)}>
          <div style={S.wideModal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16 }}>AI 报表需求对话框</h3>
            <div style={S.section}>
              <label style={S.label}>报表需求</label>
              <textarea
                style={S.textarea}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="描述报表数据范围、图表类型、分析指标和分析维度。例如：统计当前团队所有工作项总数，按状态、工作项类型、负责人分别做柱状图，并展示最近创建的工作项表格。"
              />
            </div>
            <div style={S.section}>
              <label style={S.label}>图片输入</label>
              <input type="file" accept="image/*" onChange={(e) => handlePickImage(e.target.files?.[0])} />
              {aiImage?.name && <div style={S.cardMeta}>已选择：{aiImage.name}</div>}
            </div>
            <div style={{ ...S.btnRow, marginBottom: 16 }}>
              <button style={S.btn(false)} onClick={() => setShowAiReport(false)}>取消</button>
              <button style={S.btn(true)} onClick={handleGenerateDraft} disabled={aiBusy}>
                {aiBusy ? '生成中...' : '生成草稿'}
              </button>
            </div>
            {aiDraft && (
              <div>
                <h4 style={{ margin: '8px 0' }}>需求确认：{aiDraft.title}</h4>
                {aiDraft.description && <p style={{ color: '#666', fontSize: 13 }}>{aiDraft.description}</p>}
                <div style={S.draftCard}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>数据范围与筛选</div>
                  <div style={{ color: '#666', fontSize: 12 }}>
                    数据范围：{Object.keys(aiDraft.data_scope || {}).length > 0 ? JSON.stringify(aiDraft.data_scope) : '默认工作项数据集'}
                  </div>
                  <div style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
                    筛选条件：{(aiDraft.filters || []).length > 0 ? JSON.stringify(aiDraft.filters) : '无'}
                  </div>
                </div>
                {(aiDraft.cards || []).map((card: any, index: number) => (
                  <div key={index} style={S.draftCard}>
                    <div style={{ fontWeight: 600 }}>{card.title}</div>
                    <div style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
                      图表：{card.chart_type} / 指标：{card.metric?.name || 'count'}({card.metric?.aggregation || 'count'} {card.metric?.field_key || 'uuid'}) / 维度：{card.dimension?.name || '无维度'}
                    </div>
                  </div>
                ))}
                <div style={S.btnRow}>
                  <button style={S.btn(false)} onClick={() => setAiDraft(null)}>重新生成</button>
                  <button style={S.btn(true)} onClick={handleCreateFromDraft} disabled={aiBusy}>
                    确认创建固定报表
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

ReactDOM.render(<App />, document.getElementById('ones-mf-root'))
