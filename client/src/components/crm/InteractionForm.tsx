import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { INTERACTION_TYPES, INTERACTION_CHANNELS } from "@/lib/constants";
import { Calendar } from "lucide-react";

interface InteractionFormProps {
  onSubmit: (data: {
    date: string;
    type: string;
    channel: string;
    note: string;
    isMeaningful: boolean;
  }) => void;
  onCancel: () => void;
}

export function InteractionForm({ onSubmit, onCancel }: InteractionFormProps) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [type, setType] = useState("");
  const [channel, setChannel] = useState("");
  const [note, setNote] = useState("");
  const [isMeaningful, setIsMeaningful] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || !channel) return;
    onSubmit({ date, type, channel, note, isMeaningful });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Дата</Label>
          <div className="relative">
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="pl-9"
              data-testid="input-date"
            />
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Тип</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger id="type" data-testid="select-type">
              <SelectValue placeholder="Выберите тип" />
            </SelectTrigger>
            <SelectContent>
              {INTERACTION_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="channel">Канал</Label>
        <Select value={channel} onValueChange={setChannel}>
          <SelectTrigger id="channel" data-testid="select-channel">
            <SelectValue placeholder="Выберите канал" />
          </SelectTrigger>
          <SelectContent>
            {INTERACTION_CHANNELS.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Заметка</Label>
        <Textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Краткое описание..."
          rows={3}
          data-testid="textarea-note"
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="meaningful"
          checked={isMeaningful}
          onCheckedChange={(checked) => setIsMeaningful(checked === true)}
          data-testid="checkbox-meaningful"
        />
        <Label htmlFor="meaningful" className="text-sm font-normal cursor-pointer">
          Meaningful-контакт (участвует в расчётах)
        </Label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
          Отмена
        </Button>
        <Button type="submit" disabled={!type || !channel} data-testid="button-submit">
          Добавить
        </Button>
      </div>
    </form>
  );
}
