import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api, setSession, type AuthSession, type HealthInfo } from './api'

type Props = {
  busy: boolean
  onBusy: (v: boolean, label?: string) => void
  onDone: (session: AuthSession) => void
}

const STEPS = ['环境自检', '面板名称', '最高管理员'] as const

type Check = {
  name: string
  ok: boolean
  detail: string
  hint?: string
}

function strengthOf(pw: string): { score: number; label: string } {
  let score = 0
  if (pw.length >= 8) score += 1
  if (pw.length >= 12) score += 1
  if (pw.length >= 16) score += 1
  if (/[a-z]/.test(pw)) score += 1
  if (/[A-Z]/.test(pw)) score += 1
  if (/[0-9]/.test(pw)) score += 1
  if (/[^a-zA-Z0-9]/.test(pw)) score += 1
  const weak = ['password', '123456', 'qwerty', 'admin', 'letmein', 'welcome']
  if (weak.some((w) => pw.toLowerCase().includes(w))) score = Math.max(0, score - 3)
  const capped = Math.min(5, score)
  const label =
    capped <= 1 ? '很弱' : capped === 2 ? '弱' : capped === 3 ? '中等' : capped === 4 ? '强' : '很强'
  return { score: capped, label }
}

function buildChecks(health: HealthInfo | null, loadError: string | null): Check[] {
  if (loadError) {
    return [
      {
        name: '控制面连通',
        ok: false,
        detail: loadError,
        hint: '确认 cocktail-control 已启动，且端口 11011 未被占用',
      },
    ]
  }
  if (!health) {
    return [{ name: '控制面连通', ok: true, detail: '检查中…' }]
  }
  const dbOk = health.status === 'ok'
  const checks: Check[] = [
    {
      name: '控制面连通',
      ok: true,
      detail: `${health.name} ${health.version} (${health.release})`,
    },
    {
      name: '数据库可用',
      ok: dbOk,
      detail: dbOk ? 'SQLite 可读写' : '数据库不可用，状态为 degraded',
      hint: dbOk ? undefined : '检查 data 目录权限与剩余空间',
    },
    {
      name: '运行平台',
      ok: true,
      detail: `${health.os ?? '未知'} / ${health.arch ?? '未知'}${
        health.distro_name ? ` · ${health.distro_name} ${health.distro_version ?? ''}` : ''
      }`,
    },
    {
      name: '插件宿主',
      ok: health.plugin_host_ok !== false,
      detail: health.plugin_host
        ? `${health.plugin_host} · 已加载 ${health.plugins ?? 0} 个`
        : '未启用',
    },
  ]
  if (health.wsl) {
    checks.push({
      name: '运行环境提示',
      ok: true,
      detail: '检测到 WSL，端口需在 Windows 侧放行后从浏览器访问',
      hint: '如无法访问，可在 WSL 内改用 127.0.0.1 测试',
    })
  }
  if (health.setup_required === false) {
    checks.push({
      name: '初始化状态',
      ok: false,
      detail: '该面板已完成初始化',
      hint: '若忘记密码，可用 cocktail-control --reset-password 重置',
    })
  }
  return checks
}

export default function SetupPage({ busy, onBusy, onDone }: Props) {
  const [step, setStep] = useState(0)
  const [panelName, setPanelName] = useState('Cocktail Manager')
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [health, setHealth] = useState<HealthInfo | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)

  const loadHealth = async () => {
    setChecking(true)
    setLoadError(null)
    try {
      setHealth(await api.health())
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e))
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    void loadHealth()
  }, [])

  const checks = buildChecks(health, loadError)
  const blocking = checks.some((c) => !c.ok)

  const canNext = () => {
    if (step === 0) return !blocking
    if (step === 1) return panelName.trim().length > 0
    if (username.trim().length < 3) return false
    if (password.length < 8) return false
    if (password !== confirm) return false
    return true
  }

  const strength = strengthOf(password)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (step < STEPS.length - 1) {
      if (canNext()) setStep((s) => s + 1)
      return
    }
    if (!canNext()) return
    onBusy(true, '正在创建最高管理员…')
    setError(null)
    try {
      const session = await api.setup({
        username: username.trim(),
        password,
        panel_name: panelName.trim(),
      })
      setSession(session)
      onDone(session)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      onBusy(false)
    }
  }

  return (
    <div className="auth-gate">
      <header className="topbar">
        <div className="topbar-brand">
          <div className="brand-mark" aria-hidden>
            <img src="/logo.png" alt="" className="brand-logo-img" />
          </div>
          <div>
            <h1>Cocktail</h1>
            <span className="brand-sub">首次初始化</span>
          </div>
        </div>
      </header>
      <main className="auth-gate-main">
        <form className="auth-card" onSubmit={submit}>
          <p className="page-eyebrow">第一次打开控制面</p>
          <h2>
            {step === 0 ? '环境自检' : step === 1 ? '给面板起个名字' : '设置最高管理员'}
          </h2>
          <p className="meta">
            {step === 0
              ? '下面几项会在开始前自动核对，全部通过后才能继续。'
              : step === 1
                ? '这个名字会显示在登录页与浏览器标题上，之后可在设置里修改。'
                : '这是控制面的唯一超级管理员，将写入本机 SQLite（data/cocktail.db），完成后每次进入都需要登录。'}
          </p>

          <ol className="wizard-steps">
            {STEPS.map((label, i) => (
              <li key={label} className={i === step ? 'active' : i < step ? 'done' : undefined}>
                <span className="step-num">{i + 1}</span>
                {label}
              </li>
            ))}
          </ol>

          {step === 0 && (
            <div className="setup-intro">
              <ul className="home-help">
                {checks.map((c) => (
                  <li key={c.name}>
                    <strong>{c.ok ? '通过' : '未通过'}</strong> · {c.name} · {c.detail}
                    {c.hint && (
                      <div className="meta" style={{ marginTop: '0.25rem' }}>
                        建议：{c.hint}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              <div className="wizard-actions" style={{ marginTop: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={checking}
                  onClick={() => void loadHealth()}
                >
                  {checking ? '检测中…' : '重新检测'}
                </button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="settings">
              <label>
                控制面显示名称
                <input
                  value={panelName}
                  onChange={(e) => setPanelName(e.target.value)}
                  autoFocus
                />
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="settings">
              <label>
                用户名
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                />
              </label>
              <label>
                密码（至少 8 位）
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </label>
              {password && (
                <p className="meta">
                  强度：{strength.label}
                  <span style={{ marginLeft: '0.5rem' }}>
                    {'■'.repeat(strength.score)}
                    {'□'.repeat(5 - strength.score)}
                  </span>
                </p>
              )}
              <label>
                确认密码
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                />
              </label>
              {password && confirm && password !== confirm && (
                <p className="field-warn">两次密码不一致</p>
              )}
            </div>
          )}

          {error && (
            <div className="error-banner" role="alert">
              <span>
                <i className="fa fa-exclamation-circle" /> {error}
              </span>
            </div>
          )}

          <div className="wizard-actions">
            {step > 0 ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setStep((s) => s - 1)}
              >
                上一步
              </button>
            ) : (
              <span />
            )}
            <span className="spacer" />
            <button type="submit" className="btn btn-primary" disabled={busy || !canNext()}>
              {step < STEPS.length - 1 ? '继续' : '创建并进入'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}