interface LocalProgressSyncProps {
  onMerge: () => void
  onKeepCloud: () => void
}

export function LocalProgressSync({ onMerge, onKeepCloud }: LocalProgressSyncProps) {
  return (
    <section className="account-gate" role="dialog" aria-labelledby="local-progress-sync-title">
      <p className="status-kicker">发现本机学习进度</p>
      <h2 id="local-progress-sync-title">要合并到这个学习档案吗？</h2>
      <p>合并会把当前浏览器里的课程进度、错题和收藏同步到刚登录的邮箱账号；不会删除本机备份。</p>
      <div className="status-actions">
        <button className="primary-button" type="button" onClick={onMerge}>合并并同步</button>
        <button type="button" onClick={onKeepCloud}>暂不合并</button>
      </div>
    </section>
  )
}
