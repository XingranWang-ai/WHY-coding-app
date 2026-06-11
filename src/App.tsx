import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type {
  CSSProperties,
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react'
import {
  challengesByLanguage,
  LANGUAGE_OPTIONS,
  TOTAL_CHALLENGES,
  type Challenge,
  type Language,
  type LineExplanation,
} from './challenges'
import { openExternalUrl } from './externalBrowser'
import {
  activateProfile,
  createProfile,
  fetchLeaderboard,
  incrementSolvedCount,
  loadAccounts,
  loadCachedLeaderboard,
  loadProfile,
  loadSolvedCount,
  saveProfile,
  syncPlayer,
  type LeaderboardEntry,
  type PlayerAccount,
  type PlayerProfile,
} from './leaderboard'
import {
  OnboardingGate,
} from './onboarding'
import {
  APP_VERSION,
  APP_VERSION_CODE,
  checkForUpdate,
  fetchLatestVersion,
  getSkippedVersion,
  skipVersion,
  type UpdateInfo,
} from './update'
import './App.css'

type Mode = 'learn' | 'focus'
type Phase = 'reading' | 'typing' | 'complete'
type Speed = 'slow' | 'normal' | 'fast'
type DrawerPanel = 'account' | 'feedback' | 'donate' | 'settings' | null
type AppPage = 'home' | 'practice' | 'leaderboard'
type SyncStatus = 'idle' | 'syncing' | 'online' | 'offline'
type ManualUpdateStatus = 'idle' | 'checking' | 'latest' | 'error'

type ThemeSettings = {
  background: string
  accent: string
}

const READ_SECONDS = 5
const SETTINGS_KEY = 'why-app-settings-v2'
const DEFAULT_SETTINGS: ThemeSettings = {
  background: '#f4efe5',
  accent: '#316bc7',
}

const TYPE_INTERVALS: Record<Speed, number> = {
  slow: 220,
  normal: 130,
  fast: 75,
}

const SPEED_OPTIONS: Array<{ value: Speed; label: string }> = [
  { value: 'slow', label: '慢' },
  { value: 'normal', label: '中' },
  { value: 'fast', label: '快' },
]

const BACKGROUND_PRESETS = ['#f4efe5', '#10100f', '#111827', '#211813']
const ACCENT_PRESETS = ['#316bc7', '#df6c36', '#dc4c4c', '#d6a534', '#e7e2d8']
const HEX_COLOR = /^#[0-9a-f]{6}$/i
const MAX_AVATAR_DATA_LENGTH = 9000

function compactExplanation(text: string, maxLength = 150) {
  const firstSentence = text.match(/^.*?[。！？]/)?.[0] ?? text
  return firstSentence.length <= maxLength
    ? firstSentence
    : `${firstSentence.slice(0, maxLength).trim()}…`
}

function getExplanationText(
  mode: Mode,
  level: number,
  challenge: Challenge,
  explanation: LineExplanation,
) {
  if (challenge.source === 'legacy') {
    return level === 1
      ? explanation.simple
      : level === 2
        ? explanation.detail
        : explanation.deep
  }

  if (mode === 'focus') {
    return level === 1
      ? compactExplanation(explanation.detail, 90)
      : level === 2
        ? explanation.detail
        : compactExplanation(explanation.deep, 220)
  }

  if (level === 1) return explanation.simple
  if (level === 2) {
    return `${explanation.simple}\n\n进一步理解\n${explanation.detail}`
  }
  return `${explanation.simple}\n\n进一步理解\n${explanation.detail}\n\n底层原理\n${explanation.deep}`
}

const syntaxPattern =
  /(\b(?:const|let|for|of|if|else|return|new|true|false|null|undefined|int|double|String|Map|HashMap|class|public|private|static|void|boolean|char|in|def|lambda|None|True|False|import|from|as|print)\b|f?['"][^'"]*['"]|\b\d+(?:\.\d+)?\b|\/\/.*$|#.*$)/g

function highlightCode(line: string): ReactNode[] {
  return line.split(syntaxPattern).map((part, index) => {
    if (!part) return null
    let className = ''
    if (
      /^(const|let|for|of|if|else|return|new|true|false|null|undefined|int|double|String|Map|HashMap|class|public|private|static|void|boolean|char|in|def|lambda|None|True|False|import|from|as|print)$/.test(
        part,
      )
    ) {
      className = 'token-keyword'
    } else if (/^f?['"]/.test(part)) {
      className = 'token-string'
    } else if (/^\d/.test(part)) {
      className = 'token-number'
    } else if (part.startsWith('//') || part.startsWith('#')) {
      className = 'token-comment'
    }
    return (
      <span className={className} key={`${part}-${index}`}>
        {part}
      </span>
    )
  })
}

function parseHex(hex: string) {
  const normalized = hex.replace('#', '')
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function mixHex(first: string, second: string, secondWeight: number) {
  const a = parseHex(first)
  const b = parseHex(second)
  const channel = (left: number, right: number) =>
    Math.round(left * (1 - secondWeight) + right * secondWeight)
      .toString(16)
      .padStart(2, '0')
  return `#${channel(a.r, b.r)}${channel(a.g, b.g)}${channel(a.b, b.b)}`
}

function luminance(hex: string) {
  const { r, g, b } = parseHex(hex)
  const linear = [r, g, b].map((value) => {
    const channel = value / 255
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

function rgba(hex: string, alpha: number) {
  const { r, g, b } = parseHex(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function loadSettings(): ThemeSettings {
  try {
    const stored = window.localStorage.getItem(SETTINGS_KEY)
    if (!stored) return DEFAULT_SETTINGS
    const parsed = JSON.parse(stored) as Partial<ThemeSettings>
    return {
      background: HEX_COLOR.test(parsed.background ?? '')
        ? (parsed.background as string)
        : DEFAULT_SETTINGS.background,
      accent: HEX_COLOR.test(parsed.accent ?? '')
        ? (parsed.accent as string)
        : DEFAULT_SETTINGS.accent,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function createThemeStyle(settings: ThemeSettings) {
  const lightBackground = luminance(settings.background) > 0.48
  const text = lightBackground ? '#171715' : '#f2eee6'
  const opposite = lightBackground ? '#000000' : '#ffffff'
  const buttonText = luminance(settings.accent) > 0.48 ? '#171715' : '#ffffff'

  return {
    '--bg': settings.background,
    '--surface': mixHex(settings.background, opposite, lightBackground ? 0.05 : 0.04),
    '--surface-2': mixHex(settings.background, opposite, lightBackground ? 0.09 : 0.08),
    '--text': text,
    '--muted': mixHex(settings.background, text, 0.56),
    '--faint': mixHex(settings.background, text, 0.35),
    '--line': mixHex(settings.background, text, 0.14),
    '--accent': settings.accent,
    '--accent-soft': rgba(settings.accent, 0.14),
    '--accent-border': rgba(settings.accent, 0.55),
    '--button-text': buttonText,
  } as CSSProperties
}

async function resizeAvatar(file: File) {
  if (!file.type.startsWith('image/')) throw new Error('请选择图片文件')
  if (file.size > 10 * 1024 * 1024) throw new Error('图片不能超过 10MB')

  const objectUrl = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = objectUrl
    await image.decode()

    const render = (size: number, quality: number) => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const context = canvas.getContext('2d')
      if (!context) throw new Error('头像处理失败')

      const cropSize = Math.min(image.naturalWidth, image.naturalHeight)
      const sourceX = (image.naturalWidth - cropSize) / 2
      const sourceY = (image.naturalHeight - cropSize) / 2
      context.fillStyle = '#f4efe5'
      context.fillRect(0, 0, size, size)
      context.drawImage(
        image,
        sourceX,
        sourceY,
        cropSize,
        cropSize,
        0,
        0,
        size,
        size,
      )
      return canvas.toDataURL('image/jpeg', quality)
    }

    for (const [size, quality] of [
      [72, 0.72],
      [64, 0.62],
      [56, 0.52],
    ] as const) {
      const avatar = render(size, quality)
      if (avatar.length <= MAX_AVATAR_DATA_LENGTH) return avatar
    }
    throw new Error('图片内容过于复杂，请换一张')
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function Avatar({
  profile,
  size = 'medium',
}: {
  profile: Pick<PlayerProfile, 'nickname' | 'avatar'> | null
  size?: 'small' | 'medium' | 'large' | 'hero'
}) {
  const initial = profile?.nickname.trim().slice(0, 1).toUpperCase() || '?'
  return (
    <span className={`avatar avatar-${size}`} aria-hidden="true">
      {profile?.avatar ? <img src={profile.avatar} alt="" /> : initial}
    </span>
  )
}

function ModeSelect({
  language,
  profile,
  solved,
  syncStatus,
  onLanguageChange,
  onOpenLeaderboard,
  onStart,
}: {
  language: Language
  profile: PlayerProfile | null
  solved: number
  syncStatus: SyncStatus
  onLanguageChange: (language: Language) => void
  onOpenLeaderboard: () => void
  onStart: (mode: Mode) => void
}) {
  const [selected, setSelected] = useState<Mode>('learn')

  return (
    <main className="welcome">
      <div className="welcome-top">
        <div className="welcome-mark" aria-hidden="true">
          ?
        </div>
        <button
          className="welcome-rank"
          type="button"
          onClick={onOpenLeaderboard}
        >
          <span className="welcome-avatar">
            <Avatar profile={profile} size="small" />
            <i className={`network-dot ${syncStatus}`} aria-hidden="true" />
          </span>
          <span>
            <strong>{profile?.nickname ?? '排行榜'}</strong>
            <small>{solved} 题</small>
          </span>
        </button>
      </div>
      <div className="welcome-copy">
        <h1>Why</h1>
      </div>

      <div className="mode-list" aria-label="选择学习模式">
        <button
          type="button"
          className={selected === 'learn' ? 'mode-card selected' : 'mode-card'}
          onClick={() => setSelected('learn')}
        >
          <span className="mode-copy">
            <strong>学习模式</strong>
            <small>逐句讲透，适合从零学</small>
          </span>
          <span className="radio" aria-hidden="true" />
        </button>
        <button
          type="button"
          className={selected === 'focus' ? 'mode-card selected' : 'mode-card'}
          onClick={() => setSelected('focus')}
        >
          <span className="mode-copy">
            <strong>精简模式</strong>
            <small>保留重点，快速理解</small>
          </span>
          <span className="radio" aria-hidden="true" />
        </button>
      </div>

      <fieldset className="language-select">
        <legend>练习语言</legend>
        <div>
          {LANGUAGE_OPTIONS.map((option) => (
            <button
              type="button"
              className={language === option ? 'active' : ''}
              key={option}
              onClick={() => onLanguageChange(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </fieldset>

      <button
        className="leaderboard-button"
        type="button"
        onClick={onOpenLeaderboard}
      >
        <span aria-hidden="true">&#9733;</span>
        联网排行榜
        <small>{solved} 题</small>
      </button>

      <button className="start-button" type="button" onClick={() => onStart(selected)}>
        开始一题
        <span aria-hidden="true">{TOTAL_CHALLENGES} →</span>
      </button>
    </main>
  )
}

function ColorSetting({
  label,
  value,
  presets,
  onChange,
}: {
  label: string
  value: string
  presets: string[]
  onChange: (color: string) => void
}) {
  return (
    <div className="color-setting">
      <div className="setting-label">
        <span>{label}</span>
        <code>{value.toUpperCase()}</code>
      </div>
      <div className="color-options">
        {presets.map((color) => (
          <button
            type="button"
            aria-label={`${label} ${color}`}
            className={value.toLowerCase() === color.toLowerCase() ? 'selected' : ''}
            key={color}
            onClick={() => onChange(color)}
            style={{ backgroundColor: color }}
          />
        ))}
        <label className="custom-color" aria-label={`自定义${label}`}>
          <span>+</span>
          <input
            type="color"
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        </label>
      </div>
    </div>
  )
}

function NicknameGate({
  open,
  profile,
  canClose,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean
  profile: PlayerProfile | null
  canClose: boolean
  busy: boolean
  error: string
  onClose: () => void
  onSubmit: (nickname: string, avatar?: string) => void
}) {
  const [nickname, setNickname] = useState(profile?.nickname ?? '')
  const [avatar, setAvatar] = useState(profile?.avatar)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [avatarError, setAvatarError] = useState('')

  if (!open) return null

  const submitNickname = (event: FormEvent) => {
    event.preventDefault()
    const value = nickname.trim()
    if (value.length < 2 || value.length > 12) return
    onSubmit(value, avatar)
  }

  return (
    <div className="profile-gate" role="dialog" aria-modal="true" aria-label="账号资料">
      <form className="profile-card" onSubmit={submitNickname}>
        <span className="profile-kicker">WHY ACCOUNT</span>
        <h2>{profile ? '编辑账号' : '添加账号'}</h2>
        <p className="profile-intro">
          建议上传头像。昵称、头像和刷题数会显示在联网排行榜中。
        </p>
        <label className="avatar-upload">
          <Avatar profile={{ nickname: nickname || '?', avatar }} size="large" />
          <span>
            <strong>{avatarBusy ? '处理中…' : avatar ? '更换头像' : '上传头像'}</strong>
            <small>让排行榜里的你更好认</small>
          </span>
          <input
            type="file"
            accept="image/*"
            disabled={avatarBusy}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0]
              event.currentTarget.value = ''
              if (!file) return
              setAvatarBusy(true)
              setAvatarError('')
              void resizeAvatar(file)
                .then(setAvatar)
                .catch((avatarProblem: unknown) => {
                  setAvatarError(
                    avatarProblem instanceof Error
                      ? avatarProblem.message
                      : '头像处理失败',
                  )
                })
                .finally(() => setAvatarBusy(false))
            }}
          />
        </label>
        {avatarError ? (
          <small className="profile-error">{avatarError}</small>
        ) : null}
        <label htmlFor="nickname">昵称</label>
        <input
          id="nickname"
          type="text"
          value={nickname}
          minLength={2}
          maxLength={12}
          autoComplete="nickname"
          autoFocus
          placeholder="2 - 12 个字符"
          onChange={(event) => setNickname(event.target.value)}
        />
        {error ? <small className="profile-error">{error}</small> : null}
        <button
          type="submit"
          disabled={busy || avatarBusy || nickname.trim().length < 2}
        >
          {busy ? '正在连接…' : profile ? '保存资料' : '使用这个账号'}
        </button>
        {canClose ? (
          <button className="profile-cancel" type="button" onClick={onClose}>
            取消
          </button>
        ) : null}
      </form>
    </div>
  )
}

function LeaderboardPage({
  profile,
  solved,
  entries,
  syncStatus,
  error,
  onRefresh,
  onEditProfile,
  onBack,
}: {
  profile: PlayerProfile | null
  solved: number
  entries: LeaderboardEntry[]
  syncStatus: SyncStatus
  error: string
  onRefresh: () => void
  onEditProfile: () => void
  onBack: () => void
}) {
  const statusText =
    syncStatus === 'syncing'
      ? '同步中'
      : syncStatus === 'online'
        ? '已联网'
        : syncStatus === 'offline'
          ? '离线缓存'
          : '待同步'

  const topThree = [entries[1], entries[0], entries[2]]
  const topRanks = [2, 1, 3]

  return (
    <main className="leaderboard-page">
      <header className="leaderboard-header">
        <button type="button" aria-label="返回" onClick={onBack}>
          <span aria-hidden="true">‹</span>
        </button>
        <h1>排行榜</h1>
        <button
          type="button"
          onClick={onRefresh}
          disabled={syncStatus === 'syncing'}
        >
          刷新
        </button>
      </header>

      <section className="rank-profile">
        <button type="button" onClick={onEditProfile}>
          <Avatar profile={profile} size="medium" />
          <span>
            <strong>{profile?.nickname ?? '设置昵称'}</strong>
            <small>
              <i className={`network-dot ${syncStatus}`} aria-hidden="true" />
              {statusText}
            </small>
          </span>
        </button>
        <div>
          <strong>{solved}</strong>
          <span>已刷题目</span>
        </div>
      </section>

      {error ? <p className="leaderboard-error">{error}</p> : null}

      <section className="podium" aria-label="前三名">
        {topThree.map((entry, index) => {
          const rank = topRanks[index]
          return (
            <article
              className={`podium-entry rank-${rank} ${entry?.id === profile?.id ? 'current' : ''}`}
              key={entry?.id ?? `empty-${rank}`}
            >
              <span className="podium-rank">{rank}</span>
              <Avatar profile={entry ?? null} size={rank === 1 ? 'hero' : 'large'} />
              <strong>{entry?.nickname ?? '等待上榜'}</strong>
              <b>{entry ? `${entry.solved} 题` : '—'}</b>
              <div aria-hidden="true" />
            </article>
          )
        })}
      </section>

      <section className="rank-list-section">
        <div className="rank-list-title">
          <span>全部排名</span>
          <small>{entries.length} 人</small>
        </div>
        {entries.length > 3 ? (
          <ol className="leaderboard-list">
            {entries.slice(3, 50).map((entry, index) => (
              <li
                className={entry.id === profile?.id ? 'current' : ''}
                key={entry.id}
              >
                <span>{String(index + 4).padStart(2, '0')}</span>
                <Avatar profile={entry} size="small" />
                <strong>{entry.nickname}</strong>
                <b>{entry.solved} 题</b>
              </li>
            ))}
          </ol>
        ) : (
          <div className="leaderboard-empty">
            {syncStatus === 'syncing' ? '正在读取排名…' : '第四名还在路上'}
          </div>
        )}
      </section>
    </main>
  )
}

function SideDrawer({
  open,
  panel,
  profile,
  accounts,
  language,
  settings,
  updateStatus,
  onClose,
  onPanelChange,
  onSwitchAccount,
  onAddAccount,
  onEditProfile,
  onOpenTutorial,
  onCheckUpdate,
  onOpenLeaderboard,
  onLanguageChange,
  onSettingsChange,
}: {
  open: boolean
  panel: DrawerPanel
  profile: PlayerProfile | null
  accounts: PlayerAccount[]
  language: Language
  settings: ThemeSettings
  updateStatus: ManualUpdateStatus
  onClose: () => void
  onPanelChange: (panel: DrawerPanel) => void
  onSwitchAccount: (profileId: string) => void
  onAddAccount: () => void
  onEditProfile: () => void
  onOpenTutorial: () => void
  onCheckUpdate: () => void
  onOpenLeaderboard: () => void
  onLanguageChange: (language: Language) => void
  onSettingsChange: (settings: ThemeSettings) => void
}) {
  const [feedback, setFeedback] = useState('')
  const [feedbackSaved, setFeedbackSaved] = useState(false)
  const [donation, setDonation] = useState(10)

  const saveFeedback = (event: FormEvent) => {
    event.preventDefault()
    if (!feedback.trim()) return
    window.localStorage.setItem('why-app-feedback', feedback.trim())
    setFeedbackSaved(true)
  }

  return (
    <div className={open ? 'drawer-layer open' : 'drawer-layer'} aria-hidden={!open}>
      <button className="drawer-backdrop" type="button" onClick={onClose} tabIndex={-1} />
      <aside className="side-drawer" role="dialog" aria-modal="true" aria-label="菜单">
        <div className="drawer-head">
          <strong>
            Why<span>.</span>
          </strong>
          <button type="button" aria-label="关闭菜单" onClick={onClose}>
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <nav className="drawer-menu" aria-label="应用菜单">
          <button
            type="button"
            className={panel === 'account' ? 'active' : ''}
            onClick={() => onPanelChange(panel === 'account' ? null : 'account')}
          >
            <span>切换账号</span>
            <span aria-hidden="true">›</span>
          </button>
          <button
            type="button"
            onClick={onOpenLeaderboard}
          >
            <span>联网排行榜</span>
            <span aria-hidden="true">›</span>
          </button>
          <button type="button" onClick={onOpenTutorial}>
            <span>新手教程</span>
            <span aria-hidden="true">›</span>
          </button>
          <button
            type="button"
            disabled={updateStatus === 'checking'}
            onClick={onCheckUpdate}
          >
            <span>检查更新</span>
            <small>
              {updateStatus === 'checking'
                ? '检查中…'
                : updateStatus === 'latest'
                  ? '已是最新版'
                  : updateStatus === 'error'
                    ? '请稍后重试'
                    : `v${APP_VERSION}`}
            </small>
          </button>
          <button
            type="button"
            className={panel === 'feedback' ? 'active' : ''}
            onClick={() => onPanelChange(panel === 'feedback' ? null : 'feedback')}
          >
            <span>问题反馈</span>
            <span aria-hidden="true">›</span>
          </button>
          <button
            type="button"
            className={panel === 'donate' ? 'active' : ''}
            onClick={() => onPanelChange(panel === 'donate' ? null : 'donate')}
          >
            <span>打赏作者</span>
            <span aria-hidden="true">›</span>
          </button>
          <button
            type="button"
            className={panel === 'settings' ? 'active' : ''}
            onClick={() => onPanelChange(panel === 'settings' ? null : 'settings')}
          >
            <span>设置</span>
            <span aria-hidden="true">›</span>
          </button>
        </nav>

        <div className="drawer-panel">
          {panel === 'account' ? (
            <div className="account-panel">
              <p>此设备上的账号</p>
              <div className="account-list">
                {accounts.map((account) => {
                  const active = account.profile.id === profile?.id
                  return (
                    <button
                      type="button"
                      className={active ? 'active' : ''}
                      key={account.profile.id}
                      disabled={active}
                      onClick={() => onSwitchAccount(account.profile.id)}
                    >
                      <Avatar profile={account.profile} size="small" />
                      <span>
                        <strong>{account.profile.nickname}</strong>
                        <small>{account.solved} 题</small>
                      </span>
                      <i>{active ? '当前' : '切换'}</i>
                    </button>
                  )
                })}
              </div>
              <div className="account-actions">
                <button type="button" onClick={onAddAccount}>添加账号</button>
                <button type="button" onClick={onEditProfile}>编辑当前资料</button>
              </div>
            </div>
          ) : null}

          {panel === 'feedback' ? (
            <form className="feedback-form" onSubmit={saveFeedback}>
              <label htmlFor="feedback">反馈内容</label>
              <textarea
                id="feedback"
                value={feedback}
                onChange={(event) => {
                  setFeedback(event.target.value)
                  setFeedbackSaved(false)
                }}
                placeholder="写下遇到的问题"
                rows={5}
              />
              <button type="submit" disabled={!feedback.trim()}>
                {feedbackSaved ? '已保存' : '保存在本机'}
              </button>
            </form>
          ) : null}

          {panel === 'donate' ? (
            <div className="donate-panel">
              <p>选择一个心意金额</p>
              <div>
                {[5, 10, 20].map((amount) => (
                  <button
                    type="button"
                    className={donation === amount ? 'active' : ''}
                    key={amount}
                    onClick={() => setDonation(amount)}
                  >
                    ¥{amount}
                  </button>
                ))}
              </div>
              <small>课程演示版暂未接入支付。</small>
            </div>
          ) : null}

          {panel === 'settings' ? (
            <div className="settings-panel">
              <div className="drawer-language">
                <span>练习语言</span>
                <div>
                  {LANGUAGE_OPTIONS.map((option) => (
                    <button
                      type="button"
                      className={language === option ? 'active' : ''}
                      key={option}
                      onClick={() => onLanguageChange(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <ColorSetting
                label="界面颜色"
                value={settings.background}
                presets={BACKGROUND_PRESETS}
                onChange={(background) =>
                  onSettingsChange({ ...settings, background })
                }
              />
              <ColorSetting
                label="按钮颜色"
                value={settings.accent}
                presets={ACCENT_PRESETS}
                onChange={(accent) => onSettingsChange({ ...settings, accent })}
              />
              <button
                className="reset-theme"
                type="button"
                onClick={() => onSettingsChange(DEFAULT_SETTINGS)}
              >
                恢复默认
              </button>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  )
}

function App() {
  const [mode, setMode] = useState<Mode | null>(null)
  const [page, setPage] = useState<AppPage>('home')
  const [language, setLanguage] = useState<Language>('Python')
  const [profile, setProfile] = useState<PlayerProfile | null>(loadProfile)
  const [accounts, setAccounts] = useState<PlayerAccount[]>(loadAccounts)
  const [solvedCount, setSolvedCount] = useState(loadSolvedCount)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(
    loadCachedLeaderboard,
  )
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [leaderboardError, setLeaderboardError] = useState('')
  const [nicknameOpen, setNicknameOpen] = useState(() => !loadProfile())
  const [editingProfile, setEditingProfile] = useState<PlayerProfile | null>(
    loadProfile,
  )
  const [nicknameBusy, setNicknameBusy] = useState(false)
  const [nicknameError, setNicknameError] = useState('')
  const [challengeIndex, setChallengeIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('reading')
  const [readSeconds, setReadSeconds] = useState(READ_SECONDS)
  const [typedCount, setTypedCount] = useState(0)
  const [speed, setSpeed] = useState<Speed>('slow')
  const [isPaused, setIsPaused] = useState(false)
  const [isExplaining, setIsExplaining] = useState(false)
  const [selectedLine, setSelectedLine] = useState<number | null>(null)
  const [explanationLevel, setExplanationLevel] = useState(1)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerPanel, setDrawerPanel] = useState<DrawerPanel>(null)
  const [settings, setSettings] = useState<ThemeSettings>(loadSettings)
  const [scrollPosition, setScrollPosition] = useState(0)
  const [scrollMax, setScrollMax] = useState(0)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [updateBusy, setUpdateBusy] = useState(false)
  const [updateError, setUpdateError] = useState('')
  const [manualUpdateStatus, setManualUpdateStatus] =
    useState<ManualUpdateStatus>('idle')
  const timerRef = useRef<number | null>(null)
  const typingTimerRef = useRef<number | null>(null)
  const codeViewportRef = useRef<HTMLDivElement | null>(null)
  const lastTapRef = useRef(0)
  const suppressDoubleClickUntilRef = useRef(0)
  const leaderboardOriginRef = useRef<'home' | 'practice'>('home')

  const challengeList = challengesByLanguage[language]
  const challenge = challengeList[challengeIndex % challengeList.length]
  const fullCode = useMemo(() => challenge.code.join('\n'), [challenge])
  const visibleCode = fullCode.slice(0, typedCount)
  const visibleLines = visibleCode.split('\n')
  const typingLine = Math.min(
    Math.max(visibleLines.length - 1, 0),
    challenge.code.length - 1,
  )
  const completedLineCount =
    phase === 'complete' ? challenge.code.length : Math.max(visibleLines.length - 1, 0)
  const explanationLine = selectedLine ?? typingLine
  const currentExplanation = challenge.explanations[explanationLine]
  const themeStyle = useMemo(() => createThemeStyle(settings), [settings])

  const resetLesson = useCallback((nextIndex = 0) => {
    setChallengeIndex(nextIndex)
    setPhase('reading')
    setReadSeconds(READ_SECONDS)
    setTypedCount(0)
    setIsPaused(false)
    setIsExplaining(false)
    setSelectedLine(null)
    setExplanationLevel(1)
    setScrollPosition(0)
    if (codeViewportRef.current) codeViewportRef.current.scrollLeft = 0
  }, [])

  const changeLanguage = useCallback(
    (nextLanguage: Language) => {
      if (nextLanguage === language) return
      setLanguage(nextLanguage)
      resetLesson(0)
    },
    [language, resetLesson],
  )

  const updateSettings = useCallback((nextSettings: ThemeSettings) => {
    setSettings(nextSettings)
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(nextSettings))
  }, [])

  const refreshLeaderboard = useCallback(
    async (syncCurrentPlayer = true) => {
      setSyncStatus('syncing')
      setLeaderboardError('')
      try {
        const entries =
          syncCurrentPlayer && profile
            ? await syncPlayer(profile, solvedCount)
            : await fetchLeaderboard()
        setLeaderboard(entries)
        setSyncStatus('online')
      } catch {
        setSyncStatus('offline')
        setLeaderboardError('暂时无法连接排行榜，已保留本机刷题记录。')
      }
    },
    [profile, solvedCount],
  )

  const submitNickname = useCallback(
    (nickname: string, avatar?: string) => {
      setNicknameBusy(true)
      setNicknameError('')
      const nextProfile = editingProfile
        ? { ...editingProfile, nickname, avatar }
        : { ...createProfile(nickname), avatar }
      saveProfile(nextProfile)
      const nextSolved = loadSolvedCount(nextProfile.id)
      setProfile(nextProfile)
      setAccounts(loadAccounts())
      setSolvedCount(nextSolved)
      setNicknameOpen(false)
      setSyncStatus('syncing')
      setNicknameBusy(false)
    },
    [editingProfile],
  )

  const switchAccount = useCallback(
    (profileId: string) => {
      const nextProfile = activateProfile(profileId)
      if (!nextProfile) return
      setProfile(nextProfile)
      setAccounts(loadAccounts())
      setSolvedCount(loadSolvedCount(nextProfile.id))
      setLeaderboardError('')
      setDrawerOpen(false)
      setDrawerPanel(null)
      setPage('home')
      resetLesson(0)
    },
    [resetLesson],
  )

  const openNewAccount = useCallback(() => {
    setEditingProfile(null)
    setNicknameError('')
    setDrawerOpen(false)
    setDrawerPanel(null)
    setNicknameOpen(true)
  }, [])

  const openProfileEditor = useCallback(() => {
    setEditingProfile(profile)
    setNicknameError('')
    setDrawerOpen(false)
    setDrawerPanel(null)
    setNicknameOpen(true)
  }, [profile])

  const showLeaderboard = useCallback(() => {
    leaderboardOriginRef.current = page === 'practice' ? 'practice' : 'home'
    setDrawerOpen(false)
    setDrawerPanel(null)
    setPage('leaderboard')
    void refreshLeaderboard(true)
  }, [page, refreshLeaderboard])

  useEffect(() => {
    if (!profile) return
    void syncPlayer(profile, loadSolvedCount(profile.id))
      .then((entries) => {
        setLeaderboard(entries)
        setLeaderboardError('')
        setSyncStatus('online')
      })
      .catch(() => {
        setLeaderboardError('账号资料和刷题数已保存在本机，联网后会继续同步。')
        setSyncStatus('offline')
      })
  }, [profile])

  // onboarding: show after profile is set (or first launch without profile gate)
  useEffect(() => {
    if (nicknameOpen) return
    try {
      if (window.localStorage.getItem('why-onboarding-done-v1') === '1') return
    } catch {
      return
    }
    // brief delay so the home page renders underneath first
    const timer = window.setTimeout(() => setOnboardingOpen(true), 400)
    return () => window.clearTimeout(timer)
  }, [nicknameOpen])

  // update check: run once after startup
  useEffect(() => {
    const run = async () => {
      const info = await checkForUpdate()
      if (!info) return
      if (info.versionCode <= getSkippedVersion()) return
      // delay so it doesn't collide with onboarding
      window.setTimeout(() => setUpdateInfo(info), 1200)
    }
    void run()
  }, [])

  const downloadUpdate = useCallback(async (info: UpdateInfo) => {
    setUpdateBusy(true)
    setUpdateError('')
    try {
      await openExternalUrl(info.apkUrl)
      setUpdateInfo(null)
    } catch {
      setUpdateError('无法打开浏览器，请确认手机已安装并启用浏览器。')
    } finally {
      setUpdateBusy(false)
    }
  }, [])

  const dismissUpdate = useCallback((info: UpdateInfo) => {
    skipVersion(info.versionCode)
    setUpdateError('')
    setUpdateInfo(null)
  }, [])

  const checkUpdateManually = useCallback(async () => {
    setManualUpdateStatus('checking')
    try {
      const info = await fetchLatestVersion()
      if (info.versionCode > APP_VERSION_CODE) {
        setManualUpdateStatus('idle')
        setDrawerOpen(false)
        setDrawerPanel(null)
        setUpdateInfo(info)
      } else {
        setManualUpdateStatus('latest')
      }
    } catch {
      setManualUpdateStatus('error')
    }
  }, [])

  const recordCompletion = useCallback(() => {
    if (!profile) return
    const nextSolved = incrementSolvedCount(profile.id)
    setSolvedCount(nextSolved)
    setAccounts(loadAccounts())

    setSyncStatus('syncing')
    void syncPlayer(profile, nextSolved)
      .then((entries) => {
        setLeaderboard(entries)
        setLeaderboardError('')
        setSyncStatus('online')
      })
      .catch(() => {
        setLeaderboardError('本题已记录在本机，联网后会继续同步。')
        setSyncStatus('offline')
      })
  }, [profile])

  useEffect(() => {
    if (page !== 'practice' || !mode || phase !== 'reading' || drawerOpen) return
    timerRef.current = window.setInterval(() => {
      setReadSeconds((seconds) => {
        if (seconds <= 1) {
          if (timerRef.current) window.clearInterval(timerRef.current)
          setPhase('typing')
          return 0
        }
        return seconds - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [drawerOpen, mode, page, phase])

  useEffect(() => {
    if (
      page !== 'practice' ||
      !mode ||
      phase !== 'typing' ||
      isPaused ||
      isExplaining ||
      drawerOpen
    )
      return
    if (typedCount >= fullCode.length) return
    typingTimerRef.current = window.setTimeout(() => {
      const nextCount = Math.min(typedCount + 1, fullCode.length)
      setTypedCount(nextCount)
      if (nextCount >= fullCode.length) {
        setPhase('complete')
        setIsPaused(false)
        setSelectedLine(null)
        recordCompletion()
      }
    }, TYPE_INTERVALS[speed])
    return () => {
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current)
      typingTimerRef.current = null
    }
  }, [
    drawerOpen,
    fullCode.length,
    isExplaining,
    isPaused,
    mode,
    page,
    phase,
    recordCompletion,
    speed,
    typedCount,
  ])

  useLayoutEffect(() => {
    const viewport = codeViewportRef.current
    if (!viewport || phase === 'reading') {
      setScrollMax(0)
      return
    }

    const updateRange = () => {
      const nextMax = Math.max(0, viewport.scrollWidth - viewport.clientWidth)
      setScrollMax(nextMax)
      setScrollPosition((position) => Math.min(position, nextMax))
    }

    updateRange()
    const resizeObserver = new ResizeObserver(updateRange)
    resizeObserver.observe(viewport)
    if (viewport.firstElementChild) resizeObserver.observe(viewport.firstElementChild)
    return () => resizeObserver.disconnect()
  }, [challenge.id, phase, typedCount])

  useEffect(() => {
    if (!drawerOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [drawerOpen])

  const askWhy = useCallback(() => {
    if (phase === 'reading') {
      if (timerRef.current) window.clearInterval(timerRef.current)
      setPhase('typing')
      setReadSeconds(0)
      return
    }
    if (phase === 'typing' && !isExplaining && typingTimerRef.current) {
      window.clearTimeout(typingTimerRef.current)
      typingTimerRef.current = null
    }
    if (isExplaining) {
      setIsExplaining(false)
      setSelectedLine(null)
      setIsPaused(false)
    } else {
      setSelectedLine(typingLine)
      setIsPaused(true)
      setIsExplaining(true)
    }
    setExplanationLevel(1)
  }, [isExplaining, phase, typingLine])

  const togglePause = useCallback(() => {
    if (phase !== 'typing' || isExplaining) return
    if (!isPaused && typingTimerRef.current) {
      window.clearTimeout(typingTimerRef.current)
      typingTimerRef.current = null
    }
    setIsPaused((paused) => !paused)
  }, [isExplaining, isPaused, phase])

  const reviewLine = useCallback(
    (lineIndex: number) => {
      if (lineIndex >= completedLineCount) return
      if (typingTimerRef.current) {
        window.clearTimeout(typingTimerRef.current)
        typingTimerRef.current = null
      }
      setIsPaused(true)
      setSelectedLine(lineIndex)
      setIsExplaining(true)
      setExplanationLevel(1)
    },
    [completedLineCount],
  )

  const handleCodePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse') return
      const now = Date.now()
      if (now - lastTapRef.current <= 320) {
        event.preventDefault()
        lastTapRef.current = 0
        suppressDoubleClickUntilRef.current = now + 500
        togglePause()
        return
      }
      lastTapRef.current = now
    },
    [togglePause],
  )

  const handleCodeDoubleClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      event.preventDefault()
      if (Date.now() < suppressDoubleClickUntilRef.current) return
      togglePause()
    },
    [togglePause],
  )

  const handleLineKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>, lineIndex: number) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      event.stopPropagation()
      reviewLine(lineIndex)
    },
    [reviewLine],
  )

  const goDeeper = useCallback(() => {
    if (!isExplaining) return
    setExplanationLevel((level) => Math.min(level + 1, 3))
  }, [isExplaining])

  const moveCodeViewport = (position: number) => {
    const viewport = codeViewportRef.current
    if (!viewport) return
    viewport.scrollLeft = position
    setScrollPosition(position)
  }

  const openDrawer = () => {
    if (phase === 'typing' && !isPaused && !isExplaining) setIsPaused(true)
    setDrawerOpen(true)
  }

  const explanationText = getExplanationText(
    mode ?? 'learn',
    explanationLevel,
    challenge,
    currentExplanation,
  )

  return (
    <div className="theme-root" style={themeStyle}>
      {page === 'leaderboard' ? (
        <LeaderboardPage
          profile={profile}
          solved={solvedCount}
          entries={leaderboard}
          syncStatus={syncStatus}
          error={leaderboardError}
          onRefresh={() => void refreshLeaderboard(true)}
          onEditProfile={openProfileEditor}
          onBack={() => setPage(leaderboardOriginRef.current)}
        />
      ) : page === 'home' ? (
        <ModeSelect
          language={language}
          profile={profile}
          solved={solvedCount}
          syncStatus={syncStatus}
          onLanguageChange={changeLanguage}
          onOpenLeaderboard={showLeaderboard}
          onStart={(selectedMode) => {
            resetLesson(0)
            setMode(selectedMode)
            setPage('practice')
          }}
        />
      ) : (
        <main className="app-shell">
          <header className="topbar">
            <button
              className="menu-button"
              type="button"
              aria-label="打开菜单"
              onClick={openDrawer}
            >
              <span className="menu-icon" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="compact-wordmark">
                Why<span>.</span>
              </span>
            </button>
            <div className="mode-toggle" aria-label="切换模式">
              <button
                type="button"
                className={mode === 'learn' ? 'active' : ''}
                onClick={() => setMode('learn')}
              >
                学习
              </button>
              <button
                type="button"
                className={mode === 'focus' ? 'active' : ''}
                onClick={() => setMode('focus')}
              >
                精简
              </button>
            </div>
          </header>

          <section className="question">
            <div>
              <span>{challenge.language}</span>
              <h1>{challenge.title}</h1>
            </div>
            <p>
              {challenge.prompt}
              <small>
                {challengeIndex + 1} / {challengeList.length}
              </small>
            </p>
          </section>

          <section className="code-stage" aria-label="代码演示">
            <div className="stage-status">
              <div className="stage-state">
                <span className={`status-dot ${phase} ${isPaused ? 'paused' : ''}`} />
                <span>
                  {phase === 'reading'
                    ? `${readSeconds}s`
                    : phase === 'complete'
                      ? '完成'
                      : isExplaining
                        ? `第 ${explanationLine + 1} 行`
                        : isPaused
                          ? '暂停'
                          : '书写中'}
                </span>
              </div>
              <div className="stage-actions">
                <div className="speed-toggle" aria-label="书写速度">
                  {SPEED_OPTIONS.map((option) => (
                    <button
                      type="button"
                      className={speed === option.value ? 'active' : ''}
                      key={option.value}
                      onClick={() => setSpeed(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="pause-button"
                  onClick={togglePause}
                  disabled={phase !== 'typing' || isExplaining}
                >
                  {isPaused && !isExplaining ? '继续' : '暂停'}
                </button>
              </div>
            </div>

            <div
              className="code-viewport"
              ref={codeViewportRef}
              onScroll={(event) => setScrollPosition(event.currentTarget.scrollLeft)}
            >
              <div
                className="code-window"
                onPointerUp={handleCodePointerUp}
                onDoubleClick={handleCodeDoubleClick}
              >
                {phase === 'reading' ? (
                  <div className="answer-waiting">
                    <span>{readSeconds}</span>
                  </div>
                ) : (
                  challenge.code.map((line, index) => {
                    const shownLine = visibleLines[index] ?? ''
                    const isVisible = index < visibleLines.length
                    const canReview = index < completedLineCount
                    const isActive =
                      selectedLine === index ||
                      (selectedLine === null && index === typingLine)
                    return (
                      <div
                        className={`code-line ${isActive ? 'active' : ''} ${isVisible ? '' : 'hidden'} ${canReview ? 'reviewable' : ''}`}
                        key={`${challenge.id}-${index}`}
                        role={canReview ? 'button' : undefined}
                        tabIndex={canReview ? 0 : undefined}
                        aria-label={canReview ? `回看第 ${index + 1} 行` : undefined}
                        onClick={() => reviewLine(index)}
                        onKeyDown={(event) => handleLineKeyDown(event, index)}
                        style={{ '--line-width': `${Math.max(line.length, 24)}ch` } as CSSProperties}
                      >
                        <span className="line-number">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <code>
                          {highlightCode(shownLine)}
                          {index === typingLine &&
                          phase === 'typing' &&
                          !isPaused &&
                          !isExplaining ? (
                            <span className="cursor" aria-hidden="true" />
                          ) : null}
                        </code>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className="code-pan-control">
              <span aria-hidden="true">‹</span>
              <input
                type="range"
                aria-label="移动代码显示范围"
                min="0"
                max={Math.max(scrollMax, 1)}
                step="1"
                value={Math.min(scrollPosition, Math.max(scrollMax, 1))}
                disabled={scrollMax === 0}
                onInput={(event) =>
                  moveCodeViewport(Number(event.currentTarget.value))
                }
              />
              <span aria-hidden="true">›</span>
            </div>
          </section>

          {isExplaining ? (
            <section className="explanation open" aria-live="polite">
              <div className="explanation-head">
                <span>
                  第 {explanationLine + 1} 行 · {mode === 'focus' ? '精简' : '详解'}
                </span>
                <span>{explanationLevel} / 3</span>
              </div>
              <p>{explanationText}</p>
              {mode === 'learn' && explanationLevel === 3 ? (
                <aside>
                  <strong>顺便学一点</strong>
                  {currentExplanation.extension}
                </aside>
              ) : null}
            </section>
          ) : null}

          {phase === 'complete' && !isExplaining ? (
            <button
              className="next-challenge"
              type="button"
              onClick={() => resetLesson((challengeIndex + 1) % challengeList.length)}
            >
              下一题
              <span aria-hidden="true">→</span>
            </button>
          ) : null}

          <footer className="controls">
            <button type="button" className="primary-control" onClick={askWhy}>
              {isExplaining ? '继续' : 'why'}
            </button>
            <button
              type="button"
              className="secondary-control"
              onClick={goDeeper}
              disabled={!isExplaining || explanationLevel === 3}
            >
              {explanationLevel === 3 ? '已到最深' : '深一层'}
            </button>
          </footer>
        </main>
      )}

      <SideDrawer
        open={drawerOpen}
        panel={drawerPanel}
        profile={profile}
        accounts={accounts}
        language={language}
        settings={settings}
        updateStatus={manualUpdateStatus}
        onClose={() => setDrawerOpen(false)}
        onPanelChange={setDrawerPanel}
        onSwitchAccount={switchAccount}
        onAddAccount={openNewAccount}
        onEditProfile={openProfileEditor}
        onOpenTutorial={() => {
          setDrawerOpen(false)
          setDrawerPanel(null)
          setOnboardingOpen(true)
        }}
        onCheckUpdate={() => void checkUpdateManually()}
        onOpenLeaderboard={showLeaderboard}
        onLanguageChange={changeLanguage}
        onSettingsChange={updateSettings}
      />

      <NicknameGate
        key={`${nicknameOpen}-${editingProfile?.id ?? 'new'}`}
        open={nicknameOpen}
        profile={editingProfile}
        canClose={Boolean(profile)}
        busy={nicknameBusy}
        error={nicknameError}
        onClose={() => setNicknameOpen(false)}
        onSubmit={(nickname, avatar) => void submitNickname(nickname, avatar)}
      />

      {onboardingOpen ? (
        <OnboardingGate onDone={() => setOnboardingOpen(false)} />
      ) : null}

      {updateInfo ? (
        <div className="update-overlay" role="dialog" aria-modal="true" aria-label="发现新版本">
          <div className="update-sheet">
            <h2>
              发现新版本
              <span>v{updateInfo.version}</span>
            </h2>
            {updateInfo.releaseNotes ? (
              <p className="update-notes">{updateInfo.releaseNotes}</p>
            ) : null}
            {updateError ? (
              <p className="update-error" role="alert">{updateError}</p>
            ) : null}
            <div className="update-buttons">
              <button
                className="update-skip"
                type="button"
                onClick={() => dismissUpdate(updateInfo)}
              >
                稍后提醒
              </button>
              <button
                className="update-confirm"
                type="button"
                disabled={updateBusy}
                onClick={() => void downloadUpdate(updateInfo)}
              >
                {updateBusy ? '正在打开…' : '立即更新'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
