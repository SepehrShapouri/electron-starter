"use client";

import * as React from "react";

import { AppIcon } from "@/components/app-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type DataTableColumn<T> = {
  key: keyof T;
  header: string;
  sortable?: boolean;
  className?: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
};

type SortDirection = "asc" | "desc";

export type DataTableProps<T extends { id: string | number }> = {
  columns: Array<DataTableColumn<T>>;
  data: T[];
  searchPlaceholder?: string;
  pageSize?: number;
  emptyText?: string;
  className?: string;
};

export function DataTable<T extends { id: string | number }>({
  columns,
  data,
  searchPlaceholder = "Search rows...",
  pageSize = 6,
  emptyText = "No rows found.",
  className,
}: DataTableProps<T>) {
  const [search, setSearch] = React.useState("");
  const [sortKey, setSortKey] = React.useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("asc");
  const [page, setPage] = React.useState(1);

  const filteredRows = React.useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return data;
    }

    return data.filter((row) => {
      return Object.values(row).some((value) =>
        String(value).toLowerCase().includes(normalizedSearch),
      );
    });
  }, [data, search]);

  const sortedRows = React.useMemo(() => {
    if (!sortKey) {
      return filteredRows;
    }

    return [...filteredRows].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];
      const comparison = String(aValue).localeCompare(String(bValue), undefined, {
        numeric: true,
        sensitivity: "base",
      });

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredRows, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));

  React.useEffect(() => {
    setPage(1);
  }, [search, sortDirection, sortKey]);

  React.useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const startIndex = (page - 1) * pageSize;
  const visibleRows = sortedRows.slice(startIndex, startIndex + pageSize);

  const handleSort = (column: DataTableColumn<T>) => {
    if (!column.sortable) {
      return;
    }

    if (sortKey === column.key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(column.key);
    setSortDirection("asc");
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={searchPlaceholder}
          className="sm:max-w-sm"
        />
        <p className="text-muted-foreground text-xs">
          Showing {visibleRows.length} of {sortedRows.length} rows
        </p>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => {
                const isActive = sortKey === column.key;
                const iconClassName = cn(
                  "size-3.5 opacity-40",
                  isActive && "opacity-100",
                  isActive && sortDirection === "asc" && "rotate-180",
                );

                return (
                  <TableHead key={String(column.key)} className={column.className}>
                    {column.sortable ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort(column)}
                        className="-ml-2 h-7 px-2"
                      >
                        <span>{column.header}</span>
                        <AppIcon
                          name="IconChevronDownMedium"
                          fallbackName="IconCircle"
                          className={iconClassName}
                        />
                      </Button>
                    ) : (
                      column.header
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.length ? (
              visibleRows.map((row) => (
                <TableRow key={String(row.id)}>
                  {columns.map((column) => (
                    <TableCell key={`${String(row.id)}-${String(column.key)}`} className={column.className}>
                      {column.render ? column.render(row[column.key], row) : String(row[column.key])}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {emptyText}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage((currentPage) => currentPage - 1)}
        >
          <AppIcon
            name="IconChevronRightMedium"
            fallbackName="IconCircle"
            className="size-3.5 rotate-180"
          />
          Previous
        </Button>
        <p className="text-muted-foreground text-xs">
          Page {page} of {totalPages}
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => setPage((currentPage) => currentPage + 1)}
        >
          Next
          <AppIcon name="IconChevronRightMedium" fallbackName="IconCircle" className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
