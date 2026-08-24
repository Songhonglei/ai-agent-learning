const PROJECT_REPOSITORY_URL = 'https://github.com/Songhonglei/ai-agent-learning'

export function ProjectFooter(): React.JSX.Element {
  return (
    <footer className="project-footer" aria-label="开源项目信息">
      <span>开源项目</span>
      <span aria-hidden="true">·</span>
      <a href={PROJECT_REPOSITORY_URL} target="_blank" rel="noreferrer">
        GitHub <span aria-hidden="true">↗</span>
      </a>
    </footer>
  )
}
