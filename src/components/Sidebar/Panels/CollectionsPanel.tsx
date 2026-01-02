import { ChevronDown, ChevronRight, Folder, FolderOpen } from "lucide-react";
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
import {
  CollectionNode,
  CollectionRequest,
  RequestData,
  RequestType,
  Workspace,
} from "../../../types";
import { REQUEST_TYPE_OPTIONS, getDefaultMethodForType, getRequestTypeLabel } from "../../../lib/request";
import { useI18n } from "../../../i18n";

interface CollectionsPanelProps {
  collectionNodes: CollectionNode[];
  setCollectionNodes: Dispatch<SetStateAction<CollectionNode[]>>;
  currentUrl: string;
  currentMethod: string;
  onSelectRequest: (request: CollectionRequest) => void;
  buildRequestData: (method: string, url: string, requestType?: RequestType) => RequestData;
  activeWorkspace: Workspace | null;
}

const MethodBadge = ({ method }: { method: string }) => {
  return <span className={`method-badge method-${method}`}>{method}</span>;
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

export const CollectionsPanel = ({
  collectionNodes,
  setCollectionNodes,
  currentUrl,
  currentMethod,
  onSelectRequest,
  buildRequestData,
  activeWorkspace,
}: CollectionsPanelProps) => {
  const { t } = useI18n();
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
  
  // Sync open folders when nodes change (e.g. workspace switch)
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
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const renameFocusRef = useRef(false);

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
      targetName: t("app.collection"),
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
    const all = [{ id: null, label: t("app.moveRoot") }, ...listFolderOptions(collectionNodes)];
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
      name: type === "folder" ? t("app.newTitle", { type: t("app.contextFolder") }) : t("app.newRequest"),
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
    <>
      <div className="sidebar-search">
        <input
          className="sidebar-search-input"
          placeholder={t("app.searchCollections")}
          value={collectionFilter}
          onChange={(event) => setCollectionFilter(event.target.value)}
        />
      </div>

      <div
        className={`menu-label row ${dropTargetId === "root" ? "drop-target-root" : ""}`}
        onDragOver={handleDragOverRoot}
        onDrop={handleDropOnRoot}
      >
        <div className="menu-label-group">
          <span>{t("app.collection")}</span>
          {activeWorkspace && (
            <span className="workspace-badge">
              {t("app.workspaceBadge", { name: activeWorkspace.name || t("app.workspace") })}
            </span>
          )}
        </div>
        <button
          type="button"
          className="menu-action"
          onClick={(event) => {
            event.stopPropagation();
            setContextMenu({
              x: event.currentTarget.getBoundingClientRect().left,
              y: event.currentTarget.getBoundingClientRect().bottom + 6,
              targetId: "root",
              targetName: t("app.collection"),
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
            return <div className="empty-state">{t("app.collectionEmpty")}</div>;
          }
          return renderNodes(filtered, 0, Boolean(collectionFilter.trim()));
        })()}
      </div>

      {contextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="context-menu-title">
            {contextMenu.targetType === "root"
              ? t("app.contextCollection")
              : contextMenu.targetType === "folder"
                ? t("app.contextFolder")
                : t("app.contextRequest")}
          </div>
          {contextMenu.targetType === "folder" && (
            <>
              <button className="context-menu-item" onClick={() => startCreate("request")}>
                {t("app.addRequest")}
              </button>
              <button className="context-menu-item" onClick={() => startCreate("folder")}>
                {t("app.addFolder")}
              </button>
              <button className="context-menu-item disabled" disabled>
                {t("app.run")}
              </button>
              <button className="context-menu-item disabled" disabled>
                {t("app.share")}
              </button>
              <button className="context-menu-item" onClick={() => handleContextCommand("move")}>
                {t("app.move")}
              </button>
              <button className="context-menu-item" onClick={() => handleContextAction("rename")}>
                {t("app.rename")}
              </button>
              <button className="context-menu-item" onClick={() => handleContextCommand("duplicate")}>
                {t("app.duplicate")}
              </button>
              <button className="context-menu-item" onClick={() => handleContextCommand("sort")}>
                {t("app.sort")}
              </button>
              <button className="context-menu-item danger" onClick={() => handleContextAction("delete")}>
                {t("app.delete")}
              </button>
            </>
          )}
          {contextMenu.targetType === "root" && (
            <>
              <button className="context-menu-item" onClick={() => startCreate("request")}>
                {t("app.addRequest")}
              </button>
              <button className="context-menu-item" onClick={() => startCreate("folder")}>
                {t("app.addFolder")}
              </button>
              <button className="context-menu-item" onClick={() => handleContextCommand("sort")}>
                {t("app.sort")}
              </button>
            </>
          )}
          {contextMenu.targetType === "request" && (
            <>
              <button className="context-menu-item" onClick={() => handleContextAction("rename")}>
                {t("app.rename")}
              </button>
              <button className="context-menu-item" onClick={() => handleContextCommand("duplicate")}>
                {t("app.duplicate")}
              </button>
              <button className="context-menu-item danger" onClick={() => handleContextAction("delete")}>
                {t("app.delete")}
              </button>
            </>
          )}
        </div>
      )}
      {renameModal && (
        <div className="modal-overlay" onClick={handleRenameCancel}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              {t("app.renameTitle", {
                type:
                  renameModal.targetType === "folder"
                    ? t("app.contextFolder")
                    : t("app.contextRequest"),
              })}
            </div>
            <form className="modal-body" onSubmit={handleRenameSubmit}>
              <label className="modal-label" htmlFor="rename-input">
                {t("app.nameLabel")}
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
                  {t("app.cancel")}
                </button>
                <button type="submit" className="modal-button primary">
                  {t("app.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {createModal && (
        <div className="modal-overlay" onClick={handleCreateCancel}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              {t("app.newTitle", {
                type: createModal.type === "folder" ? t("app.contextFolder") : t("app.contextRequest"),
              })}
            </div>
            <form className="modal-body" onSubmit={handleCreateSubmit}>
              <label className="modal-label" htmlFor="create-name-input">
                {t("app.nameLabel")}
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
                    {t("app.typeLabel")}
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
                    {t("app.methodLabel")}
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
                    {t("app.urlLabel")}
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
                        {t("app.urlLabel")}
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
                        {t("app.requestBuilderSoon", { type: getRequestTypeLabel(createModal.requestType) })}
                      </div>
                    </>
                  )}
                </>
              )}
              <div className="modal-actions">
                <button type="button" className="modal-button ghost" onClick={handleCreateCancel}>
                  {t("app.cancel")}
                </button>
                <button type="submit" className="modal-button primary">
                  {t("app.create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {deleteModal && (
        <div className="modal-overlay" onClick={handleDeleteCancel}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              {t("app.deleteTitle", {
                type: deleteModal.targetType === "folder" ? t("app.contextFolder") : t("app.contextRequest"),
              })}
            </div>
            <div className="modal-body">
              <div className="modal-text">
                {t("app.deleteConfirm", { name: deleteModal.targetName })}
              </div>
              <div className="modal-actions">
                <button type="button" className="modal-button ghost" onClick={handleDeleteCancel}>
                  {t("app.cancel")}
                </button>
                <button type="button" className="modal-button danger" onClick={handleDeleteConfirm}>
                  {t("app.delete")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {moveModal && (
        <div className="modal-overlay" onClick={handleMoveCancel}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              {t("app.moveTitle", {
                type: moveModal.targetType === "folder" ? t("app.contextFolder") : t("app.contextRequest"),
              })}
            </div>
            <div className="modal-body">
              <label className="modal-label" htmlFor="move-destination-input">
                {t("app.destinationLabel")}
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
                  {t("app.cancel")}
                </button>
                <button type="button" className="modal-button primary" onClick={handleMoveConfirm}>
                  {t("app.move")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
