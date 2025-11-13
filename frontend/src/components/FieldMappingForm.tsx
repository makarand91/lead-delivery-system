import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

interface FieldMapping {
  sourceField: string;
  targetField: string;
  required?: boolean;
}

interface FieldMappingFormProps {
  excelHeaders: string[];
  onMappingComplete: (mappings: FieldMapping[]) => void;
  onSkip: () => void;
}

// Standard lead fields that the system accepts
const STANDARD_LEAD_FIELDS = [
  { value: 'firstName', label: 'First Name' },
  { value: 'lastName', label: 'Last Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'company', label: 'Company' },
  { value: 'jobTitle', label: 'Job Title' },
  { value: 'address', label: 'Address' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State' },
  { value: 'zipCode', label: 'Zip Code' },
  { value: 'country', label: 'Country' },
  { value: 'leadSource', label: 'Lead Source' },
  { value: 'leadStatus', label: 'Lead Status' },
  { value: 'notes', label: 'Notes' },
  { value: 'unmapped', label: '(Group at end - unmapped)' },
];

const FieldMappingForm = ({ excelHeaders, onMappingComplete, onSkip }: FieldMappingFormProps) => {
  const [mappings, setMappings] = useState<FieldMapping[]>([]);

  useEffect(() => {
    // Initialize mappings with Excel headers
    const initialMappings = excelHeaders.map((header) => {
      // Try to auto-match based on common field names
      const lowerHeader = header.toLowerCase();
      let targetField = 'unmapped';

      if (lowerHeader.includes('first') && lowerHeader.includes('name')) {
        targetField = 'firstName';
      } else if (lowerHeader.includes('last') && lowerHeader.includes('name')) {
        targetField = 'lastName';
      } else if (lowerHeader.includes('email')) {
        targetField = 'email';
      } else if (lowerHeader.includes('phone')) {
        targetField = 'phone';
      } else if (lowerHeader.includes('company')) {
        targetField = 'company';
      } else if (lowerHeader.includes('job') || lowerHeader.includes('title')) {
        targetField = 'jobTitle';
      } else if (lowerHeader.includes('city')) {
        targetField = 'city';
      } else if (lowerHeader.includes('state')) {
        targetField = 'state';
      } else if (lowerHeader.includes('zip')) {
        targetField = 'zipCode';
      } else if (lowerHeader.includes('country')) {
        targetField = 'country';
      }

      return {
        sourceField: header,
        targetField,
        required: false,
      };
    });

    setMappings(initialMappings);
  }, [excelHeaders]);

  const handleMappingChange = (index: number, targetField: string) => {
    const newMappings = [...mappings];
    newMappings[index].targetField = targetField;
    setMappings(newMappings);
  };

  const handleRequiredChange = (index: number, required: boolean) => {
    const newMappings = [...mappings];
    newMappings[index].required = required;
    setMappings(newMappings);
  };

  const handleSubmit = () => {
    // Validate that required fields are mapped
    const unmappedRequired = mappings.filter((m) => m.required && m.targetField === 'unmapped');
    if (unmappedRequired.length > 0) {
      toast.error('Please map all required fields');
      return;
    }

    onMappingComplete(mappings);
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mt-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Map Excel Columns to Lead Fields</h2>
          <p className="mt-1 text-sm text-gray-600">
            Map your Excel columns to standard lead fields. Unmapped fields will be grouped at the end.
          </p>
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-gray-600 hover:text-gray-800"
        >
          Skip mapping (use defaults)
        </button>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        <div className="grid grid-cols-12 gap-4 px-2 py-2 bg-gray-50 rounded font-medium text-sm text-gray-700">
          <div className="col-span-4">Excel Column</div>
          <div className="col-span-5">Maps to Lead Field</div>
          <div className="col-span-3 text-center">Required</div>
        </div>

        {mappings.map((mapping, index) => (
          <div key={index} className="grid grid-cols-12 gap-4 px-2 py-2 border-b border-gray-200 items-center">
            <div className="col-span-4">
              <span className="text-sm font-medium text-gray-900">{mapping.sourceField}</span>
            </div>
            <div className="col-span-5">
              <select
                value={mapping.targetField}
                onChange={(e) => handleMappingChange(index, e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {STANDARD_LEAD_FIELDS.map((field) => (
                  <option key={field.value} value={field.value}>
                    {field.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-3 flex justify-center">
              <input
                type="checkbox"
                checked={mapping.required || false}
                onChange={(e) => handleRequiredChange(index, e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-between items-center">
        <p className="text-sm text-gray-600">
          <span className="font-medium">{mappings.filter((m) => m.targetField !== 'unmapped').length}</span> of{' '}
          <span className="font-medium">{mappings.length}</span> columns mapped
        </p>
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onSkip}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Use Auto-Mapping
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Confirm Mapping
          </button>
        </div>
      </div>
    </div>
  );
};

export default FieldMappingForm;
