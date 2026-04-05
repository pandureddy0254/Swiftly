import { useContext } from 'react';
import { SwiftlyContext } from './SwiftlyContext';

export function useSwiftly() {
  const context = useContext(SwiftlyContext);
  if (!context) {
    throw new Error('useSwiftly must be used within SwiftlyProvider');
  }
  return context;
}
