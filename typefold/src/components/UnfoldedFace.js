import React, { useRef, useState, useEffect } from "react";
import Sketch from "react-p5";

export default function ShaderTexture({ onTextureReady }) {
  const shaderRef = useRef(null);
  const p5Ref = useRef(null);
  const [patternType, setPatternType] = useState(1);
  const [patternScale, setPatternScale] = useState(3.0);
  const [vertexShaderCode, setVertexShaderCode] = useState(`
    attribute vec3 aPosition;
    attribute vec2 aTexCoord;
    varying vec2 vTexCoord;
    void main() {
      vTexCoord = aTexCoord;
      vec4 positionVec4 = vec4(aPosition, 1.0);
      positionVec4.xy = positionVec4.xy * 2.0 - 1.0;
      gl_Position = positionVec4;
    }
  `);

  const [fragmentShaderCode, setFragmentShaderCode] = useState(`
    precision mediump float;
    varying vec2 vTexCoord;
    uniform float uTime;
    uniform int uPattern;
    uniform float uPatternScale;

    float hexagonPattern(vec2 p) {
      vec2 hexCoord = p * uPatternScale;
      hexCoord.x *= 1.1547;
      vec2 gridId = floor(hexCoord);
      vec2 gridPos = fract(hexCoord) - 0.5;
      
      float hex = length(gridPos) * 2.0;
      return hex;
    }

    float checkerPattern(vec2 p) {
      vec2 grid = floor(p * uPatternScale);
      return mod(grid.x + grid.y, 2.0);
    }

    float zigzagPattern(vec2 p) {
      float v = sin(p.x * uPatternScale + sin(p.y * (uPatternScale * 0.5))) * 0.5 + 
                sin(p.y * uPatternScale) * 0.5;
      return v;
    }

    void main() {
      vec2 uv = vTexCoord;
      uv.y = 1.0 - uv.y;
      
      vec3 color;
      
      if (uPattern == 1) {
        float hex = hexagonPattern(uv + vec2(sin(uTime * 0.2), cos(uTime * 0.2)) * 0.1);
        color = vec3(
          sin(hex * 4.0 + uTime) * 0.5 + 0.5,
          cos(hex * 5.0 - uTime) * 0.5 + 0.5,
          sin(hex * 6.0 + uTime * 0.7) * 0.5 + 0.5
        );
      }
      else if (uPattern == 2) {
        float check = checkerPattern(uv + vec2(sin(uTime * 0.2), cos(uTime * 0.2)) * 0.1);
        color = mix(
          vec3(0.8, 0.2, 0.3),
          vec3(0.2, 0.5, 0.8),
          check
        );
      }
      else if (uPattern == 3) {
        float zig = zigzagPattern(uv + vec2(uTime * 0.1));
        color = vec3(
          sin(zig + uTime) * 0.5 + 0.5,
          cos(zig * 2.0 + uTime * 0.7) * 0.5 + 0.5,
          sin(zig * 3.0 - uTime * 0.5) * 0.5 + 0.5
        );
      }
      else {
        float waves = sin(uv.x * uPatternScale * 2.0 + uTime) * 0.5 + 
                     sin(uv.y * (uPatternScale * 1.5) - uTime * 0.7) * 0.5;
        color = vec3(
          sin(waves * 3.0 + uTime) * 0.5 + 0.5,
          cos(waves * 4.0 - uTime * 0.5) * 0.5 + 0.5,
          sin(waves * 5.0 + uTime * 0.3) * 0.5 + 0.5
        );
      }
      gl_FragColor = vec4(color, 1.0);
    }
  `);

  const recompileShader = (p5) => {
    if (!p5) return;
    
    try {
      // 이전 쉐이더 정리
      if (shaderRef.current) {
        shaderRef.current = null;
      }

      // 새 쉐이더 생성 및 컴파일
      const newShader = p5.createShader(vertexShaderCode, fragmentShaderCode);
      shaderRef.current = newShader;
      p5.shader(newShader);
      
      console.log('Shader compiled successfully');
    } catch (error) {
      console.error("Shader compilation failed:", error);
      alert(`Shader compilation error: ${error.message}`);
    }
  };

  const setup = (p5, canvasParentRef) => {
    const canvas = p5.createCanvas(512, 512, p5.WEBGL);
    canvas.parent(canvasParentRef);
    p5.pixelDensity(1);
    
    try {
      const newShader = p5.createShader(vertexShaderCode, fragmentShaderCode);
      shaderRef.current = newShader;
      p5.shader(newShader);
      p5.noStroke();

      p5.keyPressed = () => {
        if (p5.key >= '1' && p5.key <= '4') {
          setPatternType(parseInt(p5.key));
        }
      };

      createControls(p5);
    } catch (error) {
      console.error("Shader initialization failed:", error);
    }
  };

  const createControls = (p5) => {
    p5Ref.current = p5;
    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute;
      right: 10px;
      bottom: 10px;
      width: 100%;
      background-color: rgba(255, 255, 255, 0.9);
      padding: 10px;
      border-radius: 5px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      z-index: 100;
    `;

    // 쉐이더 에디터
    const editorContainer = document.createElement('div');
    editorContainer.style.cssText = `
      margin-bottom: 10px;
      display: flex;
      gap: 10px;
      border: none;
    `;

    // Vertex Shader 에디터
    const vertexEditor = document.createElement('div');
    vertexEditor.style.cssText = `flex: 1;`;
    const vertexLabel = document.createElement('div');
    vertexLabel.textContent = 'Vertex Shader';
    vertexLabel.style.marginBottom = '5px';
    vertexLabel.style.fontFamily = 'montreal, sans-serif';
    const vertexTextarea = document.createElement('textarea');
    vertexTextarea.value = vertexShaderCode;
    vertexTextarea.style.cssText = `
      width: 100%;
      height: 150px;
      font-family: 'montreal',sans-serif;
      font-size: 12px;
      resize: vertical;
      border-radius:6px;
      border: solid 1px #00aaff;
    `;
    vertexEditor.appendChild(vertexLabel);
    vertexEditor.appendChild(vertexTextarea);

    const fragmentEditor = document.createElement('div');
    fragmentEditor.style.cssText = `flex: 1;`;
    const fragmentLabel = document.createElement('div');
    fragmentLabel.textContent = 'Fragment Shader';
    fragmentLabel.style.marginBottom = '5px';
    fragmentLabel.style.fontFamily = 'montreal, sans-serif';
    const fragmentTextarea = document.createElement('textarea');
    fragmentTextarea.value = fragmentShaderCode;
    fragmentTextarea.style.cssText = `
      width: 100%;
      height: 150px;
      font-family: 'montreal',sans-serif;
      font-size: 12px;
      resize: vertical;
      outline: none;
      border-radius:6px;
      border: solid 1px #00aaff;
    `;
    fragmentEditor.appendChild(fragmentLabel);
    fragmentEditor.appendChild(fragmentTextarea);

    editorContainer.appendChild(vertexEditor);
    editorContainer.appendChild(fragmentEditor);
    container.appendChild(editorContainer);

    const compileButton = document.createElement('button');
    compileButton.textContent = 'Compile Shader';
    compileButton.style.cssText = `
      display: block;
      margin: 10px 0;
      padding: 5px 10px;
      font-family: 'montreal', sans-serif;
      font-weight : 100;
      background-color: #0CFF69;
      color: black;
      border: none;
      border-radius: 3px;
      cursor: pointer;
    `;
    compileButton.onclick = () => {
      setVertexShaderCode(vertexTextarea.value);
      setFragmentShaderCode(fragmentTextarea.value);
      if (p5Ref.current) {
        recompileShader(p5Ref.current);
      }
    };
    container.appendChild(compileButton);

    const buttonContainer = document.createElement('div');
    buttonContainer.style.marginBottom = '10px';
    ['Type1', 'Type2', 'Type3', 'Type4'].forEach((pattern, index) => {
      const button = document.createElement('button');
      button.textContent = pattern;
      button.style.cssText = `
        margin-right: 5px;
        padding: 5px 10px;
        font-family: 'montreal', sans-serif;
        font-weight: 100;
        background-color: ${patternType === index + 1 ? '#000' : '#fff'};
        color: ${patternType === index + 1 ? '#fff' : '#000'};
        border: 1px solid #000;
        cursor: pointer;
        border-radius: 3px;
      `;
      button.onclick = () => {
        setPatternType(index + 1);
        buttonContainer.querySelectorAll('button').forEach((btn, idx) => {
          btn.style.backgroundColor = idx === index ? '#000' : '#fff';
          btn.style.color = idx === index ? '#fff' : '#000';
        });
      };
      buttonContainer.appendChild(button);
    });
    container.appendChild(buttonContainer);

    // 스케일 슬라이더
    const sliderContainer = document.createElement('div');
    sliderContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: 'montreal', sans-serif;
    `;

    const label = document.createElement('label');
    label.textContent = 'Pattern Scale:';
    sliderContainer.appendChild(label);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '1';
    slider.max = '20';
    slider.step = '0.5';
    slider.value = patternScale;
    slider.style.width = '120px';
    
    const value = document.createElement('span');
    value.textContent = patternScale;
    value.style.minWidth = '30px';

    slider.oninput = (e) => {
      const newScale = parseFloat(e.target.value);
      setPatternScale(newScale);
      value.textContent = newScale.toFixed(1);
    };

    sliderContainer.appendChild(slider);
    sliderContainer.appendChild(value);
    container.appendChild(sliderContainer);

    const unfoldedCanvas = document.getElementById('unfoldedCanvas');
    if (unfoldedCanvas) {
      unfoldedCanvas.appendChild(container);
    }
  };

  useEffect(() => {
    if (p5Ref.current) {
      recompileShader(p5Ref.current);
    }
  }, [vertexShaderCode, fragmentShaderCode, recompileShader]);

  const draw = (p5) => {
    if (!shaderRef.current) return;
    
    try {
      p5.shader(shaderRef.current);
      shaderRef.current.setUniform('uTime', p5.millis() / 1000.0);
      shaderRef.current.setUniform('uPattern', patternType);
      shaderRef.current.setUniform('uPatternScale', patternScale);
      
      p5.rect(-p5.width/2, -p5.height/2, p5.width, p5.height);
      
      if (onTextureReady) {
        onTextureReady(p5.canvas);
      }
    } catch (error) {
      console.error("Error in draw:", error);
    }
  };

  return <Sketch setup={setup} draw={draw} />;
}