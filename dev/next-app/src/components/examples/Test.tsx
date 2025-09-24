"use client";
import { useProducts } from '@/hooks/useProducts';
import React, { useEffect } from 'react'

export const Test = () => {
    const { loading, products, error, init } =  useProducts();
    useEffect(() => {
        init();
    }, []);
  return (
    <div>Test</div>
  )
}
