import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import BookingForm from './BookingForm';
import AdminPanel from './admin/AdminPanel';
import Success from './Success'; // ✅ импортируем Success

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/booking" replace />} />
        <Route path="/booking" element={<BookingForm />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/success" element={<Success />} /> {/* ✅ добавили маршрут */}
      </Routes>
    </Router>
  );
}

export default App;
