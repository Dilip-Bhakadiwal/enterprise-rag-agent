export type EntityCategory =
  | 'dilip_ai'
  | 'apple'
  | 'samsung'
  | 'stores'
  | '5g_regions'
  | 'warranty';

export interface SubClusterInfo {
  id: string;
  label: string;
  clusterId: EntityCategory;
  color: string;
  description: string;
}

export interface MainClusterInfo {
  id: EntityCategory;
  label: string;
  parentNodeId: string;
  color: string;
  iconKey: string;
  description: string;
  subclusters: SubClusterInfo[];
}

export interface GraphNode {
  id: string;
  label: string;
  category: EntityCategory;
  subcategory: string;
  subclusterId?: string;
  subclusterLabel?: string;
  isParentNode?: boolean;
  hierarchyLevel?: 1 | 2 | 3; // 1 = Main Cluster Hub/Parent, 2 = Subcluster Hub, 3 = Leaf Node
  color: string;
  glowColor: string;
  radius: number;
  description: string;
  shortSnippet?: string;
  metrics: Record<string, string | number>;
  attributes: Record<string, string>;
  tags: string[];
  iconType: 'ai' | 'apple' | 'samsung' | 'store' | 'region' | 'warranty' | 'paper' | 'chip';
  // Orbital celestial animation coordinates
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  orbitRadius?: number;
  basePlanetAngle?: number;
  subDist?: number;
  baseSubAngle?: number;
  ringRadius?: number;
  baseNodeAngle?: number;
}

export interface GraphLink {
  id: string;
  source: string; // node ID or node reference
  target: string; // node ID or node reference
  relationship: string;
  strength: number; // 0.1 to 1.0
  directed?: boolean;
  color?: string;
  particleSpeed?: number;
  particleDensity?: number;
  description?: string;
}

export interface EnergyPulsePacket {
  id: string;
  linkId: string;
  sourceId: string;
  targetId: string;
  progress: number; // 0.0 to 1.0
  speed: number;
  color: string;
  size: number;
  tailLength: number;
}

export type CategoryFilter = 'all' | 'apple' | 'samsung' | 'stores' | '5g_regions' | 'warranty' | 'dilip_ai';

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  relatedNodeId?: string;
  relatedNodeLabel?: string;
  source?: 'gemini-3.7-flash' | 'local-rag-engine';
}

export interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  activeCluster: string;
  fps: number;
  energyParticlesCount: number;
}
