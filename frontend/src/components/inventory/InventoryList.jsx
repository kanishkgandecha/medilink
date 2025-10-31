import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';

const InventoryList = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'staff')) {
      api.get('/inventory').then(res => setItems(res.data.data)).catch(() => setItems([]));
    }
  }, [user]);

  // Only render for allowed roles
  if (!user || (user.role !== 'admin' && user.role !== 'staff')) return null;

  return (
    <div className="bg-white p-6 rounded shadow mt-4">
      <h2 className="text-xl font-semibold mb-4">Inventory</h2>
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            <th className="border-b p-2">Item</th>
            <th className="border-b p-2">Qty</th>
            <th className="border-b p-2">Category</th>
            <th className="border-b p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item._id}>
              <td className="border-b p-2">{item.itemName}</td>
              <td className="border-b p-2">{item.quantity}</td>
              <td className="border-b p-2">{item.category}</td>
              <td className="border-b p-2">{item.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryList;
