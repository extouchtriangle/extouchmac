import React from "react";
import { Range, OperationConfig } from "../types";

interface Props {
  id: string;
  label: string;
  symbol: string;
  config: OperationConfig;
  showRange2?: boolean;
  onEnableChange: () => void;
  onRangeChange: (
    which: "range1" | "range2",
    field: "min" | "max",
    value: number
  ) => void;
}

export default function OperationConfigSection({
  id,
  label,
  symbol,
  config,
  showRange2,
  onEnableChange,
  onRangeChange,
}: Props) {
  return (
    <div className="flex items-start gap-3">
      <input
        type="checkbox"
        checked={config.enabled}
        onChange={onEnableChange}
        className="mt-1 h-5 w-5 text-blue-600"
        id={id}
      />
      <div className="flex-1">
        <label htmlFor={id} className="font-semibold text-lg">
          {label} <span className="text-gray-500">({symbol})</span>
        </label>
        {symbol === "−" ? (
          <div className="text-sm text-gray-500 mt-1">
            Addition problems in reverse.
          </div>
        ) : symbol === "÷" ? (
          <div className="text-sm text-gray-500 mt-1">
            Multiplication problems in reverse.
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-1 text-sm">
            Range: (
            <input
              type="number"
              className="w-14 px-1 py-0.5 border rounded"
              value={config.range1.min}
              min={-999}
              max={999}
              onChange={(e) =>
                onRangeChange("range1", "min", parseInt(e.target.value) || 0)
              }
            />
            to
            <input
              type="number"
              className="w-14 px-1 py-0.5 border rounded"
              value={config.range1.max}
              min={config.range1.min}
              max={999}
              onChange={(e) =>
                onRangeChange("range1", "max", parseInt(e.target.value) || 0)
              }
            />
            )
            {showRange2 && (
              <>
                {symbol === "+"
                  ? " + ("
                  : symbol === "×"
                  ? " × ("
                  : symbol === "÷"
                  ? " ÷ ("
                  : ""}
                <input
                  type="number"
                  className="w-14 px-1 py-0.5 border rounded"
                  value={config.range2.min}
                  min={-999}
                  max={999}
                  onChange={(e) =>
                    onRangeChange(
                      "range2",
                      "min",
                      parseInt(e.target.value) || 0
                    )
                  }
                />
                to
                <input
                  type="number"
                  className="w-14 px-1 py-0.5 border rounded"
                  value={config.range2.max}
                  min={config.range2.min}
                  max={999}
                  onChange={(e) =>
                    onRangeChange(
                      "range2",
                      "max",
                      parseInt(e.target.value) || 0
                    )
                  }
                />
                )
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
