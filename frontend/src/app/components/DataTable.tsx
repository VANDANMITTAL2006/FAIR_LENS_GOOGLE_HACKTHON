import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  onRowClick?: (row: any) => void;
}

export function DataTable({ columns, data, onRowClick }: DataTableProps) {
  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-800 bg-zinc-900/50">
            {columns.map((col) => (
              <TableHead key={col.key} className="text-zinc-400">
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, idx) => (
            <TableRow
              key={idx}
              className="border-zinc-800 hover:bg-zinc-900/50 cursor-pointer transition-colors"
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <TableCell key={col.key} className="text-zinc-300">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
