# 校准批次验收证据

- 批次：`calibration-001`
- 冻结来源：31 项；双人独立复核：31 项；正式已复核：31 项；剩余未复核：805 项。
- 分歧率：`1.0`；关键遗漏：0；各分层已按 `disagreement-rate-over-0.02` 记录扩审。
- 发现记录：9 条；本批新增视觉：`visual-p032-01`、`visual-p239-01`。
- 冻结 SHA-256：`ab27a28e51da3c086f9be68db83ffbaf452624c7dec2fc1dd8dcfaea149fd383`。
- 验收后 decisions SHA-256：`7833c691...191f`。

## 保护来源

```text
27dba7a82ce46fbaa60c27a99e633a029db455ec2ccec08c79466c57f317b4ac  reference/原始文档.pdf
101c5adc73073a0afb3b4dd08d0fa7b6b56a9aa8a611b2ff6a95c87a75b220ce  reference/source-audit/source-index.json
```

## 确定性报告

```text
8cd8812e0e044ef69340cbb7d41a38248265d482df4e3af570503f5ee089287a  reference/source-audit/source-coverage-matrix.md
cdbb1034475ddcb75d20d6f39cfde8fbffe0f01fcc50ab6f0824c4e51550b04b  reference/source-audit/visual-asset-index.md
```

## 完整的审计门

- 分歧工作清单：`tmp/source-audit/review-patches/calibration/disagreement-worklist.md`，31/31 条均已完成证据裁决。
- 独立校准验证器：通过，证明 31 个来源、31 次双审、31 条复核增量和一条台账验收记录。
- 测试：240/240 通过（`-W error`）。
- 规格复审：`PASS — no P0-P2`。
- 代码质量复审：`PASS — no P0-P2`。

阶段 A 尚未完成；全书其余 805 项仍待按正常批次复核。
