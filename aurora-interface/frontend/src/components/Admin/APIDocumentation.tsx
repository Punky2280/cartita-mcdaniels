import React, { useState, useEffect } from 'react';
import {
  Book,
  Code,
  Play,
  Copy,
  CheckCircle,
  AlertTriangle,
  Download,
  ExternalLink,
  Search,
  Filter,
  Globe,
  Lock,
  Unlock,
  RefreshCw,
  Settings,
  FileText,
  Zap,
  Database,
  Shield
} from 'lucide-react';
import { useApiData } from '@/hooks';
import { logger } from '@/utils/logger';

interface APIEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  summary: string;
  description: string;
  tags: string[];
  parameters: APIParameter[];
  requestBody?: APIRequestBody;
  responses: APIResponse[];
  security: SecurityRequirement[];
  deprecated: boolean;
  operationId: string;
  examples: APIExample[];
}

interface APIParameter {
  name: string;
  in: 'query' | 'path' | 'header' | 'cookie';
  required: boolean;
  schema: APISchema;
  description: string;
  example?: unknown;
}

interface APIRequestBody {
  description: string;
  required: boolean;
  content: Record<string, APIMediaType>;
}

interface APIResponse {
  statusCode: string;
  description: string;
  content?: Record<string, APIMediaType>;
  headers?: Record<string, APIHeader>;
}

interface APIMediaType {
  schema: APISchema;
  examples?: Record<string, APIExample>;
}

interface APISchema {
  type: string;
  format?: string;
  properties?: Record<string, APISchema>;
  items?: APISchema;
  required?: string[];
  enum?: unknown[];
  example?: unknown;
}

interface APIHeader {
  description: string;
  schema: APISchema;
}

interface APIExample {
  summary: string;
  description: string;
  value: unknown;
}

interface SecurityRequirement {
  name: string;
  scopes?: string[];
}

interface APIDocumentation {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
    contact?: {
      name: string;
      email: string;
      url: string;
    };
    license?: {
      name: string;
      url: string;
    };
  };
  servers: APIServer[];
  tags: APITag[];
  endpoints: APIEndpoint[];
  securitySchemes: Record<string, SecurityScheme>;
}

interface APIServer {
  url: string;
  description: string;
  variables?: Record<string, ServerVariable>;
}

interface ServerVariable {
  default: string;
  description: string;
  enum?: string[];
}

interface APITag {
  name: string;
  description: string;
  externalDocs?: {
    url: string;
    description: string;
  };
}

interface SecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  description: string;
  name?: string;
  in?: 'query' | 'header' | 'cookie';
  scheme?: string;
  bearerFormat?: string;
}

interface TestResult {
  status: 'success' | 'error' | 'pending';
  statusCode?: number;
  responseTime?: number;
  response?: unknown;
  error?: string;
}

