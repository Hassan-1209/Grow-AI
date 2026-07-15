import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { MarketplaceItem } from '../types';

export function useMarketplace() {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'marketplaceItems'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const itemsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MarketplaceItem));
      setItems(itemsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addItem = async (item: Omit<MarketplaceItem, 'id'>) => {
    await addDoc(collection(db, 'marketplaceItems'), item);
  };

  const removeItem = async (id: string) => {
    await deleteDoc(doc(db, 'marketplaceItems', id));
  };

  return { items, loading, addItem, removeItem };
}
