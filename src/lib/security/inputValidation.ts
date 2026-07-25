export class InputValidator {
  static sanitizeString(input: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    };
    return input.replace(/[&<>"'/`=]/g, function(s) {
      return map[s];
    });
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  static validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password minimal 8 karakter');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Harus ada huruf kapital');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Harus ada huruf kecil');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Harus ada angka');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Harus ada karakter khusus');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  static validateBloodType(bloodType: string): boolean {
    const validTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    return validTypes.includes(bloodType);
  }

  static validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^(?:\+62|0)[0-9]{9,13}$/;
    return phoneRegex.test(phone);
  }

  static sanitizeObject<T extends Record<string, any>>(obj: T): T {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized as T;
  }

  static escapeHtml(unsafe: string): string {
    return this.sanitizeString(unsafe);
  }
}