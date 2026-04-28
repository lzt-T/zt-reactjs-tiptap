import { useState, useEffect } from "react";
import {
  ReactTiptapEditor,
  EditorMode,
  EditorTheme,
  htmlToPlainText,
} from "../../../src/index";
import "./App.css";

function App() {
  // 控制编辑器浅色/深色主题。
  const [editorTheme, setEditorTheme] = useState<EditorTheme>(
    EditorTheme.Light,
  );
  const [content, setContent] = useState("");
  const [count, setCount] = useState(0);
  const [disabled, setDisabled] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>(EditorMode.Headless);

  const handleToggleMode = () => {
    setEditorMode((prevMode) =>
      prevMode === EditorMode.Headless
        ? EditorMode.NotionLike
        : EditorMode.Headless,
    );
  };

  const handleToggleDisabled = () => {
    setDisabled((prevDisabled) => !prevDisabled);
  };

  /** 切换编辑器主题（浅色/深色）。 */
  const handleToggleTheme = () => {
    setEditorTheme((prevTheme) =>
      prevTheme === EditorTheme.Dark ? EditorTheme.Light : EditorTheme.Dark,
    );
  };

  const handleEditorChange = (html: string) => {
    setCount(count + 1);
    setContent(html);
    console.log(
      "htmlToPlainText",
      htmlToPlainText(html, {
        singleLine: true,
      }),
    );
    console.log("count", count);
    console.log("✏️ onChange 被触发 - 用户编辑:", html);
  };

  const handleImagePreUpload = async (file: File): Promise<string> => {
    console.log("📤 上传图片:", file.name, file.size, "bytes");
    console.log("count", count);

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.2) {
          const mockUrl = `https://picsum.photos/seed/${Date.now()}/800/600`;
          console.log("✅ 上传成功:", mockUrl);
          resolve(mockUrl);
        } else {
          console.log("❌ 上传失败");
          reject(new Error("Mock upload failed, please retry"));
        }
      }, 1500);
    });
  };

  const onImageUpload = (payload: {
    file: File;
    url: string;
    alt?: string;
  }) => {
    console.log("count", count);
    console.log("✅ 图片 Confirm 回调:", payload);
  };

  const onFilePreUpload = async (
    file: File,
  ): Promise<{ url: string; name: string }> => {
    console.log("📤 上传文件:", file.name, file.size, "bytes");
    console.log("count", count);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ url: "https://example.com/file.pdf", name: file.name });
      }, 1500);
    });
  };

  const onFileUpload = (payload: { file: File; url: string; name: string }) => {
    console.log("count", count);
    console.log("✅ 文件 Confirm 回调:", payload);
  };

  const onFileAttachmentClick = ({
    url,
    name,
  }: {
    url: string;
    name: string;
  }) => {
    console.log(count, "count");
    console.log("📤 点击文件:", { url, name });
  };

  const onImageDelete = (params: {
    src: string;
    alt?: string;
    title?: string;
  }) => {
    console.log("count", count);
    console.log("🗑️ 删除图片:", params);
  };

  const onFileDelete = (params: { url: string; name: string }) => {
    console.log("count", count);
    console.log("🗑️ 删除附件:", params);
  };

  useEffect(() => {
    console.log("📡 准备从接口加载数据...");
    setTimeout(() => {
      console.log("📥 接口数据返回，设置 content（此操作不应触发 onChange）");
      setContent(
        '<p>Welcome to Tiptap Editor! asd</p><p></p><div data-latex="\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}" data-type="block-math"></div><p></p>',
      );
    }, 2000);
  }, []);

  return (
    <div
      className={`app ${editorTheme === EditorTheme.Dark ? "app-dark" : "app-light"}`}
    >
      <h1>Tiptap Markdown Editor</h1>
      <div className="demo-actions">
        <button type="button" onClick={handleToggleMode}>
          切换模式
        </button>
        <button type="button" onClick={handleToggleDisabled}>
          切换disabled
        </button>
        <button type="button" onClick={handleToggleTheme}>
          切换主题（{editorTheme}）
        </button>
      </div>
      {/*<div onClick={() => setDisabled(true)}>disabled</div>
      <div onClick={() => setDisabled(false)}> not disabled</div>*/}
      <div
        className="flex-1"
        style={{ height: "calc(100vh - 200px)", width: "800px" }}
      >
        <ReactTiptapEditor
          disabled={disabled}
          editorMode={editorMode}
          theme={editorTheme}
          value={content}
          onChange={(str: string) => {
            console.log("str", str);
            handleEditorChange(str);
          }}
          language="en-US"
          fileUploadTypes={["pdf"]}
          onImagePreUpload={handleImagePreUpload}
          onImageUpload={onImageUpload}
          onImageDelete={onImageDelete}
          maxHeight="500px"
          onFilePreUpload={onFilePreUpload}
          onFileUpload={onFileUpload}
          onFileDelete={onFileDelete}
          onFileAttachmentClick={onFileAttachmentClick}
          // onCodeBlockFormat={onCodeBlockFormat}
        />
      </div>
      <div className="h-[900px]"></div>
    </div>
  );
}

export default App;
