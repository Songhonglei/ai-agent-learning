import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import {
  exportProfile,
  previewProfileImport,
  type ImportPreview,
} from '../../shared/profile-transfer/transfer'
import type { LearningProfile } from '../../shared/types/profile'

interface ProfileTransferProps {
  profile: LearningProfile
  onConfirm: (merged: LearningProfile) => void
  blockedMessage?: string
  compact?: boolean
}

function downloadFileName(updatedAt: string): string {
  const date = new Date(updatedAt)
  const dateLabel = Number.isNaN(date.getTime())
    ? 'backup'
    : date.toISOString().slice(0, 10)
  return `ai-agent-learning-profile-${dateLabel}.json`
}

function profileFingerprint(profile: LearningProfile): string {
  return JSON.stringify(profile)
}

export function ProfileTransfer({
  profile,
  onConfirm,
  blockedMessage,
  compact = false,
}: ProfileTransferProps) {
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const previewBaseRef = useRef<string | null>(null)

  useEffect(() => {
    if (
      preview?.status === 'ready'
      && previewBaseRef.current !== profileFingerprint(profile)
    ) {
      previewBaseRef.current = null
      setPreview({
        status: 'invalid',
        message: '学习档案已更新，请重新选择备份以生成新的导入预览。',
      })
    }
  }, [preview, profile])

  function handleExport() {
    const blob = new Blob([exportProfile(profile)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = downloadFileName(profile.updatedAt)
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return

    try {
      const json = await file.text()
      previewBaseRef.current = profileFingerprint(profile)
      setPreview(previewProfileImport(json, profile))
    } catch {
      setPreview({
        status: 'invalid',
        message: '无法读取这个本地文件，请重新选择学习档案备份。',
      })
    } finally {
      input.value = ''
    }
  }

  function handleConfirm() {
    if (preview?.status !== 'ready') return
    if (previewBaseRef.current !== profileFingerprint(profile)) {
      previewBaseRef.current = null
      setPreview({
        status: 'invalid',
        message: '学习档案已更新，请重新选择备份以生成新的导入预览。',
      })
      return
    }
    onConfirm(preview.candidate)
    previewBaseRef.current = null
    setPreview(null)
  }

  return (
    <section className={compact ? 'profile-transfer profile-transfer-compact' : 'profile-transfer'} aria-labelledby="profile-transfer-title">
      {!compact && (
        <>
          <div className="profile-transfer-heading">
            <div>
              <p className="profile-transfer-kicker">只在本机处理</p>
              <h2 id="profile-transfer-title">备份与迁移学习档案</h2>
            </div>
            <span>JSON · schema v{profile.schemaVersion}</span>
          </div>

          <p className="profile-transfer-intro">
            导出内容只包含学习进度；导入文件会先校验并展示合并取舍，确认前不会改动当前档案。
          </p>
        </>
      )}

      {compact && <h2 className="sr-only" id="profile-transfer-title">导入或导出本地学习档案</h2>}

      <div className="profile-transfer-actions">
        <button className="primary-button" type="button" onClick={handleExport}>
          导出学习档案
        </button>
        <label className="profile-transfer-file">
          <span>导入学习档案</span>
          <input
            type="file"
            accept="application/json,.json"
            disabled={blockedMessage !== undefined}
            onChange={handleFileChange}
          />
        </label>
      </div>

      {blockedMessage && (
        <p className="profile-transfer-error" role="alert">{blockedMessage}</p>
      )}

      {!blockedMessage && preview?.status === 'ready' && (
        <div className="profile-transfer-preview" role="status" aria-live="polite">
          <h3>确认导入前，请检查这些取舍</h3>
          <ul>
            {preview.summary.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
          </ul>
          <div className="profile-transfer-confirm-actions">
            <button type="button" onClick={() => setPreview(null)}>取消导入</button>
            <button className="primary-button" type="button" onClick={handleConfirm}>
              确认导入
            </button>
          </div>
        </div>
      )}

      {!blockedMessage && preview && preview.status !== 'ready' && (
        <p className="profile-transfer-error" role="alert">{preview.message}</p>
      )}
    </section>
  )
}
