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
}

function formatDraftSummary(draft: any): string {
  if (!draft) return '已生成报表卡片草稿。'
  const filters = (draft.filters || []).length > 0 ? JSON.stringify(draft.filters) : '无'
  const scope =
    Object.keys(draft.data_scope || {}).length > 0
      ? JSON.stringify(draft.data_scope)
      : '默认工作项数据集'
  const cards = (draft.cards || [])
    .map((card: any, index: number) => {
      const metric = `${card.metric?.name || 'count'}(${card.metric?.aggregation || 'count'} ${card.metric?.field_key || 'uuid'})`
      const dimension = card.dimension?.name || card.dimension?.field_key || '无维度'
      return `${index + 1}. ${card.title}：${card.chart_type}，指标 ${metric}，维度 ${dimension}`
    })
    .join('\n')
  return [
    `我理解的报表卡片需求：${draft.title}`,
    draft.description ? `说明：${draft.description}` : '',
    `数据范围：${scope}`,
    `筛选条件：${filters}`,
    `卡片设计：\n${cards || '暂无卡片'}`,
    '可以继续告诉我如何调整，确认后我会把这些卡片添加到当前仪表盘。',
  ]
    .filter(Boolean)
    .join('\n')
}

const AiReportDialogContent: React.FC<any> = ({
  aiBusy,
  aiDraft,
  aiImage,
  aiMessages,
  aiPrompt,
  setAiDraft,
  setAiImage,
  setAiMessages,
  setAiPrompt,
  handleGenerateDraft,
  handleCreateFromDraft,
  handlePickImage,
  handlePasteImage,
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
  const processText = aiBusy
    ? '执行过程：\n1. 读取当前对话和附件上下文\n2. 解析数据范围、指标、维度和图表类型\n3. 校验字段和图表白名单\n4. 生成可添加到仪表盘的卡片草稿'
    : aiDraft
      ? '执行过程：\n1. 已完成需求解析\n2. 已完成字段和图表类型校验\n3. 等待继续调整或确认添加'
      : aiMessages.length > 0
        ? '执行过程：AI 正在按配置的需求澄清流程继续确认报表的数据范围、图表类型、指标、维度和筛选条件。'
        : '执行过程：等待输入需求；可以粘贴截图或点击左下角 + 添加图片。'

  return (
    <>
      <div style={S.chatHeader}>
        <h3 style={S.chatTitle}>AI 报表卡片需求对话</h3>
        <button style={S.btn(false)} onClick={onCancel}>
          关闭
        </button>
      </div>
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
              <strong>
                {item.role === 'user' ? '用户' : item.role === 'process' ? '过程' : 'AI'}：
              </strong>
              {item.content}
              {(item.images || []).map((image: any, imageIndex: number) => (
                <span key={`${index}-${imageIndex}`}>
                  <img src={image.data_url} alt={image.name || '图片'} style={S.chatImage} />
                  <span style={S.chatImageName}>{image.name || '图片'}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
        <div style={S.chatMsgWrap('process')}>
          <div style={S.chatMsg('process')}>{processText}</div>
        </div>
      </div>
      <div style={S.composer}>
        <div style={S.composerBox}>
          <textarea
            style={S.composerInput}
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
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
                <button
                  style={{ ...S.btn(false), marginRight: 8 }}
                  onClick={() => {
                    setAiDraft(null)
                    setAiMessages([])
                    setAiPrompt('')
                  }}
                >
                  重新开始
                </button>
              )}
              {aiDraft && (
                <button
                  style={{ ...S.btn(true), marginRight: 8 }}
                  onClick={handleCreateFromDraft}
                  disabled={aiBusy}
                >
                  确认添加
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
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiImage, setAiImage] = useState<any>(null)
  const [aiDraft, setAiDraft] = useState<any>(null)
  const [aiMessages, setAiMessages] = useState<any[]>([])
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

  function openAiReport() {
    setAiPrompt('')
    setAiImage(null)
    setAiDraft(null)
    setAiMessages([])
    setShowAiReport(true)
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
      setMsg(aiDraft ? '请输入调整指令或添加图片' : '请输入报表需求或添加图片')
      return
    }
    const userText = aiPrompt.trim() || '请分析这张图片里的报表需求'
    setAiBusy(true)
    setMsg('')
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
      const draft = result.status === 'ready' ? result.draft : null
      const assistantText = [
        result.reply ||
          (draft ? '已整理出报表配置草稿，请确认是否添加。' : '我需要继续确认报表需求。'),
        draft ? `\n已整理的配置草稿：\n${formatDraftSummary(draft)}` : '',
      ]
        .filter(Boolean)
        .join('\n')
      setAiDraft(draft)
      setAiMessages([...nextMessages, { role: 'assistant', content: assistantText }])
    } catch (e: any) {
      setMsg(e.message || '生成报表草稿失败')
    } finally {
      setAiBusy(false)
    }
  }

  async function handleCreateFromDraft() {
    if (!aiDraft || !currentUuid) return
    setAiBusy(true)
    try {
      await apiPost('/bi/report/from-draft', { draft: aiDraft, dashboard_uuid: currentUuid })
      setShowAiReport(false)
      setAiDraft(null)
      setAiMessages([])
      setAiPrompt('')
      setAiImage(null)
      setDetailReloadToken((value) => value + 1)
    } catch (e: any) {
      setMsg(e.message || '添加 AI 卡片失败')
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
                aiBusy={aiBusy}
                aiDraft={aiDraft}
                aiImage={aiImage}
                aiMessages={aiMessages}
                aiPrompt={aiPrompt}
                setAiDraft={setAiDraft}
                setAiImage={setAiImage}
                setAiMessages={setAiMessages}
                setAiPrompt={setAiPrompt}
                handleGenerateDraft={handleGenerateDraft}
                handleCreateFromDraft={handleCreateFromDraft}
                handlePickImage={handlePickImage}
                handlePasteImage={handlePasteImage}
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
