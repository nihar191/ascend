// frontend/src/components/match/CodeEditor.jsx
import { useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play } from 'lucide-react';

const CodeEditor = ({ code, onChange, onSubmit, language = 'javascript', onLanguageChange, disabled = false }) => {
  const editorRef = useRef(null);
  const [editorError, setEditorError] = useState(false);

  console.log('CodeEditor render:', { code, language, disabled });

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
    console.log('Monaco Editor mounted with code:', code);
    
    // Ensure the editor has content
    if (!code || code.trim() === '') {
      console.warn('Editor mounted with empty code');
    }
  };

  const handleEditorChange = (value) => {
    console.log('Editor content changed:', value);
    if (onChange) {
      onChange(value);
    }
  };

  const handleEditorError = (error) => {
    console.error('Monaco Editor error:', error);
    setEditorError(true);
  };

  const handleLanguageChange = (e) => {
    if (onLanguageChange) {
      onLanguageChange(e.target.value);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-gray-100 border-b gap-3">
        <div className="flex items-center space-x-3">
          <label className="text-sm font-medium text-gray-700 hidden sm:block">Language:</label>
          <select
            value={language}
            onChange={handleLanguageChange}
            disabled={disabled}
            className="px-3 py-2 border rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
            <option value="c">C</option>
          </select>
        </div>
        <button
          onClick={onSubmit}
          disabled={disabled}
          className="btn-primary text-sm flex items-center w-full sm:w-auto justify-center"
        >
          <Play className="h-4 w-4 mr-1" />
          Submit
        </button>
      </div>

      <div className="flex-1 min-h-0">
        {editorError ? (
          <div className="h-full p-4">
            <div className="mb-2 text-sm text-red-600">Monaco Editor failed to load. Using fallback editor:</div>
            <textarea
              value={code}
              onChange={(e) => handleEditorChange(e.target.value)}
              disabled={disabled}
              className="w-full h-full p-3 border border-gray-300 rounded font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Write your solution here..."
            />
          </div>
        ) : (
          <Editor
            height="100%"
            language={language}
            value={code}
            onChange={handleEditorChange}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: window.innerWidth < 768 ? 12 : 14,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              readOnly: disabled,
              wordWrap: 'on',
              wrappingIndent: 'indent',
              scrollbar: {
                vertical: 'auto',
                horizontal: 'auto',
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8,
              },
            }}
            onMount={handleEditorDidMount}
            onError={handleEditorError}
            loading={<div className="flex items-center justify-center h-full">Loading editor...</div>}
          />
        )}
      </div>
    </div>
  );
};

export default CodeEditor;
