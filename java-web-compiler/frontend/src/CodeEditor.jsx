import Editor from "@monaco-editor/react";
import PropTypes from "prop-types";

export default function CodeEditor({ code, language, onChange }) {
  return (
    <Editor
      height="100%"
      language={language}
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

CodeEditor.propTypes = {
  code: PropTypes.string,
  language: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};
