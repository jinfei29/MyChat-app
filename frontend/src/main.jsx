import './lib/global';  // 导入全局对象配置
/* eslint-disable no-unused-vars */
import React from 'react';
/* eslint-enable no-unused-vars */
import ReactDOM from 'react-dom/client';
import "./index.css";
import App from "./App.jsx";

import { BrowserRouter } from "react-router-dom";
import axios from "axios";
axios.defaults.withCredentials = true; // ✅ 设置默认携带 cookie

ReactDOM.createRoot(document.getElementById("root")).render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
);
