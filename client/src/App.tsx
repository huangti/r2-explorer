import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  ExplorerItem,
  ListResponse,
  ClipboardItem,
  StatsResponse,
  ViewMode,
  SortField,
  SortOrder,
} from './types';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { FileList } from './components/FileList';
import { ContextMenu } from './components/ContextMenu';
import { PreviewModal } from './components/PreviewModal';
import { NewFolderModal } from './components/NewFolderModal';
import { RenameModal } from './components/RenameModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { PropertiesDrawer } from './components/PropertiesDrawer';
import { QuotaModal } from './components/QuotaModal';
import { UploadToast } from './components/UploadToast';
import type { UploadItem } from './components/UploadToast';
import { LockModal } from './components/LockModal';
import { getFileCategory, matchesCategoryFilter } from './utils/format';

export const App: React.FC = () => {
  // Server Status & Info
  const [bucket, setBucket] = useState('bucketwestnorthamerica');
  const [publicDomain, setPublicDomain] = useState('https://bucketwna.505250.xyz');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);

  // Navigation History
  const [currentPrefix, setCurrentPrefix] = useState<string>('');
  const [history, setHistory] = useState<string[]>(['']);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Directory Contents
  const [folders, setFolders] = useState<ExplorerItem[]>([]);
  const [files, setFiles] = useState<ExplorerItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fromCache, setFromCache] = useState(false);

  // View & Filter States
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('r2_view_mode') as ViewMode) || 'grid';
  });
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // Selection & Clipboard
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [clipboard, setClipboard] = useState<ClipboardItem | null>(null);

  // Context Menu
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    targetItem: ExplorerItem | null;
  } | null>(null);

  // Modals & Panels
  const [previewItem, setPreviewItem] = useState<ExplorerItem | null>(null);
  const [propertiesItem, setPropertiesItem] = useState<ExplorerItem | null>(null);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [renameTargetItem, setRenameTargetItem] = useState<ExplorerItem | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isQuotaOpen, setIsQuotaOpen] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [savedPassword, setSavedPassword] = useState<string>(() => localStorage.getItem('r2_app_password') || '');
  const [isLocked, setIsLocked] = useState(false);

  // Centralized apiFetch with Authorization header
  const apiFetch = useCallback((url: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    const token = savedPassword || localStorage.getItem('r2_app_password');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return fetch(url, { ...init, headers });
  }, [savedPassword]);

  // 1. Fetch initial status and stats
  const fetchStatusAndStats = useCallback(async () => {
    try {
      const [statusRes, statsRes] = await Promise.all([
        apiFetch('/api/status').then((r) => r.json()),
        apiFetch('/api/stats').then((r) => r.json()),
      ]);
      if (statusRes.requirePassword && statusRes.status === 'locked') {
        setIsLocked(true);
      }
      if (statusRes.bucket) setBucket(statusRes.bucket);
      if (statusRes.publicDomain) setPublicDomain(statusRes.publicDomain);
      if (statusRes.userEmail) setUserEmail(statusRes.userEmail);
      if (statsRes.stats) setStats(statsRes);
    } catch (e) {
      console.error('Failed to load status:', e);
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchStatusAndStats();
  }, [fetchStatusAndStats]);

  // 2. Fetch Directory Items
  const loadDirectory = useCallback(
    async (prefix: string, forceRefresh = false) => {
      setIsLoading(true);
      try {
        const query = new URLSearchParams({
          prefix,
          refresh: forceRefresh ? 'true' : 'false',
        });
        const res = await apiFetch(`/api/files?${query.toString()}`);
        if (res.status === 401) {
          setIsLocked(true);
          return;
        }
        if (!res.ok) throw new Error('Failed to fetch directory');
        const data: ListResponse = await res.json();

        setFolders(data.folders || []);
        setFiles(data.files || []);
        setFromCache(!!data.fromCache);
        setSelectedKeys(new Set()); // Clear selection on folder switch
      } catch (err) {
        console.error('Error fetching files:', err);
      } finally {
        setIsLoading(false);
        // Refresh stats
        apiFetch('/api/stats')
          .then((r) => r.json())
          .then((d) => d.stats && setStats(d))
          .catch(() => {});
      }
    },
    [apiFetch]
  );

  const handleUnlock = async (pwd: string) => {
    try {
      const res = await fetch('/api/status', {
        headers: { Authorization: `Bearer ${pwd}` },
      });
      const data = await res.json();
      if (data.status === 'ok') {
        localStorage.setItem('r2_app_password', pwd);
        setSavedPassword(pwd);
        setIsLocked(false);
        loadDirectory(currentPrefix, true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    loadDirectory(currentPrefix);
  }, [currentPrefix, loadDirectory]);

  // 3. Navigation Controls
  const navigateTo = (prefix: string) => {
    if (prefix === currentPrefix) return;
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(prefix);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    setCurrentPrefix(prefix);
    setCategoryFilter(null);
    setSearchQuery('');
  };

  const handleGoBack = () => {
    if (historyIndex > 0) {
      const nextIdx = historyIndex - 1;
      setHistoryIndex(nextIdx);
      setCurrentPrefix(history[nextIdx]);
    }
  };

  const handleGoForward = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setCurrentPrefix(history[nextIdx]);
    }
  };

  const handleGoUp = () => {
    if (!currentPrefix) return;
    const trimmed = currentPrefix.replace(/\/+$/, '');
    const lastSlash = trimmed.lastIndexOf('/');
    const parentPrefix = lastSlash >= 0 ? trimmed.substring(0, lastSlash + 1) : '';
    navigateTo(parentPrefix);
  };

  const handleRefresh = () => {
    loadDirectory(currentPrefix, true);
  };

  // 4. Filter and Sort Items
  const allItems = useMemo(() => {
    return [...folders, ...files];
  }, [folders, files]);

  const filteredItems = useMemo(() => {
    let result = allItems;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((item) => item.name.toLowerCase().includes(q));
    }

    // Category filter
    if (categoryFilter) {
      result = result.filter((item) => {
        if (item.type === 'folder') return false;
        const cat = getFileCategory(item.name, item.mimeType);
        return matchesCategoryFilter(cat, categoryFilter);
      });
    }

    // Sort: Folders always on top, then sort by field
    return result.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }

      let cmp = 0;
      if (sortField === 'name') {
        cmp = a.name.localeCompare(b.name, 'zh-CN');
      } else if (sortField === 'size') {
        cmp = (a.size || 0) - (b.size || 0);
      } else if (sortField === 'lastModified') {
        cmp =
          new Date(a.lastModified || 0).getTime() -
          new Date(b.lastModified || 0).getTime();
      } else if (sortField === 'type') {
        cmp = (a.mimeType || '').localeCompare(b.mimeType || '');
      }

      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [allItems, searchQuery, categoryFilter, sortField, sortOrder]);

  const selectedItems = useMemo(() => {
    return allItems.filter((i) =>
      selectedKeys.has(i.type === 'folder' ? i.prefix! : i.key!)
    );
  }, [allItems, selectedKeys]);

  // 5. Selection Handlers
  const handleSelectItem = (item: ExplorerItem, e: React.MouseEvent) => {
    const id = item.type === 'folder' ? item.prefix! : item.key!;
    const newSelected = new Set(selectedKeys);

    if (e.ctrlKey || e.metaKey) {
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
    } else if (e.shiftKey && selectedKeys.size > 0) {
      // Range selection
      const currentIndex = filteredItems.findIndex(
        (it) => (it.type === 'folder' ? it.prefix! : it.key!) === id
      );
      const lastSelectedId = Array.from(selectedKeys).pop()!;
      const lastIndex = filteredItems.findIndex(
        (it) => (it.type === 'folder' ? it.prefix! : it.key!) === lastSelectedId
      );

      const start = Math.min(currentIndex, lastIndex);
      const end = Math.max(currentIndex, lastIndex);

      for (let i = start; i <= end; i++) {
        const itemId =
          filteredItems[i].type === 'folder'
            ? filteredItems[i].prefix!
            : filteredItems[i].key!;
        newSelected.add(itemId);
      }
    } else {
      newSelected.clear();
      newSelected.add(id);
    }

    setSelectedKeys(newSelected);
  };

  const handleClearSelection = () => {
    setSelectedKeys(new Set());
  };

  const handleOpenItem = (item: ExplorerItem) => {
    if (item.type === 'folder') {
      navigateTo(item.prefix!);
    } else {
      setPreviewItem(item);
    }
  };

  // 6. Context Menu Handler
  const handleContextMenu = (
    e: React.MouseEvent,
    item: ExplorerItem | null
  ) => {
    e.preventDefault();
    if (item) {
      const id = item.type === 'folder' ? item.prefix! : item.key!;
      if (!selectedKeys.has(id)) {
        setSelectedKeys(new Set([id]));
      }
    }
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      targetItem: item,
    });
  };

  // 7. File Operations: Create Folder, Upload, Rename, Move, Copy, Delete
  const handleCreateFolder = async (name: string) => {
    try {
      const res = await apiFetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix: currentPrefix, name }),
      });
      if (!res.ok) throw new Error('Create folder failed');
      await loadDirectory(currentPrefix, true);
    } catch (e) {
      alert(`创建文件夹失败: ${(e as Error).message}`);
    }
  };

  const handleUploadFiles = async (
    fileList: FileList,
    targetPrefix = currentPrefix
  ) => {
    const newUploads: UploadItem[] = Array.from(fileList).map((f) => ({
      id: Math.random().toString(36).substring(2),
      name: f.name,
      size: f.size,
      status: 'uploading',
    }));

    setUploads((prev) => [...prev, ...newUploads]);

    const formData = new FormData();
    formData.append('prefix', targetPrefix);
    Array.from(fileList).forEach((file) => formData.append('files', file));

    try {
      const res = await apiFetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload request failed');

      setUploads((prev) =>
        prev.map((u) =>
          newUploads.some((nu) => nu.id === u.id)
            ? { ...u, status: 'success' }
            : u
        )
      );

      await loadDirectory(currentPrefix, true);
    } catch (err) {
      setUploads((prev) =>
        prev.map((u) =>
          newUploads.some((nu) => nu.id === u.id)
            ? { ...u, status: 'error', errorMessage: (err as Error).message }
            : u
        )
      );
    }
  };

  const handleRename = async (newName: string) => {
    if (!renameTargetItem) return;
    try {
      const oldKey =
        renameTargetItem.type === 'folder'
          ? renameTargetItem.prefix!
          : renameTargetItem.key!;
      const isFolder = renameTargetItem.type === 'folder';

      const res = await apiFetch('/api/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldKey, newName, isFolder }),
      });

      if (!res.ok) throw new Error('Rename failed');
      await loadDirectory(currentPrefix, true);
    } catch (e) {
      alert(`重命名失败: ${(e as Error).message}`);
    }
  };

  const handleMoveItem = async (
    srcKey: string,
    destPrefix: string,
    isFolder: boolean
  ) => {
    try {
      const res = await apiFetch('/api/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ srcKey, destPrefix, isFolder }),
      });
      if (!res.ok) throw new Error('Move failed');
      await loadDirectory(currentPrefix, true);
    } catch (e) {
      alert(`移动失败: ${(e as Error).message}`);
    }
  };

  const handleCopy = () => {
    if (selectedItems.length > 0) {
      setClipboard({
        item: selectedItems[0],
        mode: 'copy',
      });
    }
  };

  const handleCut = () => {
    if (selectedItems.length > 0) {
      setClipboard({
        item: selectedItems[0],
        mode: 'cut',
      });
    }
  };

  const handlePaste = async () => {
    if (!clipboard) return;
    const { item, mode } = clipboard;
    const srcKey = item.type === 'folder' ? item.prefix! : item.key!;
    const isFolder = item.type === 'folder';

    try {
      const endpoint = mode === 'cut' ? '/api/move' : '/api/copy';
      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ srcKey, destPrefix: currentPrefix, isFolder }),
      });

      if (!res.ok) throw new Error('Operation failed');
      if (mode === 'cut') setClipboard(null);
      await loadDirectory(currentPrefix, true);
    } catch (e) {
      alert(`粘贴失败: ${(e as Error).message}`);
    }
  };

  const handleDeleteConfirm = async () => {
    const itemsToDelete = selectedItems.map((i) => ({
      key: i.type === 'folder' ? i.prefix! : i.key!,
      isFolder: i.type === 'folder',
    }));

    try {
      const res = await apiFetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToDelete }),
      });

      if (!res.ok) throw new Error('Delete failed');
      setSelectedKeys(new Set());
      await loadDirectory(currentPrefix, true);
    } catch (e) {
      alert(`删除失败: ${(e as Error).message}`);
    }
  };

  const handleDownload = (key: string) => {
    const token = savedPassword || localStorage.getItem('r2_app_password');
    const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
    window.location.href = `/api/download?key=${encodeURIComponent(key)}&download=1${tokenParam}`;
  };

  const handleCopyPublicUrl = (item: ExplorerItem) => {
    if (item.publicUrl) {
      navigator.clipboard.writeText(item.publicUrl);
    }
  };

  const handleClearCache = async () => {
    await apiFetch('/api/clear-cache', { method: 'POST' });
    loadDirectory(currentPrefix, true);
  };

  // 8. Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if inside input/textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      // Ctrl/Cmd + A: Select all
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        const allKeys = new Set(
          filteredItems.map((i) => (i.type === 'folder' ? i.prefix! : i.key!))
        );
        setSelectedKeys(allKeys);
      }

      // Ctrl/Cmd + C: Copy
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleCopy();
      }

      // Ctrl/Cmd + X: Cut
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        handleCut();
      }

      // Ctrl/Cmd + V: Paste
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        handlePaste();
      }

      // Delete: Delete selected
      if (e.key === 'Delete') {
        e.preventDefault();
        if (selectedItems.length > 0) setIsDeleteOpen(true);
      }

      // F2: Rename
      if (e.key === 'F2') {
        e.preventDefault();
        if (selectedItems.length === 1) {
          setRenameTargetItem(selectedItems[0]);
        }
      }

      // Enter: Open
      if (e.key === 'Enter') {
        if (selectedItems.length === 1) {
          handleOpenItem(selectedItems[0]);
        }
      }

      // Escape: Clear
      if (e.key === 'Escape') {
        handleClearSelection();
        setContextMenu(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredItems, selectedItems, clipboard, currentPrefix]);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('r2_view_mode', mode);
  };

  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 overflow-hidden font-sans">
      {/* Top Navbar */}
      <Navbar
        bucket={bucket}
        currentPrefix={currentPrefix}
        canGoBack={historyIndex > 0}
        canGoForward={historyIndex < history.length - 1}
        canGoUp={currentPrefix !== ''}
        isLoading={isLoading}
        searchQuery={searchQuery}
        viewMode={viewMode}
        classACount={stats?.stats.classA || 0}
        classBCount={stats?.stats.classB || 0}
        fromCache={fromCache}
        userEmail={userEmail}
        onNavigate={navigateTo}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
        onGoUp={handleGoUp}
        onRefresh={handleRefresh}
        onSearchChange={setSearchQuery}
        onViewModeChange={handleViewModeChange}
        onNewFolderClick={() => setIsNewFolderOpen(true)}
        onOpenQuotaModal={() => setIsQuotaOpen(true)}
        onUploadFiles={handleUploadFiles}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          bucket={bucket}
          publicDomain={publicDomain}
          currentPrefix={currentPrefix}
          stats={stats}
          onNavigate={navigateTo}
          activeFilter={categoryFilter}
          onFilterCategory={setCategoryFilter}
        />

        {/* File Explorer Workspace */}
        <FileList
          currentPrefix={currentPrefix}
          items={filteredItems}
          selectedKeys={selectedKeys}
          clipboard={clipboard}
          viewMode={viewMode}
          sortField={sortField}
          sortOrder={sortOrder}
          onSelectItem={handleSelectItem}
          onClearSelection={handleClearSelection}
          onOpenItem={handleOpenItem}
          onContextMenu={handleContextMenu}
          onSortChange={handleSortChange}
          onDropLocalFiles={handleUploadFiles}
          onMoveItem={handleMoveItem}
        />

        {/* Properties Drawer */}
        {propertiesItem && (
          <PropertiesDrawer
            item={propertiesItem}
            onClose={() => setPropertiesItem(null)}
          />
        )}
      </div>

      {/* Right Click Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          targetItem={contextMenu.targetItem}
          selectedCount={selectedItems.length}
          hasClipboard={!!clipboard}
          onClose={() => setContextMenu(null)}
          onOpen={() => contextMenu.targetItem && handleOpenItem(contextMenu.targetItem)}
          onCopyPublicUrl={() =>
            contextMenu.targetItem && handleCopyPublicUrl(contextMenu.targetItem)
          }
          onDownload={() =>
            contextMenu.targetItem?.key && handleDownload(contextMenu.targetItem.key)
          }
          onCut={handleCut}
          onCopy={handleCopy}
          onPaste={handlePaste}
          onRename={() => setRenameTargetItem(contextMenu.targetItem)}
          onDelete={() => setIsDeleteOpen(true)}
          onProperties={() => setPropertiesItem(contextMenu.targetItem)}
          onNewFolder={() => setIsNewFolderOpen(true)}
          onUpload={() => {
            const input = document.querySelector('input[type="file"]') as HTMLInputElement;
            input?.click();
          }}
          onRefresh={handleRefresh}
        />
      )}

      {/* Modals */}
      <PreviewModal
        item={previewItem}
        onClose={() => setPreviewItem(null)}
        onDownload={handleDownload}
      />

      <NewFolderModal
        isOpen={isNewFolderOpen}
        onClose={() => setIsNewFolderOpen(false)}
        onCreate={handleCreateFolder}
      />

      <RenameModal
        item={renameTargetItem}
        onClose={() => setRenameTargetItem(null)}
        onRename={handleRename}
      />

      <DeleteConfirmModal
        items={selectedItems}
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
      />

      <QuotaModal
        isOpen={isQuotaOpen}
        onClose={() => setIsQuotaOpen(false)}
        stats={stats}
        onClearCache={handleClearCache}
      />

      {/* Upload Toast */}
      <UploadToast
        uploads={uploads}
        onDismiss={(id) => setUploads((prev) => prev.filter((u) => u.id !== id))}
        onClearAll={() => setUploads([])}
      />

      {/* Lock Modal */}
      <LockModal isOpen={isLocked} onUnlock={handleUnlock} />
    </div>
  );
};

export default App;
