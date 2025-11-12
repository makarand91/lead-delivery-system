import { Injectable } from '@nestjs/common';

export interface TransformationFunction {
  name: string;
  description: string;
  category: 'date' | 'string' | 'phone' | 'custom';
  function: (value: any, params?: any) => any;
}

@Injectable()
export class TransformationsService {
  private readonly builtInTransformations: TransformationFunction[] = [
    // Date transformations
    {
      name: 'formatDate',
      description: 'Format date to ISO 8601 (YYYY-MM-DD)',
      category: 'date',
      function: (value: any) => {
        if (!value) return '';
        const date = new Date(value);
        if (isNaN(date.getTime())) return value;
        return date.toISOString().split('T')[0];
      },
    },
    {
      name: 'formatDateTime',
      description: 'Format date to ISO 8601 with time',
      category: 'date',
      function: (value: any) => {
        if (!value) return '';
        const date = new Date(value);
        if (isNaN(date.getTime())) return value;
        return date.toISOString();
      },
    },
    {
      name: 'dateToTimestamp',
      description: 'Convert date to Unix timestamp',
      category: 'date',
      function: (value: any) => {
        if (!value) return null;
        const date = new Date(value);
        if (isNaN(date.getTime())) return null;
        return Math.floor(date.getTime() / 1000);
      },
    },
    // String transformations
    {
      name: 'toUpperCase',
      description: 'Convert string to uppercase',
      category: 'string',
      function: (value: any) => {
        return value ? String(value).toUpperCase() : '';
      },
    },
    {
      name: 'toLowerCase',
      description: 'Convert string to lowercase',
      category: 'string',
      function: (value: any) => {
        return value ? String(value).toLowerCase() : '';
      },
    },
    {
      name: 'trim',
      description: 'Remove leading and trailing whitespace',
      category: 'string',
      function: (value: any) => {
        return value ? String(value).trim() : '';
      },
    },
    {
      name: 'concatenate',
      description: 'Concatenate multiple values',
      category: 'string',
      function: (value: any, params?: { values: any[]; separator?: string }) => {
        if (!params?.values) return value;
        return params.values.filter(v => v).join(params.separator || ' ');
      },
    },
    {
      name: 'split',
      description: 'Split string and take specific part',
      category: 'string',
      function: (value: any, params?: { separator: string; index: number }) => {
        if (!value || !params) return value;
        const parts = String(value).split(params.separator);
        return parts[params.index] || '';
      },
    },
    // Phone transformations
    {
      name: 'formatPhoneUS',
      description: 'Format phone number to US format (XXX) XXX-XXXX',
      category: 'phone',
      function: (value: any) => {
        if (!value) return '';
        const cleaned = String(value).replace(/\D/g, '');
        if (cleaned.length !== 10) return value;
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
      },
    },
    {
      name: 'formatPhoneE164',
      description: 'Format phone to E.164 international format (+1XXXXXXXXXX)',
      category: 'phone',
      function: (value: any, params?: { countryCode?: string }) => {
        if (!value) return '';
        const cleaned = String(value).replace(/\D/g, '');
        const countryCode = params?.countryCode || '1';
        return `+${countryCode}${cleaned}`;
      },
    },
    {
      name: 'cleanPhone',
      description: 'Remove all non-numeric characters from phone',
      category: 'phone',
      function: (value: any) => {
        if (!value) return '';
        return String(value).replace(/\D/g, '');
      },
    },
  ];

  getBuiltInTransformations(): TransformationFunction[] {
    return this.builtInTransformations.map(t => ({
      name: t.name,
      description: t.description,
      category: t.category,
      function: undefined, // Don't expose function in API response
    })) as any[];
  }

  applyTransformation(
    transformationName: string,
    value: any,
    params?: any,
  ): any {
    const transformation = this.builtInTransformations.find(
      t => t.name === transformationName,
    );

    if (!transformation) {
      throw new Error(`Transformation '${transformationName}' not found`);
    }

    try {
      return transformation.function(value, params);
    } catch (error) {
      console.error(`Error applying transformation '${transformationName}':`, error);
      return value; // Return original value on error
    }
  }

  applyCustomTransformation(code: string, value: any): any {
    try {
      // Create isolated function from code string
      const func = new Function('value', code);
      return func(value);
    } catch (error) {
      console.error('Error applying custom transformation:', error);
      return value;
    }
  }

  validateTransformationCode(code: string): { valid: boolean; error?: string } {
    try {
      new Function('value', code);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
      };
    }
  }
}
