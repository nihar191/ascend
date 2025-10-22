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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 lg:p-3 bg-gray-100 border-b gap-2 lg:gap-3 sticky top-0 z-10">
        <div className="flex items-center gap-2 lg:gap-3 w-full sm:w-auto">
          <label className="text-xs lg:text-sm font-medium text-gray-700 hidden sm:block">Language:</label>
          <select
            value={language}
            onChange={handleLanguageChange}
            disabled={disabled}
            className="px-2 lg:px-3 py-1 lg:py-2 border rounded text-xs lg:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 flex-1 sm:flex-none"
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
          className="btn-primary text-xs lg:text-sm flex items-center w-full sm:w-auto justify-center py-2 lg:py-3 px-3 lg:px-6"
        >
          <Play className="h-3 w-3 lg:h-4 lg:w-4 mr-1" />
          Submit
        </button>
      </div>

      <div className="flex-1 min-h-0">
        {editorError ? (
          <div className="h-full p-2 lg:p-4">
            <div className="mb-2 text-xs lg:text-sm text-red-600">Monaco Editor failed to load. Using fallback editor:</div>
            <textarea
              value={code}
              onChange={(e) => handleEditorChange(e.target.value)}
              disabled={disabled}
              className="w-full h-full p-2 lg:p-3 border border-gray-300 rounded font-mono text-xs lg:text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
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
              fontSize: window.innerWidth < 768 ? 10 : 14,
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
                verticalScrollbarSize: 6,
                horizontalScrollbarSize: 6,
              },
              padding: { top: 8, bottom: 8 },
            }}
            onMount={handleEditorDidMount}
            onError={handleEditorError}
            loading={<div className="flex items-center justify-center h-full text-xs lg:text-sm">Loading editor...</div>}
          />
        )}
      </div>
    </div>
  );
};

export default CodeEditor;
