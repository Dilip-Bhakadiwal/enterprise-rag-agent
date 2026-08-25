import { GraphNode, GraphLink, EntityCategory } from '../types/graph';
import { CATEGORY_CONFIG } from './knowledgeGraphData';

const CLUSTER_KEYS: EntityCategory[] = [
  'dilip_ai',
  'apple',
  'samsung',
  'stores',
  '5g_regions',
  'warranty',
];

const SUBTOPICS: Record<EntityCategory, string[]> = {
  dilip_ai: [
    'Speculative Decoders',
    'Neural Quantization',
    'Loss Landscapes',
    'Attention Pruning',
    'Transformer Memory',
    'Edge Inference',
    'Mixture of Experts',
    'Direct Preference Opt',
    'Kernel Compilation',
    'FP4 Matrix Ops',
  ],
  apple: [
    'M3 Max Micro-Arch',
    'Unified Memory Bus',
    'Neural Engine Core',
    'ProRes Accelerators',
    'Spatial Audio DSP',
    'Titanium Frame Stress',
    'Retina XDR Calibration',
    'Tandem OLED Drivers',
    'Secure Enclave Gen4',
    'Battery Power Mgmt',
  ],
  samsung: [
    'Galaxy NPU Hexagon',
    'Flex Hinge Durability',
    '200MP ISOCELL Sensor',
    'Vapor Chamber Cooling',
    'Dynamic AMOLED 2X',
    'UFS 4.0 Bus Controller',
    'S-Pen Digitizer Layer',
    'Knox Vault Subsystem',
    'Battery SEI Stabilization',
    'OneUI Frame Scheduler',
  ],
  stores: [
    'NYC Fifth Ave Matrix',
    'Tokyo Ginza Hub',
    'London Regent Telemetry',
    'Paris Champs-Élysées',
    'Milan Piazza Liberty',
    'Singapore Marina Bay',
    'Berlin Kurfürstendamm',
    'Sydney George St',
    'Seoul Gangnam Hub',
    'Dubai Mall Pavilion',
  ],
  '5g_regions': [
    'North America mmWave',
    'Europe C-Band 3.5GHz',
    'APAC 64T64R MIMO',
    'LATAM Sub-6GHz Standalone',
    'Nordic Low-Band Coverage',
    'MidEast High-Density 5G',
    'Transatlantic Edge Relay',
    'Private Campus RAN',
    'Beamforming Phase Array',
    'Dynamic Spectrum Sharing',
  ],
  warranty: [
    'OLED Pixel Burn-In',
    'Hinge Particle Ingress',
    'Battery Solid Interface',
    'Thermal Throttling QA',
    'Micro-Crack Acoustic Test',
    'Optical Anti-Reflective',
    'Sapphire Lens Flare Test',
    'Capacitive Touch Drift',
    'USB-C Port Retention Test',
    'Drop Impact Vector Logs',
  ],
};

/**
 * Generates a scalable knowledge graph with N nodes and links
 * Fully interconnected hierarchical structure with parents, sub-clusters, and leaves
 */
