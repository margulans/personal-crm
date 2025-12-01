import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Filters {
  search: string;
  importance: string;
  valueCategory: string;
  heatStatus: string;
}

interface ContactFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

export function ContactFilters({ filters, onFiltersChange }: ContactFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  const updateFilter = (key: keyof Filters, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      importance: "",
      valueCategory: "",
      heatStatus: "",
    });
  };

  const activeFilterCount = [
    filters.importance,
    filters.valueCategory,
    filters.heatStatus,
  ].filter(Boolean).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по имени или тегам..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
          {filters.search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => updateFilter("search", "")}
              data-testid="button-clear-search"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <Button
          variant="outline"
          size="default"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
          data-testid="button-toggle-filters"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Фильтры
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="default"
            onClick={clearFilters}
            className="text-muted-foreground"
            data-testid="button-clear-filters"
          >
            Сбросить
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-3 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Важность
            </label>
            <Select
              value={filters.importance}
              onValueChange={(v) => updateFilter("importance", v)}
            >
              <SelectTrigger className="w-[120px]" data-testid="select-importance">
                <SelectValue placeholder="Все" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="A">A - Высокая</SelectItem>
                <SelectItem value="B">B - Средняя</SelectItem>
                <SelectItem value="C">C - Низкая</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Категория
            </label>
            <Select
              value={filters.valueCategory}
              onValueChange={(v) => updateFilter("valueCategory", v)}
            >
              <SelectTrigger className="w-[130px]" data-testid="select-category">
                <SelectValue placeholder="Все" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="AA">AA</SelectItem>
                <SelectItem value="AB">AB</SelectItem>
                <SelectItem value="BA">BA</SelectItem>
                <SelectItem value="BB">BB</SelectItem>
                <SelectItem value="BC">BC</SelectItem>
                <SelectItem value="CC">CC</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Статус
            </label>
            <Select
              value={filters.heatStatus}
              onValueChange={(v) => updateFilter("heatStatus", v)}
            >
              <SelectTrigger className="w-[140px]" data-testid="select-status">
                <SelectValue placeholder="Все" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="green">Зелёный</SelectItem>
                <SelectItem value="yellow">Жёлтый</SelectItem>
                <SelectItem value="red">Красный</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
