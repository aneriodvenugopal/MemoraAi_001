import React, { createContext, useState, useContext, useEffect } from 'react';
import { currencyService } from '../services';

const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
  const [currencies, setCurrencies] = useState([]);
  const [selectedCurrency, setSelectedCurrency] = useState('INR');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const fetchCurrencies = async () => {
    try {
      const data = await currencyService.getAll();
      setCurrencies(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching currencies:', error);
      setLoading(false);
    }
  };

  const formatCurrency = (amount, currencyCode = selectedCurrency) => {
    const currency = currencies.find((c) => c.code === currencyCode);
    if (!currency) return amount;

    const formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

    return formatted;
  };

  const value = {
    currencies,
    selectedCurrency,
    setSelectedCurrency,
    formatCurrency,
    loading,
  };

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return context;
};