export function generateLargeKnowledgeGraph(targetNodeCount = 1000): {
  nodes: GraphNode[];
  links: GraphLink[];
} {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  const clusterCount = CLUSTER_KEYS.length;
  const nodesPerCluster = Math.floor(targetNodeCount / clusterCount);

  let linkIdCounter = 1;

  CLUSTER_KEYS.forEach((catKey) => {
    const config = CATEGORY_CONFIG[catKey];
    const subtopics = SUBTOPICS[catKey] || ['Subsystem A', 'Subsystem B'];

    // 1. Create Root Parent Hub Node
    const rootId = `root_${catKey}`;
    const rootNode: GraphNode = {
      id: rootId,
      label: config.label,
      category: catKey,
      subcategory: 'Cluster Nexus Core',
      subclusterId: `${catKey}_root`,
      isParentNode: true,
      hierarchyLevel: 1,
      color: config.color,
      glowColor: config.color,
      radius: 36,
      description: `Primary parent apex cluster representing ${config.label}.`,
      shortSnippet: `Apex Root Hub (${nodesPerCluster} sub-nodes)`,
      metrics: {
        'Total Child Nodes': nodesPerCluster,
        'Cluster Architecture': 'Hierarchical Star Matrix',
        'Throughput Load': '12.4 GB/s',
      },
      attributes: {
        'Hierarchy Tier': 'Tier 1 Apex Nexus',
        'Resilience Level': '99.999% High Availability',
      },
      tags: [config.label, 'Core Hub', 'Root Nexus'],
      iconType: 'ai',
    };
    nodes.push(rootNode);

    // 2. Create Intermediate Subcluster Hubs (Tier 2)
    const numSubhubs = 6;
    const subhubIds: string[] = [];

    for (let s = 0; s < numSubhubs; s++) {
      const subId = `${catKey}_subhub_${s + 1}`;
      subhubIds.push(subId);
      const subTopic = subtopics[s % subtopics.length];

      const subhubNode: GraphNode = {
        id: subId,
        label: `${subTopic} Branch`,
        category: catKey,
        subcategory: subTopic,
        subclusterId: `${catKey}_sub_${s + 1}`,
        hierarchyLevel: 2,
        color: config.color,
        glowColor: config.color,
        radius: 22,
        description: `Subcluster routing branch managing ${subTopic} telemetry.`,
        shortSnippet: `${subTopic} Routing Sub-hub`,
        metrics: {
          'Sub-branch Nodes': Math.floor(nodesPerCluster / numSubhubs),
          'Bandwidth Allocation': '2.4 GB/s',
        },
        attributes: {
          'Hierarchy Tier': 'Tier 2 Intermediate Hub',
          'Routing Protocol': 'Speculative Semantic Bus',
        },
        tags: [config.label, subTopic, 'Sub-Hub'],
        iconType: 'chip',
      };
      nodes.push(subhubNode);

      // Connect Root to Subhub
      links.push({
        id: `link_${linkIdCounter++}`,
        source: rootId,
        target: subId,
        relationship: 'BRANCHES_INTO',
        strength: 0.9,
        color: config.color,
        particleSpeed: 1.2,
      });
    }

    // 3. Create Leaf Nodes (Tier 3)
    const remainingNodes = nodesPerCluster - 1 - numSubhubs;
    for (let i = 0; i < remainingNodes; i++) {
      const leafId = `${catKey}_leaf_${i + 1}`;
      const parentSubhubId = subhubIds[i % subhubIds.length];
      const topicIndex = i % subtopics.length;
      const topic = subtopics[topicIndex];

      const leafNode: GraphNode = {
        id: leafId,
        label: `${topic} #${i + 1}`,
        category: catKey,
        subcategory: topic,
        subclusterId: `${catKey}_sub_${(i % numSubhubs) + 1}`,
        hierarchyLevel: 3,
        color: config.color,
        glowColor: config.color,
        radius: 12 + (i % 6),
        description: `Active operational edge unit for ${topic} handling parallel stream #${i + 1}.`,
        shortSnippet: `Edge Unit #${i + 1} • ${topic}`,
        metrics: {
          'Latency Point': `${(1.2 + (i % 5) * 0.4).toFixed(1)} ms`,
          'Sample Rate': `${100 + (i % 40) * 10} Hz`,
          'Integrity Score': `${(97.5 + (i % 25) * 0.1).toFixed(1)}%`,
        },
        attributes: {
          'Hierarchy Tier': 'Tier 3 Leaf Node',
          'Compute State': 'Active Synced',
        },
        tags: [config.label, topic, `Batch-${(i % 10) + 1}`],
        iconType: 'ai',
      };
      nodes.push(leafNode);

      // Connect Leaf to Subhub
      links.push({
        id: `link_${linkIdCounter++}`,
        source: parentSubhubId,
        target: leafId,
        relationship: 'MANAGES_TELEMETRY',
        strength: 0.75,
        color: config.color,
        particleSpeed: 0.9 + (i % 4) * 0.15,
      });

      // Periodic horizontal intra-cluster link between sibling leaves (every 8th node)
      if (i > 0 && i % 8 === 0) {
        const prevSiblingId = `${catKey}_leaf_${i}`;
        links.push({
          id: `link_${linkIdCounter++}`,
          source: prevSiblingId,
          target: leafId,
          relationship: 'CROSS_VALIDATION',
          strength: 0.4,
          color: config.color,
          particleSpeed: 0.6,
        });
      }
    }
  });

  // 4. Inter-Cluster Nexus Bridges (Connecting Root Hubs together)
  for (let i = 0; i < CLUSTER_KEYS.length; i++) {
    const srcCat = CLUSTER_KEYS[i];
    const tgtCat = CLUSTER_KEYS[(i + 1) % CLUSTER_KEYS.length];
    links.push({
      id: `link_nexus_${i}`,
      source: `root_${srcCat}`,
      target: `root_${tgtCat}`,
      relationship: 'INTER_CLUSTER_LINK',
      strength: 0.85,
      color: '#38bdf8',
      particleSpeed: 1.5,
    });
  }

  return { nodes, links };
}
