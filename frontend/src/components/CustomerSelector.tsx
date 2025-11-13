import { useState, useRef, useEffect } from 'react';

interface Customer {
  customerId: string;
  name: string;
  crmType: string;
}

interface CustomerSelectorProps {
  customers: Customer[];
  value: string;
  onChange: (customerId: string) => void;
  disabled?: boolean;
  required?: boolean;
}

const CustomerSelector = ({
  customers,
  value,
  onChange,
  disabled = false,
  required = false,
}: CustomerSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter customers based on search term
  const filteredCustomers = customers.filter((customer) => {
    const search = searchTerm.toLowerCase();
    return (
      customer.name.toLowerCase().includes(search) ||
      customer.customerId.toLowerCase().includes(search) ||
      customer.crmType.toLowerCase().includes(search)
    );
  });

  // Get selected customer for display
  const selectedCustomer = customers.find((c) => c.customerId === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        setIsOpen(true);
        setFocusedIndex(0);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev < filteredCustomers.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredCustomers.length) {
          handleSelect(filteredCustomers[focusedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (customer: Customer) => {
    onChange(customer.customerId);
    setSearchTerm('');
    setIsOpen(false);
    setFocusedIndex(-1);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleClear = () => {
    onChange('');
    setSearchTerm('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Display Selected Customer or Search Input */}
      <div className="relative">
        {!isOpen && selectedCustomer ? (
          <div
            className={`w-full px-3 py-2 border border-gray-300 rounded-md bg-white flex items-center justify-between ${
              disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
            }`}
            onClick={() => !disabled && setIsOpen(true)}
          >
            <div>
              <span className="font-medium">{selectedCustomer.name}</span>
              <span className="text-sm text-gray-500 ml-2">
                ({selectedCustomer.crmType})
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {!required && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={disabled}
                >
                  ✕
                </button>
              )}
              <span className="text-gray-400">▼</span>
            </div>
          </div>
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedCustomer
                ? `${selectedCustomer.name} (${selectedCustomer.crmType})`
                : 'Search customers...'
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            disabled={disabled}
            autoComplete="off"
          />
        )}
      </div>

      {/* Dropdown List */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-64 overflow-y-auto">
          {filteredCustomers.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              No customers found
              {searchTerm && (
                <>
                  {' '}
                  for "<span className="font-medium">{searchTerm}</span>"
                </>
              )}
            </div>
          ) : (
            <ul>
              {filteredCustomers.map((customer, index) => (
                <li
                  key={customer.customerId}
                  onClick={() => handleSelect(customer)}
                  className={`px-3 py-2 cursor-pointer ${
                    index === focusedIndex
                      ? 'bg-primary-100'
                      : customer.customerId === value
                      ? 'bg-primary-50'
                      : 'hover:bg-gray-100'
                  }`}
                  onMouseEnter={() => setFocusedIndex(index)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">
                        {customer.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {customer.customerId}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      {customer.crmType}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {filteredCustomers.length > 0 && (
            <div className="px-3 py-2 text-xs text-gray-500 border-t border-gray-200 bg-gray-50">
              {filteredCustomers.length} of {customers.length} customers
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerSelector;
