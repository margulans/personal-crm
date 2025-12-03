import { useState, useCallback, useMemo, useRef, useEffect, Component, type ReactNode } from "react";
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
import { Loader2, Plus, X, Link2, ZoomIn, ZoomOut, Maximize2, Users, Menu, RefreshCw, Hand, Play, PanelLeft } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import type { Contact, ContactConnection } from "@/lib/types";
import { connectionTypes } from "@shared/schema";

interface GraphErrorBoundaryProps {
  children: ReactNode;
  onReset: () => void;
}

interface GraphErrorBoundaryState {
  hasError: boolean;
  errorCount: number;
}

class GraphErrorBoundary extends Component<GraphErrorBoundaryProps, GraphErrorBoundaryState> {
  constructor(props: GraphErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorCount: 0 };
  }

  static getDerivedStateFromError(): Partial<GraphErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    if (error.message?.includes('initPos') || error.message?.includes('undefined')) {
      this.setState(prev => ({ errorCount: prev.errorCount + 1 }));
      if (this.state.errorCount < 3) {
        setTimeout(() => {
          this.setState({ hasError: false });
          this.props.onReset();
        }, 300);
      }
    }
  }

  render() {
    if (this.state.hasError && this.state.errorCount >= 3) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
          <RefreshCw className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h2 className="text-lg font-medium mb-2">Ошибка загрузки графа</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Произошла ошибка при отрисовке графа. Попробуйте обновить страницу.
          </p>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Обновить страницу
          </Button>
        </div>
      );
    }

    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    return this.props.children;
  }
}

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

const strengthColors: Record<number, string> = {
  1: "rgba(148, 163, 184, 0.3)",
  2: "rgba(148, 163, 184, 0.45)",
  3: "rgba(148, 163, 184, 0.6)",
  4: "rgba(203, 213, 225, 0.75)",
  5: "rgba(226, 232, 240, 0.9)",
};

interface GraphNode {
  id: string;
  name: string;
  shortName?: string | null;
  valueCategory: string;
  color: string;
  size: number;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  connectionType: string;
  strength: number;
  id: string;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
  
  return isMobile;
}

