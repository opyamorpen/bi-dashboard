import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import { apiGet, apiPost } from '../../api'

const S: any = {
  page: { padding: 24, background: '#fff', minHeight: '100vh', color: '#1f2329' },
  title: { fontSize: 20, fontWeight: 600, margin: '0 0 20px' },
  form: { maxWidth: 640 },
  section: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: 500, marginBottom: 6, display: 'block' },
  input: {
    padding: '8px 12px',
    borderRadius: 4,
    border: '1px solid #d9d9d9',
    fontSize: 14,
    width: '100%',
    boxSizing: 'border-box' as any,
  },
  textarea: {
    padding: '8px 12px',
    borderRadius: 4,
    border: '1px solid #d9d9d9',
    fontSize: 14,
    width: '100%',
    minHeight: 220,
    lineHeight: 1.6,
    boxSizing: 'border-box' as any,
    resize: 'vertical' as any,
  },
  help: { marginTop: 4, color: '#86909c', fontSize: 12 },
  row: { display: 'flex', alignItems: 'center', gap: 8 },
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
  msg: (ok: boolean) => ({
    fontSize: 13,
    padding: '8px 12px',
    borderRadius: 4,
    marginBottom: 16,
    background: ok ? '#f6ffed' : '#fff2f0',
    color: ok ? '#52c41a' : '#ff4d4f',
    border: `1px solid ${ok ? '#b7eb8f' : '#ffccc7'}`,
  }),
}

const ConfigApp: React.FC = () => {
  const [config, setConfig] = useState<any>({
    base_url: '',
    model: '',
    supports_vision: true,
    api_key: '',
    skill_prompt: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [ok, setOk] = useState(false)

  async function load() {
    setLoading(true)
    setMessage('')
    try {
      const res = await apiGet('/bi/ai/config')
      setConfig({ ...(res.data || {}), api_key: '' })
    } catch (e: any) {
      setOk(false)
      setMessage(e.message || '加载 AI 配置失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function save() {
    setSaving(true)
    setMessage('')
    try {
      await apiPost('/bi/ai/config', config)
      setOk(true)
      setMessage('AI 配置已保存')
      await load()
    } catch (e: any) {
      setOk(false)
      setMessage(e.message || '保存 AI 配置失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={S.page}>
      <h1 style={S.title}>AI 配置</h1>
      {message && <div style={S.msg(ok)}>{message}</div>}
      {loading ? (
        <div>加载中...</div>
      ) : (
        <div style={S.form}>
          <div style={S.section}>
            <label style={S.label}>Base URL</label>
            <input
              style={S.input}
              value={config.base_url || ''}
              onChange={(e) => setConfig({ ...config, base_url: e.target.value })}
              placeholder="https://api.openai.com/v1"
            />
            <div style={S.help}>支持 OpenAI 兼容的 /chat/completions 服务地址。</div>
          </div>
          <div style={S.section}>
            <label style={S.label}>Model</label>
            <input
              style={S.input}
              value={config.model || ''}
              onChange={(e) => setConfig({ ...config, model: e.target.value })}
              placeholder="gpt-4.1"
            />
          </div>
          <div style={S.section}>
            <label style={S.label}>API Key</label>
            <input
              style={S.input}
              type="password"
              value={config.api_key || ''}
              onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
              placeholder={config.has_api_key ? '已配置，留空则不修改' : '请输入 API Key'}
            />
            <div style={S.help}>保存后不会在前端回显明文密钥。</div>
          </div>
          <div style={S.section}>
            <label style={S.row}>
              <input
                type="checkbox"
                checked={Boolean(config.supports_vision)}
                onChange={(e) => setConfig({ ...config, supports_vision: e.target.checked })}
              />
              支持图片输入
            </label>
          </div>
          <div style={S.section}>
            <label style={S.label}>报表需求澄清 Skill</label>
            <textarea
              style={S.textarea}
              value={config.skill_prompt || ''}
              onChange={(e) => setConfig({ ...config, skill_prompt: e.target.value })}
              placeholder="配置 AI 在报表需求对话中的确认流程和输出规则"
            />
            <div style={S.help}>
              用于约束 AI
              如何追问数据范围、图表类型、指标、维度和筛选条件，并在需求明确后转换为插件支持的报表配置。
            </div>
          </div>
          <button style={S.btn(true)} onClick={save} disabled={saving}>
            {saving ? '保存中...' : '保存配置'}
          </button>
        </div>
      )}
    </div>
  )
}

ReactDOM.render(<ConfigApp />, document.getElementById('ones-mf-root'))
