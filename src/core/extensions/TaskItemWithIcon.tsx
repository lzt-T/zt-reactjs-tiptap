import TaskItem from "@tiptap/extension-task-item";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { Check } from "lucide-react";

/** TaskItem 节点属性。 */
interface TaskItemAttrs {
  checked?: boolean;
}

/** 使用 Lucide 图标渲染任务项复选框。 */
function TaskItemWithIconView({ node, editor, updateAttributes }: NodeViewProps) {
  // 当前任务项是否已勾选。
  const checked = Boolean((node.attrs as TaskItemAttrs).checked);
  // 当前任务项是否可编辑。
  const editable = editor.isEditable;

  return (
    <NodeViewWrapper as="li" data-type="taskItem" data-checked={checked ? "true" : "false"}>
      <label className="task-item-checkbox-label" contentEditable={false}>
        <span className="task-item-checkbox-box">
          <input
            type="checkbox"
            checked={checked}
            disabled={!editable}
            onChange={(event) => {
              updateAttributes({ checked: event.currentTarget.checked });
            }}
          />
          <span className="task-item-checkmark" aria-hidden="true">
            <Check size={14} strokeWidth={3} />
          </span>
        </span>
      </label>
      <NodeViewContent as="div" />
    </NodeViewWrapper>
  );
}

/** 带 Lucide 勾选图标的任务项扩展。 */
export const TaskItemWithIcon = TaskItem.extend({
  addNodeView() {
    return ReactNodeViewRenderer(TaskItemWithIconView);
  },
});
