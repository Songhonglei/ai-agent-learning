import type { SourceRef } from '../../shared/types/lesson'
import { appPath, deploymentBasePath } from '../../shared/runtime/app-path'
import { AgentFormulaDiagram } from './AgentFormulaDiagram'
import { AgentTaskLoopDiagram } from './AgentTaskLoopDiagram'
import { ContextWindowDiagram } from './ContextWindowDiagram'
import { PromptFlowDiagram } from './PromptFlowDiagram'
import { PromptSafetyDiagram } from './PromptSafetyDiagram'
import { MemoryLayersDiagram } from './MemoryLayersDiagram'
import { EvaluationDiagram } from './EvaluationDiagram'
import { CollaborationDiagram } from './CollaborationDiagram'

interface SourceEvidenceProps {
  lessonId: string
  sourceRefs: SourceRef[]
}

const lessonEvidenceCopy: Record<string, string> = {
  '0-1': '本课根据原书的日常任务形态与任务推进过程，区分单次回答和 Agent 工作方式；不把产品标签当作结论。',
  '0-2': '本课用三要素解释 Agent，并把原书的消融实验转写为可访问文字；不把具体产品能力当作稳定事实。',
  '1-1': '本课可讲结论与生产级缓存提醒分开呈现；缓存提醒只用于理解结构化上下文的边界，不参与课内判定。',
  '1-2': '本课通过流程图与对比练习说明提示词的组织方式；不把实验数字或单一提示词当作万能答案。',
  '1-3': '本课只做本地、无执行能力的来源辨识练习；原书的分层防御结论不等于单层规则可以保证安全。',
  '2-1': '本课区分通用知识与需维护资料；不把检索视为所有任务的固定步骤，也不承诺资料自动正确。',
  '2-2': '本课用虚构资料模拟检索相关性；RAG 的可用性仍依赖资料质量、时效和结果核对。',
  '2-3': '本课把不同用途的信息分层说明；不保存真实个人信息，也不把存得更多当作更好的记忆。',
  '3-1': '本课只模拟工具角色选择；高风险操作必须在权限边界内并由人确认，课内不执行任何真实操作。',
  '3-2': '本课重绘任务循环；观察结果后仍需判断，错误、上限或无后续行动时应停止或交还人类。',
  '4-1': '本课把评估转写为环境、标准与改进闭环；不以单次分数替代真实质量判断。',
  '4-2': '本课只在有新信息、并行或隔离需求时推荐协作；多个角色重复同一上下文不天然更好。',
}

function sourceDocumentHref(pdfPage: number) {
  if (pdfPage <= 0) return null

  const configuredDocumentUrl = import.meta.env.VITE_SOURCE_DOCUMENT_URL?.trim()
  if (configuredDocumentUrl) return `${configuredDocumentUrl.replace(/#.*$/, '')}#page=${pdfPage}`

  const isLocalPreview = typeof window !== 'undefined'
    && ['localhost', '127.0.0.1'].includes(window.location.hostname)
  if (deploymentBasePath() || isLocalPreview) {
    return appPath(`/resources/original-document.pdf#page=${pdfPage}`)
  }

  return null
}

export function SourceEvidence({ lessonId, sourceRefs }: SourceEvidenceProps) {
  return (
    <section
      className="source-evidence"
      id="source-evidence"
      aria-label="来源依据入口"
      tabIndex={-1}
    >
      <div className="source-evidence-heading">
        <div>
          <p className="source-evidence-kicker">已审核来源包 · {lessonId}</p>
          <h2>来源依据</h2>
        </div>
        <span>{sourceRefs.length} 项已复核</span>
      </div>
      <p className="source-evidence-intro">
        {lessonEvidenceCopy[lessonId] ?? '本课只呈现已审核来源中的可讲结论。'}
      </p>

      <div className="source-evidence-list">
        {sourceRefs.map((sourceRef) => {
          const isBoundary = sourceRef.boundary !== undefined
          const documentHref = sourceDocumentHref(sourceRef.pdfPage)

          return (
            <article
              className={isBoundary ? 'source-card source-card-boundary' : 'source-card'}
              aria-label={`来源 ${sourceRef.id}`}
              id={`source-${sourceRef.id}`}
              key={sourceRef.id}
            >
              <div className="source-card-meta">
                {documentHref ? (
                  <a
                    className="source-document-link"
                    href={documentHref}
                    rel="noreferrer"
                    target="_blank"
                    title={`在新窗口打开原始文档 PDF 第 ${sourceRef.pdfPage} 页`}
                  >
                    {sourceRef.id}
                  </a>
                ) : <strong>{sourceRef.id}</strong>}
                <span>PDF {sourceRef.pdfPage} · 印刷页 {sourceRef.printedPage}</span>
              </div>
              <p className="source-card-kind">
                {isBoundary ? lessonId === '1-1' ? '缓存扩展边界' : '课程边界提醒' : '本课可讲结论'}
              </p>
              <p>{sourceRef.conclusion}</p>
              {sourceRef.boundary && <p className="source-boundary-note">{sourceRef.boundary}</p>}
            </article>
          )
        })}
      </div>

      {lessonId === '0-1' && <AgentTaskLoopDiagram />}
      {lessonId === '0-2' && <AgentFormulaDiagram />}
      {lessonId === '1-1' && <ContextWindowDiagram />}
      {lessonId === '1-2' && <PromptFlowDiagram />}
      {lessonId === '1-3' && <PromptSafetyDiagram />}
      {lessonId === '2-3' && <MemoryLayersDiagram />}
      {lessonId === '3-2' && <AgentTaskLoopDiagram />}
      {lessonId === '4-1' && <EvaluationDiagram />}
      {lessonId === '4-2' && <CollaborationDiagram />}
    </section>
  )
}
