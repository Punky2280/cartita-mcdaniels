import React, { useState } from 'react';
import {
  CubeIcon,
  SwatchIcon,
  CodeBracketIcon,
  ClipboardDocumentIcon,
  MagnifyingGlassIcon,
  TagIcon,
  PlusIcon,
  MinusIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
  StarIcon,
  HeartIcon,
  BoltIcon,
  SparklesIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  AdjustmentsHorizontalIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

interface ComponentExample {
  id: string;
  name: string;
  category: 'buttons' | 'forms' | 'navigation' | 'data-display' | 'feedback' | 'layout' | 'media';
  description: string;
  code: string;
  preview: React.ReactNode;
  props?: Array<{
    name: string;
    type: string;
    default?: string;
    description: string;
  }>;
}

const ComponentCard: React.FC<{
  component: ComponentExample;
  onCopyCode: (code: string) => void;
}> = ({ component, onCopyCode }) => {
  const [showCode, setShowCode] = useState(false);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">{component.name}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCode(!showCode)}
              className="p-2 rounded-md hover:bg-gray-100 transition-colors"
              title={showCode ? "Hide Code" : "Show Code"}
            >
              {showCode ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
            <button
              onClick={() => onCopyCode(component.code)}
              className="p-2 rounded-md hover:bg-gray-100 transition-colors"
              title="Copy Code"
            >
              <ClipboardDocumentIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-600">{component.description}</p>
      </div>

      {/* Preview */}
      <div className="p-6 bg-gray-50">
        <div className="flex items-center justify-center min-h-[100px]">
          {component.preview}
        </div>
      </div>

      {/* Code */}
      {showCode && (
        <div className="border-t border-gray-200">
          <pre className="p-4 text-sm text-gray-800 bg-gray-900 text-green-400 overflow-x-auto">
            <code>{component.code}</code>
          </pre>
        </div>
      )}

      {/* Props */}
      {component.props && component.props.length > 0 && (
        <div className="p-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Props</h4>
          <div className="space-y-2">
            {component.props.map((prop, index) => (
              <div key={index} className="flex items-start gap-3 text-xs">
                <code className="px-2 py-1 bg-gray-100 rounded text-gray-800 font-mono">
                  {prop.name}
                </code>
                <div className="flex-1">
                  <div className="text-gray-600">{prop.type}</div>
                  <div className="text-gray-500">{prop.description}</div>
                  {prop.default && (
                    <div className="text-gray-400">Default: {prop.default}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const Components: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const components: ComponentExample[] = [
    {
      id: 'button-primary',
      name: 'Primary Button',
      category: 'buttons',
      description: 'Main action button with Cartrita orange styling',
      code: `<button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 transition-colors">
  <PlayIcon className="h-4 w-4 mr-2" />
  Primary Action
</button>`,
      preview: (
        <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 transition-colors">
          <PlayIcon className="h-4 w-4 mr-2" />
          Primary Action
        </button>
      ),
      props: [
        { name: 'children', type: 'ReactNode', description: 'Button content' },
        { name: 'disabled', type: 'boolean', default: 'false', description: 'Disable the button' },
        { name: 'onClick', type: 'function', description: 'Click handler' }
      ]
    },
    {
      id: 'button-secondary',
      name: 'Secondary Button',
      category: 'buttons',
      description: 'Secondary action button with outline styling',
      code: `<button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors">
  <PauseIcon className="h-4 w-4 mr-2" />
  Secondary Action
</button>`,
      preview: (
        <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors">
          <PauseIcon className="h-4 w-4 mr-2" />
          Secondary Action
        </button>
      )
    },
    {
      id: 'button-danger',
      name: 'Danger Button',
      category: 'buttons',
      description: 'Destructive action button with red styling',
      code: `<button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors">
  <StopIcon className="h-4 w-4 mr-2" />
  Danger Action
</button>`,
      preview: (
        <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors">
          <StopIcon className="h-4 w-4 mr-2" />
          Danger Action
        </button>
      )
    },
    {
      id: 'input-text',
      name: 'Text Input',
      category: 'forms',
      description: 'Standard text input with Cartrita focus styling',
      code: `<input
  type="text"
  placeholder="Enter text..."
  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
/>`,
      preview: (
        <input
          type="text"
          placeholder="Enter text..."
          className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        />
      ),
      props: [
        { name: 'type', type: 'string', default: 'text', description: 'Input type' },
        { name: 'placeholder', type: 'string', description: 'Placeholder text' },
        { name: 'value', type: 'string', description: 'Input value' },
        { name: 'onChange', type: 'function', description: 'Change handler' }
      ]
    },
    {
      id: 'select',
      name: 'Select Dropdown',
      category: 'forms',
      description: 'Dropdown select with Cartrita styling',
      code: `<select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500">
  <option>Option 1</option>
  <option>Option 2</option>
  <option>Option 3</option>
</select>`,
      preview: (
        <select className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500">
          <option>Option 1</option>
          <option>Option 2</option>
          <option>Option 3</option>
        </select>
      )
    },
    {
      id: 'checkbox',
      name: 'Checkbox',
      category: 'forms',
      description: 'Custom styled checkbox with Cartrita colors',
      code: `<label className="flex items-center gap-2">
  <input type="checkbox" className="rounded border-gray-300 text-orange-600 focus:ring-orange-500" />
  <span className="text-sm text-gray-700">Checkbox label</span>
</label>`,
      preview: (
        <label className="flex items-center gap-2">
          <input type="checkbox" className="rounded border-gray-300 text-orange-600 focus:ring-orange-500" />
          <span className="text-sm text-gray-700">Checkbox label</span>
        </label>
      )
    },
    {
      id: 'badge-success',
      name: 'Success Badge',
      category: 'data-display',
      description: 'Green badge for success states',
      code: `<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
  <CheckCircleIcon className="h-3 w-3 mr-1" />
  Success
</span>`,
      preview: (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircleIcon className="h-3 w-3 mr-1" />
          Success
        </span>
      )
    },
    {
      id: 'badge-warning',
      name: 'Warning Badge',
      category: 'data-display',
      description: 'Yellow badge for warning states',
      code: `<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
  <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
  Warning
</span>`,
      preview: (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
          Warning
        </span>
      )
    },
    {
      id: 'badge-error',
      name: 'Error Badge',
      category: 'data-display',
      description: 'Red badge for error states',
      code: `<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
  <XCircleIcon className="h-3 w-3 mr-1" />
  Error
</span>`,
      preview: (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircleIcon className="h-3 w-3 mr-1" />
          Error
        </span>
      )
    },
    {
      id: 'card',
      name: 'Card',
      category: 'layout',
      description: 'Basic card container with Cartrita styling',
      code: `<div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
  <h3 className="text-lg font-semibold text-gray-900 mb-2">Card Title</h3>
  <p className="text-gray-600">Card content goes here with some descriptive text.</p>
</div>`,
      preview: (
        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow max-w-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Card Title</h3>
          <p className="text-gray-600">Card content goes here with some descriptive text.</p>
        </div>
      )
    },
    {
      id: 'alert-info',
      name: 'Info Alert',
      category: 'feedback',
      description: 'Information alert with blue styling',
      code: `<div className="rounded-md bg-blue-50 p-4">
  <div className="flex">
    <InformationCircleIcon className="h-5 w-5 text-blue-400" />
    <div className="ml-3">
      <h3 className="text-sm font-medium text-blue-800">Information</h3>
      <p className="mt-2 text-sm text-blue-700">This is an informational message.</p>
    </div>
  </div>
</div>`,
      preview: (
        <div className="rounded-md bg-blue-50 p-4 max-w-sm">
          <div className="flex">
            <InformationCircleIcon className="h-5 w-5 text-blue-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Information</h3>
              <p className="mt-2 text-sm text-blue-700">This is an informational message.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'progress-bar',
      name: 'Progress Bar',
      category: 'feedback',
      description: 'Progress indicator with Cartrita orange color',
      code: `<div className="w-full bg-gray-200 rounded-full h-2">
  <div className="bg-orange-500 h-2 rounded-full transition-all duration-300" style={{ width: '65%' }}></div>
</div>`,
      preview: (
        <div className="w-full max-w-xs">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-orange-500 h-2 rounded-full transition-all duration-300" style={{ width: '65%' }}></div>
          </div>
          <div className="text-sm text-gray-600 mt-1">65% complete</div>
        </div>
      )
    },
    {
      id: 'rating',
      name: 'Star Rating',
      category: 'data-display',
      description: 'Five-star rating component',
      code: `<div className="flex items-center gap-1">
  {[1, 2, 3, 4, 5].map((star) => (
    <StarIcon
      key={star}
      className={\`h-5 w-5 \${star <= 4 ? 'text-yellow-400 fill-current' : 'text-gray-300'}\`}
    />
  ))}
  <span className="text-sm text-gray-600 ml-2">4.0</span>
</div>`,
      preview: (
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <StarIcon
              key={star}
              className={`h-5 w-5 ${star <= 4 ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
            />
          ))}
          <span className="text-sm text-gray-600 ml-2">4.0</span>
        </div>
      )
    },
    {
      id: 'toggle',
      name: 'Toggle Switch',
      category: 'forms',
      description: 'Toggle switch with Cartrita styling',
      code: `<button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-orange-600 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2">
  <span className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out translate-x-5"></span>
</button>`,
      preview: (
        <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-orange-600 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2">
          <span className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out translate-x-5"></span>
        </button>
      )
    }
  ];

  const filteredComponents = components.filter(component => {
    const matchesSearch = component.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         component.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || component.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  const categoryStats = {
    buttons: components.filter(c => c.category === 'buttons').length,
    forms: components.filter(c => c.category === 'forms').length,
    navigation: components.filter(c => c.category === 'navigation').length,
    'data-display': components.filter(c => c.category === 'data-display').length,
    feedback: components.filter(c => c.category === 'feedback').length,
    layout: components.filter(c => c.category === 'layout').length,
    media: components.filter(c => c.category === 'media').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-purple-600">
              <CubeIcon className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">UI Components</h1>
          </div>
          <p className="text-gray-600">
            Explore and use components from the Cartrita Design System
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
            <SwatchIcon className="h-4 w-4 mr-2" />
            Design Tokens
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 transition-colors">
            <CodeBracketIcon className="h-4 w-4 mr-2" />
            View Source
          </button>
        </div>
      </div>

      {/* Copy Success Message */}
      {copiedCode && (
        <div className="fixed top-4 right-4 z-50 bg-green-100 border border-green-200 rounded-md p-3 shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
            <span className="text-sm font-medium text-green-800">Code copied to clipboard!</span>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{components.length}</div>
          <div className="text-sm text-gray-600">Total Components</div>
        </div>
        {Object.entries(categoryStats).map(([category, count]) => (
          <div key={category} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">{count}</div>
            <div className="text-sm text-gray-600 capitalize">
              {category.replace('-', ' ')}
            </div>
          </div>
        ))}
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search components..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="all">All Categories</option>
            <option value="buttons">Buttons</option>
            <option value="forms">Forms</option>
            <option value="navigation">Navigation</option>
            <option value="data-display">Data Display</option>
            <option value="feedback">Feedback</option>
            <option value="layout">Layout</option>
            <option value="media">Media</option>
          </select>
        </div>
      </div>

      {/* Color Palette */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Cartrita Color Palette</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Primary (Orange)</h3>
            <div className="flex gap-1">
              <div className="w-8 h-8 rounded bg-orange-50 border border-gray-200"></div>
              <div className="w-8 h-8 rounded bg-orange-100 border border-gray-200"></div>
              <div className="w-8 h-8 rounded bg-orange-200 border border-gray-200"></div>
              <div className="w-8 h-8 rounded bg-orange-500"></div>
              <div className="w-8 h-8 rounded bg-orange-600"></div>
              <div className="w-8 h-8 rounded bg-orange-700"></div>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Secondary (Blue)</h3>
            <div className="flex gap-1">
              <div className="w-8 h-8 rounded bg-blue-50 border border-gray-200"></div>
              <div className="w-8 h-8 rounded bg-blue-100 border border-gray-200"></div>
              <div className="w-8 h-8 rounded bg-blue-200 border border-gray-200"></div>
              <div className="w-8 h-8 rounded bg-blue-500"></div>
              <div className="w-8 h-8 rounded bg-blue-600"></div>
              <div className="w-8 h-8 rounded bg-blue-700"></div>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Accent (Purple)</h3>
            <div className="flex gap-1">
              <div className="w-8 h-8 rounded bg-purple-50 border border-gray-200"></div>
              <div className="w-8 h-8 rounded bg-purple-100 border border-gray-200"></div>
              <div className="w-8 h-8 rounded bg-purple-200 border border-gray-200"></div>
              <div className="w-8 h-8 rounded bg-purple-500"></div>
              <div className="w-8 h-8 rounded bg-purple-600"></div>
              <div className="w-8 h-8 rounded bg-purple-700"></div>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Neutral (Gray)</h3>
            <div className="flex gap-1">
              <div className="w-8 h-8 rounded bg-gray-50 border border-gray-200"></div>
              <div className="w-8 h-8 rounded bg-gray-100 border border-gray-200"></div>
              <div className="w-8 h-8 rounded bg-gray-200 border border-gray-200"></div>
              <div className="w-8 h-8 rounded bg-gray-500"></div>
              <div className="w-8 h-8 rounded bg-gray-600"></div>
              <div className="w-8 h-8 rounded bg-gray-900"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Components Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredComponents.map((component) => (
          <ComponentCard
            key={component.id}
            component={component}
            onCopyCode={handleCopyCode}
          />
        ))}
      </div>

      {filteredComponents.length === 0 && (
        <div className="text-center py-12">
          <CubeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No components found</h3>
          <p className="text-gray-600">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      )}
    </div>
  );
};