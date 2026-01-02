import { ChevronDown, ChevronRight, Folder, FolderOpen, Layers, Pin, Play, Settings } from "lucide-react";
import {
  type FormEvent,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { KeyValueEditor } from "../Editors/KeyValueEditor";
import {
  CollectionNode,
  CollectionRequest,
  Environment,
  HistoryItem,
  KeyValue,
  RequestData,
  RequestType,
} from "../../types";

interface SidebarProps {
  appName: string;
  appVersion: string | null;
  history: HistoryItem[];
  currentUrl: string;
  currentMethod: string;
  collectionNodes: CollectionNode[];
  setCollectionNodes: Dispatch<SetStateAction<CollectionNode[]>>;
  buildRequestData: (method: string, url: string, requestType?: RequestType) => RequestData;
  onSelectRequest: (request: CollectionRequest) => void;
  onSelectHistory: (method: string, url: string) => void;
  onHistoryPinToggle: (id: string) => void;
  onHistoryRerun: (item: HistoryItem) => void;
  environments: Environment[];
  activeEnvironmentId: string | null;
  onEnvironmentChange: (id: string | null) => void;
  onEnvironmentAdd: () => void;
  onEnvironmentRename: (id: string, name: string) => void;
  onEnvironmentDelete: (id: string) => void;
  onEnvironmentVarChange: (id: string, idx: number, field: keyof KeyValue, val: string | boolean) => void;
  onEnvironmentVarRemove: (id: string, idx: number) => void;
}

const MethodBadge = ({ method }: { method: string }) => {
  return <span className={`method-badge method-${method}`}>{method}</span>;
};

const REQUEST_TYPE_OPTIONS: { value: RequestType; label: string }[] = [
  { value: "http", label: "HTTP" },
  { value: "grpc", label: "gRPC" },
  { value: "websocket", label: "WebSocket" },
  { value: "socketio", label: "Socket.IO" },
  { value: "graphql", label: "GraphQL" },
  { value: "mqtt", label: "MQTT" },
  { value: "ia", label: "IA" },
  { value: "mcp", label: "MCP" },
];

const getDefaultMethodForType = (requestType: RequestType) => {
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

const getRequestTypeLabel = (requestType: RequestType) => {
  const match = REQUEST_TYPE_OPTIONS.find((option) => option.value === requestType);
  return match ? match.label : "Request";
};

const SidebarItem = ({
  active,
  method,
  label,
  depth = 0,
  onContextMenu,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  className,
  onClick,
}: {
  active?: boolean;
  method: string;
  label: string;
  depth?: number;
  onContextMenu?: (event: MouseEvent) => void;
  onDragStart?: (event: DragEvent) => void;
  onDragEnd?: () => void;
  onDragOver?: (event: DragEvent) => void;
  onDragLeave?: (event: DragEvent) => void;
  onDrop?: (event: DragEvent) => void;
  className?: string;
  onClick: () => void;
}) => (
  <button
    className={`nav-item ${active ? "active" : ""} ${className ?? ""}`}
    style={{ paddingLeft: 12 + depth * 14 }}
    onContextMenu={onContextMenu}
    onDragStart={onDragStart}
    onDragEnd={onDragEnd}
    onDragOver={onDragOver}
    onDragLeave={onDragLeave}
    onDrop={onDrop}
    draggable={!!onDragStart}
    onClick={onClick}
  >
    <MethodBadge method={method} />
    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
      {label}
    </span>
  </button>
);

export const Sidebar = ({
  appName,
  appVersion,
  history,
  currentUrl,
  currentMethod,
  collectionNodes,
  setCollectionNodes,
  buildRequestData,
  onSelectRequest,
  onSelectHistory,
  onHistoryPinToggle,
  onHistoryRerun,
  environments,
  activeEnvironmentId,
  onEnvironmentChange,
  onEnvironmentAdd,
  onEnvironmentRename,
  onEnvironmentDelete,
  onEnvironmentVarChange,
  onEnvironmentVarRemove,
}: SidebarProps) => {
  const defaultOpen = useMemo(() => {
    const openMap: Record<string, boolean> = {};
    const walk = (nodes: CollectionNode[]) => {
      nodes.forEach((node) => {
        if (node.type === "folder") {
          openMap[node.id] = true;
          walk(node.children);
        }
      });
    };
    walk(collectionNodes);
    return openMap;
  }, [collectionNodes]);
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>(defaultOpen);
  useEffect(() => {
    setOpenFolders((prev) => {
      const next = { ...prev };
      const walk = (nodes: CollectionNode[]) => {
        nodes.forEach((node) => {
          if (node.type === "folder") {
            if (!(node.id in next)) {
              next[node.id] = true;
            }
            walk(node.children);
          }
        });
      };
      walk(collectionNodes);
      return next;
    });
  }, [collectionNodes]);

  const toggleFolder = (id: string) => {
    setOpenFolders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    targetId: string;
    targetName: string;
    targetType: "root" | "folder" | "request";
  } | null>(null);
  const [renameModal, setRenameModal] = useState<{
    targetId: string;
    targetType: "folder" | "request";
    name: string;
  } | null>(null);
  const [createModal, setCreateModal] = useState<{
    parentId: string | null;
    type: "folder" | "request";
    name: string;
    requestType: RequestType;
    method: string;
    url: string;
  } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    targetId: string;
    targetType: "folder" | "request";
    targetName: string;
  } | null>(null);
  const [moveModal, setMoveModal] = useState<{
    targetId: string;
    targetType: "folder" | "request";
    targetName: string;
    destinationId: string | null;
  } | null>(null);
  const [collectionFilter, setCollectionFilter] = useState("");
  const [dragState, setDragState] = useState<{
    dragId: string;
    dragType: "folder" | "request";
  } | null>(null);
  const dragStateRef = useRef<{
    dragId: string;
    dragType: "folder" | "request";
  } | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropInvalidId, setDropInvalidId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(true);
  const pinnedHistory = useMemo(() => history.filter((item) => item.pinned), [history]);
  const recentHistory = useMemo(() => history.filter((item) => !item.pinned), [history]);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [envModalOpen, setEnvModalOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"general" | "about">("general");
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const renameFocusRef = useRef(false);
  const activeEnvironment = environments.find((env) => env.id === activeEnvironmentId) ?? null;

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener("click", closeMenu);
    window.addEventListener("blur", closeMenu);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("blur", closeMenu);
    };
  }, []);

  useEffect(() => {
    if (renameModal && renameInputRef.current && !renameFocusRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
      renameFocusRef.current = true;
    }
    if (!renameModal) {
      renameFocusRef.current = false;
    }
  }, [renameModal]);

  const openContextMenu = (
    event: MouseEvent,
    node: { id: string; name: string; type: "folder" | "request" }
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      targetId: node.id,
      targetName: node.name,
      targetType: node.type,
    });
  };

  const openRootContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      targetId: "root",
      targetName: "Collection",
      targetType: "root",
    });
  };

  const renameNode = (nodes: CollectionNode[], targetId: string, nextName: string): CollectionNode[] =>
    nodes.map((node) => {
      if (node.id === targetId) {
        return { ...node, name: nextName };
      }
      if (node.type === "folder") {
        return { ...node, children: renameNode(node.children, targetId, nextName) };
      }
      return node;
    });

  const collectFolderIds = (node: CollectionNode): string[] => {
    if (node.type !== "folder") {
      return [];
    }
    return [node.id, ...node.children.flatMap(collectFolderIds)];
  };

  const removeNode = (
    nodes: CollectionNode[],
    targetId: string
  ): { nodes: CollectionNode[]; removed: boolean; removedFolderIds: string[] } => {
    let removed = false;
    let removedFolderIds: string[] = [];

    const nextNodes = nodes
      .filter((node) => {
        if (node.id === targetId) {
          removed = true;
          removedFolderIds = collectFolderIds(node);
          return false;
        }
        return true;
      })
      .map((node) => {
        if (node.type !== "folder") {
          return node;
        }
        const result = removeNode(node.children, targetId);
        if (result.removed) {
          removed = true;
          removedFolderIds = removedFolderIds.concat(result.removedFolderIds);
          return { ...node, children: result.nodes };
        }
        return node;
      });

    return { nodes: nextNodes, removed, removedFolderIds };
  };

  const extractNode = (
    nodes: CollectionNode[],
    targetId: string
  ): { nodes: CollectionNode[]; extracted: CollectionNode | null } => {
    let extracted: CollectionNode | null = null;
    const nextNodes = nodes
      .filter((node) => {
        if (node.id === targetId) {
          extracted = node;
          return false;
        }
        return true;
      })
      .map((node) => {
        if (node.type !== "folder") {
          return node;
        }
        const result = extractNode(node.children, targetId);
        if (result.extracted) {
          extracted = result.extracted;
          return { ...node, children: result.nodes };
        }
        return node;
      });

    return { nodes: nextNodes, extracted };
  };

  const isDescendant = (node: CollectionNode, targetId: string): boolean => {
    if (node.type !== "folder") {
      return false;
    }
    return node.children.some(
      (child) => child.id === targetId || (child.type === "folder" && isDescendant(child, targetId))
    );
  };

  const findNodeById = (nodes: CollectionNode[], targetId: string): CollectionNode | null => {
    for (const node of nodes) {
      if (node.id === targetId) {
        return node;
      }
      if (node.type === "folder") {
        const found = findNodeById(node.children, targetId);
        if (found) {
          return found;
        }
      }
    }
    return null;
  };

  const findParentInfo = (
    nodes: CollectionNode[],
    targetId: string,
    parentId: string | null = null
  ): { parentId: string | null; index: number } | null => {
    for (let i = 0; i < nodes.length; i += 1) {
      const node = nodes[i];
      if (node.id === targetId) {
        return { parentId, index: i };
      }
      if (node.type === "folder") {
        const child = findParentInfo(node.children, targetId, node.id);
        if (child) {
          return child;
        }
      }
    }
    return null;
  };

  const listFolderOptions = (nodes: CollectionNode[], acc: { id: string | null; label: string }[] = [], prefix = "") => {
    nodes.forEach((node) => {
      if (node.type === "folder") {
        acc.push({ id: node.id, label: `${prefix}${node.name}` });
        listFolderOptions(node.children, acc, `${prefix}${node.name} / `);
      }
    });
    return acc;
  };

  const cloneNodeWithIds = (node: CollectionNode): CollectionNode => {
    if (node.type === "folder") {
      return {
        id: `folder-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        type: "folder",
        name: `${node.name} Copy`,
        children: node.children.map((child) => cloneNodeWithIds(child)),
      };
    }
    return {
      id: `req-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: "request",
      name: `${node.name} Copy`,
      request: {
        ...node.request,
        params: node.request.params.map((item) => ({ ...item })),
        headers: node.request.headers.map((item) => ({ ...item })),
        authData: {
          apiKey: { ...node.request.authData.apiKey },
          bearer: { ...node.request.authData.bearer },
          basic: { ...node.request.authData.basic },
        },
        bodyFormData: node.request.bodyFormData.map((item) => ({ ...item })),
        bodyUrlEncoded: node.request.bodyUrlEncoded.map((item) => ({ ...item })),
        settings: { ...node.request.settings },
      },
    };
  };

  const sortChildrenByName = (nodes: CollectionNode[]): CollectionNode[] => {
    return [...nodes].sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "folder" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  };

  const insertNodeAt = (
    nodes: CollectionNode[],
    parentId: string | null,
    index: number,
    node: CollectionNode
  ): CollectionNode[] => {
    if (!parentId) {
      const next = [...nodes];
      next.splice(index, 0, node);
      return next;
    }

    return nodes.map((entry) => {
      if (entry.type === "folder") {
        if (entry.id === parentId) {
          const nextChildren = [...entry.children];
          nextChildren.splice(index, 0, node);
          return { ...entry, children: nextChildren };
        }
        return { ...entry, children: insertNodeAt(entry.children, parentId, index, node) };
      }
      return entry;
    });
  };

  const moveNode = (dragId: string, targetFolderId: string | null) => {
    if (targetFolderId && dragId === targetFolderId) {
      return;
    }

    let draggedNode: CollectionNode | null = null;
    setCollectionNodes((prev) => {
      const extracted = extractNode(prev, dragId);
      draggedNode = extracted.extracted;
      if (!draggedNode) {
        return prev;
      }
      if (targetFolderId) {
        if (draggedNode.type === "folder" && isDescendant(draggedNode, targetFolderId)) {
          draggedNode = null;
          return prev;
        }
        return addNode(extracted.nodes, targetFolderId, draggedNode);
      }
      return addNode(extracted.nodes, null, draggedNode);
    });

    if (draggedNode && targetFolderId) {
      setOpenFolders((prev) => ({ ...prev, [targetFolderId]: true }));
    }
  };

  const handleDragStart = (event: DragEvent, node: { id: string; type: "folder" | "request" }) => {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", node.id);
    event.dataTransfer.setData("text", node.id);
    event.dataTransfer.dropEffect = "move";
    const nextDrag = { dragId: node.id, dragType: node.type };
    dragStateRef.current = nextDrag;
    setDragState(nextDrag);
    setDropInvalidId(null);
  };

  const handleDragEnd = () => {
    setDragState(null);
    dragStateRef.current = null;
    setDropTargetId(null);
    setDropInvalidId(null);
  };

  const handleDragOverFolder = (event: DragEvent, folderId: string) => {
    const activeDrag = dragStateRef.current ?? dragState;
    if (!activeDrag) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      return;
    }
    if (activeDrag.dragId === folderId) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "none";
      setDropTargetId(null);
      setDropInvalidId(folderId);
      return;
    }
    if (activeDrag.dragType === "folder") {
      const dragged = findNodeById(collectionNodes, activeDrag.dragId);
      if (dragged && isDescendant(dragged, folderId)) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "none";
        setDropTargetId(null);
        setDropInvalidId(folderId);
        return;
      }
    }
    event.stopPropagation();
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropTargetId(folderId);
    setDropInvalidId(null);
  };

  const handleDragOverRequest = (event: DragEvent, requestId: string) => {
    const activeDrag = dragStateRef.current ?? dragState;
    if (!activeDrag) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      return;
    }
    if (activeDrag.dragId === requestId) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "none";
      setDropTargetId(null);
      setDropInvalidId(requestId);
      return;
    }
    if (activeDrag.dragType === "folder") {
      const dragged = findNodeById(collectionNodes, activeDrag.dragId);
      if (dragged && isDescendant(dragged, requestId)) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "none";
        setDropTargetId(null);
        setDropInvalidId(requestId);
        return;
      }
    }
    event.stopPropagation();
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropTargetId(requestId);
    setDropInvalidId(null);
  };

  const handleDragOverRoot = (event: DragEvent) => {
    const activeDrag = dragStateRef.current ?? dragState;
    if (!activeDrag) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropTargetId("root");
    setDropInvalidId(null);
  };

  const handleDragLeaveFolder = (event: DragEvent, folderId: string) => {
    if (dropTargetId === folderId || dropInvalidId === folderId) {
      const currentTarget = event.currentTarget as HTMLElement;
      if (!currentTarget.contains(event.relatedTarget as Node)) {
        setDropTargetId(null);
        setDropInvalidId(null);
      }
    }
  };

  const handleDropOnFolder = (event: DragEvent, folderId: string) => {
    event.stopPropagation();
    event.preventDefault();
    const activeDrag = dragStateRef.current ?? dragState;
    if (!activeDrag) {
      return;
    }
    if (activeDrag.dragId === folderId) {
      return;
    }
    if (activeDrag.dragType === "folder") {
      const dragged = findNodeById(collectionNodes, activeDrag.dragId);
      if (dragged && isDescendant(dragged, folderId)) {
        return;
      }
    }
    moveNode(activeDrag.dragId, folderId);
    setDropTargetId(null);
    setDragState(null);
    dragStateRef.current = null;
    setDropInvalidId(null);
  };

  const handleDropOnRequest = (event: DragEvent, requestId: string) => {
    event.stopPropagation();
    event.preventDefault();
    const activeDrag = dragStateRef.current ?? dragState;
    if (!activeDrag) {
      return;
    }
    if (activeDrag.dragId === requestId) {
      return;
    }
    if (activeDrag.dragType === "folder") {
      const dragged = findNodeById(collectionNodes, activeDrag.dragId);
      if (dragged && isDescendant(dragged, requestId)) {
        return;
      }
    }
    const targetInfo = findParentInfo(collectionNodes, requestId);
    if (!targetInfo) {
      return;
    }
    setCollectionNodes((prev) => {
      const extracted = extractNode(prev, activeDrag.dragId);
      if (!extracted.extracted) {
        return prev;
      }
      return insertNodeAt(extracted.nodes, targetInfo.parentId, targetInfo.index, extracted.extracted);
    });
    if (targetInfo.parentId) {
      setOpenFolders((prev) => ({ ...prev, [targetInfo.parentId as string]: true }));
    }
    setDropTargetId(null);
    setDragState(null);
    dragStateRef.current = null;
    setDropInvalidId(null);
  };

  const handleDropOnRoot = (event: DragEvent) => {
    event.preventDefault();
    const activeDrag = dragStateRef.current ?? dragState;
    if (!activeDrag) {
      return;
    }
    moveNode(activeDrag.dragId, null);
    setDropTargetId(null);
    setDragState(null);
    dragStateRef.current = null;
    setDropInvalidId(null);
  };

  const handleContextAction = (action: "rename" | "delete") => {
    if (!contextMenu) {
      return;
    }

    if (action === "rename") {
      if (contextMenu.targetType === "root") {
        setContextMenu(null);
        return;
      }
      setRenameModal({
        targetId: contextMenu.targetId,
        targetType: contextMenu.targetType,
        name: contextMenu.targetName,
      });
      setContextMenu(null);
      return;
    }

    if (action === "delete") {
      if (contextMenu.targetType === "root") {
        setContextMenu(null);
        return;
      }
      setDeleteModal({
        targetId: contextMenu.targetId,
        targetType: contextMenu.targetType,
        targetName: contextMenu.targetName,
      });
      setContextMenu(null);
      return;
    }

    setContextMenu(null);
  };

  const getMoveOptions = () => {
    const all = [{ id: null, label: "Root" }, ...listFolderOptions(collectionNodes)];
    if (!moveModal) {
      return all;
    }
    if (moveModal.targetType !== "folder") {
      return all;
    }
    const dragged = findNodeById(collectionNodes, moveModal.targetId);
    return all.filter((option) => {
      if (option.id === moveModal.targetId) {
        return false;
      }
      if (!option.id || !dragged || dragged.type !== "folder") {
        return true;
      }
      return !isDescendant(dragged, option.id);
    });
  };

  const handleContextCommand = (action: "duplicate" | "move" | "sort") => {
    if (!contextMenu) {
      return;
    }
    if (contextMenu.targetType === "root" && action !== "sort") {
      setContextMenu(null);
      return;
    }

    if (action === "duplicate") {
      const targetInfo = findParentInfo(collectionNodes, contextMenu.targetId);
      setCollectionNodes((prev) => {
        const extracted = extractNode(prev, contextMenu.targetId);
        if (!extracted.extracted) {
          return prev;
        }
        const clone = cloneNodeWithIds(extracted.extracted);
        if (!targetInfo) {
          return [...prev, clone];
        }
        return insertNodeAt(prev, targetInfo.parentId, targetInfo.index + 1, clone);
      });
      setContextMenu(null);
      return;
    }

    if (action === "move") {
      setMoveModal({
        targetId: contextMenu.targetId,
        targetType: contextMenu.targetType as "folder" | "request",
        targetName: contextMenu.targetName,
        destinationId: null,
      });
      setContextMenu(null);
      return;
    }

    if (action === "sort") {
      if (contextMenu.targetType === "root") {
        setCollectionNodes((prev) => sortChildrenByName(prev));
      } else {
        const targetId = contextMenu.targetId;
        const sortById = (nodes: CollectionNode[]): CollectionNode[] =>
          nodes.map((node) => {
            if (node.type === "folder") {
              if (node.id === targetId) {
                return { ...node, children: sortChildrenByName(node.children) };
              }
              return { ...node, children: sortById(node.children) };
            }
            return node;
          });
        setCollectionNodes((prev) => sortById(prev));
      }
      setContextMenu(null);
    }
  };

  const startCreate = (type: "folder" | "request") => {
    if (!contextMenu) {
      return;
    }
    const parentId = contextMenu.targetType === "folder" ? contextMenu.targetId : null;
    setCreateModal({
      parentId,
      type,
      name: type === "folder" ? "New Folder" : "New Request",
      requestType: "http",
      method: getDefaultMethodForType("http"),
      url: "https://example.com",
    });
    setContextMenu(null);
  };

  const addNode = (nodes: CollectionNode[], parentId: string | null, node: CollectionNode): CollectionNode[] => {
    if (!parentId) {
      return [...nodes, node];
    }

    return nodes.map((entry) => {
      if (entry.type === "folder") {
        if (entry.id === parentId) {
          return { ...entry, children: [...entry.children, node] };
        }
        return { ...entry, children: addNode(entry.children, parentId, node) };
      }
      return entry;
    });
  };

  const handleCreateSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!createModal) {
      return;
    }
    const name = createModal.name.trim();
    if (!name) {
      return;
    }

    const id = `node-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const newNode: CollectionNode =
      createModal.type === "folder"
        ? { id, type: "folder", name, children: [] }
        : {
            id,
            type: "request",
            name,
            request: buildRequestData(
              createModal.method,
              createModal.url.trim() || "https://example.com",
              createModal.requestType
            ),
          };

    setCollectionNodes((prev) => addNode(prev, createModal.parentId, newNode));
    if (createModal.parentId) {
      setOpenFolders((prev) => ({ ...prev, [createModal.parentId as string]: true, [id]: true }));
    } else if (createModal.type === "folder") {
      setOpenFolders((prev) => ({ ...prev, [id]: true }));
    }
    setCreateModal(null);
  };

  const handleCreateCancel = () => {
    setCreateModal(null);
  };

  const handleDeleteConfirm = () => {
    if (!deleteModal) {
      return;
    }
    const result = removeNode(collectionNodes, deleteModal.targetId);
    if (result.removed) {
      setCollectionNodes(result.nodes);
      if (result.removedFolderIds.length > 0) {
        setOpenFolders((prev) => {
          const next = { ...prev };
          result.removedFolderIds.forEach((id) => {
            delete next[id];
          });
          return next;
        });
      }
    }
    setDeleteModal(null);
  };

  const handleDeleteCancel = () => {
    setDeleteModal(null);
  };

  const handleMoveConfirm = () => {
    if (!moveModal) {
      return;
    }
    const destinationId = moveModal.destinationId;
    if (destinationId === moveModal.targetId) {
      setMoveModal(null);
      return;
    }
    setCollectionNodes((prev) => {
      const extracted = extractNode(prev, moveModal.targetId);
      if (!extracted.extracted) {
        return prev;
      }
      return addNode(extracted.nodes, destinationId, extracted.extracted);
    });
    if (destinationId) {
      setOpenFolders((prev) => ({ ...prev, [destinationId]: true }));
    }
    setMoveModal(null);
  };

  const handleMoveCancel = () => {
    setMoveModal(null);
  };

  const handleRenameSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!renameModal) {
      return;
    }
    const trimmed = renameModal.name.trim();
    if (!trimmed) {
      return;
    }
    setCollectionNodes((prev) => renameNode(prev, renameModal.targetId, trimmed));
    setRenameModal(null);
  };

  const handleRenameCancel = () => {
    setRenameModal(null);
  };

  const handleRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      handleRenameCancel();
    }
  };

  const filterNodes = (nodes: CollectionNode[], query: string): CollectionNode[] => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return nodes;
    }
    const matches = (node: CollectionNode) => {
      if (node.type === "folder") {
        return node.name.toLowerCase().includes(trimmed);
      }
      return (
        node.name.toLowerCase().includes(trimmed) ||
        node.request.url.toLowerCase().includes(trimmed) ||
        node.request.method.toLowerCase().includes(trimmed)
      );
    };
    const walk = (list: CollectionNode[]): CollectionNode[] =>
      list
        .map((node) => {
          if (node.type === "folder") {
            const children = walk(node.children);
            if (children.length > 0 || matches(node)) {
              return { ...node, children };
            }
            return null;
          }
          return matches(node) ? node : null;
        })
        .filter((node): node is CollectionNode => Boolean(node));
    return walk(nodes);
  };

  const renderNodes = (nodes: CollectionNode[], depth = 0, forceOpen = false) =>
    nodes.map((node) => {
      if (node.type === "folder") {
        const isOpen = forceOpen || !!openFolders[node.id];
        const isInvalidDrop = dropInvalidId === node.id;
        return (
          <div key={node.id} className="collection-group">
            <button
              className={`collection-folder ${isOpen ? "open" : ""} ${
                dropTargetId === node.id ? "drop-target" : ""
              } ${isInvalidDrop ? "drop-invalid" : ""}`}
              style={{ paddingLeft: 12 + depth * 14 }}
              onClick={() => toggleFolder(node.id)}
              onContextMenu={(event) => openContextMenu(event, node)}
              draggable
              onDragStart={(event) => handleDragStart(event, node)}
              onDragEnd={handleDragEnd}
              onDragOver={(event) => handleDragOverFolder(event, node.id)}
              onDragLeave={(event) => handleDragLeaveFolder(event, node.id)}
              onDrop={(event) => handleDropOnFolder(event, node.id)}
            >
              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              {isOpen ? <FolderOpen size={14} /> : <Folder size={14} />}
              <span className="collection-label">{node.name}</span>
            </button>
            {isOpen && (
              <div className="collection-children">{renderNodes(node.children, depth + 1, forceOpen)}</div>
            )}
          </div>
        );
      }

      return (
        <SidebarItem
          key={node.id}
          method={node.request.method}
          label={node.name}
          depth={depth}
          active={currentUrl === node.request.url && currentMethod === node.request.method}
          onClick={() => onSelectRequest(node)}
          onContextMenu={(event) => openContextMenu(event, node)}
          onDragStart={(event) => handleDragStart(event, node)}
          onDragEnd={handleDragEnd}
          onDragOver={(event) => handleDragOverRequest(event, node.id)}
          onDragLeave={(event) => handleDragLeaveFolder(event, node.id)}
          onDrop={(event) => handleDropOnRequest(event, node.id)}
          className={`${dropTargetId === node.id ? "drop-target" : ""} ${dropInvalidId === node.id ? "drop-invalid" : ""}`}
        />
      );
    });

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand">
          <Layers className="logo-icon" size={20} />
          <span>{appName}</span>
        </div>
        <div className="sidebar-env">
          <select
            className="env-select"
            value={activeEnvironmentId ?? ""}
            onChange={(event) => {
              const nextValue = event.target.value;
              if (nextValue === "__settings__") {
                setEnvModalOpen(true);
                return;
              }
              onEnvironmentChange(nextValue || null);
            }}
            aria-label="Active environment"
          >
            <option value="">No Environment</option>
            {environments.map((env) => (
              <option key={env.id} value={env.id}>
                {env.name || "Environment"}
              </option>
            ))}
            <option value="__separator__" disabled>
              ──────────
            </option>
            <option value="__settings__">Settings</option>
          </select>
        </div>
      </div>

      <div className="sidebar-content">
        <div className="sidebar-search">
          <input
            className="sidebar-search-input"
            placeholder="Search collections..."
            value={collectionFilter}
            onChange={(event) => setCollectionFilter(event.target.value)}
          />
        </div>

        <div
          className={`menu-label row ${dropTargetId === "root" ? "drop-target-root" : ""}`}
          onDragOver={handleDragOverRoot}
          onDrop={handleDropOnRoot}
        >
          <span>Collection</span>
          <button
            type="button"
            className="menu-action"
            onClick={(event) => {
              event.stopPropagation();
              setContextMenu({
                x: event.currentTarget.getBoundingClientRect().left,
                y: event.currentTarget.getBoundingClientRect().bottom + 6,
                targetId: "root",
                targetName: "Collection",
                targetType: "root",
              });
            }}
          >
            +
          </button>
        </div>
        <div
          className={`collection-tree ${dropTargetId === "root" ? "drop-target-root" : ""}`}
          onContextMenu={openRootContextMenu}
          onDragOver={handleDragOverRoot}
          onDrop={handleDropOnRoot}
        >
          {(() => {
            const filtered = filterNodes(collectionNodes, collectionFilter);
            if (filtered.length === 0) {
              return <div className="empty-state">No collections found.</div>;
            }
            return renderNodes(filtered, 0, Boolean(collectionFilter.trim()));
          })()}
        </div>

        <div className="menu-label row">
          <span>History</span>
          <button
            type="button"
            className="menu-action"
            onClick={() => setHistoryOpen((prev) => !prev)}
            aria-label={historyOpen ? "Collapse history" : "Expand history"}
          >
            {historyOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
        {historyOpen && (
          <>
            {history.length === 0 && (
              <div style={{ padding: "0 12px", fontSize: "0.8rem", color: "var(--text-dim)" }}>
                No history yet.
              </div>
            )}
            {pinnedHistory.map((h) => (
              <div key={h.id} className="history-item">
                <button
                  className="history-main"
                  onClick={() => onSelectHistory(h.method, h.url)}
                >
                  <MethodBadge method={h.method} />
                  <span className="history-label">{h.url}</span>
                </button>
                <div className="history-actions">
                  <button
                    type="button"
                    className="history-action"
                    title="Run request"
                    onClick={(event) => {
                      event.stopPropagation();
                      onHistoryRerun(h);
                    }}
                  >
                    <Play size={12} />
                  </button>
                  <button
                    type="button"
                    className={`history-action ${h.pinned ? "active" : ""}`}
                    title={h.pinned ? "Unpin" : "Pin"}
                    onClick={(event) => {
                      event.stopPropagation();
                      onHistoryPinToggle(h.id);
                    }}
                  >
                    <Pin size={12} />
                  </button>
                </div>
              </div>
            ))}
            {recentHistory.map((h) => (
              <div key={h.id} className="history-item">
                <button
                  className="history-main"
                  onClick={() => onSelectHistory(h.method, h.url)}
                >
                  <MethodBadge method={h.method} />
                  <span className="history-label">{h.url}</span>
                </button>
                <div className="history-actions">
                  <button
                    type="button"
                    className="history-action"
                    title="Run request"
                    onClick={(event) => {
                      event.stopPropagation();
                      onHistoryRerun(h);
                    }}
                  >
                    <Play size={12} />
                  </button>
                  <button
                    type="button"
                    className={`history-action ${h.pinned ? "active" : ""}`}
                    title={h.pinned ? "Unpin" : "Pin"}
                    onClick={(event) => {
                      event.stopPropagation();
                      onHistoryPinToggle(h.id);
                    }}
                  >
                    <Pin size={12} />
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="sidebar-header" style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 'auto' }}>
        <button className="nav-item" onClick={() => setSettingsModalOpen(true)}>
          <Settings size={16} />
          <span>Settings</span>
        </button>
        <div style={{ padding: '0 12px', fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 4 }}>
          v{appVersion}
        </div>
      </div>
      {contextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="context-menu-title">
            {contextMenu.targetType === "root"
              ? "Collection"
              : contextMenu.targetType === "folder"
                ? "Folder"
                : "Request"}
          </div>
          {contextMenu.targetType === "folder" && (
            <>
              <button className="context-menu-item" onClick={() => startCreate("request")}>
                Add Request
              </button>
              <button className="context-menu-item" onClick={() => startCreate("folder")}>
                Add Folder
              </button>
              <button className="context-menu-item disabled" disabled>
                Run
              </button>
              <button className="context-menu-item disabled" disabled>
                Share
              </button>
              <button className="context-menu-item" onClick={() => handleContextCommand("move")}>
                Move
              </button>
              <button className="context-menu-item" onClick={() => handleContextAction("rename")}>
                Rename
              </button>
              <button className="context-menu-item" onClick={() => handleContextCommand("duplicate")}>
                Duplicate
              </button>
              <button className="context-menu-item" onClick={() => handleContextCommand("sort")}>
                Sort
              </button>
              <button className="context-menu-item danger" onClick={() => handleContextAction("delete")}>
                Delete
              </button>
            </>
          )}
          {contextMenu.targetType === "root" && (
            <>
              <button className="context-menu-item" onClick={() => startCreate("request")}>
                Add Request
              </button>
              <button className="context-menu-item" onClick={() => startCreate("folder")}>
                Add Folder
              </button>
              <button className="context-menu-item" onClick={() => handleContextCommand("sort")}>
                Sort
              </button>
            </>
          )}
          {contextMenu.targetType === "request" && (
            <>
              <button className="context-menu-item" onClick={() => handleContextAction("rename")}>
                Rename
              </button>
              <button className="context-menu-item" onClick={() => handleContextCommand("duplicate")}>
                Duplicate
              </button>
              <button className="context-menu-item danger" onClick={() => handleContextAction("delete")}>
                Delete
              </button>
            </>
          )}
          {contextMenu.targetType === "root" && (
            <>
              <button className="context-menu-item" onClick={() => handleContextCommand("sort")}>
                Sort
              </button>
            </>
          )}
        </div>
      )}
      {renameModal && (
        <div className="modal-overlay" onClick={handleRenameCancel}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">Rename {renameModal.targetType === "folder" ? "Folder" : "Request"}</div>
            <form className="modal-body" onSubmit={handleRenameSubmit}>
              <label className="modal-label" htmlFor="rename-input">
                Name
              </label>
              <input
                id="rename-input"
                ref={renameInputRef}
                className="modal-input"
                value={renameModal.name}
                onChange={(event) =>
                  setRenameModal((prev) => (prev ? { ...prev, name: event.target.value } : prev))
                }
                onKeyDown={handleRenameKeyDown}
              />
              <div className="modal-actions">
                <button type="button" className="modal-button ghost" onClick={handleRenameCancel}>
                  Cancel
                </button>
                <button type="submit" className="modal-button primary">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {createModal && (
        <div className="modal-overlay" onClick={handleCreateCancel}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">New {createModal.type === "folder" ? "Folder" : "Request"}</div>
            <form className="modal-body" onSubmit={handleCreateSubmit}>
              <label className="modal-label" htmlFor="create-name-input">
                Name
              </label>
              <input
                id="create-name-input"
                className="modal-input"
                value={createModal.name}
                onChange={(event) =>
                  setCreateModal((prev) => (prev ? { ...prev, name: event.target.value } : prev))
                }
              />
              {createModal.type === "request" && (
                <>
                  <label className="modal-label" htmlFor="create-type-input">
                    Type
                  </label>
                  <select
                    id="create-type-input"
                    className="modal-input"
                    value={createModal.requestType}
                    onChange={(event) =>
                      setCreateModal((prev) => {
                        if (!prev) {
                          return prev;
                        }
                        const nextType = event.target.value as RequestType;
                        const nextMethod = nextType === "http" ? "GET" : getDefaultMethodForType(nextType);
                        return { ...prev, requestType: nextType, method: nextMethod };
                      })
                    }
                  >
                    {REQUEST_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {createModal.requestType === "http" ? (
                    <>
                  <label className="modal-label" htmlFor="create-method-input">
                    Method
                  </label>
                  <select
                    id="create-method-input"
                    className="modal-input"
                    value={createModal.method}
                    onChange={(event) =>
                      setCreateModal((prev) => (prev ? { ...prev, method: event.target.value } : prev))
                    }
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                    <option value="DELETE">DELETE</option>
                    <option value="HEAD">HEAD</option>
                    <option value="OPTIONS">OPTIONS</option>
                  </select>
                  <label className="modal-label" htmlFor="create-url-input">
                    URL
                  </label>
                  <input
                    id="create-url-input"
                    className="modal-input"
                    value={createModal.url}
                    onChange={(event) =>
                      setCreateModal((prev) => (prev ? { ...prev, url: event.target.value } : prev))
                    }
                  />
                    </>
                  ) : (
                    <>
                      <label className="modal-label" htmlFor="create-url-input">
                        URL
                      </label>
                      <input
                        id="create-url-input"
                        className="modal-input"
                        value={createModal.url}
                        onChange={(event) =>
                          setCreateModal((prev) => (prev ? { ...prev, url: event.target.value } : prev))
                        }
                      />
                      <div className="modal-text">
                        {getRequestTypeLabel(createModal.requestType)} request builder coming soon.
                      </div>
                    </>
                  )}
                </>
              )}
              <div className="modal-actions">
                <button type="button" className="modal-button ghost" onClick={handleCreateCancel}>
                  Cancel
                </button>
                <button type="submit" className="modal-button primary">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {deleteModal && (
        <div className="modal-overlay" onClick={handleDeleteCancel}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">Delete {deleteModal.targetType === "folder" ? "Folder" : "Request"}</div>
            <div className="modal-body">
              <div className="modal-text">
                Delete "{deleteModal.targetName}"? This action cannot be undone.
              </div>
              <div className="modal-actions">
                <button type="button" className="modal-button ghost" onClick={handleDeleteCancel}>
                  Cancel
                </button>
                <button type="button" className="modal-button danger" onClick={handleDeleteConfirm}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {moveModal && (
        <div className="modal-overlay" onClick={handleMoveCancel}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">Move {moveModal.targetType === "folder" ? "Folder" : "Request"}</div>
            <div className="modal-body">
              <label className="modal-label" htmlFor="move-destination-input">
                Destination
              </label>
              <select
                id="move-destination-input"
                className="modal-input"
                value={moveModal.destinationId ?? ""}
                onChange={(event) =>
                  setMoveModal((prev) =>
                    prev ? { ...prev, destinationId: event.target.value || null } : prev
                  )
                }
              >
                {getMoveOptions().map((option) => (
                  <option key={option.id ?? "root"} value={option.id ?? ""}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="modal-actions">
                <button type="button" className="modal-button ghost" onClick={handleMoveCancel}>
                  Cancel
                </button>
                <button type="button" className="modal-button primary" onClick={handleMoveConfirm}>
                  Move
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {settingsModalOpen && (
        <div className="modal-overlay" onClick={() => setSettingsModalOpen(false)}>
          <div className="modal settings-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">Settings</div>
            <div className="settings-tabs">
              <button
                type="button"
                className={`settings-tab ${settingsTab === "general" ? "active" : ""}`}
                onClick={() => setSettingsTab("general")}
              >
                General
              </button>
              <button
                type="button"
                className={`settings-tab ${settingsTab === "about" ? "active" : ""}`}
                onClick={() => setSettingsTab("about")}
              >
                About
              </button>
            </div>
            <div className="settings-content">
              {settingsTab === "general" && (
                <div className="settings-panel">
                  <div className="settings-title">General</div>
                  <div className="settings-text">Configure app defaults and behavior.</div>
                </div>
              )}
              {settingsTab === "about" && (
                <div className="settings-panel">
                  <div className="settings-title">About</div>
                  <div className="settings-text">
                    Postman Clone v{appVersion || "0.0.0"} — built with Tauri + React.
                  </div>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button type="button" className="modal-button ghost" onClick={() => setSettingsModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {envModalOpen && (
        <div className="modal-overlay" onClick={() => setEnvModalOpen(false)}>
          <div className="modal env-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">Environments</div>
            <div className="env-modal-body">
              <div className="env-modal-sidebar">
                <div className="env-sidebar-header">
                  <span>Environments</span>
                  <button type="button" className="env-button" onClick={onEnvironmentAdd}>
                    + New
                  </button>
                </div>
                <div className="env-list">
                  <button
                    type="button"
                    className={`env-list-item ${activeEnvironmentId ? "" : "active"}`}
                    onClick={() => onEnvironmentChange(null)}
                  >
                    No Environment
                  </button>
                  {environments.map((env) => (
                    <button
                      key={env.id}
                      type="button"
                      className={`env-list-item ${activeEnvironmentId === env.id ? "active" : ""}`}
                      onClick={() => onEnvironmentChange(env.id)}
                    >
                      <span className="env-list-name">{env.name || "Environment"}</span>
                      <span className="env-list-meta">
                        {env.variables.filter((item) => item.enabled && item.key.trim()).length} vars
                      </span>
                    </button>
                  ))}
                </div>
                <div className="env-sidebar-hint">
                  Use <code>{"{{variable}}"}</code> in URLs, headers, or bodies.
                </div>
              </div>
              <div className="env-modal-main">
                {activeEnvironment ? (
                  <>
                    <div className="env-main-header">
                      <div className="env-name-field">
                        <label className="modal-label" htmlFor="env-name-input">
                          Name
                        </label>
                        <input
                          id="env-name-input"
                          className="modal-input"
                          value={activeEnvironment.name}
                          onChange={(event) => onEnvironmentRename(activeEnvironment.id, event.target.value)}
                        />
                      </div>
                      <div className="env-main-actions">
                        <button
                          type="button"
                          className="env-button danger"
                          onClick={() => onEnvironmentDelete(activeEnvironment.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="env-vars-header">
                      <div>
                        <div className="env-vars-title">Variables</div>
                        <div className="env-vars-subtitle">Set key/value pairs for this environment.</div>
                      </div>
                    </div>
                    <KeyValueEditor
                      items={activeEnvironment.variables}
                      onChange={(idx, field, val) =>
                        onEnvironmentVarChange(activeEnvironment.id, idx, field, val)
                      }
                      onRemove={(idx) => onEnvironmentVarRemove(activeEnvironment.id, idx)}
                    />
                  </>
                ) : (
                  <div className="empty-state env-empty-state">
                    Select an environment to edit variables.
                  </div>
                )}
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="modal-button ghost" onClick={() => setEnvModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
