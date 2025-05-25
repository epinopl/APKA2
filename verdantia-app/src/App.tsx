import { useEffect, useRef, useState } from "react";
// @ts-ignore
import p5 from "p5";

// Typy danych
interface Node {
  id: string;
  name: string;
  x: number;
  y: number;
}

interface Edge {
  from: string;
  to: string;
  dist: number;
}

const nodes: Node[] = [
  { id: "MR1", name: "Najwyższe Mrowisko", x: 150, y: 350 },
  { id: "BG1", name: "Bagna Koralowe", x: 180, y: 1250 },
  { id: "RC1", name: "Rzeka Dwóch Cieni", x: 450, y: 800 },
  { id: "LB1", name: "Labirynt Pięciu Dolin", x: 500, y: 700 },
  { id: "BST", name: "Baszta Zmierzchu", x: 870, y: 240 },
  { id: "CT1", name: "Zamek Główny", x: 830, y: 1370 },
];

const nodeMap: { [key: string]: Node } = Object.fromEntries(nodes.map(n => [n.id, n]));

function App() {
  const sketchRef = useRef(null);
  const [alpha, setAlpha] = useState(1.0);
  const [beta, setBeta] = useState(2.0);
  const [rho, setRho] = useState(0.5);

  useEffect(() => {
    const pInst = new p5((s: any) => {
      let edges: Edge[] = [];
      let pheromones = new Map<string, number>();
      let bestPath: string[] = [];
      let bestLength = Infinity;
      let iteration = 0;

      // Animacja Gruntora
      let gruntorIndex = 0;
      let gruntorProgress = 0;
      const gruntorSpeed = 10; // px/s

      s.setup = () => {
        s.createCanvas(1000, 1500);
        s.frameRate(60);
        edges = generateAllEdges();
        initializePheromones();
      };

      function generateAllEdges(): Edge[] {
        const edgeList: Edge[] = [];
        const connected = new Set<string>();
        for (let i = 0; i < nodes.length; i++) {
          for (let j = 0; j < nodes.length; j++) {
            const from = nodes[i].id;
            const to = nodes[j].id;
            const key = `${from}-${to}`;
            const rev = `${to}-${from}`;
            if (from !== to && !connected.has(key) && !connected.has(rev) && (from === "BST" || to === "BST" || Math.random() < 0.5)) {
              const dist = distance(nodes[i], nodes[j]);
              edgeList.push({ from, to, dist });
              edgeList.push({ from: to, to: from, dist });
              connected.add(key);
              connected.add(rev);
            }
          }
        }
        return edgeList;
      }

      function initializePheromones() {
        pheromones.clear();
        for (let edge of edges) {
          pheromones.set(`${edge.from}-${edge.to}`, 1.0);
        }
      }

      function distance(a: Node, b: Node): number {
        return Math.hypot(a.x - b.x, a.y - b.y);
      }

      function chooseNext(current: string, visitCounts: Map<string, number>): string | undefined {
        const options = edges.filter(e => e.from === current && (visitCounts.get(e.to) || 0) < 3);
        const scores = options.map(e => {
          const pher = pheromones.get(`${e.from}-${e.to}`) || 0.01;
          return Math.pow(pher, alpha) * Math.pow(1 / e.dist, beta);
        });
        const sum = scores.reduce((a, b) => a + b, 0);
        const probs = scores.map(s => s / sum);
        let r = Math.random();
        for (let i = 0; i < probs.length; i++) {
          r -= probs[i];
          if (r <= 0) return options[i].to;
        }
        return options[options.length - 1]?.to;
      }

      function runACOIteration() {
        const antCount = 20;
        let localBest: string[] | null = null;
        let localLength = Infinity;

        const newPheromones = new Map<string, number>();
        for (let i = 0; i < antCount; i++) {
          let path: string[] = ["BG1"];
          let visitCounts = new Map<string, number>();
          visitCounts.set("BG1", 1);
          let totalLength = 0;

          while (new Set(path).size < nodes.length || path[path.length - 1] !== "BST") {
            const current = path[path.length - 1];
            const next = chooseNext(current, visitCounts);
            if (!next) break;
            path.push(next);
            visitCounts.set(next, (visitCounts.get(next) || 0) + 1);
            const dist = distance(nodeMap[current], nodeMap[next]);
            totalLength += dist;
            const key = `${current}-${next}`;
            newPheromones.set(key, (newPheromones.get(key) || 0) + 1 / dist);
            if (path.length > 50) break;
          }

          if (new Set(path).size === nodes.length && path[path.length - 1] === "BST" && totalLength < localLength) {
            localBest = path;
            localLength = totalLength;
          }
        }

        for (let key of pheromones.keys()) {
          pheromones.set(key, pheromones.get(key)! * (1 - rho));
        }
        for (let [key, value] of newPheromones.entries()) {
          pheromones.set(key, (pheromones.get(key) || 0) + value);
        }

        if (localBest && localLength < bestLength) {
          bestPath = localBest;
          bestLength = localLength;
          gruntorIndex = 0;
          gruntorProgress = 0;
        }

        iteration++;
      }

      s.draw = () => {
        runACOIteration();

        s.background(10, 20, 30);
        s.textSize(16);
        s.stroke(255);
        s.fill(255);

        for (let edge of edges) {
          const pher = pheromones.get(`${edge.from}-${edge.to}`) || 0;
          const from = nodeMap[edge.from];
          const to = nodeMap[edge.to];
          s.stroke(100, 255, 100, Math.min(255, pher * 40));
          s.line(from.x, from.y, to.x, to.y);
        }

        for (let node of nodes) {
          s.fill(255);
          s.ellipse(node.x, node.y, 30, 30);
          s.text(node.name, node.x + 10, node.y);
        }

        for (let i = 0; i < bestPath.length - 1; i++) {
          const from = nodeMap[bestPath[i]];
          const to = nodeMap[bestPath[i + 1]];
          s.stroke(0, 200, 255);
          s.strokeWeight(4);
          s.line(from.x, from.y, to.x, to.y);
        }
        s.strokeWeight(1);

        // Ruch Gruntora po ścieżce z określoną prędkością
        if (bestPath.length > 1 && gruntorIndex < bestPath.length - 1) {
          const from = nodeMap[bestPath[gruntorIndex]];
          const to = nodeMap[bestPath[gruntorIndex + 1]];
          const dist = distance(from, to);
          gruntorProgress += gruntorSpeed / 60; // 60 FPS

          if (gruntorProgress >= dist) {
            gruntorIndex++;
            gruntorProgress = 0;
          }

          const t = gruntorProgress / dist;
          const x = s.lerp(from.x, to.x, t);
          const y = s.lerp(from.y, to.y, t);

          s.fill(0, 200, 0);
          s.ellipse(x, y, 60, 60);
          s.text("Gruntor", x - 20, y - 40);
        }

        s.fill(255);
        s.text(`α=${alpha.toFixed(2)} β=${beta.toFixed(2)} ρ=${rho.toFixed(2)}`, 20, 40);
        s.text(`Najlepsza długość: ${bestLength.toFixed(1)} | Iteracja: ${iteration}`, 20, 60);
      };
    }, sketchRef.current!);

    return () => pInst.remove();
  }, [alpha, beta, rho]);

  return (
    <div>
      <div style={{ padding: 20 }}>
        <label>α (feromon): {alpha.toFixed(2)} </label>
        <input type="range" min="0" max="5" step="0.1" value={alpha} onChange={e => setAlpha(parseFloat(e.target.value))} /><br />

        <label>β (trasa): {beta.toFixed(2)} </label>
        <input type="range" min="0" max="5" step="0.1" value={beta} onChange={e => setBeta(parseFloat(e.target.value))} /><br />

        <label>ρ (parowanie): {rho.toFixed(2)} </label>
        <input type="range" min="0" max="1" step="0.05" value={rho} onChange={e => setRho(parseFloat(e.target.value))} /><br />
      </div>
      <div ref={sketchRef}></div>
    </div>
  );
}

export default App;
