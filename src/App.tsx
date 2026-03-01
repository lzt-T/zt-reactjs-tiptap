import { useState, useEffect } from "react";
import TiptapEditor from "@/components/TiptapEditor";
import { EditorMode, HeadlessToolbarMode } from "@/components/TiptapEditor/types";
import "./App.css";

function App() {
  const [content, setContent] = useState("");
  const [count, setCount] = useState(0);

  const handleEditorChange = (html: string) => {
    setCount(count + 1);
    setContent(html);
    console.log("count", count);
    console.log("✏️ onChange 被触发 - 用户编辑:", html);
  };

  // 自定义图片上传函数示例
  // 如果不提供此函数，图片会自动转换为 Base64
  const handleImageUpload = async (file: File): Promise<string> => {
    console.log("📤 上传图片:", file.name, file.size, "bytes");

    // 模拟上传到服务器（实际使用时替换为真实的上传逻辑）
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // 模拟 80% 成功率
        if (Math.random() > 0.2) {
          // 这里应该返回服务器上的图片 URL
          // 示例中我们返回一个在线图片 URL 作为演示
          const mockUrl = `https://picsum.photos/seed/${Date.now()}/800/600`;
          console.log("✅ 上传成功:", mockUrl);
          resolve(mockUrl);
        } else {
          console.log("❌ 上传失败");
          reject(new Error("模拟上传失败，请重试"));
        }
      }, 1500); // 模拟 1.5 秒的上传时间
    });
  };

  useEffect(() => {
    console.log("📡 准备从接口加载数据...");
    setTimeout(() => {
      console.log("📥 接口数据返回，设置 content（此操作不应触发 onChange）");
      setContent(
        '<p>欢迎使用 Tiptap 编辑器！asd</p><p></p><div data-latex="\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}" data-type="block-math"></div><p></p>'
      );
    }, 2000);
  }, []);

  return (
    <div className="app">
      <h1>Tiptap Markdown Editor</h1>

      {/* <div className="h-[500px] overflow-y-auto"> */}
      <div
        className="flex-1"
        style={{ height: "calc(100vh - 400px)", width: "400px" }}
      >
        <TiptapEditor
          // border={false}
          // disabled={true}
          // editorMode={EditorMode.Headless}
          headlessToolbarMode={HeadlessToolbarMode.OnFocus}
          value={content}
          onChange={handleEditorChange}
          onImageUpload={handleImageUpload}
        />
      </div>
      {/* </div> */}
      <div className="h-[900px]"></div>
    </div>
  );
}

export default App;
