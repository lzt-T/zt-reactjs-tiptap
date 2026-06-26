import { useState } from 'react'
import { SegmentedSwitch } from '@/react/components/SegmentedSwitch'
import { FormulaSnippetButton } from '../FormulaSnippetButton'
import { FORMULA_CATEGORIES, type FormulaPickerCategory } from '@/shared/config/formulaCategories'
import './index.css'

export type { FormulaPickerCategory } from '@/shared/config/formulaCategories'

export interface FormulaPickerProps {
  handlePickSnippet: (latex: string) => void
  /** 不传则使用默认 FORMULA_CATEGORIES */
  categories?: FormulaPickerCategory[]
}

/** 渲染公式片段分类选择器。 */
export function FormulaPicker({ handlePickSnippet, categories }: FormulaPickerProps) {
  // 当前可用的公式分类列表。
  const categoriesList = categories ?? FORMULA_CATEGORIES
  // 初始选中的分类 ID。
  const initialCategoryId = categoriesList[0]?.id ?? FORMULA_CATEGORIES[0].id
  // 当前选中的分类 ID。
  const [currentCategoryId, setCurrentCategoryId] = useState(initialCategoryId)
  // 当前展示的分类，外部分类变化导致 ID 失效时回退到首个分类。
  const currentCategory =
    categoriesList.find((category) => category.id === currentCategoryId) ??
    categoriesList[0]
  // 当前传给切换器的选中值，确保内容与选中态一致。
  const selectedCategoryId = currentCategory?.id ?? currentCategoryId
  // 分段切换选项。
  const categoryOptions = categoriesList.map((category) => ({
    label: category.title,
    value: category.id,
  }))

  return (
    <div className="formula-picker math-dialog-tabs">
      <SegmentedSwitch
        className="math-dialog-tabs-list"
        value={selectedCategoryId}
        onChange={setCurrentCategoryId}
        options={categoryOptions}
      />
      {currentCategory && (
        <div className="math-dialog-tabs-content">
          <div className="math-dialog-snippets-grid">
            {currentCategory.items.map((item) => (
              <FormulaSnippetButton key={item.id} item={item} onInsert={handlePickSnippet} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
