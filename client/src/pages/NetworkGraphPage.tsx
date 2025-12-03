import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import ForceGraph2D from "react-force-graph-2d";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Plus, X, Link2, ZoomIn, ZoomOut, Maximize2, Users } from "lucide-react";
import type { Contact, ContactConnection } from "@/lib/types";
import { connectionTypes } from "@shared/schema";

const connectionTypeLabels: Record<string, string> = {
  friend: "Друзья",
  colleague: "Коллеги",
  partner: "Партнёры",
  family: "Семья",
  client: "Клиент",
  mentor: "Наставник",
  classmate: "Одноклассники",
  neighbor: "Соседи",
  acquaintance: "Знакомые",
  other: "Другое",
};

const valueCategoryColors: Record<string, string> = {
  AA: "#22c55e",
  AB: "#84cc16",
  BA: "#84cc16",
  BB: "#eab308",
  AC: "#a3e635",
  CA: "#a3e635",
  BC: "#facc15",
  CB: "#facc15",
  CC: "#f97316",
  AD: "#d9f99d",
  DA: "#d9f99d",
  BD: "#fde047",
  DB: "#fde047",
  CD: "#fb923c",
  DC: "#fb923c",
  DD: "#94a3b8",
};

interface GraphNode {
  id: string;
  name: string;
  shortName?: string | null;
  valueCategory: string;
  color: string;
  size: number;
}

interface GraphLink {
  source: string;
  target: string;
  connectionType: string;
  strength: number;
  id: string;
}

