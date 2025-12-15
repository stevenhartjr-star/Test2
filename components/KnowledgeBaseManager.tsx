
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef } from 'react';
import { Plus, Trash2, ChevronDown, X, Upload, FolderUp, File as FileIcon } from 'lucide-react';
import { URLGroup } from '../types';

interface KnowledgeBaseManagerProps {
  urls: string[];
  onAddUrl: (url: string) => void;
  onRemoveUrl: (url: string) => void;
  
  files?: File[];
  onAddFiles?: (files: File[]) => void;
  onRemoveFile?: (fileName: string) => void;

  maxUrls?: number;
  urlGroups: URLGroup[];
  activeUrlGroupId: string;
  onSetGroupId: (id: string) => void;
  onCloseSidebar?: () => void;
}

const KnowledgeBaseManager: React.FC<KnowledgeBaseManagerProps> = ({ 
  urls, 
  onAddUrl, 
  onRemoveUrl,
  files = [],
  onAddFiles,
  onRemoveFile,
  maxUrls = 20,
  urlGroups,
  activeUrlGroupId,
  onSetGroupId,
  onCloseSidebar,
}) => {
  const [currentUrlInput, setCurrentUrlInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const isValidUrl = (urlString: string): boolean => {
    try {
      new URL(urlString);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleAddUrl = () => {
    if (!currentUrlInput.trim()) {
      setError('URL cannot be empty.');
      return;
    }
    if (!isValidUrl(currentUrlInput)) {
      setError('Invalid URL format. Please include http:// or https://');
      return;
    }
    if (urls.length >= maxUrls) {
      setError(`You can add a maximum of ${maxUrls} URLs to the current group.`);
      return;
    }
    if (urls.includes(currentUrlInput)) {
      setError('This URL has already been added to the current group.');
      return;
    }
    onAddUrl(currentUrlInput);
    setCurrentUrlInput('');
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onAddFiles) {
      const newFiles = Array.from(e.target.files);
      
      // Simple duplicate check based on name
      const existingNames = new Set(files.map(f => f.name));
      const uniqueFiles = newFiles.filter(f => !existingNames.has(f.name));
      
      if (uniqueFiles.length < newFiles.length) {
         setError(`Skipped ${newFiles.length - uniqueFiles.length} duplicate files.`);
      } else {
        setError(null);
      }
      
      if (uniqueFiles.length > 0) {
        onAddFiles(uniqueFiles);
      }
      
      // Reset input
      e.target.value = '';
    }
  };

  const activeGroupName = urlGroups.find(g => g.id === activeUrlGroupId)?.name || "Unknown Group";
  
  // React doesn't fully support the directory attribute yet in Typescript definitions for all versions
  const folderInputAttributes = {
    type: "file",
    multiple: true,
    webkitdirectory: "",
    directory: "",
  } as React.InputHTMLAttributes<HTMLInputElement>;

  return (
    <div className="p-4 bg-[#1E1E1E] shadow-md rounded-xl h-full flex flex-col border border-[rgba(255,255,255,0.05)]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold text-[#E2E2E2]">Knowledge Base</h2>
        {onCloseSidebar && (
          <button
            onClick={onCloseSidebar}
            className="p-1 text-[#A8ABB4] hover:text-white rounded-md hover:bg-white/10 transition-colors md:hidden"
            aria-label="Close knowledge base"
          >
            <X size={24} />
          </button>
        )}
      </div>
      
      <div className="mb-3">
        <label htmlFor="url-group-select-kb" className="block text-sm font-medium text-[#A8ABB4] mb-1">
          Active Group
        </label>
        <div className="relative w-full">
          <select
            id="url-group-select-kb"
            value={activeUrlGroupId}
            onChange={(e) => onSetGroupId(e.target.value)}
            className="w-full py-2 pl-3 pr-8 appearance-none border border-[rgba(255,255,255,0.1)] bg-[#2C2C2C] text-[#E2E2E2] rounded-md focus:ring-1 focus:ring-white/20 focus:border-white/20 text-sm"
          >
            {urlGroups.map(group => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          <ChevronDown
            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A8ABB4] pointer-events-none"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* URL Section */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <input
            type="url"
            value={currentUrlInput}
            onChange={(e) => setCurrentUrlInput(e.target.value)}
            placeholder="Add URL (https://...)"
            className="flex-grow h-8 py-1 px-2.5 border border-[rgba(255,255,255,0.1)] bg-[#2C2C2C] text-[#E2E2E2] placeholder-[#777777] rounded-lg focus:ring-1 focus:ring-white/20 focus:border-white/20 transition-shadow text-sm"
            onKeyPress={(e) => e.key === 'Enter' && handleAddUrl()}
          />
          <button
            onClick={handleAddUrl}
            disabled={urls.length >= maxUrls}
            className="h-8 w-8 p-1.5 bg-white/[.12] hover:bg-white/20 text-white rounded-lg transition-colors disabled:bg-[#4A4A4A] disabled:text-[#777777] flex items-center justify-center"
            title="Add URL"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* File Upload Section */}
      <div className="mb-2 flex gap-2">
        <input 
          type="file" 
          multiple 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
        />
        {/* @ts-ignore */}
        <input 
          {...folderInputAttributes}
          className="hidden" 
          ref={folderInputRef} 
          onChange={handleFileChange} 
        />
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-2 py-1.5 bg-[#2C2C2C] border border-[rgba(255,255,255,0.1)] hover:bg-[#3C3C3C] text-[#E2E2E2] rounded-lg text-xs transition-colors"
        >
          <Upload size={14} />
          Add Files
        </button>
        <button 
          onClick={() => folderInputRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-2 py-1.5 bg-[#2C2C2C] border border-[rgba(255,255,255,0.1)] hover:bg-[#3C3C3C] text-[#E2E2E2] rounded-lg text-xs transition-colors"
        >
          <FolderUp size={14} />
          Add Folder
        </button>
      </div>

      {error && <p className="text-xs text-[#f87171] mb-2">{error}</p>}
      
      <div className="flex-grow overflow-y-auto space-y-1 chat-container mt-2">
        {(urls.length === 0 && files.length === 0) && (
          <p className="text-[#777777] text-center py-6 text-sm">Add URLs or files to "{activeGroupName}" to start.</p>
        )}
        
        {/* URLs List */}
        {urls.map((url) => (
          <div key={url} className="flex items-center justify-between p-2 bg-[#2C2C2C] border border-[rgba(255,255,255,0.05)] rounded-lg group">
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#79B8FF] hover:underline truncate w-full" title={url}>
              {url}
            </a>
            <button 
              onClick={() => onRemoveUrl(url)}
              className="p-1 text-[#A8ABB4] hover:text-[#f87171] rounded opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 ml-1"
              title="Remove URL"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        {/* Files List */}
        {files.map((file, idx) => (
          <div key={`${file.name}-${idx}`} className="flex items-center justify-between p-2 bg-[#2C2C2C] border border-[rgba(255,255,255,0.05)] rounded-lg group">
            <div className="flex items-center gap-2 truncate w-full">
               <FileIcon size={12} className="text-[#A8ABB4] flex-shrink-0" />
               <span className="text-xs text-[#E2E2E2] truncate" title={file.name}>{file.name}</span>
               <span className="text-[10px] text-[#777] flex-shrink-0">{(file.size / 1024).toFixed(0)}KB</span>
            </div>
            <button 
              onClick={() => onRemoveFile && onRemoveFile(file.name)}
              className="p-1 text-[#A8ABB4] hover:text-[#f87171] rounded opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 ml-1"
              title="Remove File"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KnowledgeBaseManager;
