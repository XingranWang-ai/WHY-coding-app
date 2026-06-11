import { useState } from 'react'

export const ONBOARDING_DONE_KEY = 'why-onboarding-done-v1'

function markOnboardingDone() {
  window.localStorage.setItem(ONBOARDING_DONE_KEY, '1')
}

type Step = 'gate' | 'home' | 'practice' | 'why' | 'sidebar' | 'leaderboard'

const STEPS: { key: Step; label: string; emoji: string }[] = [
  { key: 'gate', label: '欢迎', emoji: '?' },
  { key: 'home', label: '选题', emoji: '1' },
  { key: 'practice', label: '书写', emoji: '2' },
  { key: 'why', label: '解释', emoji: '3' },
  { key: 'sidebar', label: '菜单', emoji: '4' },
  { key: 'leaderboard', label: '排行', emoji: '5' },
]

type OnboardingGateProps = {
  onDone: () => void
}

export function OnboardingGate({ onDone }: OnboardingGateProps) {
  const [step, setStep] = useState<Step>('gate')

  const finish = () => {
    markOnboardingDone()
    onDone()
  }

  const advance = (next: Step) => setStep(next)

  if (step === 'gate') {
    return (
      <div className="onboard-overlay" role="dialog" aria-modal="true" aria-label="新手引导">
        <div className="onboard-card">
          <div className="onboard-graphic gate-graphic">
            <span>?</span>
          </div>
          <div className="onboard-body">
            <h2>欢迎使用 Why</h2>
            <p>一款把代码练习变成随手一学的轻量应用。</p>
          </div>
          <div className="onboard-actions stack">
            <button
              className="onboard-primary"
              type="button"
              onClick={() => advance('home')}
            >
              我是新用户，带我了解
            </button>
            <button
              className="onboard-ghost"
              type="button"
              onClick={finish}
            >
              我是老用户，直接开始
            </button>
          </div>
        </div>
      </div>
    )
  }

  const stepIndex = STEPS.findIndex((s) => s.key === step)

  const content: Record<Step, { title: string; body: string }> = {
    gate: { title: '', body: '' },
    home: {
      title: '选择题目',
      body: '首页可选择「学习模式」或「精简模式」，再挑选 Python、JavaScript 或 Java，然后点「开始一题」进入练习。',
    },
    practice: {
      title: '代码自动书写',
      body: '题目给出后，答案代码会逐行自动书写。你可以调节慢、中、快三档速度，也可以随时暂停或继续。',
    },
    why: {
      title: '逐行解释',
      body: '点击任意已完成的代码行，按下「why」按钮，可获得三层渐进式解释——从一句话概述到深度原理，帮你真正理解代码。',
    },
    sidebar: {
      title: '侧边栏',
      body: '练习页左上角菜单可打开侧边栏，包含联网排行榜、问题反馈、打赏作者以及界面颜色设置。',
    },
    leaderboard: {
      title: '联网排行榜',
      body: '首页或侧边栏均可进入排行榜。前三名在顶部突出展示，按累计刷题数量排名。只需一个昵称即可加入。',
    },
  }

  const current = content[step]

  return (
    <div className="onboard-overlay" role="dialog" aria-modal="true" aria-label={current.title}>
      <div className="onboard-card">
        <div className={`onboard-graphic onboard-graphic-${step}`}>
          <span>{STEPS[stepIndex].emoji}</span>
        </div>
        <div className="onboard-body">
          <h2>{current.title}</h2>
          <p>{current.body}</p>
        </div>
        <div className="onboard-dots">
          {STEPS.slice(1).map((s) => (
            <span
              key={s.key}
              className={s.key === step ? 'active' : ''}
              aria-hidden="true"
            />
          ))}
        </div>
        <div className="onboard-actions">
          <button
            className="onboard-ghost"
            type="button"
            onClick={finish}
          >
            跳过
          </button>
          {stepIndex < STEPS.length - 1 ? (
            <button
              className="onboard-primary"
              type="button"
              onClick={() => advance(STEPS[stepIndex + 1].key)}
            >
              下一步
            </button>
          ) : (
            <button
              className="onboard-primary"
              type="button"
              onClick={finish}
            >
              开始使用
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
