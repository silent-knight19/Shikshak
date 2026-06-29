const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Fix Subject Chip Alignment (add alignSelf: 'center')
content = content.replace(
  "                    gap: 4,\n                    flexShrink: 0,\n                    lineHeight: 1.3,\n                  }}>",
  "                    gap: 4,\n                    flexShrink: 0,\n                    lineHeight: 1.3,\n                    alignSelf: 'center',\n                  }}>"
);

// 2. Remove "⇧ Enter" text
// Finding the block and replacing it with empty string
content = content.replace(
  /                \{inputText\.length === 0 && pendingFiles\.length === 0 && \([\s\S]*?\}\)[\s]*?/,
  ""
);

// 3. Make Mic Icon Bigger (width=22, height=22)
// Replace width="18" height="18" inside the Voice typing button
// We have two SVGs in Voice typing button (one for listening, one for not listening)
const voiceButtonIndex = content.indexOf("{/* Voice typing button */}");
if (voiceButtonIndex !== -1) {
  let before = content.substring(0, voiceButtonIndex);
  let voiceSection = content.substring(voiceButtonIndex);
  
  voiceSection = voiceSection.replace(
    /<svg width="18" height="18"/g, 
    '<svg width="22" height="22"'
  );
  
  // Make the button itself slightly larger to accommodate (from 34 to 38)
  voiceSection = voiceSection.replace(
    /width: 34,\n                      height: 34,/g,
    "width: 38,\n                      height: 38,"
  );
  
  content = before + voiceSection;
}

// 4. Add pulse effect to Mic button
content = content.replace(
  "                      background: listening ? 'rgba(239,68,68,0.15)' : 'transparent',",
  "                      background: listening ? 'rgba(239,68,68,0.15)' : 'transparent',\n                      animation: listening ? 'pulseRed 1.5s infinite' : 'none',"
);

fs.writeFileSync('src/App.tsx', content);

// Add pulseRed animation to index.css
let css = fs.readFileSync('src/index.css', 'utf8');
if (!css.includes('@keyframes pulseRed')) {
  css += `
@keyframes pulseRed {
  0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}
`;
  fs.writeFileSync('src/index.css', css);
}

console.log('UI Tweaks script completed successfully!');
