import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { GraphNode, GraphLink, EnergyPulsePacket } from '../types/graph';

interface KnowledgeGraphCanvasProps {
  nodes?: GraphNode[];
  links?: GraphLink[];
  selectedNodeId?: string | null;
  pulseSpeedMultiplier?: number;
  viewPerspective3D?: boolean;
  onSelectNode?: (node: GraphNode | null) => void;
  onStatsUpdate?: (fps: number, particleCount: number) => void;
}

// ── STATIC CACHES (module-level, zero allocation per frame) ─────────────────
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

// Semantic Sub-Category Classifier
const getSemanticSubcluster = (node: GraphNode): string => {
  const label = (node.label || '').toLowerCase();
  const sub = (node.subcategory || '').toLowerCase();
  const cat = node.category;

  if (cat === 'apple') {
    if (label.includes('macbook') || label.includes('mac ') || label.includes('imac') || label.includes('studio') || label.includes('pro display')) return 'Mac & Compute';
    if (label.includes('iphone') || label.includes('bionic')) return 'iPhone Ecosystem';
    if (label.includes('ipad')) return 'iPad & Tablets';
    if (label.includes('airpods') || label.includes('homepod') || label.includes('audio') || label.includes('beat')) return 'Audio & Acoustics';
    if (label.includes('watch') || label.includes('vision') || label.includes('wearable')) return 'Wearables & Vision';
    return 'Apple Hardware';
  }
  if (cat === 'samsung') {
    if (label.includes('fold') || label.includes('flip')) return 'Foldables & Flex';
    if (label.includes('ultra') || label.includes('s23') || label.includes('s24') || label.includes('s22')) return 'Galaxy S Series';
    if (label.includes('watch') || label.includes('buds') || label.includes('ring')) return 'Galaxy Wearables';
    if (label.includes('5g') || label.includes('modem') || label.includes('telecom')) return '5G Telemetry';
    return 'Samsung Galaxy';
  }
  if (cat === 'stores') {
    if (label.includes('york') || label.includes('fifth') || label.includes('chicago') || label.includes('san francisco') || label.includes('usa') || label.includes('america')) return 'North America Stores';
    if (label.includes('london') || label.includes('regent') || label.includes('paris') || label.includes('berlin') || label.includes('europe') || label.includes('uk')) return 'European Stores';
    if (label.includes('ginza') || label.includes('tokyo') || label.includes('seoul') || label.includes('shanghai') || label.includes('asia') || label.includes('singapore')) return 'Asia-Pacific Stores';
    if (sub.includes('city')) return 'Global Cities';
    if (sub.includes('country')) return 'Sovereign Markets';
    return 'Retail Flagships';
  }
  if (cat === '5g_regions') {
    if (label.includes('q1') || label.includes('q2') || label.includes('q3') || label.includes('q4')) return 'Quarterly Timelines';
    if (sub.includes('region')) return 'Continental Jurisdictions';
    return '5G Telemetry Hubs';
  }
  if (cat === 'warranty') {
    if (label.includes('oled') || label.includes('display')) return 'Display & Screen Claims';
    if (label.includes('hinge') || label.includes('flex')) return 'Mechanical & Hinge Durability';
    if (label.includes('battery') || label.includes('power')) return 'Battery Lifecycle Analytics';
    return 'Defect Telemetry';
  }
  return 'Research & Innovation';
};

