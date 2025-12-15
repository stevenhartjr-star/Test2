
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import { ChatMessage, MessageSender } from '../types';
import { Sparkles, FileText, AlertCircle } from 'lucide-react';

// Configure marked to use highlight.js for syntax highlighting
marked.setOptions({
  highlight: function(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  },
  langPrefix: 'hljs language-', // Prefix for CSS classes
} as any);

interface MessageItemProps {
  message: ChatMessage;
  onSummarize?: (messageId: string, urls: string[]) => void;
}

const SenderAvatar: React.FC<{ sender: MessageSender; isError?: boolean }> = ({ sender, isError }) => {
  let avatarChar = '';
  let bgColorClass = '';
  let textColorClass = '';

  if (sender === MessageSender.USER) {
    avatarChar = 'U';
    bgColorClass = 'bg-white/[.12]';
    textColorClass = 'text-white';
  } else if (sender === MessageSender.MODEL) {
    avatarChar = 'AI';
    bgColorClass = 'bg-[#777777]'; 
    textColorClass = 'text-[#E2E2E2]';
  } else { // SYSTEM
    avatarChar = 'S';
    bgColorClass = isError ? 'bg-red-500/20' : 'bg-[#4A4A4A]';
    textColorClass = isError ? 'text-red-200' : 'text-[#E2E2E2]';
  }

  return (
    <div className={`w-8 h-8 rounded-full ${bgColorClass} ${textColorClass} flex items-center justify-center text-sm font-semibold flex-shrink-0`}>
      {isError ? <AlertCircle size={16} /> : avatarChar}
    </div>
  );
};

const MessageItem: React.FC<MessageItemProps> = ({ message, onSummarize }) => {
  const isUser = message.sender === MessageSender.USER;
  const isModel = message.sender === MessageSender.MODEL;
  const isSystem = message.sender === MessageSender.SYSTEM;
  const isError = isSystem && message.text.startsWith('Error:');

  const renderContent = (content: string) => {
    const proseClasses = "prose prose-sm prose-invert w-full min-w-0"; 
    const rawMarkup = marked.parse(content || "") as string;
    return <div className={proseClasses} dangerouslySetInnerHTML={{ __html: rawMarkup }} />;
  };

  const renderMessageContent = () => {
    if (isModel && !message.isLoading) {
      return renderContent(message.text);
    }
    
    let textColorClass = '';
    if (isUser) {
        textColorClass = 'text-white';
    } else if (isError) {
        textColorClass = 'text-red-200';
    } else if (isSystem) {
        textColorClass = 'text-[#A8ABB4]';
    } else { // Model loading
        textColorClass = 'text-[#E2E2E2]';
    }
    return <div className={`whitespace-pre-wrap text-sm ${textColorClass}`}>{message.text}</div>;
  };
  
  let bubbleClasses = "p-3 rounded-lg shadow w-full "; 

  if (isUser) {
    bubbleClasses += "bg-white/[.12] text-white rounded-br-none";
  } else if (isModel) {
    bubbleClasses += `bg-[rgba(119,119,119,0.10)] border-t border-[rgba(255,255,255,0.04)] backdrop-blur-lg rounded-bl-none`;
  } else if (isError) {
     bubbleClasses += "bg-red-500/10 border border-red-500/20 text-red-200 rounded-bl-none";
  } else { // System message
    bubbleClasses += "bg-[#2C2C2C] text-[#A8ABB4] rounded-bl-none";
  }

  const successfulUrls = message.urlContext
    ?.filter(meta => {
        const status = meta.urlRetrievalStatus || '';
        return status.includes('SUCCESS') || status === 'OK';
    })
    .map(meta => meta.retrievedUrl) || [];

  return (
    <div className={`flex mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex items-start gap-2 max-w-[85%]`}>
        {!isUser && <SenderAvatar sender={message.sender} isError={isError} />}
        <div className={bubbleClasses}>
          {message.isLoading ? (
            <div className="flex items-center space-x-1.5">
              <div className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.3s] ${isUser ? 'bg-white' : 'bg-[#A8ABB4]'}`}></div>
              <div className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.15s] ${isUser ? 'bg-white' : 'bg-[#A8ABB4]'}`}></div>
              <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${isUser ? 'bg-white' : 'bg-[#A8ABB4]'}`}></div>
            </div>
          ) : (
            renderMessageContent()
          )}
          
          {isModel && message.urlContext && message.urlContext.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-[rgba(255,255,255,0.1)]">
              <div className="flex items-center justify-between mb-2">
                 <h4 className="text-xs font-semibold text-[#A8ABB4]">Context URLs Retrieved:</h4>
                 {successfulUrls.length > 0 && !message.summary && onSummarize && !message.isSummarizing && (
                    <button 
                      onClick={() => onSummarize(message.id, successfulUrls)}
                      className="flex items-center gap-1.5 text-[10px] bg-[#79B8FF]/10 text-[#79B8FF] hover:bg-[#79B8FF]/20 px-2 py-1 rounded transition-colors border border-[#79B8FF]/20"
                      title="Generate a summary of these URLs"
                    >
                      <Sparkles size={12} />
                      Summarize URLs
                    </button>
                 )}
                 {message.isSummarizing && (
                    <div className="flex items-center gap-1.5 text-[10px] text-[#A8ABB4]">
                       <div className="w-2 h-2 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                       Summarizing...
                    </div>
                 )}
              </div>
              
              <ul className="space-y-0.5 mb-2">
                {message.urlContext.map((meta, index) => {
                  const statusText = typeof meta.urlRetrievalStatus === 'string' 
                    ? meta.urlRetrievalStatus.replace('URL_RETRIEVAL_STATUS_', '') 
                    : 'UNKNOWN';
                  const isSuccess = statusText.includes('SUCCESS');

                  return (
                    <li key={index} className="text-[11px] text-[#A8ABB4]">
                      <a href={meta.retrievedUrl} target="_blank" rel="noopener noreferrer" className="hover:underline break-all text-[#79B8FF]">
                        {meta.retrievedUrl}
                      </a>
                      <span className={`ml-1.5 px-1 py-0.5 rounded-sm text-[9px] ${
                        isSuccess
                          ? 'bg-white/[.12] text-white'
                          : 'bg-slate-600/30 text-slate-400'
                      }`}>
                        {statusText}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {message.summary && (
                <div className="mt-3 p-2.5 bg-[#1E1E1E] rounded-md border border-[rgba(255,255,255,0.05)] shadow-inner">
                   <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[rgba(255,255,255,0.05)]">
                      <FileText size={14} className="text-[#79B8FF]" />
                      <span className="text-xs font-semibold text-[#E2E2E2]">Content Summary</span>
                   </div>
                   <div className="text-xs text-[#A8ABB4] leading-relaxed">
                      {renderContent(message.summary)}
                   </div>
                </div>
              )}
            </div>
          )}
        </div>
        {isUser && <SenderAvatar sender={message.sender} />}
      </div>
    </div>
  );
};

export default MessageItem;
