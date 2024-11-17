// src/components/UnfoldedFace.js

import React, { useRef, useState } from 'react';
import Sketch from 'react-p5';

export default function UnfoldedFace({ vertices, onTextureReady, uMin, uMax, vMin, vMax }) {
  const [p5Instance, setP5Instance] = useState(null);
  const canvasRef = useRef(null);

  // 상태를 관리하기 위한 Ref
  const bubbles = useRef([]);
  const circles = useRef([]);
  const count = useRef(0);

  const setup = (p5, canvasParentRef) => {
    const canvas = p5.createCanvas(p5.windowWidth / 2, p5.windowHeight);
    canvas.parent(canvasParentRef);
    p5.colorMode(p5.HSB, 255, 255, 255);
    p5.noCursor();

    setP5Instance(p5);
    canvasRef.current = canvas;
  };

  const draw = (p5) => {
    p5.clear();
    p5.blendMode(p5.DIFFERENCE);
    p5.background(0);

    for (let bubble of bubbles.current) {
      bubble.show();
      if (count.current !== 0) {
        bubble.move();
      }
    }

    for (let circle of circles.current) {
      circle.show();
      circle.move();
    }

    if (onTextureReady) {
      onTextureReady(p5.canvas);
    }
  };

  const windowResized = (p5) => {
    p5.resizeCanvas(p5.windowWidth / 2, p5.windowHeight);
  };

  const mousePressed = (p5) => {
    if (count.current === 0) {
      let b6 = new Bubble(p5, p5.width * 2 / 3, p5.height * 0.5, 100);
      bubbles.current.push(b6);
    } else if (count.current >= 1) {
      let newr = p5.random(300, 700);
      let b1 = new Bubble(p5, p5.mouseX, p5.height * 0.5, p5.random(70, 120));
      let b2 = new Bubble(p5, p5.mouseX, p5.height * 0.5, p5.random(70, 120));
      let b3 = new Bubble(p5, p5.mouseX, p5.height * 0.5, p5.random(80, 120));
      let b4 = new Bubble(p5, p5.mouseX, p5.height * 0.5, p5.random(90, 100));
      let b5 = new Bubble(p5, p5.mouseX, p5.height * 0.5, p5.random(70, 180));
      let c = new Circle(p5, p5.random(0, p5.width), p5.height * 0.5, newr);
      bubbles.current.push(b1, b2, b3, b4, b5);
      circles.current.push(c);
    }
    count.current += 1;
  };

  class Bubble {
    constructor(p5, x, y, r) {
      this.p5 = p5;
      this.x = x;
      this.y = y;
      this.r = r;
      this.xVel = p5.random(-3, 3);
      this.yVel = 0;
      this.c = p5.color(0, p5.random(0, 255), p5.random(0, 255));
    }

    move() {
      this.x += this.xVel;
      this.xVel += this.p5.random(-0.2, 0.2);

      if (this.x < 0) {
        this.x = 0;
        this.xVel = -this.xVel;
      } else if (this.x > this.p5.width) {
        this.x = this.p5.width;
        this.xVel = -this.xVel;
      }
      this.xVel *= 0.995;
    }

    show() {
      this.p5.fill(this.c);
      this.p5.noStroke();
      this.p5.ellipse(this.x, this.y, this.r * 2, this.r * 2);
    }
  }

  class Circle {
    constructor(p5, x, y, r) {
      this.p5 = p5;
      this.x = x;
      this.y = y;
      this.r = r;
      this.xVel = p5.random(1, 1.5);
      this.yVel = 0;
      this.c = p5.color(0, 0, p5.random(0, 255));
    }

    move() {
      this.x += this.xVel;

      if (this.x < 0) {
        this.x = 0;
        this.xVel = -2 * this.xVel;
      }

      this.yVel *= 0.995;
    }

    show() {
      this.p5.stroke(255);
      this.p5.noFill();
      this.p5.strokeWeight(this.p5.random(0.5, 1.2));
      this.p5.ellipse(this.x, this.y, this.r * 2, this.r * 2);
    }
  }

  return (
    <Sketch
      setup={setup}
      draw={draw}
      windowResized={windowResized}
      mousePressed={mousePressed}
    />
  );
}
