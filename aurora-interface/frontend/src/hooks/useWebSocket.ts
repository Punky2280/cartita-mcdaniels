import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAgentStore } from '@/stores/useAgentStore';

interface WebSocketEvent {
  type: string;
  data: any;
  timestamp: Date;
}

interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  enableHeartbeat?: boolean;
  heartbeatInterval?: number;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const {
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectDelay = 1000,
    enableHeartbeat = true,
    heartbeatInterval = 30000,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const reconnectCountRef = useRef(0);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketEvent | null>(null);

  const {
    updateAgent,
    updateWorkflowExecution,
    setMetrics,
    fetchAgents,
    fetchWorkflowExecutions,
    fetchMetrics
  } = useAgentStore();

  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
      setConnectionError('No authentication token available');
      return;
    }

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

    socketRef.current = io(apiBaseUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 5000,
      retries: reconnectAttempts,
    });

    const socket = socketRef.current;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setConnectionError(null);
      reconnectCountRef.current = 0;

      // Start heartbeat
      if (enableHeartbeat) {
        startHeartbeat();
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);
      stopHeartbeat();

      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect automatically
        setConnectionError('Server disconnected the connection');
      }
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setConnectionError(error.message);
      setIsConnected(false);

      // Implement exponential backoff for reconnection
      if (reconnectCountRef.current < reconnectAttempts) {
        const delay = reconnectDelay * Math.pow(2, reconnectCountRef.current);
        setTimeout(() => {
          reconnectCountRef.current++;
          socket.connect();
        }, delay);
      }
    });

    // Agent-related event handlers
    socket.on('agent:created', (agent) => {
      console.log('Agent created:', agent);
      setLastMessage({ type: 'agent:created', data: agent, timestamp: new Date() });
      // Refresh agents list to get the new agent
      fetchAgents();
    });

    socket.on('agent:updated', (agent) => {
      console.log('Agent updated:', agent);
      setLastMessage({ type: 'agent:updated', data: agent, timestamp: new Date() });
      updateAgent(agent.id, agent);
    });

    socket.on('agent:deleted', (agentId) => {
      console.log('Agent deleted:', agentId);
      setLastMessage({ type: 'agent:deleted', data: { id: agentId }, timestamp: new Date() });
      // Refresh agents list to remove the deleted agent
      fetchAgents();
    });

    socket.on('agent:status_changed', ({ agentId, status, metadata }) => {
      console.log('Agent status changed:', { agentId, status });
      setLastMessage({
        type: 'agent:status_changed',
        data: { agentId, status, metadata },
        timestamp: new Date()
      });
      updateAgent(agentId, { status, ...metadata });
    });

    // Workflow execution event handlers
    socket.on('workflow:started', (execution) => {
      console.log('Workflow started:', execution);
      setLastMessage({ type: 'workflow:started', data: execution, timestamp: new Date() });
      fetchWorkflowExecutions();
    });

    socket.on('workflow:progress', ({ executionId, progress, currentStep, stepResult }) => {
      console.log('Workflow progress:', { executionId, progress });
      setLastMessage({
        type: 'workflow:progress',
        data: { executionId, progress, currentStep, stepResult },
        timestamp: new Date()
      });
      updateWorkflowExecution(executionId, { progress, currentStep });
    });

    socket.on('workflow:completed', ({ executionId, result, endTime }) => {
      console.log('Workflow completed:', { executionId });
      setLastMessage({
        type: 'workflow:completed',
        data: { executionId, result, endTime },
        timestamp: new Date()
      });
      updateWorkflowExecution(executionId, {
        status: 'completed',
        progress: 100,
        endTime: new Date(endTime)
      });
    });

    socket.on('workflow:failed', ({ executionId, error, endTime }) => {
      console.log('Workflow failed:', { executionId, error });
      setLastMessage({
        type: 'workflow:failed',
        data: { executionId, error, endTime },
        timestamp: new Date()
      });
      updateWorkflowExecution(executionId, {
        status: 'failed',
        endTime: new Date(endTime)
      });
    });

    socket.on('workflow:cancelled', ({ executionId, endTime }) => {
      console.log('Workflow cancelled:', { executionId });
      setLastMessage({
        type: 'workflow:cancelled',
        data: { executionId, endTime },
        timestamp: new Date()
      });
      updateWorkflowExecution(executionId, {
        status: 'cancelled',
        endTime: new Date(endTime)
      });
    });

    // System metrics updates
    socket.on('metrics:updated', (metrics) => {
      console.log('Metrics updated:', metrics);
      setLastMessage({ type: 'metrics:updated', data: metrics, timestamp: new Date() });
      setMetrics(metrics);
    });

    // Performance monitoring
    socket.on('performance:agent_metrics', ({ agentId, performance }) => {
      console.log('Agent performance updated:', { agentId, performance });
      setLastMessage({
        type: 'performance:agent_metrics',
        data: { agentId, performance },
        timestamp: new Date()
      });
      updateAgent(agentId, { performance });
    });

    // Error handling
    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      setConnectionError(error.message);
      setLastMessage({ type: 'error', data: error, timestamp: new Date() });
    });

    // System notifications
    socket.on('notification', (notification) => {
      console.log('System notification:', notification);
      setLastMessage({ type: 'notification', data: notification, timestamp: new Date() });
      // You can integrate with a toast notification system here
    });

  }, [
    reconnectAttempts,
    reconnectDelay,
    enableHeartbeat,
    updateAgent,
    updateWorkflowExecution,
    setMetrics,
    fetchAgents,
    fetchWorkflowExecutions,
    fetchMetrics
  ]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      stopHeartbeat();
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('heartbeat', { timestamp: Date.now() });
      }
    }, heartbeatInterval);
  }, [heartbeatInterval]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
      return true;
    }
    return false;
  }, []);

  const subscribe = useCallback((event: string, handler: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler);

      return () => {
        socketRef.current?.off(event, handler);
      };
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopHeartbeat();
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [stopHeartbeat]);

  return {
    isConnected,
    connectionError,
    lastMessage,
    connect,
    disconnect,
    sendMessage,
    subscribe,
  };
};

export default useWebSocket;