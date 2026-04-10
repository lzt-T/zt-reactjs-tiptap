import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/react/components/ui/tabs'
import { FormulaSnippetButton } from '../FormulaSnippetButton'
import { FORMULA_CATEGORIES, type FormulaPickerCategory } from '@/shared/config/formulaCategories'
import './FormulaPicker.css'

export type { FormulaPickerCategory } from '@/shared/config/formulaCategories'

export interface FormulaPickerProps {
  handlePickSnippet: (latex: string) => void
  /** 不传则使用默认 FORMULA_CATEGORIES */
  categories?: FormulaPickerCategory[]
}

export function FormulaPicker({ handlePickSnippet, categories }: FormulaPickerProps) {
  const categoriesList = categories ?? FORMULA_CATEGORIES
  const defaultTab = categoriesList[0]?.id ?? FORMULA_CATEGORIES[0].id

  return (
    <Tabs defaultValue={defaultTab} className="formula-picker math-dialog-tabs">
      <TabsList className="math-dialog-tabs-list">
        {categoriesList.map((category) => (
          <TabsTrigger key={category.id} value={category.id}>
            {category.title}
          </TabsTrigger>
        ))}
      </TabsList>
      {categoriesList.map((category) => (
        <TabsContent key={category.id} value={category.id} className="math-dialog-tabs-content">
          <div className="math-dialog-snippets-grid">
            {category.items.map((item) => (
              <FormulaSnippetButton key={item.id} item={item} onInsert={handlePickSnippet} />
            ))}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  )
}
