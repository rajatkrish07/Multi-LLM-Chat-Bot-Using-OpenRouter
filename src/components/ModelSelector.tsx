import React from "react";
import { Bot, Check, Info } from "lucide-react";
import { LLMModel } from "../types";
import { FREE_MODELS } from "../utils/openRouter";

interface ModelSelectorProps {
  selectedModel: LLMModel;
  onSelectModel: (model: LLMModel) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function ModelSelector({
  selectedModel,
  onSelectModel,
  isOpen,
  onClose,
}: ModelSelectorProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Background click-to-close escape key */}
      <div 
        className="fixed inset-0 z-40 cursor-default" 
        onClick={onClose}
      />
      
      {/* Popover Card */}
      <div 
        className="absolute bottom-18 right-2 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-[#e5e2da] dark:border-[#2b2926] bg-white dark:bg-[#1c1b19] p-4 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-150"
        style={{ transformOrigin: "bottom right" }}
      >
        <div className="mb-3 flex items-center justify-between border-b border-[#f3f1eb] dark:border-[#262522] pb-2">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-[#8b5cf6] dark:text-[#a78bfa]" />
            <span className="font-display text-xs font-semibold text-[#1d1c1a] dark:text-[#f3f1ed] uppercase tracking-wider">
              Select Model (Free Tier)
            </span>
          </div>
          <span className="text-[10px] font-mono rounded bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 text-emerald-600 dark:text-emerald-400 font-bold">
            No Costs
          </span>
        </div>

        <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto custom-scrollbar pr-0.5">
          {FREE_MODELS.map((model) => {
            const isSelected = model.id === selectedModel.id;
            return (
              <button
                key={model.id}
                onClick={() => {
                  onSelectModel(model);
                  onClose();
                }}
                className={`group flex flex-col w-full text-left p-2.5 rounded-xl transition-all duration-150 border ${
                  isSelected
                    ? "bg-[#faf9f4] dark:bg-[#252422] border-[#d97706]/40 dark:border-[#d97706]/35 text-[#1d1c1a] dark:text-[#fbfaf7]"
                    : "bg-white dark:bg-[#1c1b19] border-transparent hover:bg-[#fcfbf9] dark:hover:bg-[#22211e] text-[#5c5954] dark:text-[#c4c1b9]"
                }`}
              >
                <div className="flex items-start justify-between w-full">
                  <div className="font-sans font-medium text-xs text-[#1d1c1a] dark:text-[#fbfaf7] group-hover:text-[#d97706] dark:group-hover:text-amber-500 transition-colors">
                    {model.name}
                  </div>
                  {isSelected && (
                    <Check className="h-3.5 w-3.5 text-[#d97706] shrink-0 mt-0.5" />
                  )}
                </div>
                
                <p className="mt-1 text-[11px] leading-relaxed text-[#8a857c] dark:text-[#a09a8f] line-clamp-2">
                  {model.description}
                </p>

                <div className="mt-1.5 flex items-center gap-2 text-[9px] text-[#a19c91] dark:text-[#706c64] font-mono">
                  <span className="px-1.5 py-0.5 rounded bg-[#f3f1eb] dark:bg-[#2a2926] text-[#8a857c] dark:text-[#c4c1b9] uppercase font-semibold">
                    {model.provider}
                  </span>
                  <span>•</span>
                  <span>{model.contextLength.toLocaleString()} tokens ctx</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-3 border-t border-[#f3f1eb] dark:border-[#262522] pt-2 flex items-start gap-1.5 text-[10px] text-[#8a857c] dark:text-[#a09a8f] leading-relaxed bg-[#faf8f4] dark:bg-[#1a1917] p-2 rounded-xl border border-transparent dark:border-[#262522]">
          <Info className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
          <span>
            <strong>Fail-safe Routing:</strong> ChatBuddy monitors connection status. If your chosen model hits an issue, it fallbacks automatically.
          </span>
        </div>
      </div>
    </>
  );
}
