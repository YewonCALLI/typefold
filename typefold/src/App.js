// src/App.js

import React from "react";
import TypeFold from "./components/TypeFold";
import Making from "./components/Making";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

function App() {
  return (
    <Router>
      <Routes>
        {/* 기본 페이지 */}
        <Route path="/" element={<TypeFold />} />
        {/* 세부 페이지 */}
        <Route path="/making" element={<Making />} />
      </Routes>
    </Router>
  );
}

export default App;