export default function NetworkGraphPage() {
  const { toast } = useToast();
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [fromContactId, setFromContactId] = useState("");
  const [toContactId, setToContactId] = useState("");
  const [connectionType, setConnectionType] = useState<string>("acquaintance");
  const [connectionStrength, setConnectionStrength] = useState(3);
  const [connectionNotes, setConnectionNotes] = useState("");

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width || 800,
          height: Math.max(rect.height - 60, 400),
        });
      }
    };
    
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const { data: contacts = [], isLoading: contactsLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const { data: connections = [], isLoading: connectionsLoading } = useQuery<ContactConnection[]>({
    queryKey: ["/api/connections"],
  });

  const createConnectionMutation = useMutation({
    mutationFn: async (data: { fromContactId: string; toContactId: string; connectionType: string; strength: number; notes?: string }) => {
      await apiRequest("POST", "/api/connections", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      toast({ title: "Связь создана" });
      setShowAddDialog(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: error.message || "Ошибка создания связи", variant: "destructive" });
    },
  });

  const deleteConnectionMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/connections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      toast({ title: "Связь удалена" });
    },
    onError: () => {
      toast({ title: "Ошибка удаления связи", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFromContactId("");
    setToContactId("");
    setConnectionType("acquaintance");
    setConnectionStrength(3);
    setConnectionNotes("");
    setSelectedNode(null);
  };

  const graphData = useMemo(() => {
    const connectedContactIds = new Set<string>();
    connections.forEach((c) => {
      connectedContactIds.add(c.fromContactId);
      connectedContactIds.add(c.toContactId);
    });

    const nodes: GraphNode[] = contacts
      .filter((contact) => connectedContactIds.has(contact.id))
      .map((contact) => ({
        id: contact.id,
        name: contact.shortName || contact.fullName,
        shortName: contact.shortName,
        valueCategory: contact.valueCategory,
        color: valueCategoryColors[contact.valueCategory] || "#94a3b8",
        size: 8 + (contact.contributionScore + contact.potentialScore) / 2,
      }));

    const seenPairs = new Set<string>();
    const links: GraphLink[] = [];
    
    for (const conn of connections) {
      const pairKey = [conn.fromContactId, conn.toContactId].sort().join("-");
      if (!seenPairs.has(pairKey)) {
        seenPairs.add(pairKey);
        links.push({
          source: conn.fromContactId,
          target: conn.toContactId,
          connectionType: conn.connectionType,
          strength: conn.strength,
          id: conn.id,
        });
      }
    }

    return { nodes, links };
  }, [contacts, connections]);

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);
    setFromContactId(node.id);
    setShowAddDialog(true);
  }, []);

  const handleLinkClick = useCallback((link: GraphLink) => {
    if (confirm("Удалить эту связь?")) {
      deleteConnectionMutation.mutate(link.id);
    }
  }, [deleteConnectionMutation]);

  const handleZoomIn = () => {
    if (graphRef.current) {
      graphRef.current.zoom(graphRef.current.zoom() * 1.5, 300);
    }
  };

  const handleZoomOut = () => {
    if (graphRef.current) {
      graphRef.current.zoom(graphRef.current.zoom() / 1.5, 300);
    }
  };

  const handleFitView = () => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400);
    }
  };

  const handleCreateConnection = () => {
    if (!fromContactId || !toContactId) {
      toast({ title: "Выберите оба контакта", variant: "destructive" });
      return;
    }
    if (fromContactId === toContactId) {
      toast({ title: "Нельзя создать связь с самим собой", variant: "destructive" });
      return;
    }
    createConnectionMutation.mutate({
      fromContactId,
      toContactId,
      connectionType,
      strength: connectionStrength,
      notes: connectionNotes || undefined,
    });
  };

  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D) => {
    const size = node.size || 8;
    const fontSize = Math.max(10, size * 0.8);
    
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
    ctx.fillStyle = node.color;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.font = `${fontSize}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#1f2937";
    
    const label = node.name.length > 15 ? node.name.slice(0, 12) + "..." : node.name;
    ctx.fillText(label, node.x, node.y + size + 4);
  }, []);

  const linkCanvasObject = useCallback((link: any, ctx: CanvasRenderingContext2D) => {
    const start = link.source;
    const end = link.target;
    
    if (typeof start !== 'object' || typeof end !== 'object') return;
    
    const lineWidth = 1 + link.strength * 0.5;
    
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.strokeStyle = "rgba(100, 116, 139, 0.5)";
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }, []);

  if (contactsLoading || connectionsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-3">
          <Link2 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-semibold">Граф связей</h1>
            <p className="text-sm text-muted-foreground">
              {graphData.nodes.length} контактов, {graphData.links.length} связей
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleZoomOut} data-testid="button-zoom-out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleZoomIn} data-testid="button-zoom-in">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleFitView} data-testid="button-fit-view">
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button onClick={() => { resetForm(); setShowAddDialog(true); }} data-testid="button-add-connection">
            <Plus className="h-4 w-4 mr-2" />
            Добавить связь
          </Button>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 bg-muted/30 relative">
        {graphData.nodes.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
            <Users className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-medium mb-2">Нет связей</h2>
            <p className="text-muted-foreground mb-4 max-w-md">
              Добавьте связи между контактами, чтобы увидеть граф отношений. 
              Нажмите кнопку "Добавить связь" чтобы начать.
            </p>
            <Button onClick={() => { resetForm(); setShowAddDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Добавить первую связь
            </Button>
          </div>
        ) : (
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            width={dimensions.width}
            height={dimensions.height}
            nodeCanvasObject={nodeCanvasObject}
            nodePointerAreaPaint={(node: any, color, ctx) => {
              ctx.beginPath();
              ctx.arc(node.x, node.y, node.size + 5, 0, 2 * Math.PI);
              ctx.fillStyle = color;
              ctx.fill();
            }}
            linkCanvasObject={linkCanvasObject}
            onNodeClick={handleNodeClick}
            onLinkClick={handleLinkClick}
            cooldownTicks={100}
            linkDirectionalParticles={0}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
          />
        )}
        
        <Card className="absolute bottom-4 left-4 w-48 p-3">
          <div className="text-xs font-medium mb-2">Категории ценности</div>
          <div className="grid grid-cols-2 gap-1 text-xs">
            {Object.entries(valueCategoryColors).slice(0, 6).map(([cat, color]) => (
              <div key={cat} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span>{cat}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedNode ? `Связи для: ${selectedNode.name}` : "Новая связь"}
            </DialogTitle>
            <DialogDescription>
              Укажите контакты и тип их связи
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>От контакта</Label>
              <Select value={fromContactId} onValueChange={setFromContactId}>
                <SelectTrigger data-testid="select-from-contact">
                  <SelectValue placeholder="Выберите контакт" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>К контакту</Label>
              <Select value={toContactId} onValueChange={setToContactId}>
                <SelectTrigger data-testid="select-to-contact">
                  <SelectValue placeholder="Выберите контакт" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.filter((c) => c.id !== fromContactId).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Тип связи</Label>
              <Select value={connectionType} onValueChange={setConnectionType}>
                <SelectTrigger data-testid="select-connection-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {connectionTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {connectionTypeLabels[type] || type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Сила связи (1-5)</Label>
              <Select 
                value={connectionStrength.toString()} 
                onValueChange={(v) => setConnectionStrength(parseInt(v))}
              >
                <SelectTrigger data-testid="select-connection-strength">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Слабая</SelectItem>
                  <SelectItem value="2">2 - Ниже среднего</SelectItem>
                  <SelectItem value="3">3 - Средняя</SelectItem>
                  <SelectItem value="4">4 - Выше среднего</SelectItem>
                  <SelectItem value="5">5 - Сильная</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Заметки (опционально)</Label>
              <Textarea
                value={connectionNotes}
                onChange={(e) => setConnectionNotes(e.target.value)}
                placeholder="Как они познакомились, общие интересы..."
                data-testid="input-connection-notes"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Отмена
            </Button>
            <Button 
              onClick={handleCreateConnection}
              disabled={createConnectionMutation.isPending}
              data-testid="button-create-connection"
            >
              {createConnectionMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Создать связь
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
