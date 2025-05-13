import React, { useState, useEffect } from 'react';
import { collection, addDoc, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

function DatesManager() {
  const [dates, setDates] = useState([]);
  const [formData, setFormData] = useState({
    date: '',
    timeStart: '',
    timeEnd: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ✏️ Новое: состояния для редактирования
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    date: '',
    timeStart: '',
    timeEnd: ''
  });

  // Загрузка дат из Firestore
  const fetchDates = async () => {
    const snapshot = await getDocs(collection(db, 'availabledates'));
    const loadedDates = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setDates(loadedDates);
  };

  useEffect(() => {
    fetchDates();
  }, []);

  // Добавление новой даты
  const handleAddDate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.date || !formData.timeStart || !formData.timeEnd) {
      setError('Пожалуйста, заполните все поля.');
      setLoading(false);
      return;
    }

    try {
      await addDoc(collection(db, 'availabledates'), {
        date: formData.date,
        timeStart: formData.timeStart,
        timeEnd: formData.timeEnd,
        isBooked: false
      });
      setFormData({ date: '', timeStart: '', timeEnd: '' });
      fetchDates(); // обновить список после добавления
    } catch (err) {
      console.error('Ошибка добавления даты:', err);
      setError('Ошибка добавления даты.');
    } finally {
      setLoading(false);
    }
  };

  // Удаление даты
  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'availabledates', id));
    fetchDates();
  };

  // ✏️ Начать редактирование
  const handleEdit = (item) => {
    setEditingId(item.id);
    setEditFormData({
      date: item.date,
      timeStart: item.timeStart,
      timeEnd: item.timeEnd
    });
  };

  // 💾 Сохранить изменения
  const handleSaveEdit = async () => {
    try {
      const dateRef = doc(db, 'availabledates', editingId);
      await updateDoc(dateRef, {
        date: editFormData.date,
        timeStart: editFormData.timeStart,
        timeEnd: editFormData.timeEnd
      });
      setEditingId(null);
      setEditFormData({ date: '', timeStart: '', timeEnd: '' });
      fetchDates();
    } catch (err) {
      console.error('Ошибка при обновлении даты:', err);
      alert('Не удалось обновить дату');
    }
  };

  return (
    <div>
      <h2>Управление датами</h2>

      <form onSubmit={handleAddDate} style={{ marginBottom: '20px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label>Дата: </label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>Время начала: </label>
          <input
            type="time"
            name="timeStart"
            value={formData.timeStart}
            onChange={(e) => setFormData({ ...formData, timeStart: e.target.value })}
            required
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>Время окончания: </label>
          <input
            type="time"
            name="timeEnd"
            value={formData.timeEnd}
            onChange={(e) => setFormData({ ...formData, timeEnd: e.target.value })}
            required
          />
        </div>

        {error && <div style={{ color: 'red' }}>{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? 'Добавление...' : 'Добавить дату'}
        </button>
      </form>

      <h3>Список дат:</h3>
      <ul>
        {dates.map((item) => (
          <li key={item.id} className="date-item">
          {editingId === item.id ? (
            <>
              <input
                type="date"
                value={editFormData.date}
                onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
              />
              <input
                type="time"
                value={editFormData.timeStart}
                onChange={(e) => setEditFormData({ ...editFormData, timeStart: e.target.value })}
              />
              <input
                type="time"
                value={editFormData.timeEnd}
                onChange={(e) => setEditFormData({ ...editFormData, timeEnd: e.target.value })}
              />
              <button onClick={handleSaveEdit}>💾 Сохранить</button>
              <button onClick={() => setEditingId(null)}>✖ Отмена</button>
            </>
          ) : (
            <>
              {item.date} | {item.timeStart} - {item.timeEnd} | {item.isBooked ? 'Забронировано' : 'Свободно'}
              <button onClick={() => handleEdit(item)}>✏️ Редактировать</button>
              <button onClick={() => handleDelete(item.id)}>🗑️ Удалить</button>
            </>
          )}
        </li>        
        ))}
      </ul>
    </div>
  );
}

export default DatesManager;
