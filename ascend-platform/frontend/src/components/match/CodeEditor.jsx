// frontend/src/components/match/CodeEditor.jsx
import { useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Play } from 'lucide-react';

const CodeEditor = ({ code, onChange, onSubmit, language = 'javascript', disabled = false }) => {
  const editorRef = useRef(null);

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 bg-gray-100 border-b">
        <div className="flex items-center space-x-4">
          <select
            value={language}
            disabled
            className="px-3 py-1 border rounded text-sm bg-white"
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
          </select>
        </div>
        <button
          onClick={onSubmit}
          disabled={disabled}
          className="btn-primary text-sm flex items-center"
        >
          <Play className="h-4 w-4 mr-1" />
          Submit
        </button>
      </div>

      <div className="flex-1">
        <Editor
          height="100%"
          language={language}
          value={code}
          onChange={onChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            readOnly: disabled,
          }}
          onMount={handleEditorDidMount}
        />
      </div>
    </div>
  );
};

export default CodeEditor;
