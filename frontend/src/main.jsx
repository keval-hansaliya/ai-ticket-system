import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { BrowserRouter, Route, Routes } from "react-router-dom";
import CheckAuth from "./components/checkAuth.jsx";
import Layout from './components/Layout.jsx';
import Tickets from "./pages/Tickets.jsx";
import TicketDetailsPage from "./pages/TicketDetailsPage.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Admin from "./pages/Admin.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Protected routes wrapped in Layout (with Navbar) */}
        <Route
          element={
            <CheckAuth protectedRoute={true}>
              <Layout />
            </CheckAuth>
          }
        >
          <Route path="/" element={<Tickets />} />
          <Route path="/tickets/:id" element={<TicketDetailsPage />} />
          <Route path="/admin" element={<Admin />} />
        </Route>

        {/* Public auth routes */}
        <Route
          path="/login"
          element={
            <CheckAuth protectedRoute={false}>
              <Login />
            </CheckAuth>
          }
        />
        <Route
          path="/signup"
          element={
            <CheckAuth protectedRoute={false}>
              <Signup />
            </CheckAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);