import { useState, useEffect, useCallback } from 'react';
import { InputValidator } from '@/lib/security/inputValidation';
import { auditLogger } from '@/lib/security/auditLogger';

interface UseSecurityReturn {
  csrfToken: string;
  validateForm: (data: Record<string, any>) => {
    isValid: boolean;
    errors: string[];
  };
  sanitizeInput: <T extends Record<string, any>>(data: T) => T;
  logSecurityEvent: (event: string, details: any) => void;  // ← ubah jadi void
}

export function useSecurity(): UseSecurityReturn {
  const [csrfToken, setCsrfToken] = useState<string>('');

  useEffect(() => {
    const array = new Uint8Array(32);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
      const token = Array.from(array, byte => 
        byte.toString(16).padStart(2, '0')
      ).join('');
      setCsrfToken(token);
    } else {
      setCsrfToken(Math.random().toString(36).substring(2, 15));
    }
  }, []);

  const validateForm = useCallback((data: Record<string, any>) => {
    const errors: string[] = [];
    
    if (data.email && !InputValidator.validateEmail(data.email)) {
      errors.push('Email tidak valid');
    }
    
    if (data.password) {
      const result = InputValidator.validatePassword(data.password);
      if (!result.valid) {
        errors.push(...result.errors);
      }
    }
    
    if (data.bloodType && !InputValidator.validateBloodType(data.bloodType)) {
      errors.push('Golongan darah tidak valid');
    }

    if (data.phone && !InputValidator.validatePhoneNumber(data.phone)) {
      errors.push('Nomor telepon tidak valid');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  const sanitizeInput = useCallback(<T extends Record<string, any>>(data: T): T => {
    return InputValidator.sanitizeObject(data);
  }, []);

  const logSecurityEvent = useCallback(async (event: string, details: any) => {
    await auditLogger.logSecurityEvent(event, details);
  }, []);

  return {
    csrfToken,
    validateForm,
    sanitizeInput,
    logSecurityEvent
  };
}