export const APIDocumentation: React.FC = () => {
  const [documentation, setDocumentation] = useState<APIDocumentation | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<APIEndpoint | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [copiedCode, setCopiedCode] = useState<string>('');
  const [selectedServer, setSelectedServer] = useState<string>('');
  const [authToken, setAuthToken] = useState<string>('');

  // Fetch API documentation
  const { data: docData, loading: docLoading, refetch: refetchDocs } = useApiData<APIDocumentation>('/api/docs/openapi');

  useEffect(() => {
    if (docData) {
      setDocumentation(docData);
      if (docData.servers.length > 0) {
        setSelectedServer(docData.servers[0].url);
      }
    }
  }, [docData]);

  const filteredEndpoints = documentation?.endpoints.filter(endpoint => {
    const matchesTag = selectedTag === 'all' || endpoint.tags.includes(selectedTag);
    const matchesSearch = searchQuery === '' ||
      endpoint.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      endpoint.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      endpoint.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTag && matchesSearch;
  }) || [];

  const handleCopyCode = async (code: string, type: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(`${type}-${code.slice(0, 20)}`);
      setTimeout(() => setCopiedCode(''), 2000);
      logger.info('Code copied to clipboard');
    } catch (error) {
      logger.error('Failed to copy code', error instanceof Error ? error : new Error(String(error)));
    }
  };

  const handleTestEndpoint = async (endpoint: APIEndpoint) => {
    const testId = `${endpoint.method}-${endpoint.path}`;
    setTestResults(prev => ({ ...prev, [testId]: { status: 'pending' } }));

    try {
      const startTime = Date.now();

      // Build request URL
      const url = `${selectedServer}${endpoint.path}`;

      // Build headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (authToken && endpoint.security.length > 0) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      // Make request
      const response = await fetch(url, {
        method: endpoint.method,
        headers,
        // Add body if needed for POST/PUT/PATCH
        ...(endpoint.requestBody && ['POST', 'PUT', 'PATCH'].includes(endpoint.method) && {
          body: JSON.stringify(endpoint.examples[0]?.value || {})
        })
      });

      const responseTime = Date.now() - startTime;
      const responseData = await response.json().catch(() => null);

      setTestResults(prev => ({
        ...prev,
        [testId]: {
          status: response.ok ? 'success' : 'error',
          statusCode: response.status,
          responseTime,
          response: responseData,
          error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
        }
      }));

      logger.info(`API test completed for ${endpoint.method} ${endpoint.path}`, {
        statusCode: response.status,
        responseTime
      });

    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [testId]: {
          status: 'error',
          error: error instanceof Error ? error.message : String(error)
        }
      }));

      logger.error('API test failed', error instanceof Error ? error : new Error(String(error)));
    }
  };

  const generateCurlCommand = (endpoint: APIEndpoint): string => {
    let curl = `curl -X ${endpoint.method} \\\n  "${selectedServer}${endpoint.path}"`;

    if (authToken && endpoint.security.length > 0) {
      curl += ` \\\n  -H "Authorization: Bearer ${authToken}"`;
    }

    curl += ` \\\n  -H "Content-Type: application/json"`;

    if (endpoint.requestBody && ['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
      const exampleBody = endpoint.examples[0]?.value || {};
      curl += ` \\\n  -d '${JSON.stringify(exampleBody, null, 2)}'`;
    }

    return curl;
  };

  const generateJavaScriptCode = (endpoint: APIEndpoint): string => {
    let jsCode = `const response = await fetch('${selectedServer}${endpoint.path}', {\n`;
    jsCode += `  method: '${endpoint.method}',\n`;
    jsCode += `  headers: {\n`;
    jsCode += `    'Content-Type': 'application/json',\n`;

    if (authToken && endpoint.security.length > 0) {
      jsCode += `    'Authorization': 'Bearer ${authToken}',\n`;
    }

    jsCode += `  },\n`;

    if (endpoint.requestBody && ['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
      const exampleBody = endpoint.examples[0]?.value || {};
      jsCode += `  body: JSON.stringify(${JSON.stringify(exampleBody, null, 2)})\n`;
    }

    jsCode += `});\n\nconst data = await response.json();\nconsole.log(data);`;

    return jsCode;
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-green-100 text-green-800';
      case 'POST': return 'bg-blue-100 text-blue-800';
      case 'PUT': return 'bg-yellow-100 text-yellow-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      case 'PATCH': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (docLoading && !documentation) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!documentation) {
    return (
      <div className="text-center py-12">
        <Book className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No API Documentation Available</h3>
        <p className="mt-1 text-sm text-gray-500">
          API documentation could not be loaded.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{documentation.info.title}</h1>
          <p className="text-gray-600 mt-1">{documentation.info.description}</p>
          <div className="flex items-center mt-2 space-x-4">
            <span className="text-sm text-gray-500">Version: {documentation.info.version}</span>
            <span className="text-sm text-gray-500">OpenAPI: {documentation.openapi}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => refetchDocs()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={() => window.open(`${selectedServer}/docs`, '_blank')}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Swagger UI
          </button>
        </div>
      </div>

      {/* Server Selection & Auth */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">API Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Globe className="w-4 h-4 inline mr-1" />
              Server
            </label>
            <select
              value={selectedServer}
              onChange={(e) => setSelectedServer(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {documentation.servers.map((server) => (
                <option key={server.url} value={server.url}>
                  {server.url} - {server.description}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Lock className="w-4 h-4 inline mr-1" />
              Authentication Token
            </label>
            <input
              type="password"
              placeholder="Bearer token (optional)"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search endpoints..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Tags</option>
              {documentation.tags.map((tag) => (
                <option key={tag.name} value={tag.name}>
                  {tag.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Endpoints List */}
      <div className="space-y-4">
        {filteredEndpoints.map((endpoint) => {
          const testId = `${endpoint.method}-${endpoint.path}`;
          const testResult = testResults[testId];

          return (
            <div key={endpoint.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div
                className="p-6 cursor-pointer hover:bg-gray-50"
                onClick={() => setSelectedEndpoint(selectedEndpoint?.id === endpoint.id ? null : endpoint)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getMethodColor(endpoint.method)}`}>
                      {endpoint.method}
                    </span>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{endpoint.path}</h3>
                      <p className="text-sm text-gray-600">{endpoint.summary}</p>
                    </div>
                    {endpoint.deprecated && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                        Deprecated
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {endpoint.security.length > 0 && (
                      <Lock className="w-4 h-4 text-gray-400" title="Requires authentication" />
                    )}
                    <div className="flex flex-wrap gap-1">
                      {endpoint.tags.map((tag) => (
                        <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {selectedEndpoint?.id === endpoint.id && (
                <div className="border-t border-gray-200 p-6 bg-gray-50">
                  <div className="space-y-6">
                    {/* Description */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Description</h4>
                      <p className="text-sm text-gray-600">{endpoint.description}</p>
                    </div>

                    {/* Parameters */}
                    {endpoint.parameters.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Parameters</h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2">Name</th>
                                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2">Type</th>
                                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2">In</th>
                                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2">Required</th>
                                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2">Description</th>
                              </tr>
                            </thead>
                            <tbody>
                              {endpoint.parameters.map((param) => (
                                <tr key={param.name} className="border-b border-gray-100">
                                  <td className="py-2 text-sm font-medium text-gray-900">{param.name}</td>
                                  <td className="py-2 text-sm text-gray-600">{param.schema.type}</td>
                                  <td className="py-2 text-sm text-gray-600">{param.in}</td>
                                  <td className="py-2 text-sm text-gray-600">
                                    {param.required ? (
                                      <span className="text-red-600">Yes</span>
                                    ) : (
                                      <span className="text-gray-400">No</span>
                                    )}
                                  </td>
                                  <td className="py-2 text-sm text-gray-600">{param.description}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Request Body */}
                    {endpoint.requestBody && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Request Body</h4>
                        <p className="text-sm text-gray-600 mb-2">{endpoint.requestBody.description}</p>
                        <div className="bg-gray-100 rounded-lg p-3">
                          <pre className="text-sm text-gray-800 overflow-x-auto">
                            {JSON.stringify(endpoint.examples[0]?.value || {}, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Responses */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Responses</h4>
                      <div className="space-y-2">
                        {endpoint.responses.map((response) => (
                          <div key={response.statusCode} className="border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                response.statusCode.startsWith('2') ? 'bg-green-100 text-green-800' :
                                response.statusCode.startsWith('4') ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {response.statusCode}
                              </span>
                              <span className="text-sm text-gray-600">{response.description}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Code Examples */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Code Examples</h4>
                      <div className="space-y-4">
                        {/* cURL */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">cURL</span>
                            <button
                              onClick={() => handleCopyCode(generateCurlCommand(endpoint), 'curl')}
                              className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                            >
                              {copiedCode.startsWith('curl-') ? (
                                <CheckCircle className="w-4 h-4 mr-1" />
                              ) : (
                                <Copy className="w-4 h-4 mr-1" />
                              )}
                              Copy
                            </button>
                          </div>
                          <div className="bg-gray-900 rounded-lg p-3">
                            <pre className="text-sm text-green-400 overflow-x-auto">
                              {generateCurlCommand(endpoint)}
                            </pre>
                          </div>
                        </div>

                        {/* JavaScript */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">JavaScript</span>
                            <button
                              onClick={() => handleCopyCode(generateJavaScriptCode(endpoint), 'js')}
                              className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                            >
                              {copiedCode.startsWith('js-') ? (
                                <CheckCircle className="w-4 h-4 mr-1" />
                              ) : (
                                <Copy className="w-4 h-4 mr-1" />
                              )}
                              Copy
                            </button>
                          </div>
                          <div className="bg-gray-900 rounded-lg p-3">
                            <pre className="text-sm text-blue-400 overflow-x-auto">
                              {generateJavaScriptCode(endpoint)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Test Button */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <button
                        onClick={() => handleTestEndpoint(endpoint)}
                        disabled={testResult?.status === 'pending'}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                      >
                        {testResult?.status === 'pending' ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4 mr-2" />
                        )}
                        Test Endpoint
                      </button>

                      {testResult && testResult.status !== 'pending' && (
                        <div className="flex items-center space-x-2">
                          {testResult.status === 'success' ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                          )}
                          <span className="text-sm text-gray-600">
                            {testResult.statusCode && `${testResult.statusCode} • `}
                            {testResult.responseTime && `${testResult.responseTime}ms`}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Test Results */}
                    {testResult && testResult.response && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Response</h4>
                        <div className="bg-gray-100 rounded-lg p-3">
                          <pre className="text-sm text-gray-800 overflow-x-auto">
                            {JSON.stringify(testResult.response, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {testResult && testResult.error && (
                      <div>
                        <h4 className="text-sm font-medium text-red-900 mb-2">Error</h4>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <p className="text-sm text-red-700">{testResult.error}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredEndpoints.length === 0 && (
        <div className="text-center py-12">
          <Search className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No endpoints found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      )}
    </div>
  );
};