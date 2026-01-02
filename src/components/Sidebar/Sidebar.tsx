import { ChevronDown, ChevronRight, Folder, FolderOpen, Layers, Settings } from "lucide-react";
import {
  type FormEvent,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CollectionNode, HistoryItem } from "../../types";

interface SidebarProps {
  appName: string;
  appVersion: string | null;
  history: HistoryItem[];
  currentUrl: string;
  currentMethod: string;
  onSelectRequest: (method: string, url: string) => void;
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
  onClick,
}: {
  active?: boolean;
  method: string;
  label: string;
  depth?: number;
  onContextMenu?: (event: MouseEvent) => void;
  onDragStart?: (event: DragEvent) => void;
  onDragEnd?: () => void;
  onClick: () => void;
}) => (
  <button
    className={`nav-item ${active ? "active" : ""}`}
    style={{ paddingLeft: 12 + depth * 14 }}
    onContextMenu={onContextMenu}
    onDragStart={onDragStart}
    onDragEnd={onDragEnd}
    draggable={!!onDragStart}
    onClick={onClick}
  >
    <MethodBadge method={method} />
    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
      {label}
    </span>
  </button>
);

const initialCollectionTree: CollectionNode[] = [
  {
    id: "folder-starter",
    type: "folder",
    name: "Starter",
    children: [
      {
        id: "req-catfact",
        type: "request",
        name: "Get Cat Fact",
        method: "GET",
        url: "https://catfact.ninja/fact",
      },
      {
        id: "req-create-user",
        type: "request",
        name: "Create User",
        method: "POST",
        url: "https://reqres.in/api/users",
      },
    ],
  },
  {
    id: "folder-users",
    type: "folder",
    name: "Users",
    children: [
      {
        id: "req-users-list",
        type: "request",
        name: "List Users",
        method: "GET",
        url: "https://reqres.in/api/users?page=1",
      },
      {
        id: "folder-users-profile",
        type: "folder",
        name: "Profiles",
        children: [
          {
            id: "req-user-update",
            type: "request",
            name: "Update User",
            method: "PUT",
            url: "https://reqres.in/api/users/2",
          },
          {
            id: "req-user-patch",
            type: "request",
            name: "Patch User",
            method: "PATCH",
            url: "https://reqres.in/api/users/2",
          },
          {
            id: "req-user-delete",
            type: "request",
            name: "Delete User",
            method: "DELETE",
            url: "https://reqres.in/api/users/2",
          },
        ],
      },
    ],
  },
];

export const Sidebar = ({ appName, appVersion, history, currentUrl, currentMethod, onSelectRequest }: SidebarProps) => {
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
    walk(initialCollectionTree);
    return openMap;
  }, []);
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>(defaultOpen);
  const [collectionNodes, setCollectionNodes] = useState<CollectionNode[]>(initialCollectionTree);

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
    method: string;
    url: string;
  } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    targetId: string;
    targetType: "folder" | "request";
    targetName: string;
  } | null>(null);
  const [collectionFilter, setCollectionFilter] = useState("");
  const [dragState, setDragState] = useState<{
    dragId: string;
    dragType: "folder" | "request";
  } | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropInvalidId, setDropInvalidId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"general" | "about">("general");
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
    setDragState({ dragId: node.id, dragType: node.type });
    setDropInvalidId(null);
  };

  const handleDragEnd = () => {
    setDragState(null);
    setDropTargetId(null);
    setDropInvalidId(null);
  };

  const handleDragOverFolder = (event: DragEvent, folderId: string) => {
    if (!dragState) {
      return;
    }
    if (dragState.dragId === folderId) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "none";
      setDropTargetId(null);
      setDropInvalidId(folderId);
      return;
    }
    if (dragState.dragType === "folder") {
      const dragged = findNodeById(collectionNodes, dragState.dragId);
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

  const handleDragOverRoot = (event: DragEvent) => {
    if (!dragState) {
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
    if (!dragState) {
      return;
    }
    if (dragState.dragId === folderId) {
      return;
    }
    if (dragState.dragType === "folder") {
      const dragged = findNodeById(collectionNodes, dragState.dragId);
      if (dragged && isDescendant(dragged, folderId)) {
        return;
      }
    }
    moveNode(dragState.dragId, folderId);
    setDropTargetId(null);
    setDragState(null);
    setDropInvalidId(null);
  };

  const handleDropOnRoot = (event: DragEvent) => {
    event.preventDefault();
    if (!dragState) {
      return;
    }
    moveNode(dragState.dragId, null);
    setDropTargetId(null);
    setDragState(null);
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

  const startCreate = (type: "folder" | "request") => {
    if (!contextMenu) {
      return;
    }
    const parentId = contextMenu.targetType === "folder" ? contextMenu.targetId : null;
    setCreateModal({
      parentId,
      type,
      name: type === "folder" ? "New Folder" : "New Request",
      method: "GET",
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
            method: createModal.method,
            url: createModal.url.trim() || "https://example.com",
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
        node.url.toLowerCase().includes(trimmed) ||
        node.method.toLowerCase().includes(trimmed)
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
          method={node.method}
          label={node.name}
          depth={depth}
          active={currentUrl === node.url && currentMethod === node.method}
          onClick={() => onSelectRequest(node.method, node.url)}
          onContextMenu={(event) => openContextMenu(event, node)}
          onDragStart={(event) => handleDragStart(event, node)}
          onDragEnd={handleDragEnd}
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
            {history.map((h) => (
              <SidebarItem
                key={h.id}
                method={h.method}
                label={h.url}
                onClick={() => onSelectRequest(h.method, h.url)}
              />
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
          {contextMenu.targetType !== "request" && (
            <>
              <button className="context-menu-item" onClick={() => startCreate("request")}>
                New Request
              </button>
              <button className="context-menu-item" onClick={() => startCreate("folder")}>
                New Folder
              </button>
            </>
          )}
          {contextMenu.targetType !== "root" && (
            <>
              <button className="context-menu-item" onClick={() => handleContextAction("rename")}>
                Rename
              </button>
              <button className="context-menu-item danger" onClick={() => handleContextAction("delete")}>
                Delete
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
    </aside>
  );
};
