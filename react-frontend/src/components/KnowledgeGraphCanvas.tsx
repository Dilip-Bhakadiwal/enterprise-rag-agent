import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { GraphNode, GraphLink } from '../types/graph';

interface KnowledgeGraphCanvasProps {
  nodes?: GraphNode[];
  links?: GraphLink[];
  selectedNodeId?: string | null;
  pulseSpeedMultiplier?: number;
  viewPerspective3D?: boolean;
  onSelectNode?: (node: GraphNode | null) => void;
  onStatsUpdate?: (fps: number, particleCount: number) => void;
}

// ── COLOR HELPERS ──────────────────────────────────────────────────────────
const RGBA_CACHE: Record<string, string> = {};
const hexToRgba = (hex: string, alpha: number): string => {
  const key = `${hex}_${alpha}`;
  if (RGBA_CACHE[key]) return RGBA_CACHE[key];
  let h = (hex || '#10b981').replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const r = parseInt(h.substring(0, 2), 16) || 16;
  const g = parseInt(h.substring(2, 4), 16) || 185;
  const b = parseInt(h.substring(4, 6), 16) || 129;
  const res = `rgba(${r}, ${g}, ${b}, ${alpha})`;
  RGBA_CACHE[key] = res;
  return res;
};

// ── REFINED KNOWLEDGE DOMAINS (Linear / Cosmograph Minimal Precision) ───────
export interface KnowledgeDomain {
  id: string;
  name: string;
  subtitle: string;
  x: number;
  y: number;
  headerOffset: number; // Guaranteed safe distance from all nodes
  color: string;
}

const KNOWLEDGE_DOMAINS: Record<string, KnowledgeDomain> = {
  dilip_ai: {
    id: 'dilip_ai',
    name: 'DILIP AI RESEARCH',
    subtitle: 'Multi-Agent RAG & Edge Vision',
    x: 0,
    y: 0,
    headerOffset: -125,
    color: '#10b981', // Emerald
  },
  medical: {
    id: 'medical',
    name: 'CLINICAL ONCOLOGY',
    subtitle: '5,193 Facts • 6 Sub-specialties',
    x: -450,
    y: -80,
    headerOffset: -180,
    color: '#38bdf8', // Electric Sky
  },
  literature: {
    id: 'literature',
    name: 'LITERATURE & MULTI-HOP QA',
    subtitle: '2,282 Knowledge Triples',
    x: 450,
    y: -80,
    headerOffset: -180,
    color: '#a78bfa', // Soft Violet
  },
  corpus: {
    id: 'corpus',
    name: 'GRAPHRAG CORPUS',
    subtitle: 'Pinecone Vector + Neo4j Graph',
    x: 0,
    y: 390,
    headerOffset: -85, // Positioned at y = 305 with all nodes pushed to y >= 390!
    color: '#fbbf24', // Warm Amber
  },
};

const getDomainForCategory = (cat: string): KnowledgeDomain => {
  if (KNOWLEDGE_DOMAINS[cat]) return KNOWLEDGE_DOMAINS[cat];
  if (cat === 'apple' || cat === 'warranty') return KNOWLEDGE_DOMAINS.medical;
  if (cat === 'samsung') return KNOWLEDGE_DOMAINS.literature;
  if (cat === 'stores') return KNOWLEDGE_DOMAINS.corpus;
  return KNOWLEDGE_DOMAINS.dilip_ai;
};

// Animated node state with elastic spring physics & harmonic breathing
interface SimulatedNode extends GraphNode {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase1: number;
  phase2: number;
  freq1: number;
  freq2: number;
  driftRadius: number;
  targetRadius: number;
  currentRadius: number;
}

interface SimulatedPulse {
  sourceId: string;
  targetId: string;
  progress: number;
  speed: number;
  color: string;
  isCurved: boolean;
  ctrlX?: number;
  ctrlY?: number;
}

interface BackgroundStar {
  x: number;
  y: number;
  size: number;
  alpha: number;
  driftSpeed: number;
}

