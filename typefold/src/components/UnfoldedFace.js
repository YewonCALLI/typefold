import React, { useRef, useState, useEffect } from "react";
import Sketch from "react-p5";

export default function P5TextureEditor({ onTextureReady }) {
  const p5Ref = useRef(null);
  const sketchRef = useRef(null);
  const [currentPattern, setCurrentPattern] = useState(1);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editorCode, setEditorCode] = useState("");
  const [patternSize, setPatternSize] = useState(10);
  
  const drawPattern1 = (p5) => {
    const time = p5.millis() * 0.001;
    
    p5.background(20, 20, 40);
    
    const scale = patternSize;
    const cellSize = p5.width / scale;
    
    for (let x = 0; x < scale; x++) {
      for (let y = 0; y < scale; y++) {
        const posX = x * cellSize;
        const posY = y * cellSize;
        
        const randomOffset = p5.sin(x * 13.37 + y * 17.89);
        
        p5.push();
        p5.translate(posX + cellSize/2, posY + cellSize/2);
        
        for (let i = 5; i > 0; i--) {
          const size = (cellSize * 0.8) * (i / 5);
          
          const wavePhase = p5.sin(i * 0.5 + time + randomOffset);
          
          const r = p5.sin(wavePhase * 2.0 + time) * 0.5 + 0.5;
          const g = p5.sin(wavePhase * 3.0 + time * 1.2) * 0.5 + 0.5;
          const b = p5.sin(wavePhase * 4.0 + time * 0.8) * 0.5 + 0.5;
          
          p5.noStroke();
          p5.fill(r * 255, g * 255, b * 255);
          p5.ellipse(0, 0, size, size);
        }
        
        p5.pop();
      }
    }
  };
  const drawPattern2 = (p5) => {
  if (!p5.orange || p5.lastPatternSize !== patternSize) {
    p5.orange = [];
    p5.orange1 = [];
    p5.x3 = p5.random(400);
    p5.y3 = p5.random(400);
    p5.lastPatternSize = patternSize;
    
    const particleCount = patternSize * 2;
    
    for (let i = 0; i < particleCount; i++) {
      p5.orange[i] = {
        x: p5.random(0, p5.width),
        y: p5.random(0, p5.height),
        move: function() {
          let r = p5.random(1);
          
          if (r < 0.25) {
            this.x = this.x + 5;
          } else if (r < 0.5) {
            this.x = this.x - 5;
          } else if (r < 0.75) {
            this.y = this.y + 5;
          } else {
            this.y = this.y - 5;
          }
          
          this.x = p5.constrain(this.x, 0, p5.width);
          this.y = p5.constrain(this.y, 0, p5.height);
          
          p5.noStroke();
          p5.fill(255,255,0);
          p5.ellipse(this.x, this.y, 5);
        }
      };
    }
    
    for (let i = 0; i < particleCount; i++) {
      p5.orange1[i] = {
        x: p5.random(0, p5.width),
        y: p5.random(0, p5.height),
        move: function() {
          let r = p5.random(1);
          
          if (r < 0.25) {
            this.x = this.x + 5;
          } else if (r < 0.5) {
            this.x = this.x - 5;
          } else if (r < 0.75) {
            this.y = this.y + 5;
          } else {
            this.y = this.y - 5;
          }
          
          this.x = p5.constrain(this.x, 0, p5.width);
          this.y = p5.constrain(this.y, 0, p5.height);
          
          p5.noStroke();
          p5.fill(255);
          p5.ellipse(this.x, this.y, 5);
        }
      };
    }
    
    p5.background("#E900FF");
  }
  

  for (let i = 0; i < p5.orange.length; i++) {
    p5.orange[i].move();
  }
  
  for (let i = 0; i < p5.orange1.length; i++) {
    p5.orange1[i].move();
  }
};
  const sampleCustomCode = `// 여기에 코드를 작성해 보세요!
  function draw(p) {
    const time = p.millis() * 0.001;
    p.background(225,255,0);
    const cellCount = patternSize;
    p.fill(255);

    p.ellipse(p.width/2, p.height/2, 30*cellCount * p.sin(time));

    p.fill(255,0,255);

    p.ellipse(p.width/2, p.height/2, 20*cellCount * p.sin(time));

    
  }`;

  useEffect(() => {
    setEditorCode(sampleCustomCode);
  }, []);

  const setup = (p5, canvasParentRef) => {
    const canvas = p5.createCanvas(512, 512);
    canvas.parent(canvasParentRef);
    p5.pixelDensity(2);
    p5Ref.current = p5;
    
    createUI();
  };

  const draw = (p5) => {
    if (currentPattern === 1) {
      drawPattern1(p5);
    } else if (currentPattern === 2) {
      drawPattern2(p5);
    } else if (currentPattern === 3 && sketchRef.current) {
      try {
        // patternSize 변수를 사용자 코드에 전달
        sketchRef.current(p5, patternSize);
      } catch (e) {
        console.error("사용자 코드 실행 오류:", e);
        p5.background(255, 0, 0, 30);
        p5.fill(255);
        p5.textSize(16);
        p5.textAlign(p5.CENTER);
        p5.text("코드 오류가 발생했습니다", p5.width/2, p5.height/2);
      }
    }
    
    if (onTextureReady) {
      onTextureReady(p5.canvas);
    }
  };
  
  const createUI = () => {
    // 기존 UI 제거
    const existingUI = document.getElementById("p5EditorUI");
    if (existingUI) {
      existingUI.remove();
    }
    
    // 메인 컨테이너
    const container = document.createElement("div");
    container.id = "p5EditorUI";
    container.style.cssText = `
      position: absolute;
      right: 10px;
      bottom: 10px;
      width: ${editorVisible ? '750px' : '750px'};
      background-color: rgba(255, 255, 255, 0.95);
      padding: 10px;
      border-radius: 5px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      z-index: 100;
      transition: width 0.3s ease;
      font-family: sans-serif;
    `;
    
    // 헤더
    const header = document.createElement("div");
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      border-bottom: 1px solid #ccc;
      padding-bottom: 10px;
    `;
    

    
    // 에디터 토글 버튼
    const toggleButton = document.createElement("button");
    toggleButton.textContent = editorVisible ? "Close Editor" : "Open Editor";
    toggleButton.style.cssText = `
      padding: 5px 10px;
      background-color: #333;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
    `;
    toggleButton.onclick = () => {
      setEditorVisible(!editorVisible);
    };
    
    header.appendChild(toggleButton);
    container.appendChild(header);
    
    // 패턴 버튼들
    const patternContainer = document.createElement("div");
    patternContainer.style.cssText = `
      display: flex;
      gap: 10px;
      margin-bottom: 10px;
    `;
    
    const createPatternButton = (label, patternNumber) => {
      const button = document.createElement("button");
      button.textContent = label;
      button.style.cssText = `
        flex: 1;
        padding: 8px;
        font-size: 14px;
        background-color: ${currentPattern === patternNumber ? '#000' : '#fff'};
        color: ${currentPattern === patternNumber ? '#fff' : '#000'};
        border: 1px solid #000;
        border-radius: 3px;
        cursor: pointer;
      `;
      button.onclick = () => {
        setCurrentPattern(patternNumber);
      };
      return button;
    };
    
    const pattern1Button = createPatternButton("Pattern 1", 1);
    const pattern2Button = createPatternButton("Pattern 2", 2);
    const customCodeButton = createPatternButton("Edit here", 3);
    
    patternContainer.appendChild(pattern1Button);
    patternContainer.appendChild(pattern2Button);
    patternContainer.appendChild(customCodeButton);
    container.appendChild(patternContainer);
    
    // 패턴 크기 슬라이더
    const sliderContainer = document.createElement("div");
    sliderContainer.style.cssText = `
      margin-bottom: 15px;
    `;
    
    const sliderLabel = document.createElement("div");
    sliderLabel.textContent = "Patter Size: " + patternSize;
    sliderLabel.style.cssText = `
      margin-bottom: 5px;
      font-size: 14px;
    `;
    
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "3";
    slider.max = "30";
    slider.step = '0.01';
    slider.value = patternSize;
    slider.style.cssText = `
      width: 100%;
      height: 10px;
    `;
    
    slider.oninput = (e) => {
      const newSize = parseInt(e.target.value, 10);
      setPatternSize(newSize);
      sliderLabel.textContent = "패턴 크기: " + newSize;
    };
    
    sliderContainer.appendChild(sliderLabel);
    sliderContainer.appendChild(slider);
    container.appendChild(sliderContainer);
    
    // 코드 에디터 영역
    if (editorVisible) {
      const editorArea = document.createElement("div");
      
      const textArea = document.createElement("textarea");
      textArea.value = editorCode;
      textArea.style.cssText = `
        width: 100%;
        height: 300px;
        font-family: monospace;
        font-size: 12px;
        padding: 8px;
        margin-bottom: 10px;
        border-radius: 3px;
        border: 1px solid #ccc;
        resize: vertical;
      `;
      
      const applyButton = document.createElement("button");
      applyButton.textContent = "코드 적용";
      applyButton.style.cssText = `
        width: 100%;
        padding: 8px;
        font-size: 14px;
        background-color: #0CFF69;
        color: black;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        margin-bottom: 10px;
      `;
      
      applyButton.onclick = () => {
        try {
          const code = textArea.value;
          setEditorCode(code);
          
          const fn = new Function('p', 'patternSize', `
            try {
              ${code}
              return typeof draw === 'function' ? draw : null;
            } catch(e) {
              console.error("코드 컴파일 오류:", e);
              return null;
            }
          `);
          
          const drawFunction = fn(null, patternSize);
          
          if (typeof drawFunction === 'function') {
            sketchRef.current = drawFunction;
            setCurrentPattern(3); 
          } else {
            alert("draw 함수를 찾을 수 없습니다. 코드에 유효한 draw 함수가 포함되어 있는지 확인하세요.");
          } 
        } catch (e) {
          console.error("코드 적용 오류:", e);
          alert(`코드 오류: ${e.message}`);
        }
      };
      
      // 도움말 텍스트
      const helpText = document.createElement("div");
      helpText.innerHTML = `
        <div style="margin-top: 10px; font-size: 12px; color: #666;">
          <p><strong>도움말:</strong> draw 함수 안에서 <code>patternSize</code> 변수를 사용하여 패턴 크기를 조절할 수 있습니다.</p>
          <p>예: <code>const cellCount = patternSize;</code></p>
        </div>
      `;
      
      editorArea.appendChild(textArea);
      editorArea.appendChild(applyButton);
      editorArea.appendChild(helpText);
      container.appendChild(editorArea);
    }
    
    const unfoldedCanvas = document.getElementById('unfoldedCanvas');
    if (unfoldedCanvas) {
      unfoldedCanvas.appendChild(container);
    }
  };
  
  // 에디터 표시 상태나 패턴 종류, 크기가 변경될 때 UI 업데이트
  useEffect(() => {
    createUI();
  }, [editorVisible, currentPattern, patternSize]);

  return <Sketch setup={setup} draw={draw} />;
}