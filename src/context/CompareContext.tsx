import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '../types';
import { safeGetItem, safeSetItem } from '../utils/localStorage';

interface CompareContextType {
  compareList: Product[];
  addToCompare: (product: Product) => void;
  removeFromCompare: (productId: string) => void;
  clearCompare: () => void;
  isInCompare: (productId: string) => boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggleCompare: (product: Product) => void;
}

const CompareContext = createContext<CompareContextType | undefined>(undefined);

export const CompareProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [compareList, setCompareList] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = safeGetItem('gadgetsprohub_compare');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setCompareList(parsed.slice(0, 4));
        }
      }
    } catch (e) {
      // Ignore invalid cache
    }
  }, []);

  const saveList = (list: Product[]) => {
    setCompareList(list);
    try {
      safeSetItem('gadgetsprohub_compare', JSON.stringify(list));
    } catch (e) {
      // Ignore
    }
  };

  const addToCompare = (product: Product) => {
    if (compareList.some(p => p._id === product._id)) return;
    if (compareList.length >= 4) {
      // Remove first item if full
      saveList([...compareList.slice(1), product]);
    } else {
      saveList([...compareList, product]);
    }
  };

  const removeFromCompare = (productId: string) => {
    saveList(compareList.filter(p => p._id !== productId));
  };

  const clearCompare = () => {
    saveList([]);
    setIsOpen(false);
  };

  const isInCompare = (productId: string) => {
    return compareList.some(p => p._id === productId);
  };

  const toggleCompare = (product: Product) => {
    if (isInCompare(product._id)) {
      removeFromCompare(product._id);
    } else {
      addToCompare(product);
    }
  };

  return (
    <CompareContext.Provider
      value={{
        compareList,
        addToCompare,
        removeFromCompare,
        clearCompare,
        isInCompare,
        isOpen,
        setIsOpen,
        toggleCompare
      }}
    >
      {children}
    </CompareContext.Provider>
  );
};

export const useCompare = () => {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error('useCompare must be used within a CompareProvider');
  }
  return context;
};