export const KnowledgeGraphCanvas: React.FC<KnowledgeGraphCanvasProps> = ({
  nodes = [],
  links = [],
  selectedNodeId = null,
  pulseSpeedMultiplier = 1.0,
  onSelectNode,
  onStatsUpdate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // ── TRANSFORMS & CAMERA REFS ─────────────────────────────────────────────
  const transformRef = useRef({ x: 0, y: 0, k: 0.75 });
  const selectedIdRef = useRef<string | null>(selectedNodeId);
  selectedIdRef.current = selectedNodeId;
  const hoveredNodeRef = useRef<SimulatedNode | null>(null);
  const mouseWorldPosRef = useRef({ x: 0, y: 0 });
  const mouseScreenPosRef = useRef({ x: 0, y: 0 });
  const isMouseInsideRef = useRef(false);

  // Callbacks
  const onSelectNodeRef = useRef(onSelectNode);
  onSelectNodeRef.current = onSelectNode;
  const onStatsUpdateRef = useRef(onStatsUpdate);
  onStatsUpdateRef.current = onStatsUpdate;
  const pulseSpeedRef = useRef(pulseSpeedMultiplier);
  pulseSpeedRef.current = pulseSpeedMultiplier;

  // Nodes, Links, Background stars
  const simNodesRef = useRef<SimulatedNode[]>([]);
  const simNodeMapRef = useRef<Map<string, SimulatedNode>>(new Map());
  const activeLinksRef = useRef<{
    source: SimulatedNode;
    target: SimulatedNode;
    color: string;
    isCurved: boolean;
    ctrlX?: number;
    ctrlY?: number;
  }[]>([]);
  const pulsesRef = useRef<SimulatedPulse[]>([]);
  const domainTotalsRef = useRef<Record<string, number>>({});
  const bgStarsRef = useRef<BackgroundStar[]>([]);

  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const animFrameIdRef = useRef<number | null>(null);
  const frameCountRef = useRef(0);
  const fpsTimerRef = useRef(performance.now());
  const isInitialCenterDoneRef = useRef(false);

  // Initialize subtle cosmic starfield
  useEffect(() => {
    const stars: BackgroundStar[] = [];
    for (let i = 0; i < 35; i++) {
      stars.push({
        x: (Math.random() - 0.5) * 2200,
        y: (Math.random() - 0.5) * 1600,
        size: 0.7 + Math.random() * 1.3,
        alpha: 0.12 + Math.random() * 0.35,
        driftSpeed: 0.0002 + Math.random() * 0.0003,
      });
    }
    bgStarsRef.current = stars;
  }, []);

  // ── ADJACENCY CACHE ──────────────────────────────────────────────────────
  const adjacency = useMemo(() => {
    const connectedMap = new Map<string, Set<string>>();
    const activeLinksMap = new Map<string, Set<string>>();
    links.forEach((l) => {
      const s = typeof l.source === 'string' ? l.source : (l.source as any).id;
      const t = typeof l.target === 'string' ? l.target : (l.target as any).id;
      if (!connectedMap.has(s)) connectedMap.set(s, new Set());
      if (!connectedMap.has(t)) connectedMap.set(t, new Set());
      connectedMap.get(s)!.add(t);
      connectedMap.get(t)!.add(s);
      if (!activeLinksMap.has(s)) activeLinksMap.set(s, new Set());
      if (!activeLinksMap.has(t)) activeLinksMap.set(t, new Set());
      activeLinksMap.get(s)!.add(l.id);
      activeLinksMap.get(t)!.add(l.id);
    });
    return { connectedMap, activeLinksMap };
  }, [links]);

  const adjacencyRef = useRef(adjacency);
  adjacencyRef.current = adjacency;

  // ── ORGANIC FORCE-DIRECTED CONSTELLATION LAYOUT ─────────────────────────
  const computeOrganicConstellation = useCallback((nodeList: GraphNode[], linkList: GraphLink[]) => {
    const degreeMap = new Map<string, number>();
    linkList.forEach((l) => {
      const s = typeof l.source === 'string' ? l.source : (l.source as any).id;
      const t = typeof l.target === 'string' ? l.target : (l.target as any).id;
      degreeMap.set(s, (degreeMap.get(s) || 0) + 1);
      degreeMap.set(t, (degreeMap.get(t) || 0) + 1);
    });

    const domainBuckets: Record<string, GraphNode[]> = {
      dilip_ai: [],
      medical: [],
      literature: [],
      corpus: [],
    };

    nodeList.forEach((n) => {
      const dom = getDomainForCategory(n.category || 'dilip_ai');
      domainBuckets[dom.id].push(n);
    });

    domainTotalsRef.current = {
      dilip_ai: domainBuckets.dilip_ai.length || 5,
      medical: domainBuckets.medical.length || 5193,
      literature: domainBuckets.literature.length || 2282,
      corpus: domainBuckets.corpus.length || 21,
    };

    // Filter to top clean landmark nodes (~75 total nodes)
    const curatedNodes: GraphNode[] = [];

    // 1. Dilip AI Platform
    curatedNodes.push(...domainBuckets.dilip_ai);

    // 2. Medical Topic nodes + top 16 clean clinical concepts
    const medTopics = domainBuckets.medical.filter((n) => n.subcategory === 'MedicalTopic' || n.hierarchyLevel === 1 || n.hierarchyLevel === 2);
    const medLeaves = domainBuckets.medical
      .filter((n) => !medTopics.includes(n))
      .sort((a, b) => (degreeMap.get(b.id) || 0) - (degreeMap.get(a.id) || 0))
      .slice(0, 16);
    curatedNodes.push(...medTopics, ...medLeaves);

    // 3. Literature entities
    const litNodes = domainBuckets.literature
      .sort((a, b) => {
        const aChunk = a.label.startsWith('Novel-');
        const bChunk = b.label.startsWith('Novel-');
        if (aChunk !== bChunk) return aChunk ? 1 : -1;
        return (degreeMap.get(b.id) || 0) - (degreeMap.get(a.id) || 0);
      })
      .slice(0, 20);
    curatedNodes.push(...litNodes);

    // 4. Corpus nodes
    const corpusNodes = domainBuckets.corpus.slice(0, 9);
    curatedNodes.push(...corpusNodes);

    // Selected node guarantee
    if (selectedIdRef.current) {
      const sel = nodeList.find((n) => n.id === selectedIdRef.current);
      if (sel && !curatedNodes.some((n) => n.id === sel.id)) {
        curatedNodes.push(sel);
      }
    }

    // Build simulated nodes with collision-free organic clustering
    const simList: SimulatedNode[] = [];
    const simMap = new Map<string, SimulatedNode>();

    Object.entries(KNOWLEDGE_DOMAINS).forEach(([domId, dom]) => {
      const nodesInDom = curatedNodes.filter((n) => getDomainForCategory(n.category || 'dilip_ai').id === domId);
      if (nodesInDom.length === 0) return;

      const rootHub = nodesInDom.find((n) => n.hierarchyLevel === 1 || n.isParentNode) || nodesInDom[0];
      const satellites = nodesInDom.filter((n) => n.id !== rootHub.id);

      // Hub node (Grounded center of cluster)
      const hubSim: SimulatedNode = {
        ...rootHub,
        baseX: dom.x,
        baseY: dom.y,
        x: dom.x,
        y: dom.y,
        vx: 0,
        vy: 0,
        radius: domId === 'dilip_ai' ? 20 : 17,
        targetRadius: domId === 'dilip_ai' ? 20 : 17,
        currentRadius: domId === 'dilip_ai' ? 20 : 17,
        phase1: Math.random() * Math.PI * 2,
        phase2: Math.random() * Math.PI * 2,
        freq1: 0.0006,
        freq2: 0.0009,
        driftRadius: 1.5,
      };
      simList.push(hubSim);
      simMap.set(hubSim.id, hubSim);

      const N = satellites.length;
      satellites.forEach((sat, i) => {
        const isTopic = sat.hierarchyLevel === 2 || sat.subcategory === 'MedicalTopic';
        const rad = isTopic ? 12 : Math.max(5.5, Math.min(8.0, 5.0 + (degreeMap.get(sat.id) || 1) * 0.4));

        let theta: number;
        let baseDist: number;

        if (domId === 'corpus') {
          // FOR CORPUS: Disperse strictly into downward/sideways fan (y >= dom.y)
          // to guarantee 100% zero overlap with the "GRAPHRAG CORPUS" heading above it!
          const normalizedI = N > 1 ? i / (N - 1) : 0.5;
          theta = Math.PI * 0.15 + normalizedI * Math.PI * 0.70; // 27° to 153° (downwards)
          baseDist = 48 + (i % 3) * 22 + Math.floor(i / 3) * 35;
        } else {
          // Organic golden-spiral for other domains
          const goldenAngle = 2.3999632;
          theta = i * goldenAngle + (i % 4) * 0.18;
          const normalizedRank = (i + 1) / (N + 1);
          baseDist = isTopic
            ? 50 + (i % 3) * 16
            : 68 + Math.pow(normalizedRank, 0.65) * 135;
        }

        const bx = dom.x + Math.cos(theta) * baseDist;
        const by = dom.y + Math.sin(theta) * baseDist;

        const satSim: SimulatedNode = {
          ...sat,
          baseX: bx,
          baseY: by,
          x: bx,
          y: by,
          vx: 0,
          vy: 0,
          radius: rad,
          targetRadius: rad,
          currentRadius: rad,
          phase1: Math.random() * Math.PI * 2,
          phase2: Math.random() * Math.PI * 2,
          freq1: 0.0008 + (i % 5) * 0.0002,
          freq2: 0.0011 + (i % 3) * 0.0003,
          driftRadius: 2.5 + (i % 3) * 1.2,
        };
        simList.push(satSim);
        simMap.set(satSim.id, satSim);
      });
    });

    // 35-pass spring relaxation to prevent pairwise collisions AND enforce heading exclusion zones
    for (let pass = 0; pass < 35; pass++) {
      // 1. Pairwise node relaxation
      for (let i = 0; i < simList.length; i++) {
        const nA = simList[i];
        for (let j = i + 1; j < simList.length; j++) {
          const nB = simList[j];
          if (nA.category !== nB.category) continue;

          const dx = nB.baseX - nA.baseX;
          const dy = nB.baseY - nA.baseY;
          const dist = Math.hypot(dx, dy) || 1;
          const minDist = nA.radius + nB.radius + 18;

          if (dist < minDist) {
            const overlap = (minDist - dist) * 0.5;
            const pushX = (dx / dist) * overlap;
            const pushY = (dy / dist) * overlap;

            if (!nA.isParentNode && nA.hierarchyLevel !== 1) {
              nA.baseX -= pushX;
              nA.baseY -= pushY;
              nA.x = nA.baseX;
              nA.y = nA.baseY;
            }
            if (!nB.isParentNode && nB.hierarchyLevel !== 1) {
              nB.baseX += pushX;
              nB.baseY += pushY;
              nB.x = nB.baseX;
              nB.y = nB.baseY;
            }
          }
        }
      }

      // 2. Strict Heading Exclusion Zones: Push any node outside the heading bounding box
      Object.values(KNOWLEDGE_DOMAINS).forEach((dom) => {
        const hX = dom.x;
        const hY = dom.y + dom.headerOffset;
        const hHalfW = 125;
        const hHalfH = 26;

        for (let i = 0; i < simList.length; i++) {
          const n = simList[i];
          if (n.hierarchyLevel === 1 || n.isParentNode) continue;

          const dx = Math.abs(n.baseX - hX);
          const dy = Math.abs(n.baseY - hY);

          if (dx < hHalfW && dy < hHalfH) {
            // Push node safely outside the header box
            if (n.baseY < hY) {
              n.baseY = hY - hHalfH - 12;
            } else {
              n.baseY = hY + hHalfH + 12;
            }
            n.y = n.baseY;
          }
        }
      });
    }

    return { simList, simMap };
  }, []);

  // ── BUILD LINKS & CURVED SYNAPTIC SPLINES ────────────────────────────────
  useEffect(() => {
    if (!nodes || nodes.length === 0) return;
    const { simList, simMap } = computeOrganicConstellation(nodes, links);
    simNodesRef.current = simList;
    simNodeMapRef.current = simMap;

    const activeLinks: {
      source: SimulatedNode;
      target: SimulatedNode;
      color: string;
      isCurved: boolean;
      ctrlX?: number;
      ctrlY?: number;
    }[] = [];
    const linkSet = new Set<string>();

    links.forEach((l) => {
      const sId = typeof l.source === 'string' ? l.source : (l.source as any).id;
      const tId = typeof l.target === 'string' ? l.target : (l.target as any).id;
      const src = simMap.get(sId);
      const tgt = simMap.get(tId);
      if (!src || !tgt) return;

      const isCross = src.category !== tgt.category;
      if (isCross && src.hierarchyLevel !== 1 && tgt.hierarchyLevel !== 1) return;

      const key = `${sId}__${tId}`;
      if (linkSet.has(key)) return;
      linkSet.add(key);

      activeLinks.push({
        source: src,
        target: tgt,
        color: isCross ? '#38bdf8' : (src.color || '#10b981'),
        isCurved: isCross,
      });
    });

    // Inter-domain bridge links connecting Dilip AI Platform Core to the other 3 hubs
    const dilipHub = simMap.get('dilip_ai_core');
    if (dilipHub) {
      ['medical', 'literature', 'corpus'].forEach((cat) => {
        const hub = simList.find((n) => n.category === cat && (n.hierarchyLevel === 1 || n.isParentNode));
        if (hub) {
          activeLinks.push({
            source: dilipHub,
            target: hub,
            color: '#10b981',
            isCurved: true,
          });
        }
      });
    }

    // Precalculate curved bezier control points
    activeLinks.forEach((l) => {
      if (l.isCurved) {
        const midX = (l.source.baseX + l.target.baseX) / 2;
        const midY = (l.source.baseY + l.target.baseY) / 2;
        const dx = l.target.baseX - l.source.baseX;
        const dy = l.target.baseY - l.source.baseY;
        const normalX = -dy * 0.15;
        const normalY = dx * 0.15;
        l.ctrlX = midX + normalX;
        l.ctrlY = midY + normalY;
      }
    });

    activeLinksRef.current = activeLinks;

    // Synaptic pulses traveling along direct & curved pathways
    const pulses: SimulatedPulse[] = [];
    activeLinks.slice(0, 16).forEach((l, idx) => {
      pulses.push({
        sourceId: l.source.id,
        targetId: l.target.id,
        progress: (idx * 0.08) % 1.0,
        speed: 0.0035 + (idx % 4) * 0.0018,
        color: l.color,
        isCurved: l.isCurved,
        ctrlX: l.ctrlX,
        ctrlY: l.ctrlY,
      });
    });
    pulsesRef.current = pulses;
  }, [nodes, links, computeOrganicConstellation]);

  // ── COORDINATE CONVERSION ────────────────────────────────────────────────
  const screenToWorld = useCallback((sx: number, sy: number) => {
    const { x, y, k } = transformRef.current;
    return { x: (sx - x) / k, y: (sy - y) / k };
  }, []);

  const findNodeUnderCursor = useCallback((sx: number, sy: number): SimulatedNode | null => {
    const w = screenToWorld(sx, sy);
    const arr = simNodesRef.current;
    for (let i = arr.length - 1; i >= 0; i--) {
      const n = arr[i];
      if (n.x === undefined || n.y === undefined) continue;
      const dx = w.x - n.x;
      const dy = w.y - n.y;
      const hitRadius = Math.max(n.radius + 8, 16);
      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        return n;
      }
    }
    return null;
  }, [screenToWorld]);

  // ── MAIN DRAW LOOP (Capped at 30 FPS for Resource Conservation) ──────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let isRunning = true;
    let lastRenderTime = performance.now();
    // Strict 30 FPS Cap to save CPU/GPU and battery
    const TARGET_FPS = 30;
    const TARGET_FRAME_MS = 1000 / TARGET_FPS; // ~33.33ms

    const drawScene = (time: number) => {
      const w = canvas.width;
      const h = canvas.height;
      if (w === 0 || h === 0) return;

      // 50% glassy transparent canvas clearing
      ctx.clearRect(0, 0, w, h);

      ctx.save();
      const { x: tx, y: ty, k } = transformRef.current;
      ctx.translate(tx, ty);
      ctx.scale(k, k);

      // Frustum Culling
      const invK = 1 / k;
      const margin = 120 * invK;
      const minX = -tx * invK - margin;
      const maxX = (w - tx) * invK + margin;
      const minY = -ty * invK - margin;
      const maxY = (h - ty) * invK + margin;

      const selId = selectedIdRef.current;
      const hovNode = hoveredNodeRef.current;
      const activeNode = hovNode || (selId ? simNodeMapRef.current.get(selId) : null);
      const activeId = activeNode?.id || null;
      const connSet = activeId ? adjacencyRef.current.connectedMap.get(activeId) : null;
      const mouseW = mouseWorldPosRef.current;
      const isMouseInside = isMouseInsideRef.current;

      // ── 1. SUBTLE DEEP-SPACE BACKGROUND DUST ─────────────────────────────
      const stars = bgStarsRef.current;
      ctx.fillStyle = '#94a3b8';
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const drift = Math.sin(time * s.driftSpeed + i) * 5;
        const sx = s.x + drift;
        const sy = s.y;
        if (sx < minX || sx > maxX || sy < minY || sy > maxY) continue;

        ctx.globalAlpha = s.alpha * 0.40;
        ctx.beginPath();
        ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;

      // ── 2. ELASTIC MAGNETIC PHYSICS & HARMONIC BREATHING ─────────────────
      const allSimNodes = simNodesRef.current;
      for (let i = 0; i < allSimNodes.length; i++) {
        const n = allSimNodes[i];
        const isHub = n.hierarchyLevel === 1 || n.isParentNode;

        const t1 = time * n.freq1 + n.phase1;
        const t2 = time * n.freq2 + n.phase2;
        const harmonicX = isHub ? 0 : Math.sin(t1) * n.driftRadius + Math.cos(t2) * (n.driftRadius * 0.35);
        const harmonicY = isHub ? 0 : Math.cos(t1 * 1.1) * n.driftRadius + Math.sin(t2 * 0.9) * (n.driftRadius * 0.35);

        let targetX = n.baseX + harmonicX;
        let targetY = n.baseY + harmonicY;

        // Elastic magnetic deflection near cursor
        if (isMouseInside && !isPanningRef.current) {
          const mdx = targetX - mouseW.x;
          const mdy = targetY - mouseW.y;
          const mouseDist = Math.hypot(mdx, mdy);
          const influenceRadius = 100;

          if (mouseDist < influenceRadius && mouseDist > 0.1) {
            const force = (1 - mouseDist / influenceRadius) * 12;
            targetX += (mdx / mouseDist) * force;
            targetY += (mdy / mouseDist) * force;
          }
        }

        // Clamp drift away from domain headings to guarantee 0 overlaps
        Object.values(KNOWLEDGE_DOMAINS).forEach((dom) => {
          const hX = dom.x;
          const hY = dom.y + dom.headerOffset;
          if (Math.abs(targetX - hX) < 125 && Math.abs(targetY - hY) < 26) {
            if (targetY < hY) targetY = hY - 28;
            else targetY = hY + 28;
          }
        });

        // Smooth spring damping
        n.x += (targetX - n.x) * 0.18;
        n.y += (targetY - n.y) * 0.18;

        const isHovered = hovNode?.id === n.id;
        const isSelected = selId === n.id;
        const isConnected = connSet?.has(n.id) || false;
        n.targetRadius = isHovered || isSelected ? n.radius * 1.25 : (isConnected ? n.radius * 1.08 : n.radius);
        n.currentRadius += (n.targetRadius - n.currentRadius) * 0.25;
      }

      // ── 3. REFINED SECTOR HEADERS WITH GLASS PROTECTION (ZERO OVERLAPS!) ──
      Object.values(KNOWLEDGE_DOMAINS).forEach((dom) => {
        const headerY = dom.y + dom.headerOffset;
        if (dom.x < minX - 200 || dom.x > maxX + 200 || headerY < minY - 50 || headerY > maxY + 50) return;

        const totalNodes = domainTotalsRef.current[dom.id] || 0;
        const subtext = totalNodes > 10 ? `${totalNodes.toLocaleString()} NODES • ${dom.subtitle.toUpperCase()}` : dom.subtitle.toUpperCase();

        const pillW = 216;
        const pillH = 34;

        ctx.save();
        // Frosted glass protective pill behind heading to prevent any visual overlap
        ctx.fillStyle = 'rgba(7, 12, 24, 0.78)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.roundRect(dom.x - pillW / 2, headerY - pillH / 2, pillW, pillH, 8);
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Title
        ctx.fillStyle = '#f1f5f9';
        ctx.font = '600 10.5px Inter, system-ui, sans-serif';
        ctx.fillText(dom.name, dom.x, headerY - 6);

        // Subtitle
        ctx.fillStyle = '#94a3b8';
        ctx.font = '500 8.5px Inter, monospace';
        ctx.fillText(subtext, dom.x, headerY + 7);
        ctx.restore();
      });

      // ── 4. CLEAN DELICATE LINKS & CURVED SYNAPTIC SPLINES ─────────────────
      const activeLinks = activeLinksRef.current;

      ctx.beginPath();
      for (let i = 0; i < activeLinks.length; i++) {
        const l = activeLinks[i];
        const sx = l.source.x, sy = l.source.y;
        const tx = l.target.x, ty = l.target.y;

        if ((sx < minX || sx > maxX || sy < minY || sy > maxY) &&
            (tx < minX || tx > maxX || ty < minY || ty > maxY)) continue;

        if (activeId && (l.source.id === activeId || l.target.id === activeId)) continue;

        if (l.isCurved && l.ctrlX !== undefined && l.ctrlY !== undefined) {
          ctx.moveTo(sx, sy);
          ctx.quadraticCurveTo(l.ctrlX, l.ctrlY, tx, ty);
        } else {
          ctx.moveTo(sx, sy);
          ctx.lineTo(tx, ty);
        }
      }
      ctx.strokeStyle = activeId ? 'rgba(71, 85, 105, 0.08)' : 'rgba(71, 85, 105, 0.20)';
      ctx.lineWidth = 1.0;
      ctx.stroke();

      // Active / Connected Laser Connections
      if (activeId) {
        ctx.beginPath();
        for (let i = 0; i < activeLinks.length; i++) {
          const l = activeLinks[i];
          if (l.source.id === activeId || l.target.id === activeId) {
            const sx = l.source.x, sy = l.source.y;
            const tx = l.target.x, ty = l.target.y;
            if (l.isCurved && l.ctrlX !== undefined && l.ctrlY !== undefined) {
              ctx.moveTo(sx, sy);
              ctx.quadraticCurveTo(l.ctrlX, l.ctrlY, tx, ty);
            } else {
              ctx.moveTo(sx, sy);
              ctx.lineTo(tx, ty);
            }
          }
        }
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }

      // ── 5. SYNAPTIC PHOTON PULSES (Resource-optimized 30 FPS flow) ───────
      const pulses = pulsesRef.current;
      if (pulses.length > 0) {
        const pSpeed = pulseSpeedRef.current * 1.8;
        for (let i = 0; i < pulses.length; i++) {
          const p = pulses[i];
          p.progress += p.speed * pSpeed;
          if (p.progress >= 1) p.progress = 0;

          const src = simNodeMapRef.current.get(p.sourceId);
          const tgt = simNodeMapRef.current.get(p.targetId);
          if (!src || !tgt) continue;

          let curX: number;
          let curY: number;

          if (p.isCurved && p.ctrlX !== undefined && p.ctrlY !== undefined) {
            const t = p.progress;
            const invT = 1 - t;
            curX = invT * invT * src.x + 2 * invT * t * p.ctrlX + t * t * tgt.x;
            curY = invT * invT * src.y + 2 * invT * t * p.ctrlY + t * t * tgt.y;
          } else {
            curX = src.x + (tgt.x - src.x) * p.progress;
            curY = src.y + (tgt.y - src.y) * p.progress;
          }

          if (curX < minX || curX > maxX || curY < minY || curY > maxY) continue;

          // Luminous photon head
          ctx.beginPath();
          ctx.arc(curX, curY, 2.2, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();

          // Soft trailing light
          const tailProg = Math.max(0, p.progress - 0.07);
          let tailX: number;
          let tailY: number;

          if (p.isCurved && p.ctrlX !== undefined && p.ctrlY !== undefined) {
            const t = tailProg;
            const invT = 1 - t;
            tailX = invT * invT * src.x + 2 * invT * t * p.ctrlX + t * t * tgt.x;
            tailY = invT * invT * src.y + 2 * invT * t * p.ctrlY + t * t * tgt.y;
          } else {
            tailX = src.x + (tgt.x - src.x) * tailProg;
            tailY = src.y + (tgt.y - src.y) * tailProg;
          }

          ctx.beginPath();
          ctx.moveTo(curX, curY);
          ctx.lineTo(tailX, tailY);
          ctx.strokeStyle = p.color || '#38bdf8';
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }
      }

      // ── 6. HOLLOW RINGS (TRUE EMPTY CIRCLES - USER DEMAND) ────────────────
      for (let i = 0; i < allSimNodes.length; i++) {
        const n = allSimNodes[i];
        const nx = n.x, ny = n.y;
        if (nx < minX || nx > maxX || ny < minY || ny > maxY) continue;

        const isAct = n.id === activeId;
        const isConn = connSet?.has(n.id) || false;
        const isHub = n.hierarchyLevel === 1 || n.isParentNode;
        const rad = n.currentRadius;

        const strokeColor = isAct ? '#38bdf8' : (isConn ? '#ffffff' : (n.color || '#10b981'));

        // EMPTY CIRCLE: Dark translucent void center + crisp perimeter stroke
        ctx.beginPath();
        ctx.arc(nx, ny, rad, 0, Math.PI * 2);
        ctx.fillStyle = isAct ? 'rgba(56, 189, 248, 0.15)' : 'rgba(3, 7, 18, 0.82)';
        ctx.fill();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = isAct ? 2.2 : (isHub ? 1.8 : 1.3);
        ctx.stroke();

        // Hubs have a concentric inner thin ring (also empty/hollow!)
        if (isHub) {
          ctx.beginPath();
          ctx.arc(nx, ny, rad * 0.52, 0, Math.PI * 2);
          ctx.strokeStyle = hexToRgba(strokeColor, 0.40);
          ctx.lineWidth = 1.0;
          ctx.stroke();

          // Delicate 1.5px center focus aperture
          ctx.beginPath();
          ctx.arc(nx, ny, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        }
      }

      // ── 7. PERMANENT LABELS: STRICTLY ONLY THE 4 ROOT HUBS (NO OVERLAPS!) ─
      ctx.save();
      ctx.font = '600 11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      for (let i = 0; i < allSimNodes.length; i++) {
        const n = allSimNodes[i];
        if (n.hierarchyLevel !== 1 && !n.isParentNode) continue;
        const nx = n.x, ny = n.y;
        if (nx < minX || nx > maxX || ny < minY || ny > maxY) continue;

        const rad = n.currentRadius;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = 4;
        ctx.fillStyle = '#f1f5f9';
        ctx.fillText(n.label, nx, ny + rad + 8);
      }
      ctx.restore();

      ctx.restore();

      // ── 8. FLOATING BENTO HUD TOOLTIP ON HOVER (Linear / Obsidian UX) ──────
      if (hovNode) {
        const mouseX = mouseScreenPosRef.current.x;
        const mouseY = mouseScreenPosRef.current.y;
        const tipWidth = 230;
        const tipHeight = 52;
        const pad = 12;

        let posX = mouseX + 18;
        let posY = mouseY - 60;
        if (posX + tipWidth > w - 16) posX = mouseX - tipWidth - 18;
        if (posY < 16) posY = mouseY + 20;

        ctx.save();
        ctx.fillStyle = 'rgba(11, 17, 33, 0.96)';
        ctx.strokeStyle = hovNode.color || '#38bdf8';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.roundRect(posX, posY, tipWidth, tipHeight, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.font = '600 11.5px Inter, system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const displayLabel = hovNode.label.length > 27 ? `${hovNode.label.slice(0, 25)}...` : hovNode.label;
        ctx.fillText(displayLabel, posX + pad, posY + 9);

        ctx.fillStyle = hovNode.color || '#38bdf8';
        ctx.font = '500 9.5px Inter, monospace';
        const subtag = `${hovNode.subcategory || 'Concept'} • ${hovNode.category.toUpperCase()}`;
        ctx.fillText(subtag, posX + pad, posY + 28);
        ctx.restore();
      }
    };

    const renderLoop = (time: number) => {
      if (!isRunning) return;
      animFrameIdRef.current = requestAnimationFrame(renderLoop);

      const delta = time - lastRenderTime;
      if (delta < TARGET_FRAME_MS - 1.0) return;
      lastRenderTime = time - (delta % TARGET_FRAME_MS);

      frameCountRef.current++;
      if (time - fpsTimerRef.current >= 1000) {
        const currentFps = Math.min(TARGET_FPS, Math.round((frameCountRef.current * 1000) / (time - fpsTimerRef.current)));
        onStatsUpdateRef.current?.(currentFps, pulsesRef.current.length);
        frameCountRef.current = 0;
        fpsTimerRef.current = time;
      }

      drawScene(time);
    };

    animFrameIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, []);

  // ── WINDOW RESIZE & RESPONSIVE SCALING ───────────────────────────────────
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const w = container.clientWidth;
      const h = container.clientHeight;
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      if (!isInitialCenterDoneRef.current && w > 0 && h > 0) {
        transformRef.current.x = w / 2;
        transformRef.current.y = h / 2;
        const mobileScaleFactor = w < 600 ? w / 1400 : w / 1250;
        transformRef.current.k = Math.min(0.85, Math.max(0.50, mobileScaleFactor));
        isInitialCenterDoneRef.current = true;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── MOUSE WHEEL SMOOTH ZOOM ──────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = container.getBoundingClientRect();
      const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.12 : 0.88;
      const oldK = transformRef.current.k;
      const newK = Math.min(Math.max(oldK * factor, 0.20), 4.5);
      const ratio = newK / oldK;
      transformRef.current.x = sx - (sx - transformRef.current.x) * ratio;
      transformRef.current.y = sy - (sy - transformRef.current.y) * ratio;
      transformRef.current.k = newK;
    };
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  // ── MOUSE EVENTS & INTERACTIONS ──────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const hit = findNodeUnderCursor(sx, sy);
    if (hit) {
      selectedIdRef.current = hit.id;
      onSelectNodeRef.current?.(hit);
    } else {
      selectedIdRef.current = null;
      onSelectNodeRef.current?.(null);
      isPanningRef.current = true;
      panStartRef.current = { x: sx - transformRef.current.x, y: sy - transformRef.current.y };
    }
  }, [findNodeUnderCursor]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    isMouseInsideRef.current = true;
    mouseScreenPosRef.current = { x: sx, y: sy };
    mouseWorldPosRef.current = screenToWorld(sx, sy);

    if (isPanningRef.current) {
      transformRef.current.x = sx - panStartRef.current.x;
      transformRef.current.y = sy - panStartRef.current.y;
      return;
    }

    const hit = findNodeUnderCursor(sx, sy);
    hoveredNodeRef.current = hit;
    const canvas = canvasRef.current;
    if (canvas) canvas.style.cursor = hit ? 'pointer' : 'grab';
  }, [findNodeUnderCursor, screenToWorld]);

  const handleMouseLeave = useCallback(() => {
    isMouseInsideRef.current = false;
    hoveredNodeRef.current = null;
    isPanningRef.current = false;
  }, []);

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) canvas.style.cursor = hoveredNodeRef.current ? 'pointer' : 'grab';
  }, []);

  // ── TOUCH GESTURES (Pinch-to-zoom & Smooth Pan) ──────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let touchStartDist = 0;
    let touchStartScale = 1;
    let touchStartTime = 0;
    let touchStartX = 0;
    let touchStartY = 0;
    let isTouchPanning = false;

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();

      if (e.touches.length === 1) {
        touchStartTime = performance.now();
        touchStartX = e.touches[0].clientX - rect.left;
        touchStartY = e.touches[0].clientY - rect.top;
        isTouchPanning = true;
        panStartRef.current = {
          x: touchStartX - transformRef.current.x,
          y: touchStartY - transformRef.current.y,
        };
      } else if (e.touches.length === 2) {
        isTouchPanning = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchStartDist = Math.sqrt(dx * dx + dy * dy) || 1;
        touchStartScale = transformRef.current.k;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();

      if (e.touches.length === 1 && isTouchPanning) {
        const sx = e.touches[0].clientX - rect.left;
        const sy = e.touches[0].clientY - rect.top;
        transformRef.current.x = sx - panStartRef.current.x;
        transformRef.current.y = sy - panStartRef.current.y;
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const ratio = dist / touchStartDist;
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
        const newK = Math.min(Math.max(touchStartScale * ratio, 0.20), 4.5);
        const scaleChange = newK / transformRef.current.k;

        transformRef.current.x = midX - (midX - transformRef.current.x) * scaleChange;
        transformRef.current.y = midY - (midY - transformRef.current.y) * scaleChange;
        transformRef.current.k = newK;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (isTouchPanning && e.changedTouches.length > 0) {
        const duration = performance.now() - touchStartTime;
        const rect = canvas.getBoundingClientRect();
        const endX = e.changedTouches[0].clientX - rect.left;
        const endY = e.changedTouches[0].clientY - rect.top;
        const moveDist = Math.hypot(endX - touchStartX, endY - touchStartY);

        if (duration < 280 && moveDist < 10) {
          const hit = findNodeUnderCursor(endX, endY);
          selectedIdRef.current = hit ? hit.id : null;
          onSelectNodeRef.current?.(hit);
        }
      }
      isTouchPanning = false;
    };

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [findNodeUnderCursor]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none bg-transparent"
      style={{ touchAction: 'none' }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        className="w-full h-full block cursor-grab active:cursor-grabbing"
      />
    </div>
  );
};
