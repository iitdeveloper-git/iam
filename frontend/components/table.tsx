import type React from "react";

export function DataTable({
  headers,
  rows,
  onRowClick,
}: {
  headers: string[];
  rows: Array<Array<React.ReactNode>>;
  onRowClick?: (index: number) => void;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-line bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>{headers.map((header) => <th key={header} className="px-4 py-3 font-medium">{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td className="px-4 py-10 text-center text-slate-500" colSpan={headers.length}>No records yet</td></tr>
          ) : rows.map((row, index) => (
            <tr
              key={index}
              className={`border-t border-line ${onRowClick ? "cursor-pointer hover:bg-slate-50 transition" : ""}`}
              onClick={() => onRowClick && onRowClick(index)}
            >
              {row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3 text-slate-700">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