export const KnowledgeGraphCanvas: React.FC<KnowledgeGraphCanvasProps> = ({
  nodes = [],
  links = [],
  selectedNodeId = null,
  pulseSpeedMultiplier = 1.0,
  viewPerspective3D = false,
  onSelectNode,
  onStatsUpdate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // ── ALL MUTABLE STATE IN REFS (ZERO React re-renders during animation) ──
  const transformRef = useRef({ x: 0, y: 0, k: 0.72 });
  const selectedIdRef = useRef<string | null>(selectedNodeId);
  selectedIdRef.current = selectedNodeId;

  // Stable callback refs
  const onSelectNodeRef = useRef(onSelectNode);
  onSelectNodeRef.current = onSelectNode;
  const onStatsUpdateRef = useRef(onStatsUpdate);
  onStatsUpdateRef.current = onStatsUpdate;
  const pulseSpeedRef = useRef(pulseSpeedMultiplier);
  pulseSpeedRef.current = pulseSpeedMultiplier;
  const viewPerspective3DRef = useRef(viewPerspective3D);
  viewPerspective3DRef.current = viewPerspective3D;

  // Pre-computed layout & typed buffers
  const physicsNodesRef = useRef<GraphNode[]>([]);
  const nodeMapRef = useRef<Map<string, GraphNode>>(new Map());
  const categorizedNodesRef = useRef<{ color: string; nodes: GraphNode[] }[]>([]);
  
  // Dense link buffers pre-baked into typed arrays
  const denseLinksRef = useRef<Float64Array>(new Float64Array(0));
  const denseLinkCountRef = useRef(0);
  const backboneLinksRef = useRef<Float64Array>(new Float64Array(0));
  const backboneLinkCountRef = useRef(0);

  const energyPulsesRef = useRef<EnergyPulsePacket[]>([]);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const animFrameIdRef = useRef<number | null>(null);
  const frameCountRef = useRef(0);
  const fpsTimerRef = useRef(performance.now());
  const isInitialCenterDoneRef = useRef(false);

  const linksRef = useRef(links);
  linksRef.current = links;

  // ── O(1) ADJACENCY CACHE ─────────────────────────────────────────────────
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

  // ── ZERO-OVERLAP LAYOUT COMPUTATION (runs ONCE on data load) ──────────────
  const computeLayout = useCallback((nodeList: GraphNode[]) => {
    const orbits: Record<string, { orbitRadius: number; angle: number; subSpread: number }> = {
      dilip_ai: { orbitRadius: 0, angle: 0, subSpread: Math.PI * 2 },
      apple: { orbitRadius: 420, angle: -Math.PI * 0.75, subSpread: 1.3 },
      samsung: { orbitRadius: 420, angle: -Math.PI * 0.25, subSpread: 1.3 },
      stores: { orbitRadius: 460, angle: Math.PI * 0.75, subSpread: 1.4 },
      '5g_regions': { orbitRadius: 460, angle: Math.PI * 0.25, subSpread: 1.4 },
      warranty: { orbitRadius: 360, angle: Math.PI * 0.5, subSpread: 1.1 },
    };

    const categorized: Record<string, GraphNode[]> = {};
    nodeList.forEach((n) => {
      const cat = n.category || 'dilip_ai';
      if (!categorized[cat]) categorized[cat] = [];
      categorized[cat].push(n);
    });

    const resultMap = new Map<string, GraphNode>();

    Object.entries(categorized).forEach(([cat, catNodes]) => {
      if (!catNodes || catNodes.length === 0) return;
      const orbit = orbits[cat] || { orbitRadius: 400, angle: 0, subSpread: 1.2 };
      const px = Math.cos(orbit.angle) * orbit.orbitRadius;
      const py = Math.sin(orbit.angle) * orbit.orbitRadius;

      const hub = catNodes.find((n) => n.hierarchyLevel === 1 || n.isParentNode || (n.subcategory && ['Brand', 'Platform', 'Author'].includes(n.subcategory))) || catNodes[0];
      if (!hub || !hub.id) return;
      resultMap.set(hub.id, { ...hub, hierarchyLevel: 1, isParentNode: true, x: px, y: py, vx: 0, vy: 0, radius: cat === 'dilip_ai' ? 22 : 18 });

      const satellites = catNodes.filter((n) => n.id !== hub.id);
      const subGroups: Record<string, GraphNode[]> = {};
      satellites.forEach((node) => {
        const subName = getSemanticSubcluster(node);
        if (!subGroups[subName]) subGroups[subName] = [];
        subGroups[subName].push(node);
      });

      const subNames = Object.keys(subGroups);
      const subCount = subNames.length;
      const goldenAngle = 2.3999632;

      subNames.forEach((subName, subIdx) => {
        const subNodes = subGroups[subName];
        let subAngleOffset: number;
        if (orbit.orbitRadius === 0) {
          subAngleOffset = (subIdx / Math.max(subCount, 1)) * Math.PI * 2 - Math.PI / 2;
        } else {
          const hs = orbit.subSpread / 2;
          subAngleOffset = subCount > 1 ? orbit.angle - hs + (subIdx / (subCount - 1)) * orbit.subSpread : orbit.angle;
        }

        const subDist = Math.max(140, Math.min(260, 110 + Math.sqrt(subNodes.length) * 14));
        const scx = px + Math.cos(subAngleOffset) * subDist;
        const scy = py + Math.sin(subAngleOffset) * subDist;

        subNodes.forEach((leafNode, leafIdx) => {
          let lx: number, ly: number;
          if (leafIdx === 0 && subNodes.length > 8) {
            lx = scx; ly = scy;
          } else {
            const sr = 24 + 16 * Math.sqrt(leafIdx);
            const sa = subAngleOffset + leafIdx * goldenAngle;
            lx = scx + Math.cos(sa) * sr;
            ly = scy + Math.sin(sa) * sr;
          }
          resultMap.set(leafNode.id, { ...leafNode, hierarchyLevel: leafNode.hierarchyLevel || 3, x: lx, y: ly, vx: 0, vy: 0, radius: leafNode.hierarchyLevel === 2 ? 12 : 8 });
        });
      });
    });

    // Spatial hash relaxation (20 passes)
    const all = Array.from(resultMap.values());
    const cellSize = 80;
    for (let pass = 0; pass < 20; pass++) {
      const grid: Record<string, GraphNode[]> = {};
      for (let i = 0; i < all.length; i++) {
        const n = all[i];
        const key = `${Math.floor((n.x || 0) / cellSize)}_${Math.floor((n.y || 0) / cellSize)}`;
        if (!grid[key]) grid[key] = [];
        grid[key].push(n);
      }
      for (let i = 0; i < all.length; i++) {
        const nA = all[i];
        const gx = Math.floor((nA.x || 0) / cellSize);
        const gy = Math.floor((nA.y || 0) / cellSize);
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const neighbors = grid[`${gx + dx}_${gy + dy}`];
            if (!neighbors) continue;
            for (let j = 0; j < neighbors.length; j++) {
              const nB = neighbors[j];
              if (nA.id === nB.id) continue;
              const diffX = (nB.x || 0) - (nA.x || 0);
              const diffY = (nB.y || 0) - (nA.y || 0);
              const dist = Math.sqrt(diffX * diffX + diffY * diffY) || 0.001;
              const minD = nA.radius + nB.radius + 18;
              if (dist < minD) {
                const push = (minD - dist) * 0.5;
                const sx = (diffX / dist) * push;
                const sy = (diffY / dist) * push;
                if (!nA.isParentNode) { nA.x = (nA.x || 0) - sx; nA.y = (nA.y || 0) - sy; }
                if (!nB.isParentNode) { nB.x = (nB.x || 0) + sx; nB.y = (nB.y || 0) + sy; }
              }
            }
          }
        }
      }
    }
    return resultMap;
  }, []);

  // ── DATA LOAD: Pre-bake all links + connect 100% of nodes ─────────────────
  useEffect(() => {
    if (!nodes || nodes.length === 0) return;
    const computed = computeLayout(nodes);
    nodeMapRef.current = computed;

    const flat = Array.from(computed.values());
    physicsNodesRef.current = flat;

    // Group by category for batched node draw calls
    const byCat: Record<string, GraphNode[]> = {};
    flat.forEach((n) => {
      const c = n.category || 'dilip_ai';
      if (!byCat[c]) byCat[c] = [];
      byCat[c].push(n);
    });
    categorizedNodesRef.current = Object.entries(byCat).map(([, catNodes]) => ({
      color: catNodes[0]?.color || '#06b6d4',
      nodes: catNodes,
    }));

    // Find category super-hubs for branch synthesis
    const categoryHubs: Record<string, GraphNode> = {};
    flat.forEach((n) => {
      if (n.hierarchyLevel === 1 || n.isParentNode) {
        categoryHubs[n.category] = n;
      }
    });

    // Pre-bake ALL 3,000+ rich connections into flat typed arrays (x1, y1, x2, y2)
    const denseCoords: number[] = [];
    const backboneCoords: number[] = [];
    const connectedNodeIds = new Set<string>();

    links.forEach((l) => {
      const sId = typeof l.source === 'string' ? l.source : (l.source as any).id;
      const tId = typeof l.target === 'string' ? l.target : (l.target as any).id;
      const src = computed.get(sId);
      const tgt = computed.get(tId);
      if (!src || !tgt || src.x === undefined || tgt.x === undefined) return;

      connectedNodeIds.add(sId);
      connectedNodeIds.add(tId);

      const isBackbone = src.hierarchyLevel === 1 || tgt.hierarchyLevel === 1 || src.hierarchyLevel === 2 || tgt.hierarchyLevel === 2;
      if (isBackbone) {
        backboneCoords.push(src.x, src.y || 0, tgt.x, tgt.y || 0);
      } else {
        denseCoords.push(src.x, src.y || 0, tgt.x, tgt.y || 0);
      }
    });

    // GUARANTEE 100% OF NODES ARE CONNECTED: Connect any isolated nodes to their category hub
    flat.forEach((n) => {
      if (!connectedNodeIds.has(n.id) && n.hierarchyLevel !== 1) {
        const hub = categoryHubs[n.category] || categoryHubs['dilip_ai'];
        if (hub && hub.x !== undefined && n.x !== undefined) {
          backboneCoords.push(n.x, n.y || 0, hub.x, hub.y || 0);
          connectedNodeIds.add(n.id);
          // Register in adjacency so selection illuminates this link
          if (!adjacencyRef.current.connectedMap.has(n.id)) adjacencyRef.current.connectedMap.set(n.id, new Set());
          if (!adjacencyRef.current.connectedMap.has(hub.id)) adjacencyRef.current.connectedMap.set(hub.id, new Set());
          adjacencyRef.current.connectedMap.get(n.id)!.add(hub.id);
          adjacencyRef.current.connectedMap.get(hub.id)!.add(n.id);
        }
      }
    });

    denseLinksRef.current = new Float64Array(denseCoords);
    denseLinkCountRef.current = denseCoords.length / 4;

    backboneLinksRef.current = new Float64Array(backboneCoords);
    backboneLinkCountRef.current = backboneCoords.length / 4;

    // Energy pulses (16 packets)
    const MAX_PULSES = 16;
    const pulses: EnergyPulsePacket[] = [];
    const step = Math.max(1, Math.floor(links.length / MAX_PULSES));
    for (let i = 0; i < links.length && pulses.length < MAX_PULSES; i += step) {
      const l = links[i];
      pulses.push({
        id: `p${i}`, linkId: l.id,
        sourceId: typeof l.source === 'string' ? l.source : (l.source as any).id,
        targetId: typeof l.target === 'string' ? l.target : (l.target as any).id,
        progress: (i * 0.08) % 1.0, speed: 0.006 + (i % 3) * 0.001,
        color: l.color || '#10b981', size: 2, tailLength: 5,
      });
    }
    energyPulsesRef.current = pulses;
  }, [nodes, links, computeLayout]);

  // ── COORDINATE HELPERS (With generous 22px mobile touch radius) ────────────
  const screenToWorld = useCallback((sx: number, sy: number) => {
    const { x, y, k } = transformRef.current;
    return { x: (sx - x) / k, y: (sy - y) / k };
  }, []);

  const findNodeUnderCursor = useCallback((sx: number, sy: number): GraphNode | null => {
    const w = screenToWorld(sx, sy);
    const arr = physicsNodesRef.current;
    // Generous touch hit radius for iOS/phone screens
    for (let i = arr.length - 1; i >= 0; i--) {
      const n = arr[i];
      if (n.x === undefined || n.y === undefined) continue;
      const dx = w.x - n.x, dy = w.y - n.y;
      const hitPadding = 20 / transformRef.current.k;
      if (dx * dx + dy * dy <= (n.radius + hitPadding) ** 2) return n;
    }
    return null;
  }, [screenToWorld]);

  // ── THE RENDER LOOP — 30 FPS SMOOTH DISSOLVE ON ZOOM ──────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let isRunning = true;
    const TARGET_FPS = 30;
    const TARGET_FRAME_MS = 1000 / TARGET_FPS; // 33.33ms
    let lastRenderTime = performance.now();

    const drawScene = () => {
      const w = canvas.width;
      const h = canvas.height;

      // 1. Opaque dark cosmos clear
      ctx.fillStyle = '#050816';
      ctx.fillRect(0, 0, w, h);

      // 2. Camera transform
      ctx.save();
      const { x: tx, y: ty, k } = transformRef.current;
      ctx.translate(tx, ty);
      ctx.scale(k, k);

      if (viewPerspective3DRef.current) {
        ctx.transform(1, -0.04, 0.04, 0.96, 0, 0);
      }

      // 3. Viewport frustum bounds
      const invK = 1 / k;
      const margin = 100 * invK;
      const minX = -tx * invK - margin;
      const maxX = (w - tx) * invK + margin;
      const minY = -ty * invK - margin;
      const maxY = (h - ty) * invK + margin;

      const screenNodeSize = 8 * k;
      const skipLeafNodes = screenNodeSize < 1.5;

      // ── ZOOM DISSOLVE FACTOR: Fade out lines as you zoom near cluster center ──
      const zoomFade = Math.max(0, Math.min(1, 1 - (k - 0.85) / 0.95));

      const nodeMap = nodeMapRef.current;
      const selId = selectedIdRef.current;
      const hasSel = Boolean(selId);
      const connSet = selId ? adjacencyRef.current.connectedMap.get(selId) : null;
      const linkSet = selId ? adjacencyRef.current.activeLinksMap.get(selId) : null;

      // ── 3a. Planetary Orbital Trajectories (Fade with zoom) ───────────
      if (zoomFade > 0.02) {
        ctx.beginPath();
        const rings = [160, 360, 420, 460, 600];
        for (let i = 0; i < rings.length; i++) {
          const r = rings[i];
          ctx.moveTo(r, 0);
          ctx.arc(0, 0, r, 0, Math.PI * 2);
        }
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.035 * zoomFade})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 12]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // ── 3b. DENSE CONNECTIONS (Smoothly disappears when zooming near cluster) ──
      const dense = denseLinksRef.current;
      const denseCount = denseLinkCountRef.current;
      if (denseCount > 0 && zoomFade > 0.01) {
        ctx.beginPath();
        for (let i = 0; i < denseCount; i++) {
          const off = i * 4;
          const x1 = dense[off], y1 = dense[off + 1], x2 = dense[off + 2], y2 = dense[off + 3];
          if ((x1 < minX || x1 > maxX || y1 < minY || y1 > maxY) &&
              (x2 < minX || x2 > maxX || y2 < minY || y2 > maxY)) continue;
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
        }
        const denseAlpha = (hasSel ? 0.04 : 0.11) * zoomFade;
        ctx.strokeStyle = `rgba(59, 130, 246, ${denseAlpha})`;
        ctx.lineWidth = 0.65;
        ctx.stroke();
      }

      // ── 3c. Structural Backbone Links (Smoothly disappears on deep zoom) ──
      const bbData = backboneLinksRef.current;
      const bbCount = backboneLinkCountRef.current;
      if (bbCount > 0 && zoomFade > 0.01) {
        ctx.beginPath();
        for (let i = 0; i < bbCount; i++) {
          const off = i * 4;
          const x1 = bbData[off], y1 = bbData[off + 1], x2 = bbData[off + 2], y2 = bbData[off + 3];
          if ((x1 < minX || x1 > maxX || y1 < minY || y1 > maxY) &&
              (x2 < minX || x2 > maxX || y2 < minY || y2 > maxY)) continue;
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
        }
        const bbAlpha = (hasSel ? 0.07 : 0.22) * zoomFade;
        ctx.strokeStyle = `rgba(96, 165, 250, ${bbAlpha})`;
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }

      // ── 3d. Active Selected Node Beams (ALWAYS SHINES, Even on Deep Zoom) ──
      if (hasSel && linkSet && selId) {
        const allLinks = linksRef.current;
        ctx.beginPath();
        let beamCount = 0;
        for (let i = 0; i < allLinks.length && beamCount < 60; i++) {
          const l = allLinks[i];
          if (!linkSet.has(l.id)) continue;
          const sId = typeof l.source === 'string' ? l.source : (l.source as any).id;
          const tId = typeof l.target === 'string' ? l.target : (l.target as any).id;
          const src = nodeMap.get(sId);
          const tgt = nodeMap.get(tId);
          if (!src || !tgt || src.x === undefined || tgt.x === undefined) continue;

          ctx.moveTo(src.x, src.y || 0);
          ctx.lineTo(tgt.x, tgt.y || 0);
          beamCount++;
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 2.4;
        ctx.stroke();
      }

      // ── 3e. Energy pulses (Fade on deep zoom) ──────────────────────────
      const pulses = energyPulsesRef.current;
      if (pulses.length > 0 && zoomFade > 0.05) {
        ctx.beginPath();
        const pSpeed = pulseSpeedRef.current * 1.8;
        for (let i = 0; i < pulses.length; i++) {
          const p = pulses[i];
          p.progress += p.speed * pSpeed;
          if (p.progress >= 1) p.progress = 0;
          const src = nodeMap.get(p.sourceId);
          const tgt = nodeMap.get(p.targetId);
          if (!src || !tgt || src.x === undefined || tgt.x === undefined) continue;
          const ppx = src.x + ((tgt.x || 0) - src.x) * p.progress;
          const ppy = (src.y || 0) + ((tgt.y || 0) - (src.y || 0)) * p.progress;
          if (ppx < minX || ppx > maxX || ppy < minY || ppy > maxY) continue;
          ctx.moveTo(ppx + p.size, ppy);
          ctx.arc(ppx, ppy, p.size, 0, Math.PI * 2);
        }
        ctx.fillStyle = '#10b981';
        ctx.fill();
      }

      // ── 3f. BATCHED NODE RENDERING — 2 draw calls per category ────────
      const cats = categorizedNodesRef.current;
      const labelsToDraw: GraphNode[] = [];

      for (let c = 0; c < cats.length; c++) {
        const catGroup = cats[c];
        const catNodes = catGroup.nodes;
        const catColor = catGroup.color;

        ctx.beginPath();
        for (let i = 0; i < catNodes.length; i++) {
          const n = catNodes[i];
          const nx = n.x || 0, ny = n.y || 0;
          if (nx < minX || nx > maxX || ny < minY || ny > maxY) continue;
          if (skipLeafNodes && n.hierarchyLevel === 3) continue;

          const isSel = n.id === selId;
          const rad = isSel ? n.radius * 1.35 : n.radius;
          ctx.moveTo(nx + rad, ny);
          ctx.arc(nx, ny, rad, 0, Math.PI * 2);

          if (isSel || n.isParentNode || n.hierarchyLevel === 1) {
            labelsToDraw.push(n);
          }
        }
        ctx.fillStyle = '#050816';
        ctx.fill();
        ctx.strokeStyle = hasSel ? hexToRgba(catColor, 0.35) : catColor;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }

      // ── 3g. Selected node highlight & connected rings ─────────────────
      if (hasSel && selId) {
        const sn = nodeMap.get(selId);
        if (sn && sn.x !== undefined && sn.y !== undefined) {
          const rad = sn.radius * 1.35;
          ctx.beginPath();
          ctx.arc(sn.x, sn.y, rad, 0, Math.PI * 2);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.8;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(sn.x, sn.y, 3.2, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        }

        if (connSet) {
          ctx.beginPath();
          let hl = 0;
          connSet.forEach((cid) => {
            if (hl >= 30) return;
            const cn = nodeMap.get(cid);
            if (!cn || cn.x === undefined || cn.y === undefined) return;
            if (cn.x < minX || cn.x > maxX || cn.y < minY || cn.y > maxY) return;
            ctx.moveTo(cn.x + cn.radius, cn.y);
            ctx.arc(cn.x, cn.y, cn.radius, 0, Math.PI * 2);
            hl++;
          });
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.8;
          ctx.stroke();
        }
      }

      // ── 3h. Text labels (parent hubs + selected only) ─────────────────
      if (labelsToDraw.length > 0) {
        ctx.font = 'bold 11px Inter,system-ui,sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < labelsToDraw.length; i++) {
          const n = labelsToDraw[i];
          const nx = n.x || 0, ny = n.y || 0;
          if (nx < minX || nx > maxX || ny < minY || ny > maxY) continue;
          const rad = n.id === selId ? n.radius * 1.35 : n.radius;
          ctx.fillText(n.label, nx, ny + rad + 4);
        }
      }

      ctx.restore();
    };

    // ── RENDER LOOP: 30 FPS Smooth Throttled Target ─────────────────────
    const renderLoop = (time: number) => {
      if (!isRunning) return;
      animFrameIdRef.current = requestAnimationFrame(renderLoop);

      const delta = time - lastRenderTime;
      if (delta < TARGET_FRAME_MS - 1.0) return;
      lastRenderTime = time - (delta % TARGET_FRAME_MS);

      frameCountRef.current++;
      if (time - fpsTimerRef.current >= 1000) {
        const currentFps = Math.min(TARGET_FPS, Math.round((frameCountRef.current * 1000) / (time - fpsTimerRef.current)));
        onStatsUpdateRef.current?.(currentFps, energyPulsesRef.current.length);
        frameCountRef.current = 0;
        fpsTimerRef.current = time;
      }

      drawScene();
    };

    animFrameIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── WINDOW RESIZE & DPI (iOS Dynamic Viewport Friendly) ───────────────────
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
        // On mobile portrait (w < 600), scale down slightly for optimal initial overview
        const mobileScaleFactor = w < 600 ? w / 1400 : w / 1250;
        transformRef.current.k = Math.min(0.85, Math.max(0.42, mobileScaleFactor));
        isInitialCenterDoneRef.current = true;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── DESKTOP MOUSE WHEEL ZOOM ──────────────────────────────────────────────
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
      const newK = Math.min(Math.max(oldK * factor, 0.15), 5.0);
      const ratio = newK / oldK;
      transformRef.current.x = sx - (sx - transformRef.current.x) * ratio;
      transformRef.current.y = sy - (sy - transformRef.current.y) * ratio;
      transformRef.current.k = newK;
    };
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  // ── MOUSE CLICK & DRAG ────────────────────────────────────────────────────
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
    if (!isPanningRef.current) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    transformRef.current.x = e.clientX - rect.left - panStartRef.current.x;
    transformRef.current.y = e.clientY - rect.top - panStartRef.current.y;
  }, []);

  const handleMouseUp = useCallback(() => { isPanningRef.current = false; }, []);

  // ── iOS & MOBILE FULL TOUCH GESTURES (Single-Finger Pan, 2-Finger Pinch Zoom & Tap) ──
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
        const newDist = Math.sqrt(dx * dx + dy * dy) || 1;
        const scaleFactor = newDist / touchStartDist;

        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

        const newK = Math.min(Math.max(touchStartScale * scaleFactor, 0.15), 5.0);
        const ratio = newK / transformRef.current.k;

        transformRef.current.x = midX - (midX - transformRef.current.x) * ratio;
        transformRef.current.y = midY - (midY - transformRef.current.y) * ratio;
        transformRef.current.k = newK;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 0) {
        const duration = performance.now() - touchStartTime;
        const rect = canvas.getBoundingClientRect();
        if (e.changedTouches.length === 1) {
          const endX = e.changedTouches[0].clientX - rect.left;
          const endY = e.changedTouches[0].clientY - rect.top;
          const movedDist = Math.sqrt((endX - touchStartX) ** 2 + (endY - touchStartY) ** 2);

          // Tap gesture detection (< 300ms, < 12px movement)
          if (duration < 320 && movedDist < 14) {
            const hit = findNodeUnderCursor(endX, endY);
            if (hit) {
              selectedIdRef.current = hit.id;
              onSelectNodeRef.current?.(hit);
            } else {
              selectedIdRef.current = null;
              onSelectNodeRef.current?.(null);
            }
          }
        }
        isTouchPanning = false;
      }
    };

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', onTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [findNodeUnderCursor]);

  return (
    <div
      ref={containerRef}
      id="knowledge-graph-canvas-container"
      style={{
        touchAction: 'none',
        overscrollBehavior: 'contain',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
      className="relative w-full h-full select-none overflow-hidden bg-[#050816] cursor-grab active:cursor-grabbing"
    >
      <canvas
        ref={canvasRef}
        id="knowledge-graph-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full h-full block"
      />
    </div>
  );
};