export default function NetworkGraphPage() {
  const { toast } = useToast();
  const { toggleSidebar } = useSidebar();
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [graphKey, setGraphKey] = useState(0);
  const [isGraphReady, setIsGraphReady] = useState(false);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showLegend, setShowLegend] = useState(!isMobile);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [fromContactId, setFromContactId] = useState("");
  const [toContactId, setToContactId] = useState("");
  const [connectionType, setConnectionType] = useState<string>("acquaintance");
  const [connectionStrength, setConnectionStrength] = useState(3);
  const [connectionNotes, setConnectionNotes] = useState("");
  const [manualMode, setManualMode] = useState(false);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newWidth = Math.max(rect.width || 300, 300);
        const newHeight = Math.max(rect.height || 300, 300);
        
        setDimensions({ width: newWidth, height: newHeight });
      }
    };
    
    const debouncedUpdate = () => {
      setIsGraphReady(false);
      
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      resizeTimeoutRef.current = setTimeout(() => {
        updateDimensions();
        setGraphKey(k => k + 1);
        setTimeout(() => setIsGraphReady(true), 150);
      }, 200);
    };
    
    updateDimensions();
    setTimeout(() => setIsGraphReady(true), 200);
    
    window.addEventListener("resize", debouncedUpdate);
    return () => {
      window.removeEventListener("resize", debouncedUpdate);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
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

    const baseSize = isMobile ? 12 : 8;
    const nodes: GraphNode[] = contacts
      .filter((contact) => connectedContactIds.has(contact.id))
      .map((contact) => ({
        id: contact.id,
        name: contact.shortName || contact.fullName,
        shortName: contact.shortName,
        valueCategory: contact.valueCategory,
        color: valueCategoryColors[contact.valueCategory] || "#94a3b8",
        size: baseSize + (contact.contributionScore + contact.potentialScore) / 2,
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
  }, [contacts, connections, isMobile]);

  useEffect(() => {
    if (graphRef.current && isGraphReady && !manualMode) {
      const fg = graphRef.current;
      const nodeCount = graphData.nodes.length || 1;
      const chargeStrength = Math.max(-800, -200 - nodeCount * 50);
      const linkDistance = Math.max(80, 150 - nodeCount * 5);
      
      fg.d3Force('charge')?.strength(chargeStrength);
      fg.d3Force('link')?.distance(linkDistance);
      fg.d3Force('center')?.strength(0.1);
      
      setTimeout(() => {
        if (graphRef.current && !manualMode) {
          graphRef.current.zoomToFit(400, isMobile ? 40 : 60);
        }
      }, 500);
    }
  }, [graphKey, isGraphReady, graphData.nodes.length, isMobile, manualMode]);

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
      graphRef.current.zoomToFit(400, isMobile ? 30 : 50);
    }
  };

  const handleNodeDrag = useCallback((node: any) => {
    if (manualMode) {
      node.fx = node.x;
      node.fy = node.y;
    }
  }, [manualMode]);

  const handleNodeDragEnd = useCallback((node: any) => {
    if (manualMode) {
      node.fx = node.x;
      node.fy = node.y;
    } else {
      node.fx = undefined;
      node.fy = undefined;
    }
  }, [manualMode]);

  const toggleManualMode = () => {
    const newMode = !manualMode;
    setManualMode(newMode);
    
    if (!newMode) {
      graphData.nodes.forEach((node: any) => {
        node.fx = undefined;
        node.fy = undefined;
      });
      setGraphKey(k => k + 1);
    }
    
    toast({ 
      title: newMode ? "Ручной режим включён" : "Автоматический режим включён",
      description: newMode ? "Перетаскивайте узлы для расположения" : "Узлы распределятся автоматически"
    });
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
    if (typeof node.x !== 'number' || typeof node.y !== 'number' || isNaN(node.x) || isNaN(node.y)) {
      return;
    }
    
    const size = node.size || (isMobile ? 14 : 10);
    const fontSize = isMobile ? Math.max(10, size * 0.7) : Math.max(9, size * 0.7);
    
    ctx.save();
    ctx.shadowColor = node.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
    ctx.fillStyle = node.color;
    ctx.fill();
    ctx.restore();
    
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.font = `${fontSize}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(226, 232, 240, 0.9)";
    
    const maxLength = isMobile ? 12 : 18;
    const label = node.name.length > maxLength ? node.name.slice(0, maxLength - 3) + "..." : node.name;
    ctx.fillText(label, node.x, node.y + size + 4);
  }, [isMobile]);

  const nodePointerAreaPaint = useCallback((node: any, color: string, ctx: CanvasRenderingContext2D) => {
    if (typeof node.x !== 'number' || typeof node.y !== 'number' || isNaN(node.x) || isNaN(node.y)) {
      return;
    }
    
    const hitArea = isMobile ? 20 : 5;
    ctx.beginPath();
    ctx.arc(node.x, node.y, (node.size || 8) + hitArea, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
  }, [isMobile]);

  const linkCanvasObject = useCallback((link: any, ctx: CanvasRenderingContext2D) => {
    const start = link.source;
    const end = link.target;
    
    if (typeof start !== 'object' || typeof end !== 'object') return;
    if (typeof start.x !== 'number' || typeof start.y !== 'number' || isNaN(start.x) || isNaN(start.y)) return;
    if (typeof end.x !== 'number' || typeof end.y !== 'number' || isNaN(end.x) || isNaN(end.y)) return;
    
    const strength = Math.min(5, Math.max(1, link.strength || 3));
    const lineWidth = isMobile ? 0.5 + strength * 0.3 : 0.3 + strength * 0.2;
    const strokeColor = strengthColors[strength] || strengthColors[3];
    
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }, [isMobile]);

  if (contactsLoading || connectionsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between p-2 md:p-3 border-b bg-background gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={toggleSidebar} className="shrink-0 h-8 w-8" data-testid="button-sidebar-toggle">
              <PanelLeft className="h-4 w-4" />
            </Button>
          )}
          <Link2 className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0" />
          <div className="min-w-0">
            <h1 className="text-sm md:text-lg font-semibold truncate leading-tight">Граф связей</h1>
            <p className="text-xs text-muted-foreground leading-tight">
              {graphData.nodes.length} контактов, {graphData.links.length} связей
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 md:gap-2 shrink-0">
          <Button 
            variant={manualMode ? "default" : "outline"} 
            size="icon" 
            onClick={toggleManualMode} 
            data-testid="button-toggle-mode"
            title={manualMode ? "Ручной режим (нажмите для авто)" : "Авто режим (нажмите для ручного)"}
          >
            {manualMode ? <Hand className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          {!isMobile && (
            <>
              <Button variant="outline" size="icon" onClick={handleZoomOut} data-testid="button-zoom-out">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleZoomIn} data-testid="button-zoom-in">
                <ZoomIn className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button variant="outline" size="icon" onClick={handleFitView} data-testid="button-fit-view">
            <Maximize2 className="h-4 w-4" />
          </Button>
          {isMobile ? (
            <Button size="icon" onClick={() => { resetForm(); setShowAddDialog(true); }} data-testid="button-add-connection">
              <Plus className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={() => { resetForm(); setShowAddDialog(true); }} data-testid="button-add-connection">
              <Plus className="h-4 w-4 mr-2" />
              Добавить связь
            </Button>
          )}
        </div>
      </div>

      <div ref={containerRef} className="flex-1 relative touch-pan-x touch-pan-y" style={{ backgroundColor: '#1e1b2e' }}>
        {graphData.nodes.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 md:p-8">
            <Users className="h-12 w-12 md:h-16 md:w-16 text-slate-400/50 mb-4" />
            <h2 className="text-lg md:text-xl font-medium mb-2 text-slate-200">Нет связей</h2>
            <p className="text-sm md:text-base text-slate-400 mb-4 max-w-md">
              Добавьте связи между контактами, чтобы увидеть граф отношений.
            </p>
            <Button onClick={() => { resetForm(); setShowAddDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Добавить первую связь
            </Button>
          </div>
        ) : isGraphReady ? (
          <GraphErrorBoundary onReset={() => setGraphKey(k => k + 1)}>
            <ForceGraph2D
              key={graphKey}
              ref={graphRef}
              graphData={graphData}
              width={dimensions.width}
              height={dimensions.height}
              backgroundColor="#1e1b2e"
              nodeCanvasObject={nodeCanvasObject}
              nodePointerAreaPaint={nodePointerAreaPaint}
              linkCanvasObject={linkCanvasObject}
              onNodeClick={handleNodeClick}
              onNodeDrag={handleNodeDrag}
              onNodeDragEnd={handleNodeDragEnd}
              onLinkClick={handleLinkClick}
              onEngineStop={() => {
                if (!manualMode && graphRef.current) {
                  graphRef.current.zoomToFit(300, isMobile ? 40 : 60);
                }
              }}
              cooldownTicks={manualMode ? 0 : 150}
              warmupTicks={manualMode ? 0 : 50}
              linkDirectionalParticles={0}
              d3AlphaDecay={manualMode ? 1 : 0.02}
              d3VelocityDecay={manualMode ? 1 : 0.3}
              d3AlphaMin={0.001}
              enableNodeDrag={true}
              enablePanInteraction={true}
              enableZoomInteraction={true}
              minZoom={0.3}
              maxZoom={5}
            />
          </GraphErrorBoundary>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        
        {graphData.nodes.length > 0 && (
          <>
            {isMobile ? (
              <Button
                variant="outline"
                size="sm"
                className="absolute bottom-2 left-2 h-7 text-xs bg-slate-800/90 border-slate-600 text-slate-200 hover:bg-slate-700"
                onClick={() => setShowLegend(!showLegend)}
              >
                <Menu className="h-3 w-3 mr-1" />
                Легенда
              </Button>
            ) : null}
            
            {(showLegend || !isMobile) && (
              <div className={`absolute ${isMobile ? 'bottom-10 left-2 right-2' : 'bottom-3 left-3 w-52'} p-2 rounded-lg bg-slate-800/90 backdrop-blur-sm border border-slate-600`}>
                {isMobile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-5 w-5 text-slate-400 hover:text-slate-200"
                    onClick={() => setShowLegend(false)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
                <div className="text-[10px] font-medium mb-1 text-slate-300">Важность</div>
                <div className={`grid ${isMobile ? 'grid-cols-5' : 'grid-cols-4'} gap-0.5 text-[10px] mb-2`}>
                  {Object.entries(valueCategoryColors).slice(0, isMobile ? 10 : 8).map(([cat, color]) => (
                    <div key={cat} className="flex items-center gap-0.5">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 3px ${color}` }} />
                      <span className="text-slate-400">{cat}</span>
                    </div>
                  ))}
                </div>
                <div className="text-[10px] font-medium mb-1 text-slate-300">Сила связи</div>
                <div className="flex items-center gap-1.5 text-[10px]">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <div key={s} className="flex items-center gap-0.5">
                      <div className="w-4 h-0.5 rounded" style={{ backgroundColor: strengthColors[s].replace(/[\d.]+\)$/, '1)') }} />
                      <span className="text-slate-400">{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-[95vw] md:max-w-lg max-h-[90vh] overflow-y-auto">
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
                <SelectContent className="max-h-[40vh]">
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
                <SelectContent className="max-h-[40vh]">
                  {contacts.filter((c) => c.id !== fromContactId).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
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
                <Label>Сила (1-5)</Label>
                <Select 
                  value={connectionStrength.toString()} 
                  onValueChange={(v) => setConnectionStrength(parseInt(v))}
                >
                  <SelectTrigger data-testid="select-connection-strength">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Слабая</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3 - Средняя</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5 - Сильная</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Заметки (опционально)</Label>
              <Textarea
                value={connectionNotes}
                onChange={(e) => setConnectionNotes(e.target.value)}
                placeholder="Как они познакомились..."
                className="min-h-[80px]"
                data-testid="input-connection-notes"
              />
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="w-full sm:w-auto">
              Отмена
            </Button>
            <Button 
              onClick={handleCreateConnection}
              disabled={createConnectionMutation.isPending}
              className="w-full sm:w-auto"
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
