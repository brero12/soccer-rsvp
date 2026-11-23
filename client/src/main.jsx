import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import GamePage from "./pages/GamePage";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminHome from "./pages/admin/AdminHome";
import GamesList from "./pages/admin/GamesList";
import GameForm from "./pages/admin/GameForm";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Routes>
      <Route path="/c/:slug/g/:gameId" element={<GamePage />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminHome />} />
        <Route path="games" element={<GamesList />} />
        <Route path="games/new" element={<GameForm />} />
        <Route path="games/:id/edit" element={<GameForm />} />
      </Route>
      <Route path="*" element={<p className="p-6">Open the link shared in your group.</p>} />
    </Routes>
  </BrowserRouter>
);