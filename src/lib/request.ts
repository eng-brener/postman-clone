import { RequestType } from "../types";

export const REQUEST_TYPE_OPTIONS: { value: RequestType; label: string }[] = [
  { value: "http", label: "HTTP" },
  { value: "grpc", label: "gRPC" },
  { value: "websocket", label: "WebSocket" },
  { value: "socketio", label: "Socket.IO" },
  { value: "graphql", label: "GraphQL" },
  { value: "mqtt", label: "MQTT" },
  { value: "ia", label: "IA" },
  { value: "mcp", label: "MCP" },
];

export const getDefaultMethodForType = (requestType: RequestType) => {
  switch (requestType) {
    case "grpc":
      return "GRPC";
    case "websocket":
      return "WS";
    case "socketio":
      return "SOCKETIO";
    case "graphql":
      return "GRAPHQL";
    case "mqtt":
      return "MQTT";
    case "ia":
      return "IA";
    case "mcp":
      return "MCP";
    case "http":
    default:
      return "GET";
  }
};

export const getRequestTypeLabel = (requestType: RequestType) => {
  const match = REQUEST_TYPE_OPTIONS.find((option) => option.value === requestType);
  return match ? match.label : "Request";
};
