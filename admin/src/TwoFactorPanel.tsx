import { useEffect, useState } from 'react'
import { api } from './api'

type Props = {
  onError: (msg: string | null) => void
}

export default function TwoFactorPanel({ onError }: Props) {
  const [enabled, setEnabled] = useState(false)
  const [secret, setSecret] = useState('')
  const [url, setUrl] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [disablePass, setDisablePass] = useState('')
  const [disableCode, setDisableCode] = useState('')

  const load = async () => {
    try {
      const st = await api.totpStatus()
      setEnabled(st.enabled)
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e))
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const start = async () => {
    setBusy(true)
    onError(null)
    try {
      const res = await api.totpSetup()
      setSecret(res.secret)
      setUrl(res.otpauth_url)
      setDone(false)
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const verify = async () => {
    const n = Number(code.trim())
    if (!Number.isFinite(n) || n <= 0) {
      onError('请输入 6 位验证码')
      return
    }
    setBusy(true)
    onError(null)
    try {
      await api.totpVerify(n)
      setEnabled(true)
      setDone(true)
      setCode('')
      setSecret('')
      setUrl('')
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const disable = async () => {
    const pin = Number(disableCode.trim())
    if (!disablePass.trim() || !Number.isFinite(pin) || pin <= 0) {
      onError('关闭 2FA 需要输入登录密码和当前验证码')
      return
    }
    if (!window.confirm('关闭双因素认证？之后登录只需要密码。')) return
    setBusy(true)
    onError(null)
    try {
      await api.totpDisable({ password: disablePass, totp_code: pin })
      setEnabled(false)
      setDone(false)
      setDisablePass('')
      setDisableCode('')
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card-panel">
      <h3 className="card-title">双因素认证 (2FA)</h3>
      <p className="meta mb-1">
        开启后，登录除密码外还需输入认证器 App 生成的 6 位动态码。当前状态：
        {enabled ? '已开启' : '未开启'}
      </p>
      {enabled ? (
        <div className="settings" style={{ marginTop: '0.5rem' }}>
          <label>
            登录密码
            <input
              type="password"
              value={disablePass}
              autoComplete="current-password"
              onChange={(e) => setDisablePass(e.target.value)}
              placeholder="关闭前需要验证身份"
            />
          </label>
          <label>
            当前 6 位验证码
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value)}
              placeholder="000000"
            />
          </label>
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void disable()}>
            关闭 2FA
          </button>
        </div>
      ) : (
        <>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void start()}>
            生成密钥
          </button>
          {secret && (
            <div style={{ marginTop: '1rem' }}>
              <p className="meta">
                用 Google Authenticator / Microsoft Authenticator / 1Password 扫描下面的链接，或手动输入密钥：
              </p>
              <pre className="console" style={{ whiteSpace: 'pre-wrap' }}>{url}</pre>
              <p className="mono" style={{ fontSize: '1.1rem' }}>{secret}</p>
              <div className="settings" style={{ marginTop: '0.75rem' }}>
                <label>
                  6 位验证码
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="123456"
                    inputMode="numeric"
                    disabled={busy}
                  />
                </label>
                <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void verify()}>
                  验证并开启
                </button>
              </div>
            </div>
          )}
        </>
      )}
      {done && <p className="meta">已开启，下次登录需要输入动态码。</p>}
    </div>
  )
}