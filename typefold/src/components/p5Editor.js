import React, { useRef, useState, useEffect } from "react";
import Sketch from "react-p5";

export default function P5Editor({ onTextureReady }) {
  const p5Ref = useRef(null);
  const [sketchType, setSketchType] = useState(1);
  const [sketchScale, setSketchScale] = useState(8.0);
  const [p5Code, setP5Code] = useState(`
// P5 Sketch Template
function sketch(p) {
  const colors = [
    p.color(255, 100, 100),
    p.color(100, 255, 100),
    p.color(100, 100, 255),
    p.color(255, 255, 100),
    p.color(255, 100, 255)
  ];
  
  // Setup function - runs once
  p.setup = function() {
    // Canvas is already created by the component
    p.noStroke();
  };
  
  // Draw function - runs in a loop
  p.draw = function() {
    p.background(240);
    
    // Draw based on sketch type
    if (sketchType === 1) {
      drawCirclePattern(p);
    } else if (sketchType === 2) {
      drawGridPattern(p);
    } else if (sketchType === 3) {
      drawFlowField(p);
    } else if (sketchType === 4) {
      drawMosaicPattern(p);
    } else {
      drawRandomShapes(p);
    }
  };
  
  // Pattern type 1: Circle Pattern
  function drawCirclePattern(p) {
    const time = p.millis() * 0.001;
    const size = 512;
    const scale = sketchScale;
    
    for (let i = 0; i < 10; i++) {
      const radius = (size/2) * (0.2 + 0.8 * (i / 10));
      p.fill(colors[i % colors.length]);
      p.push();
      p.translate(size/2, size/2);
      p.rotate(time * (i % 2 === 0 ? 1 : -1) * 0.2);
      
      for (let j = 0; j < scale * 2; j++) {
        const angle = j * (p.TWO_PI / (scale * 2));
        const x = radius * p.cos(angle);
        const y = radius * p.sin(angle);
        const s = 10 + 15 * p.sin(time + i + j * 0.1);
        
        p.circle(x, y, s);
      }
      p.pop();
    }
  }
  
  // Pattern type 2: Grid Pattern
  function drawGridPattern(p) {
    const time = p.millis() * 0.001;
    const size = 512;
    const cellSize = size / sketchScale;
    
    for (let x = 0; x < size; x += cellSize) {
      for (let y = 0; y < size; y += cellSize) {
        const colorIndex = Math.floor((x + y) / cellSize) % colors.length;
        p.fill(colors[colorIndex]);
        
        const angle = time + (x + y) * 0.01;
        const waveSize = cellSize * 0.3 * (p.sin(angle) * 0.5 + 0.5);
        
        if ((x / cellSize + y / cellSize) % 2 === 0) {
          p.circle(x + cellSize/2, y + cellSize/2, cellSize - waveSize);
        } else {
          p.rect(x + waveSize/2, y + waveSize/2, cellSize - waveSize, cellSize - waveSize);
        }
      }
    }
  }
  
  // Pattern type 3: Flow Field
  function drawFlowField(p) {
    const time = p.millis() * 0.001;
    const size = 512;
    const scale = sketchScale;
    const step = size / scale;
    
    p.noFill();
    
    for (let x = 0; x < size; x += step) {
      for (let y = 0; y < size; y += step) {
        const angle = p.noise(x * 0.01, y * 0.01, time * 0.1) * p.TWO_PI * 2;
        
        p.push();
        p.translate(x + step/2, y + step/2);
        p.rotate(angle);
        
        const colorIndex = Math.floor(p.noise(x * 0.02, y * 0.02, time * 0.05) * colors.length);
        p.stroke(colors[colorIndex]);
        p.strokeWeight(2 + p.noise(x * 0.05, y * 0.05) * 3);
        
        p.line(-step/2, 0, step/2, 0);
        p.pop();
      }
    }
  }
  
  // Pattern type 4: Mosaic Pattern
  function drawMosaicPattern(p) {
    const time = p.millis() * 0.001;
    const size = 512;
    const scale = sketchScale;
    const tileSize = size / scale;
    
    p.strokeWeight(2);
    p.stroke(30, 30, 30, 100);
    
    for (let x = 0; x < size; x += tileSize) {
      for (let y = 0; y < size; y += tileSize) {
        // Create a noise value unique to this tile
        const noiseVal = p.noise(x * 0.02, y * 0.02, time * 0.1);
        const colorIndex = Math.floor(noiseVal * colors.length);
        p.fill(colors[colorIndex]);
        
        if (noiseVal < 0.33) {
          // Triangle
          p.triangle(
            x, y,
            x + tileSize, y,
            x, y + tileSize
          );
          p.fill(colors[(colorIndex + 1) % colors.length]);
          p.triangle(
            x + tileSize, y,
            x, y + tileSize,
            x + tileSize, y + tileSize
          );
        } else if (noiseVal < 0.66) {
          // Diamond
          p.quad(
            x, y + tileSize/2,
            x + tileSize/2, y,
            x + tileSize, y + tileSize/2,
            x + tileSize/2, y + tileSize
          );
        } else {
          // Circles
          p.circle(x + tileSize/2, y + tileSize/2, tileSize * 0.8);
        }
      }
    }
  }
  
  // Pattern type 5: Random Shapes
  function drawRandomShapes(p) {
    const time = p.millis() * 0.001;
    const size = 512;
    
    p.background(240, 240, 240, 10); // Slight trail effect
    
    for (let i = 0; i < sketchScale; i++) {
      const x = size/2 + p.cos(time * 0.5 + i) * size/3;
      const y = size/2 + p.sin(time * 0.7 + i) * size/3;
      const shapeSize = 20 + p.sin(time + i * 0.5) * 15;
      
      p.fill(colors[i % colors.length]);
      
      if (i % 3 === 0) {
        p.circle(x, y, shapeSize);
      } else if (i % 3 === 1) {
        p.rect(x - shapeSize/2, y - shapeSize/2, shapeSize, shapeSize);
      } else {
        p.push();
        p.translate(x, y);
        p.rotate(time + i);
        p.triangle(0, -shapeSize/2, shapeSize/2, shapeSize/2, -shapeSize/2, shapeSize/2);
        p.pop();
      }
    }
  }
  
  // Update variables from parent component
  this.updateSketchType = function(type) {
    sketchType = type;
  };
  
  this.updateSketchScale = function(scale) {
    sketchScale = scale;
  };
}
  `);

  const compileSketch = () => {
    if (!p5Ref.current) return;
    
    try {
      // Clear previous sketch
      if (p5Ref.current.remove) {
        p5Ref.current.remove();
      }
      
      // Create new sketch function from code
      const sketchFunc = new Function('p', 'sketchType', 'sketchScale', `
        const sketch = ${p5Code};
        return sketch(p);
      `);
      
      // Update the sketch
      const newSketch = sketchFunc(p5Ref.current, sketchType, sketchScale);
      
      // Update sketch properties
      if (newSketch && newSketch.updateSketchType) {
        newSketch.updateSketchType(sketchType);
      }
      
      if (newSketch && newSketch.updateSketchScale) {
        newSketch.updateSketchScale(sketchScale);
      }
      
    } catch (error) {
      console.error("Sketch compilation failed:", error);
      alert(`Sketch compilation error: ${error.message}`);
    }
  };

  const setup = (p5, canvasParentRef) => {
    const canvas = p5.createCanvas(512, 512);
    canvas.parent(canvasParentRef);
    p5.pixelDensity(1);
    
    try {
      // Store p5 instance for later use
      p5Ref.current = p5;
      
      // Create initial sketch
      const sketchFunc = new Function('p', 'sketchType', 'sketchScale', `
        const sketch = ${p5Code};
        return sketch(p);
      `);
      
      const initialSketch = sketchFunc(p5, sketchType, sketchScale);
      
      // Create UI controls
      createControls(p5);
    } catch (error) {
      console.error("Sketch initialization failed:", error);
    }
  };

  const createControls = (p5) => {
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

    // P5 Code Editor
    const editorContainer = document.createElement('div');
    editorContainer.style.cssText = `
      margin-bottom: 10px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      border: none;
    `;

    // P5 Editor
    const editorLabel = document.createElement('div');
    editorLabel.textContent = 'P5.js Sketch Editor';
    editorLabel.style.marginBottom = '5px';
    editorLabel.style.fontFamily = 'montreal, sans-serif';
    
    const codeTextarea = document.createElement('textarea');
    codeTextarea.value = p5Code;
    codeTextarea.style.cssText = `
      width: 100%;
      height: 300px;
      font-family: 'montreal',sans-serif;
      font-size: 12px;
      resize: vertical;
      border-radius:6px;
      border: solid 1px #00aaff;
    `;
    
    editorContainer.appendChild(editorLabel);
    editorContainer.appendChild(codeTextarea);
    container.appendChild(editorContainer);

    const compileButton = document.createElement('button');
    compileButton.textContent = 'Run Sketch';
    compileButton.style.cssText = `
      display: block;
      margin: 10px 0;
      padding: 5px 10px;
      font-family: 'montreal', sans-serif;
      font-weight: 100;
      background-color: #0CFF69;
      color: black;
      border: none;
      border-radius: 3px;
      cursor: pointer;
    `;
    compileButton.onclick = () => {
      setP5Code(codeTextarea.value);
      compileSketch();
    };
    container.appendChild(compileButton);

    const buttonContainer = document.createElement('div');
    buttonContainer.style.marginBottom = '10px';
    ['Circles', 'Grid', 'Flow', 'Mosaic', 'Random'].forEach((pattern, index) => {
      const button = document.createElement('button');
      button.textContent = pattern;
      button.style.cssText = `
        margin-right: 5px;
        padding: 5px 10px;
        font-family: 'montreal', sans-serif;
        font-weight: 100;
        background-color: ${sketchType === index + 1 ? '#000' : '#fff'};
        color: ${sketchType === index + 1 ? '#fff' : '#000'};
        border: 1px solid #000;
        cursor: pointer;
        border-radius: 3px;
      `;
      button.onclick = () => {
        setSketchType(index + 1);
        
        // Update buttons appearance
        buttonContainer.querySelectorAll('button').forEach((btn, idx) => {
          btn.style.backgroundColor = idx === index ? '#000' : '#fff';
          btn.style.color = idx === index ? '#fff' : '#000';
        });
        
        // Update sketch
        if (p5Ref.current) {
          const sketchFunc = new Function('p', 'sketchType', 'sketchScale', `
            const sketch = ${p5Code};
            const s = sketch(p);
            if (s && s.updateSketchType) s.updateSketchType(${index + 1});
            return s;
          `);
          sketchFunc(p5Ref.current, index + 1, sketchScale);
        }
      };
      buttonContainer.appendChild(button);
    });
    container.appendChild(buttonContainer);

    // Scale slider
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
    slider.value = sketchScale;
    slider.style.width = '120px';
    
    const value = document.createElement('span');
    value.textContent = sketchScale;
    value.style.minWidth = '30px';

    slider.oninput = (e) => {
      const newScale = parseFloat(e.target.value);
      setSketchScale(newScale);
      value.textContent = newScale.toFixed(1);
      
      // Update sketch
      if (p5Ref.current) {
        const sketchFunc = new Function('p', 'sketchType', 'sketchScale', `
          const sketch = ${p5Code};
          const s = sketch(p);
          if (s && s.updateSketchScale) s.updateSketchScale(${newScale});
          return s;
        `);
        sketchFunc(p5Ref.current, sketchType, newScale);
      }
    };

    sliderContainer.appendChild(slider);
    sliderContainer.appendChild(value);
    container.appendChild(sliderContainer);

    const p5Canvas = document.getElementById('p5Canvas');
    if (p5Canvas) {
      p5Canvas.appendChild(container);
    }
  };

  useEffect(() => {
    if (p5Ref.current) {
      compileSketch();
    }
  }, [p5Code, sketchType, sketchScale]);

  const draw = (p5) => {
    try {
      if (onTextureReady) {
        onTextureReady(p5.canvas);
      }
    } catch (error) {
      console.error("Error in draw:", error);
    }
  };

  return <Sketch setup={setup} draw={draw} />;
}