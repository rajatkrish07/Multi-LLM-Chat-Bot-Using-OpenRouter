import React, { useState, useEffect } from "react";
import { Copy, Check, Bot, User, AlertCircle, RefreshCw } from "lucide-react";
import { Message } from "../types";

interface ChatMessageProps {
  key?: string;
  message: Message;
  selectedModelName: string;
  onTypingComplete?: (msgId: string) => void;
  fontSize?: "sm" | "base" | "lg" | "xl";
}

export default function ChatMessage({ message, selectedModelName, onTypingComplete, fontSize = "base" }: ChatMessageProps) {
  const isUser = message.role === "user";
  const [displayedContent, setDisplayedContent] = useState("");
  const [isCurrentlyTyping, setIsCurrentlyTyping] = useState(false);
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});

  const fontSizeClass = "text-base md:text-[17px] lg:text-[18px]";
  const headerLargeClass = "text-2xl md:text-3xl";
  const headerMediumClass = "text-xl md:text-2xl";
  const headerSmallClass = "text-lg md:text-xl";

  const originalContent = message.content;

  // Typing simulator
  useEffect(() => {
    if (isUser || message.role === "system") {
      setDisplayedContent(originalContent);
      return;
    }

    if (message.isStreaming === false) {
      setDisplayedContent(originalContent);
      return;
    }

    // Typing simulated line by line
    setIsCurrentlyTyping(true);
    const lines = originalContent.split("\n");
    let currentLineIdx = 0;
    let accumulatedText = "";

    const typeNextLine = () => {
      if (currentLineIdx < lines.length) {
        // Append line
        accumulatedText += (currentLineIdx > 0 ? "\n" : "") + lines[currentLineIdx];
        setDisplayedContent(accumulatedText);
        currentLineIdx++;
        
        // Auto scroll helper can be triggered on parent
        const chatContainer = document.getElementById("chat-scroll-container");
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        // Fast, sleek delay between lines to eliminate perceived latency
        const lineDelay = Math.max(8, Math.min(20, Math.round(lines[currentLineIdx - 1].length * 0.1)));
        setTimeout(typeNextLine, lineDelay);
      } else {
        setIsCurrentlyTyping(false);
        if (onTypingComplete) {
          onTypingComplete(message.id);
        }
      }
    };

    typeNextLine();

    return () => {
      // Cleanup if unmounted or updated
    };
  }, [message.id, originalContent, isUser, message.isStreaming]);

  const copyToClipboard = (text: string, blockId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStates((prev) => ({ ...prev, [blockId]: true }));
    setTimeout(() => {
      setCopiedStates((prev) => ({ ...prev, [blockId]: false }));
    }, 2000);
  };

  // Ultra-precise parsing function for code blocks, lists, bold text, etc.
  const renderFormattedContent = (text: string) => {
    if (!text) return null;

    // Split entire block by code chunks ```
    const parts = text.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      // 1. If it is a code block
      if (part.startsWith("```")) {
        const match = part.match(/```(\w*)\n([\s\S]*?)```/);
        const language = match ? match[1] || "code" : "code";
        const code = match ? match[2] : part.slice(3, -3);
        const blockId = `block-${index}-${message.id}`;

        return (
          <div key={index} className="my-5 rounded-xl border border-[#e5e2da] bg-[#1d1c1a]/95 text-[#fbfaf7] overflow-hidden shadow-md max-w-full font-mono text-[13px] md:text-sm">
            <div className="flex items-center justify-between px-4 py-2 bg-[#121110] border-b border-[#2e2c29] text-[11px] md:text-xs uppercase font-semibold text-[#8a857c] tracking-wider">
               <span>{language}</span>
               <button
                 onClick={() => copyToClipboard(code, blockId)}
                 className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
               >
                 {copiedStates[blockId] ? (
                   <>
                     <Check className="h-3 w-3 text-[#d97706]" />
                     <span className="text-[#d97706]">Copied</span>
                   </>
                 ) : (
                   <>
                     <Copy className="h-3 w-3" />
                     <span>Copy</span>
                   </>
                 )}
               </button>
             </div>
             <pre className="p-4 overflow-x-auto text-[13px] md:text-sm leading-relaxed custom-scrollbar whitespace-pre-wrap break-all select-text">
               <code>{code}</code>
             </pre>
           </div>
         );
      }

      // 2. Parse inline structures and block groupings (tables, lists, blockquotes, headers, paragraphs)
      const lines = part.split("\n");
      const elements: React.ReactNode[] = [];
      let i = 0;

      while (i < lines.length) {
        const line = lines[i];

        // A. Parse tables: consecutive lines starting and ending with | or containing multiple | separators
        const isTableRowLike = (l: string) => {
          const trimmed = l.trim();
          return trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.includes("|");
        };

        if (isTableRowLike(line)) {
          const tableLines: string[] = [];
          while (i < lines.length && isTableRowLike(lines[i])) {
            tableLines.push(lines[i].trim());
            i++;
          }

          const parsedRows = tableLines.map(rowLine => {
            // strip outer pipes, split by inner pipes
            const content = rowLine.slice(1, -1);
            return content.split("|").map(cell => cell.trim());
          });

          // Identify header column cells and body rows
          let headers: string[] = [];
          let bodyRows: string[][] = [];
          // If 2nd row is markdown separator row (e.g. |---|---| or | :--- | ---:| )
          if (parsedRows.length >= 2 && parsedRows[1].every(cell => /^:?-+:?$/.test(cell))) {
            headers = parsedRows[0];
            bodyRows = parsedRows.slice(2);
          } else if (parsedRows.length >= 1) {
            headers = parsedRows[0];
            bodyRows = parsedRows.slice(1);
          }

          if (headers.length > 0 || bodyRows.length > 0) {
            elements.push(
              <div key={`table-${index}-${i}`} className="my-4 overflow-x-auto border border-[#e5e2da] dark:border-[#2e2c2a] rounded-xl shadow-2xs max-w-full">
                <table className="min-w-full divide-y divide-[#e5e2da] dark:divide-[#2e2c2a] text-left text-sm md:text-[15px]">
                  {headers.length > 0 && (
                    <thead className="bg-[#fcfbf9] dark:bg-[#1c1b19] text-[#1d1c1a] dark:text-[#fbfaf7] font-semibold border-b border-[#e5e2da] dark:border-[#2e2c2a]">
                      <tr>
                        {headers.map((hdr, hIdx) => (
                          <th key={hIdx} className="px-4 py-3 font-display border-r border-[#e5e2da] dark:border-[#2e2c2a] last:border-r-0 tracking-tight">
                            {parseInlineStyles(hdr)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody className="divide-y divide-[#e5e2da] dark:divide-[#2e2c2a] bg-transparent text-[#413f3b] dark:text-[#d3d0c9]">
                    {bodyRows.map((row, rIdx) => (
                      <tr key={rIdx} className="odd:bg-transparent even:bg-[#faf9f5]/55 dark:even:bg-[#1a1917]/30 hover:bg-[#faf9f4] dark:hover:bg-[#1c1b19]/60 transition-colors">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-4 py-2.5 border-r border-[#e5e2da] dark:border-[#2e2c2a] last:border-r-0 whitespace-normal break-words">
                            {parseInlineStyles(cell || "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }
          continue;
        }

        // B. Parse bullet lists consecutively to wrap them in a single <ul> block
        const isBulletItem = (l: string) => {
          const trimmed = l.trim();
          return trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("+ ");
        };

        if (isBulletItem(line)) {
          const listItems: string[] = [];
          while (i < lines.length && isBulletItem(lines[i])) {
            const prefixLen = lines[i].trim().slice(0, 2).length;
            listItems.push(lines[i].trim().slice(prefixLen));
            i++;
          }
          elements.push(
            <ul key={`ul-${index}-${i}`} className="list-disc list-outside pl-5 space-y-1.5 my-3">
              {listItems.map((item, liIdx) => (
                <li key={liIdx} className={`${fontSizeClass} text-[#413f3b] dark:text-[#d3d0c9] leading-relaxed`}>
                  {parseInlineStyles(item)}
                </li>
              ))}
            </ul>
          );
          continue;
        }

        // C. Parse numbered lists consecutively to wrap them in a single <ol> block
        const getNumberedMatch = (l: string) => l.trim().match(/^(\d+)\.\s(.*)/);

        if (getNumberedMatch(line)) {
          const listItems: string[] = [];
          while (i < lines.length && getNumberedMatch(lines[i])) {
            const m = getNumberedMatch(lines[i]);
            if (m) {
              listItems.push(m[2]);
            }
            i++;
          }
          elements.push(
            <ol key={`ol-${index}-${i}`} className="list-decimal list-outside pl-5 space-y-1.5 my-3">
              {listItems.map((item, liIdx) => (
                <li key={liIdx} className={`${fontSizeClass} text-[#413f3b] dark:text-[#d3d0c9] leading-relaxed`}>
                  {parseInlineStyles(item)}
                </li>
              ))}
            </ol>
          );
          continue;
        }

        // D. Parse Blockquotes consecutively to wrap them in a unified quote block
        if (line.trim().startsWith("> ")) {
          const quoteLines: string[] = [];
          while (i < lines.length && lines[i].trim().startsWith("> ")) {
            quoteLines.push(lines[i].trim().slice(2));
            i++;
          }
          elements.push(
            <blockquote key={`quote-${index}-${i}`} className={`border-l-2 border-[#d97706]/70 bg-[#faf9f4] dark:bg-[#1f1e1b] pl-3 py-2 pr-2 my-4 rounded-r-lg ${fontSizeClass} italic text-[#8a857c] dark:text-[#a8a49c] leading-relaxed`}>
              {quoteLines.map((ql, qIdx) => (
                <p key={qIdx} className={qIdx > 0 ? "mt-1.5" : ""}>
                  {parseInlineStyles(ql)}
                </p>
              ))}
            </blockquote>
          );
          continue;
        }

        // E. Parse Headings (supports standard "# Heading", malformed "#Heading", and leading spaces)
        const headingMatch = line.match(/^\s*(#{1,6})\s*(.+)$/);
        if (headingMatch) {
          const hashes = headingMatch[1];
          const text = headingMatch[2];
          const level = hashes.length;

          if (level === 1) {
            elements.push(
              <h2 key={`h2-${index}-${i}`} className={`font-display font-bold ${headerLargeClass} text-[#1d1c1a] dark:text-[#fbfaf7] mt-7 mb-3`}>
                {parseInlineStyles(text)}
              </h2>
            );
          } else if (level === 2) {
            elements.push(
              <h3 key={`h3-${index}-${i}`} className={`font-display font-semibold ${headerMediumClass} text-[#1d1c1a] dark:text-[#fbfaf7] mt-6 mb-2.5 border-b border-[#f3f1eb] dark:border-[#2e2c2a] pb-1.5`}>
                {parseInlineStyles(text)}
              </h3>
            );
          } else {
            elements.push(
              <h4 key={`h4-${index}-${i}`} className={`font-display font-semibold ${headerSmallClass} text-[#1d1c1a] dark:text-[#fbfaf7] mt-5 mb-2 uppercase tracking-wide`}>
                {parseInlineStyles(text)}
              </h4>
            );
          }
          i++;
          continue;
        }

        // F. Handle empty lines
        if (line.trim() === "") {
          elements.push(<div key={`space-${index}-${i}`} className="h-2" />);
          i++;
          continue;
        }

        // G. Fallback to standard line paragraph
        elements.push(
          <p key={`p-${index}-${i}`} className={`${fontSizeClass} leading-relaxed text-[#413f3b] dark:text-[#d3d0c9] my-1.5 select-text`}>
            {parseInlineStyles(line)}
          </p>
        );
        i++;
      }

      return elements;
    });
  };

  // Helper inside parser to replace **bold**, *italics*, and `code`
  const parseInlineStyles = (snippet: string) => {
    // Escape standard text segments matching formatting
    const boldItalicRegex = /\*\*\*([\s\S]*?)\*\*\*/g;
    const boldRegex = /\*\*([\s\S]*?)\*\*/g;
    const italicRegex = /\*([\s\S]*?)\*/g;
    const inlineCodeRegex = /`([^`]+)`/g;

    let parts = [snippet];

    // Simple replacement pipeline returning React elements
    // We will parse inline code segments first
    const items = snippet.split(/(`[^`]+`|\*\*[^\*]+\*\*|\*[^\*]+\*)/g);

    return items.map((item, idx) => {
      if (item.startsWith("`") && item.endsWith("`")) {
        return (
          <code key={idx} className="bg-[#f3f1eb] dark:bg-[#201f1d] border border-[#e5e2da] dark:border-[#383632] px-1.5 py-0.5 rounded font-mono text-xs md:text-[13px] text-amber-700 dark:text-amber-500">
            {item.slice(1, -1)}
          </code>
        );
      }
      if (item.startsWith("**") && item.endsWith("**")) {
        return (
          <strong key={idx} className="font-semibold text-[#1d1c1a] dark:text-white">
            {item.slice(2, -2)}
          </strong>
        );
      }
      if (item.startsWith("*") && item.endsWith("*")) {
        return (
          <em key={idx} className="italic text-[#5c5954] dark:text-[#b8b5ad]">
            {item.slice(1, -1)}
          </em>
        );
      }
      return item;
    });
  };

  return (
    <div 
      className={`group flex flex-col w-full pb-6 border-b border-[#f3f1eb] dark:border-[#232220] max-w-2xl mx-auto ${
        isUser ? "bg-transparent" : "bg-transparent pt-2"
      }`}
    >
      {/* Sender Header */}
      <div className="flex items-center justify-between w-full mb-3 text-[11px]">
        <div className="flex items-center gap-2">
          {isUser ? (
            <div className="h-6 w-6 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300">
              <User className="h-3 w-3" />
            </div>
          ) : (
            <div className="h-6 w-6 rounded-full bg-[#8b5cf6]/10 dark:bg-[#8b5cf6]/20 flex items-center justify-center border border-[#8b5cf6]/20 dark:border-[#8b5cf6]/30 text-[#8b5cf6] dark:text-[#a78bfa]">
              <Bot className="h-3.5 w-3.5" />
            </div>
          )}
          <span className="font-display font-semibold uppercase tracking-wider text-[#1d1c1a] dark:text-[#f3f1ed]">
            {isUser ? "You" : "ChatBuddy"}
          </span>
          {!isUser && message.modelUsed && (
            <span className="text-[9px] font-mono rounded-full bg-[#f3f1eb] dark:bg-[#201f1d] border border-[#e5e2da] dark:border-[#33312e] px-2 py-0.2 text-[#8a857c] dark:text-[#a19c91]">
              {message.modelUsed.split("/").pop()?.replace(":free", "") || message.modelUsed}
            </span>
          )}
        </div>

        {/* Timestamp */}
        <span className="font-mono text-[9px] text-[#a19c91] dark:text-[#8a857c] opacity-0 group-hover:opacity-100 transition-opacity">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>

      {/* Message Body Container */}
      <div className={`w-full ${isUser ? "pl-2" : "pl-2 bg-transparent rounded-r-2xl"}`}>
        {/* Render formatted blocks inside typing wrapper */}
        <div className={`prose prose-stone max-w-none ${fontSizeClass} break-words`}>
          {renderFormattedContent(displayedContent)}
          
          {/* Active indicator when currently typing */}
          {isCurrentlyTyping && (
            <span className="inline-block h-3 w-1.5 bg-[#d97706] ml-1 animate-pulse" />
          )}
        </div>

        {/* Exception alert details */}
        {message.error && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 p-3 text-rose-800 dark:text-rose-200 text-[11px] leading-relaxed">
            <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-900 dark:text-rose-100">Request Error Occurred</p>
              <p className="text-rose-700 dark:text-rose-300">{message.content}</p>
            </div>
          </div>
        )}

        {/* Fallback announcement detail */}
        {!isUser && message.fallbacked && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/55 dark:border-amber-900/30 p-3 text-amber-800 dark:text-amber-200 text-[10px] leading-relaxed">
            <RefreshCw className="h-3 w-3 text-amber-600 shrink-0 mt-0.5 animate-spin-slow" />
            <div>
              <span className="font-medium text-amber-900 dark:text-amber-100">Automatic Fallback Activated: </span>
              <span className="text-amber-700 dark:text-amber-300">
                Primary model (<strong>{message.originalModel?.split("/").pop()?.replace(":free", "")}</strong>) failed with status alert, so ChatBuddy routed the question to <strong>{message.modelUsed?.split("/").pop()?.replace(":free", "")}</strong> to keep the flow alive!
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
