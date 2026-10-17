import React, { useState } from 'react';
import type {
  ExplorerItem,
  ViewMode,
  SortField,
  SortOrder,
  ClipboardItem,
} from '../types';
import { FileIcon } from './FileIcon';
import { formatBytes, formatDate } from '../utils/format';
import {
  UploadCloud,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
} from 'lucide-react';

interface FileListProps {
  currentPrefix: string;
  items: ExplorerItem[];
  selectedKeys: Set<string>;
  clipboard: ClipboardItem | null;
  viewMode: ViewMode;
  sortField: SortField;
  sortOrder: SortOrder;
  onSelectItem: (item: ExplorerItem, e: React.MouseEvent) => void;
  onClearSelection: () => void;
  onOpenItem: (item: ExplorerItem) => void;
  onContextMenu: (e: React.MouseEvent, item: ExplorerItem | null) => void;
  onSortChange: (field: SortField) => void;
  onDropLocalFiles: (files: FileList, targetPrefix: string) => void;
  onMoveItem: (srcKey: string, destPrefix: string, isFolder: boolean) => void;
}

export const FileList: React.FC<FileListProps> = ({
  currentPrefix,
  items,
  selectedKeys,
  clipboard,
  viewMode,
  sortField,
  sortOrder,
  onSelectItem,
  onClearSelection,
  onOpenItem,
  onContextMenu,
  onSortChange,
  onDropLocalFiles,
  onMoveItem,
}) => {
  // Drag-and-drop state
  const [isWindowDragOver, setIsWindowDragOver] = useState(false);
  const [dragOverFolderPrefix, setDragOverFolderPrefix] = useState<string | null>(null);

  const getItemId = (item: ExplorerItem) =>
    item.type === 'folder' ? item.prefix! : item.key!;

  // Handle local file drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isWindowDragOver) setIsWindowDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only turn off if leaving the container
    if (e.currentTarget === e.target) {
      setIsWindowDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWindowDragOver(false);
    setDragOverFolderPrefix(null);

    // Check if internal item move was dragged
    const internalDragData = e.dataTransfer.getData('application/r2-explorer-item');
    if (internalDragData) {
      try {
        JSON.parse(internalDragData);
        // Dropped on empty area in current directory -> no move
        return;
      } catch (err) {}
    }

    // Local files dropped
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onDropLocalFiles(e.dataTransfer.files, currentPrefix);
    }
  };

  // Drag over a folder card (either from local files or internal drag)
  const handleFolderDragOver = (e: React.DragEvent, folderPrefix: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderPrefix(folderPrefix);
  };

  const handleFolderDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderPrefix(null);
  };

  const handleFolderDrop = (e: React.DragEvent, folderPrefix: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderPrefix(null);
    setIsWindowDragOver(false);

    // Check internal item move
    const internalDragData = e.dataTransfer.getData('application/r2-explorer-item');
    if (internalDragData) {
      try {
        const item: ExplorerItem = JSON.parse(internalDragData);
        const itemKey = getItemId(item);
        if (itemKey !== folderPrefix) {
          onMoveItem(itemKey, folderPrefix, item.type === 'folder');
        }
        return;
      } catch (err) {}
    }

    // Local files dropped onto specific folder
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onDropLocalFiles(e.dataTransfer.files, folderPrefix);
    }
  };

  // Internal item drag start
  const handleItemDragStart = (e: React.DragEvent, item: ExplorerItem) => {
    e.dataTransfer.setData('application/r2-explorer-item', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'move';
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-orange-500" />
    ) : (
      <ArrowDown className="w-3 h-3 text-orange-500" />
    );
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onContextMenu={(e) => {
        // Background right click
        if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'DIV') {
          onContextMenu(e, null);
        }
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClearSelection();
        }
      }}
      className="relative flex-1 p-4 overflow-y-auto select-none bg-slate-50/30 dark:bg-slate-950/20"
    >
      {/* Local Drag & Drop Full Overlay */}
      {isWindowDragOver && (
        <div className="absolute inset-0 bg-orange-500/10 dark:bg-orange-950/30 backdrop-blur-sm border-2 border-dashed border-orange-500 rounded-xl z-40 flex flex-col items-center justify-center pointer-events-none transition-all">
          <UploadCloud className="w-16 h-16 text-orange-500 animate-bounce" />
          <p className="mt-3 text-sm font-semibold text-orange-700 dark:text-orange-300">
            松开鼠标，上传文件到当前目录
          </p>
          <p className="text-xs text-orange-500/80">
            支持拖拽单文件或批量多文件
          </p>
        </div>
      )}

      {items.length === 0 ? (
        <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-slate-400">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
            <UploadCloud className="w-8 h-8 text-slate-300 dark:text-slate-600" />
          </div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            此文件夹为空
          </p>
          <p className="text-xs text-slate-400 mt-1">
            将本地电脑的文件拖入此处，或点击上方「上传」按钮
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {items.map((item) => {
            const id = getItemId(item);
            const isSelected = selectedKeys.has(id);
            const isCut =
              clipboard?.mode === 'cut' &&
              getItemId(clipboard.item) === id;
            const isFolderDropTarget = dragOverFolderPrefix === id;

            return (
              <div
                key={id}
                draggable
                onDragStart={(e) => handleItemDragStart(e, item)}
                onDragOver={
                  item.type === 'folder'
                    ? (e) => handleFolderDragOver(e, item.prefix!)
                    : undefined
                }
                onDragLeave={
                  item.type === 'folder' ? handleFolderDragLeave : undefined
                }
                onDrop={
                  item.type === 'folder'
                    ? (e) => handleFolderDrop(e, item.prefix!)
                    : undefined
                }
                onClick={(e) => onSelectItem(item, e)}
                onDoubleClick={() => onOpenItem(item)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onContextMenu(e, item);
                }}
                className={`group relative flex flex-col items-center p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-orange-50/80 dark:bg-orange-950/40 border-orange-400 dark:border-orange-600 shadow-sm ring-1 ring-orange-400'
                    : isFolderDropTarget
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 scale-105'
                    : 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/60 hover:border-slate-300 hover:shadow-sm'
                } ${isCut ? 'opacity-40' : 'opacity-100'}`}
              >
                {/* Checkbox indicator */}
                {isSelected && (
                  <CheckCircle2 className="w-4 h-4 text-orange-500 absolute top-2 right-2 fill-white dark:fill-slate-900" />
                )}

                {/* Icon or Thumbnail */}
                <div className="w-12 h-12 flex items-center justify-center my-1">
                  <FileIcon
                    type={item.type}
                    name={item.name}
                    mimeType={item.mimeType}
                    publicUrl={item.publicUrl}
                    className="w-10 h-10"
                  />
                </div>

                {/* Name */}
                <span
                  title={item.name}
                  className="w-full text-center text-xs font-medium text-slate-800 dark:text-slate-200 truncate px-1 mt-1"
                >
                  {item.name}
                </span>

                {/* Meta details */}
                <span className="text-[10px] text-slate-400 mt-0.5">
                  {item.type === 'folder' ? '文件夹' : formatBytes(item.size)}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST / DETAILS VIEW */
        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 select-none">
              <tr>
                <th
                  onClick={() => onSortChange('name')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <div className="flex items-center gap-1.5">
                    <span>名称</span>
                    {renderSortIcon('name')}
                  </div>
                </th>
                <th
                  onClick={() => onSortChange('size')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 w-28 text-right"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>大小</span>
                    {renderSortIcon('size')}
                  </div>
                </th>
                <th
                  onClick={() => onSortChange('type')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 w-32"
                >
                  <div className="flex items-center gap-1.5">
                    <span>类型</span>
                    {renderSortIcon('type')}
                  </div>
                </th>
                <th
                  onClick={() => onSortChange('lastModified')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 w-44"
                >
                  <div className="flex items-center gap-1.5">
                    <span>修改日期</span>
                    {renderSortIcon('lastModified')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {items.map((item) => {
                const id = getItemId(item);
                const isSelected = selectedKeys.has(id);
                const isCut =
                  clipboard?.mode === 'cut' &&
                  getItemId(clipboard.item) === id;
                const isFolderDropTarget = dragOverFolderPrefix === id;

                return (
                  <tr
                    key={id}
                    draggable
                    onDragStart={(e) => handleItemDragStart(e, item)}
                    onDragOver={
                      item.type === 'folder'
                        ? (e) => handleFolderDragOver(e, item.prefix!)
                        : undefined
                    }
                    onDragLeave={
                      item.type === 'folder' ? handleFolderDragLeave : undefined
                    }
                    onDrop={
                      item.type === 'folder'
                        ? (e) => handleFolderDrop(e, item.prefix!)
                        : undefined
                    }
                    onClick={(e) => onSelectItem(item, e)}
                    onDoubleClick={() => onOpenItem(item)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onContextMenu(e, item);
                    }}
                    className={`transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-900 dark:text-orange-200 font-medium'
                        : isFolderDropTarget
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                    } ${isCut ? 'opacity-40' : 'opacity-100'}`}
                  >
                    <td className="py-2 px-3 flex items-center gap-2.5">
                      <FileIcon
                        type={item.type}
                        name={item.name}
                        mimeType={item.mimeType}
                        className="w-4 h-4 flex-shrink-0"
                      />
                      <span className="truncate max-w-md">{item.name}</span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-500 dark:text-slate-400">
                      {item.type === 'folder' ? '-' : formatBytes(item.size)}
                    </td>
                    <td className="py-2 px-3 text-slate-500 dark:text-slate-400 truncate">
                      {item.type === 'folder' ? '文件夹' : item.mimeType || '未知类型'}
                    </td>
                    <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">
                      {formatDate(item.lastModified)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
