// src/App.js

import React from "react";
import TypeFold from "./components/TypeFold";
import Making from "./components/Making";
import About from "./components/About";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

function App() {
  return (
    <Router>
      <Routes>
        {/* 기본 페이지 */}
        <Route path="/" element={<TypeFold />} />
        {/* 세부 페이지 */}
        <Route path="/making" element={<Making />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </Router>
  );
}

export default App;
