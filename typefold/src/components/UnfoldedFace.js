import React, { useRef, useState } from "react";
import Sketch from "react-p5";

export default function ShaderTexture({ onTextureReady }) {
  const shaderRef = useRef(null);
  const [patternType, setPatternType] = useState(1);

  const vertexShader = `
    attribute vec3 aPosition;
    attribute vec2 aTexCoord;
    varying vec2 vTexCoord;

    void main() {
      vTexCoord = aTexCoord;
      // Convert position to clip space
      vec4 positionVec4 = vec4(aPosition, 1.0);
      positionVec4.xy = positionVec4.xy * 2.0 - 1.0;
      gl_Position = positionVec4;
    }
  `;

  const fragmentShader = `
    precision mediump float;
    varying vec2 vTexCoord;
    uniform float uTime;
    uniform int uPattern;

    // 육각형 패턴을 만드는 함수
    float hexagonPattern(vec2 p) {
      vec2 hexCoord = p * 3.0;
      hexCoord.x *= 1.1547; // 2.0 / sqrt(3.0)
      vec2 gridId = floor(hexCoord);
      vec2 gridPos = fract(hexCoord) - 0.5;
      
      float hex = length(gridPos) * 2.0;
      return hex;
    }

    // 체크 패턴을 만드는 함수
    float checkerPattern(vec2 p, float size) {
      vec2 grid = floor(fract(p) * size);
      return mod(grid.x + grid.y, 2.0);
    }

    // 지그재그 패턴을 만드는 함수
    float zigzagPattern(vec2 p) {
      float v = sin(p.x * 10.0 + sin(p.y * 5.0)) * 0.5 + 
                sin(p.y * 10.0) * 0.5;
      return v;
    }

    void main() {
      // Correct UV coordinates
      vec2 uv = vTexCoord;
      uv.y = 1.0 - uv.y; // Flip Y coordinate
      
      // Scale UV coordinates to create repeating pattern
      uv = fract(uv * 2.0); // Adjust the multiplication factor to change pattern scale
      
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
        float check = checkerPattern(uv + vec2(sin(uTime * 0.2), cos(uTime * 0.2)) * 0.1, 10.0);
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
        float waves = sin(uv.x * 20.0 + uTime) * 0.5 + 
                     sin(uv.y * 15.0 - uTime * 0.7) * 0.5;
        color = vec3(
          sin(waves * 3.0 + uTime) * 0.5 + 0.5,
          cos(waves * 4.0 - uTime * 0.5) * 0.5 + 0.5,
          sin(waves * 5.0 + uTime * 0.3) * 0.5 + 0.5
        );
      }

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  const setup = (p5, canvasParentRef) => {
    const canvas = p5.createCanvas(512, 512, p5.WEBGL);
    canvas.parent(canvasParentRef);
    p5.pixelDensity(1);
    
    try {
      const newShader = p5.createShader(vertexShader, fragmentShader);
      shaderRef.current = newShader;
      p5.shader(newShader);
      
      // Remove ortho projection as we're using normalized device coordinates
      p5.noStroke();

      p5.keyPressed = () => {
        if (p5.key >= '1' && p5.key <= '4') {
          setPatternType(parseInt(p5.key));
        }
      };
    } catch (error) {
      console.error("Shader initialization failed:", error);
    }
  };

  const draw = (p5) => {
    if (!shaderRef.current) return;
    
    try {
      p5.shader(shaderRef.current);
      shaderRef.current.setUniform('uTime', p5.millis() / 1000.0);
      shaderRef.current.setUniform('uPattern', patternType);
      
      // Draw a rectangle that covers the entire canvas
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