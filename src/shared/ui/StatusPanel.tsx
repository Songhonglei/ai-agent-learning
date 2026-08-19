import { appPath } from '../runtime/app-path'

type StatusPanelProps =
  | { status: 'loading'; onRetry: () => void }
  | { status: 'empty' }
  | {
    status: 'cloud-error'
    operation: 'read' | 'write'
    onRetry: () => void
    onUseLocal: () => void
    onContinue: () => void
  }
  | {
    status: 'local-storage-error'
    onRetry: () => void
    onContinue: () => void
  }
  | {
    status: 'profile-load-error'
    issue: 'malformed' | 'future-version' | 'read-error' | 'migration-error'
    onRetry: () => void
    onContinue: () => void
    resetConfirmation: boolean
    onRequestReset: () => void
    onCancelReset: () => void
    onConfirmReset: () => void
  }
  | { status: 'unknown-route' }

export function StatusPanel(props: StatusPanelProps) {
  if (props.status === 'loading') {
    return (
      <section className="status-panel" role="status" aria-live="polite">
        <p className="status-kicker">正在准备</p>
        <h1>课程加载中</h1>
        <p>本地课程正在准备。若等待过久，可以重新加载一次。</p>
        <div className="status-actions">
          <button className="primary-button" type="button" onClick={props.onRetry}>重试加载</button>
        </div>
      </section>
    )
  }

  if (props.status === 'empty') {
    return (
      <section className="status-panel">
        <p className="status-kicker">这里还是空的</p>
        <h1>暂时没有课程内容</h1>
        <p>当前入口没有可学习的内容，先回地图选择已开放课程。</p>
        <div className="status-actions">
          <a className="primary-link" href={appPath('/')}>返回学习地图</a>
        </div>
      </section>
    )
  }

  if (props.status === 'cloud-error') {
    const isWrite = props.operation === 'write'
    return (
      <section className="status-panel status-panel-inline" role="status" aria-live="polite">
        <p className="status-kicker">云端学习档案暂不可用</p>
        <h2>{isWrite ? '学习进度暂未同步' : '暂时无法读取学习档案'}</h2>
        <p>
          {isWrite
            ? '当前学习变化仍保留在本页；恢复连接后可重新同步到你的账号。'
            : '请确认邮箱登录状态后重试。课程内容仍可浏览；你也可以明确选择保存到当前浏览器。'}
        </p>
        <div className="status-actions">
          <button type="button" onClick={props.onRetry}>
            {isWrite ? '重试同步学习进度' : '重试读取学习档案'}
          </button>
          <button type="button" onClick={props.onUseLocal}>保存到本机</button>
          <button className="primary-button" type="button" onClick={props.onContinue}>继续学习</button>
        </div>
      </section>
    )
  }

  if (props.status === 'local-storage-error') {
    return (
      <section className="status-panel status-panel-inline" role="status" aria-live="polite">
        <p className="status-kicker">本机存储暂不可用</p>
        <h2>进度还没有保存到浏览器</h2>
        <p>当前学习变化仍保留在本页。请检查浏览器是否允许本站点使用本地存储，然后重试保存。</p>
        <div className="status-actions">
          <button type="button" onClick={props.onRetry}>重试本机保存</button>
          <button className="primary-button" type="button" onClick={props.onContinue}>继续学习</button>
        </div>
      </section>
    )
  }

  if (props.status === 'profile-load-error') {
    const content = {
      malformed: {
        kicker: '本地档案需要恢复',
        title: '学习档案已损坏',
        body: '已保存的档案不是有效格式。继续学习只会保留在本页，不会覆盖原文件；你可以导入有效备份，或明确确认后重置为空档案。',
      },
      'future-version': {
        kicker: '检测到更新版本',
        title: '学习档案版本较新',
        body: '此档案由更新版本创建，当前版本已切换为只读保护。继续学习不会覆盖它，也不能用备份或重置替换。',
      },
      'read-error': {
        kicker: '浏览器存储遇到问题',
        title: '暂时无法读取学习档案',
        body: '当前会话的学习变化会保留在本页。存储恢复后重试，系统会把这些变化合并到已保存档案，不会直接丢弃。',
      },
      'migration-error': {
        kicker: '旧进度仍受保护',
        title: '旧进度迁移未完成',
        body: '旧版进度尚未安全迁移或清理，因此不会覆盖任何本地记录。请保留本页进度并重试。',
      },
    }[props.issue]

    return (
      <section className="status-panel status-panel-inline" role="status" aria-live="polite">
        <p className="status-kicker">{content.kicker}</p>
        <h2>{content.title}</h2>
        <p>{content.body}</p>
        <div className="status-actions">
          <button type="button" onClick={props.onRetry}>重试本地读取</button>
          {props.issue === 'malformed' && (
            <>
              <a href={appPath('/profile')}>选择有效备份</a>
              <button type="button" onClick={props.onRequestReset}>重置损坏档案</button>
            </>
          )}
          <button className="primary-button" type="button" onClick={props.onContinue}>继续学习</button>
        </div>
        {props.issue === 'malformed' && props.resetConfirmation && (
          <div className="status-reset-confirmation" role="alert">
            <p>确认重置会永久替换损坏内容，并创建一个空学习档案。此操作无法撤销。</p>
            <div className="status-actions">
              <button type="button" onClick={props.onCancelReset}>取消重置</button>
              <button className="primary-button" type="button" onClick={props.onConfirmReset}>
                确认重置为空档案
              </button>
            </div>
          </div>
        )}
      </section>
    )
  }

  return (
    <section className="status-panel">
      <p className="status-kicker">路线走岔了</p>
      <h1>没有找到这个页面</h1>
      <p>这个地址不在当前学习路线中，返回地图即可继续学习。</p>
      <div className="status-actions">
        <a className="primary-link" href={appPath('/')}>返回学习地图</a>
      </div>
    </section>
  )
}
