import Editor from "@monaco-editor/react";

export default function CodeEditor({ code, onChange }) {
  return (
    <Editor
      height="100%"
      defaultLanguage="java"
      theme="vs-dark"
      value={code}
      onChange={(value) => onChange(value || "")}
      options={{
        fontSize: 14,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
      }}
    />
  );
}