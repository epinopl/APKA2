import { useEffect, useRef, useState } from "react";
// @ts-ignore
import p5 from "p5";

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
  { id: "FV1", name: "Fioletowy Wąwóz", x: 300, y: 600 },
  { id: "JG1", name: "Jezioro Głębokiej Ciszy", x: 620, y: 1000 },
  { id: "MG1", name: "Mglista Grota", x: 700, y: 500 },
  { id: "KL1", name: "Kwietna Łąka Elfów", x: 400, y: 1200 },
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
      let gruntorIndex = 0;
      let gruntorProgress = 0;
      const gruntorSpeed = 10;
      let scoutCounts: { [key: string]: number } = {};
      let animatedScoutAnts: { path: string[]; index: number; progress: number }[] = [];
      const scoutAnts = 100;
      let allPaths: string[][] = [];

      s.setup = () => {
        s.createCanvas(1000, 1500);
        s.frameRate(60);
        edges = generateAllEdges();
        initializePheromones();
        allPaths = generateThreePaths();
        animatedScoutAnts = [];
        scoutCounts = {};

        for (let i = 0; i < scoutAnts; i++) {
          const path = allPaths[Math.floor(Math.random() * allPaths.length)];
          animatedScoutAnts.push({ path, index: 0, progress: 0 });

          for (let j = 0; j < path.length - 1; j++) {
            const key = `${path[j]}-${path[j + 1]}`;
            scoutCounts[key] = (scoutCounts[key] || 0) + 1;
          }
        }

        let maxSum = -1;
        for (let path of allPaths) {
          let sum = 0;
          for (let i = 0; i < path.length - 1; i++) {
            const key = `${path[i]}-${path[i + 1]}`;
            sum += scoutCounts[key] || 0;
          }
          if (sum > maxSum) {
            maxSum = sum;
            bestPath = path;
          }
        }
      };

      function generateAllEdges(): Edge[] {
        const edgeList: Edge[] = [];
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const from = nodes[i];
            const to = nodes[j];
            const dist = Math.hypot(from.x - to.x, from.y - to.y);
            edgeList.push({ from: from.id, to: to.id, dist });
            edgeList.push({ from: to.id, to: from.id, dist });
          }
        }
        return edgeList;
      }

      function initializePheromones() {
        for (let edge of edges) {
          pheromones.set(`${edge.from}-${edge.to}`, 1.0);
        }
      }

      function generateThreePaths(): string[][] {
        const paths: string[][] = [];
        for (let i = 0; i < 3; i++) {
          const path: string[] = ["BG1"];
          const unvisited = new Set(nodes.map(n => n.id));
          unvisited.delete("BG1");

          while (unvisited.size > 1) { // zostawiamy miejsce na "BST"
            const current = path[path.length - 1];
            const nextOptions = [...unvisited].filter(n => n !== current && n !== "BST");
            if (nextOptions.length === 0) break;
            const next = nextOptions[Math.floor(Math.random() * nextOptions.length)];
            path.push(next);
            unvisited.delete(next);
          }

          if (!path.includes("BST")) path.push("BST");
          paths.push(path);
        }
        return paths;
      }
      // koniec setup() poprawnie zamknięty tutaj

      s.draw = () => {
        s.background(10, 20, 30);
        s.textSize(16);
        s.stroke(255);
        s.fill(255);

        for (let edge of edges) {
          const from = nodeMap[edge.from];
          const to = nodeMap[edge.to];
          const key = `${edge.from}-${edge.to}`;
          const count = scoutCounts[key] || 0;
          const intensity = Math.min(255, count * 5);
          const isBest = bestPath.includes(edge.from) && bestPath.includes(edge.to) &&
            Math.abs(bestPath.indexOf(edge.from) - bestPath.indexOf(edge.to)) === 1;
          s.stroke(isBest ? [0, 200, 255] : [100, 255, 100, intensity]);
          s.strokeWeight(isBest ? 3 : 1);
          s.line(from.x, from.y, to.x, to.y);
        }

        for (let node of nodes) {
          s.fill(255);
          s.ellipse(node.x, node.y, 30, 30);
          s.text(node.name, node.x + 10, node.y);
        }

        for (let ant of animatedScoutAnts) {
          if (ant.index < ant.path.length - 1) {
            const from = nodeMap[ant.path[ant.index]];
            const to = nodeMap[ant.path[ant.index + 1]];
            const dist = Math.hypot(from.x - to.x, from.y - to.y);
            ant.progress += 2;
            if (ant.progress >= dist) {
              ant.index++;
              ant.progress = 0;
            }
            const t = ant.progress / dist;
            const x = s.lerp(from.x, to.x, t);
            const y = s.lerp(from.y, to.y, t);
            s.fill(255, 255, 0);
            s.ellipse(x, y, 6, 6);
          }
        }

        const firstEdge = `${bestPath[0]}-${bestPath[1]}`;
        const readyToGo = (scoutCounts[firstEdge] || 0) >= scoutAnts * 0.3 && animatedScoutAnts.every(ant => ant.index >= ant.path.length - 1);

        if (bestPath.length > 1 && readyToGo && gruntorIndex < bestPath.length - 1) {
          const from = nodeMap[bestPath[gruntorIndex]];
          const to = nodeMap[bestPath[gruntorIndex + 1]];
          const dist = Math.hypot(from.x - to.x, from.y - to.y);
          gruntorProgress += gruntorSpeed / 60;
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
        s.text(`Scout ready: ${(scoutCounts[firstEdge] || 0)} / ${scoutAnts} (${((scoutCounts[firstEdge] || 0) / scoutAnts * 100).toFixed(1)}%)`, 20, 60);
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
