import { Injectable } from '@nestjs/common';
import { ValidationRule } from '../customers/customers.service';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  leadIndex?: number;
}

export interface LeadValidationResult {
  totalLeads: number;
  validLeads: number;
  invalidLeads: number;
  results: ValidationResult[];
}

@Injectable()
export class ValidationService {
  /**
   * Validate all leads against customer validation rules
   */
  validateLeads(leads: any[], validationRules: ValidationRule[]): LeadValidationResult {
    const results: ValidationResult[] = [];
    let validCount = 0;
    let invalidCount = 0;

    leads.forEach((lead, index) => {
      const validation = this.validateLead(lead, validationRules, index);
      results.push(validation);

      if (validation.isValid) {
        validCount++;
      } else {
        invalidCount++;
      }
    });

    return {
      totalLeads: leads.length,
      validLeads: validCount,
      invalidLeads: invalidCount,
      results,
    };
  }

  /**
   * Validate a single lead
   */
  validateLead(lead: any, validationRules: ValidationRule[], leadIndex?: number): ValidationResult {
    const errors: string[] = [];

    for (const rule of validationRules) {
      const error = this.applyRule(lead, rule);
      if (error) {
        errors.push(error);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      leadIndex,
    };
  }

  /**
   * Apply a single validation rule
   */
  private applyRule(lead: any, rule: ValidationRule): string | null {
    const value = lead[rule.field];
    const fieldName = rule.field;

    switch (rule.type) {
      case 'required':
        if (!value || value === '') {
          return rule.errorMessage || `${fieldName} is required`;
        }
        break;

      case 'email':
        if (value && !this.isValidEmail(value)) {
          return rule.errorMessage || `${fieldName} must be a valid email address`;
        }
        break;

      case 'phone':
        if (value && !this.isValidPhone(value)) {
          return rule.errorMessage || `${fieldName} must be a valid phone number`;
        }
        break;

      case 'regex':
        if (value && rule.value && !new RegExp(rule.value).test(value)) {
          return rule.errorMessage || `${fieldName} does not match required format`;
        }
        break;

      case 'minLength':
        if (value && value.length < rule.value) {
          return rule.errorMessage || `${fieldName} must be at least ${rule.value} characters`;
        }
        break;

      case 'maxLength':
        if (value && value.length > rule.value) {
          return rule.errorMessage || `${fieldName} must be at most ${rule.value} characters`;
        }
        break;

      case 'custom':
        if (rule.customFunction) {
          try {
            const func = new Function('value', 'lead', rule.customFunction);
            const result = func(value, lead);
            if (!result) {
              return rule.errorMessage || `${fieldName} failed custom validation`;
            }
          } catch (error) {
            console.error('Custom validation error:', error);
            return `${fieldName} custom validation failed: ${error.message}`;
          }
        }
        break;
    }

    return null;
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number format (basic validation)
   */
  private isValidPhone(phone: string): boolean {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    // Check if it's between 10-15 digits
    return cleaned.length >= 10 && cleaned.length <= 15;
  }

  /**
   * Get validation summary for display
   */
  getValidationSummary(result: LeadValidationResult): string {
    return `Total: ${result.totalLeads}, Valid: ${result.validLeads}, Invalid: ${result.invalidLeads}`;
  }

  /**
   * Filter only valid leads
   */
  filterValidLeads(leads: any[], validationResult: LeadValidationResult): any[] {
    return leads.filter((_, index) => validationResult.results[index].isValid);
  }

  /**
   * Get invalid leads with errors
   */
  getInvalidLeadsWithErrors(
    leads: any[],
    validationResult: LeadValidationResult,
  ): Array<{ lead: any; errors: string[]; index: number }> {
    return leads
      .map((lead, index) => ({
        lead,
        errors: validationResult.results[index].errors,
        index,
      }))
      .filter((item) => item.errors.length > 0);
  }
}
