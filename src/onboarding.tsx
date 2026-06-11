import { useState } from 'react'

export const ONBOARDING_DONE_KEY = 'why-onboarding-done-v1'

type Step = 'gate' | 'home' | 'practice' | 'why' | 'sidebar' | 'leaderboard'

const STEPS: Array<{
  key: Step
  title: string
  body: string
}> = [
  {
    key: 'gate',
    title: '欢迎使用 Why',
    body: '用一小段代码，学会一个清楚的知识点。',
  },
  {
    key: 'home',
    title: '选一种练习',
    body: '选择学习模式和编程语言，然后开始一题。',
  },
  {
    key: 'practice',
    title: '看代码慢慢写出',
    body: '答案会逐行出现。你可以调速度，也可以随时暂停。',
  },
  {
    key: 'why',
    title: '不懂就点 why',
    body: '选中代码行查看解释，再点“深一层”继续理解。',
  },
  {
    key: 'sidebar',
    title: '需要时打开菜单',
    body: '这里可以切换账号、回看教程、检查更新和调整设置。',
  },
  {
    key: 'leaderboard',
    title: '头像会出现在排行榜',
    body: '昵称、头像和刷题数会一起展示，每个账号独立记录。',
  },
]

function markOnboardingDone() {
  window.localStorage.setItem(ONBOARDING_DONE_KEY, '1')
}

function TutorialVisual({ step }: { step: Step }) {
  if (step === 'gate') {
    return (
      <div className="tutorial-visual tutorial-welcome" aria-hidden="true">
        <strong>?</strong>
        <div><span /><span /><span /></div>
      </div>
    )
  }

  if (step === 'home') {
    return (
      <div className="tutorial-visual tutorial-home" aria-hidden="true">
        <div><span>学习模式</span><i /></div>
        <div className="tutorial-chips"><span>Python</span><span>JavaScript</span></div>
        <b>开始一题</b>
      </div>
    )
  }

  if (step === 'practice') {
    return (
      <div className="tutorial-visual tutorial-code" aria-hidden="true">
        <span><i>1</i><code>for item in list:</code></span>
        <span><i>2</i><code>print(item)</code></span>
        <span className="typing-line"><i>3</i><code /></span>
      </div>
    )
  }

  if (step === 'why') {
    return (
      <div className="tutorial-visual tutorial-why" aria-hidden="true">
        <code>print(item)</code>
        <div><strong>why</strong><span>输出当前这一项</span></div>
        <b>深一层</b>
      </div>
    )
  }

  if (step === 'sidebar') {
    return (
      <div className="tutorial-visual tutorial-menu" aria-hidden="true">
        <span>切换账号 <i>›</i></span>
        <span>新手教程 <i>›</i></span>
        <span>检查更新 <i>›</i></span>
      </div>
    )
  }

  return (
    <div className="tutorial-visual tutorial-rank" aria-hidden="true">
      <span className="rank-two">2</span>
      <span className="rank-one">1</span>
      <span className="rank-three">3</span>
    </div>
  )
}

type OnboardingGateProps = {
  onDone: () => void
}

export function OnboardingGate({ onDone }: OnboardingGateProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const current = STEPS[stepIndex]

  const finish = () => {
    markOnboardingDone()
    onDone()
  }

  return (
    <div className="onboard-overlay" role="dialog" aria-modal="true" aria-label="新手教程">
      <div className="onboard-card">
        <TutorialVisual step={current.key} />
        <div className="onboard-body">
          <h2>{current.title}</h2>
          <p>{current.body}</p>
        </div>

        {stepIndex === 0 ? (
          <div className="onboard-actions stack">
            <button
              className="onboard-primary"
              type="button"
              onClick={() => setStepIndex(1)}
            >
              开始了解
            </button>
            <button className="onboard-ghost" type="button" onClick={finish}>
              直接使用
            </button>
          </div>
        ) : (
          <>
            <div className="onboard-dots" aria-label={`第 ${stepIndex} 步，共 ${STEPS.length - 1} 步`}>
              {STEPS.slice(1).map((step, index) => (
                <span
                  key={step.key}
                  className={index + 1 === stepIndex ? 'active' : ''}
                  aria-hidden="true"
                />
              ))}
            </div>
            <div className="onboard-actions">
              <button className="onboard-ghost" type="button" onClick={finish}>
                退出教程
              </button>
              <button
                className="onboard-primary"
                type="button"
                onClick={() => {
                  if (stepIndex === STEPS.length - 1) finish()
                  else setStepIndex((index) => index + 1)
                }}
              >
                {stepIndex === STEPS.length - 1 ? '开始使用' : '下一步'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
