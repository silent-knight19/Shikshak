const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add addMenuIndex state
content = content.replace(
  "  const [showAddMenu, setShowAddMenu] = useState(false);",
  "  const [showAddMenu, setShowAddMenu] = useState(false);\n  const [addMenuIndex, setAddMenuIndex] = useState(0);"
);

// 2. Add effect to reset index when menu opens
content = content.replace(
  "  useEffect(() => { sessionStorage.setItem('visualiseMode', String(visualiseMode)); }, [visualiseMode]);",
  "  useEffect(() => { sessionStorage.setItem('visualiseMode', String(visualiseMode)); }, [visualiseMode]);\n  useEffect(() => { if (showAddMenu) setAddMenuIndex(0); }, [showAddMenu]);"
);

// 3. Update handleKeyDown
const newHandleKeyDown = `
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showAddMenu) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAddMenuIndex(prev => (prev + 1) % 3);
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAddMenuIndex(prev => (prev - 1 + 3) % 3);
        return;
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (addMenuIndex === 0) {
          fileInputRef.current?.click();
        } else if (addMenuIndex === 1) {
          setVisualiseMode(!visualiseMode);
        } else if (addMenuIndex === 2) {
          setShowSubjectMenu(true);
        }
        setShowAddMenu(false);
        return;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowAddMenu(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) handleSendMessage();
    } else if (e.key === '/' && inputText.trim() === '') {
      e.preventDefault();
      setShowAddMenu(true);
    }
  };
`;
// Replace existing handleKeyDown
content = content.replace(
  /  const handleKeyDown = \(e: React\.KeyboardEvent\) => \{[\s\S]*?  \};\n/,
  newHandleKeyDown + "\n"
);

// 4. Update the 3 buttons in the Add Menu popover
// Button 0 (Add photos)
content = content.replace(
  "                        background: 'transparent',",
  "                        background: addMenuIndex === 0 ? 'rgba(255,255,255,0.06)' : 'transparent',"
);
content = content.replace(
  "                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}",
  "                      onMouseEnter={() => setAddMenuIndex(0)}"
);
content = content.replace(
  "                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}",
  ""
);

// Button 1 (Visualise)
content = content.replace(
  "                        background: 'transparent',",
  "                        background: addMenuIndex === 1 ? 'rgba(255,255,255,0.06)' : 'transparent',"
);
content = content.replace(
  "                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}",
  "                      onMouseEnter={() => setAddMenuIndex(1)}"
);
content = content.replace(
  "                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}",
  ""
);

// Button 2 (Subject)
content = content.replace(
  "                        background: 'transparent',",
  "                        background: addMenuIndex === 2 ? 'rgba(255,255,255,0.06)' : 'transparent',"
);
content = content.replace(
  "                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}",
  "                      onMouseEnter={() => setAddMenuIndex(2)}"
);
content = content.replace(
  "                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}",
  ""
);


fs.writeFileSync('src/App.tsx', content);
console.log('Update script completed successfully!');
