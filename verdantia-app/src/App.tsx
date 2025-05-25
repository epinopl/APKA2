import React, { useEffect, useRef, useState } from "react";
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

const nodeMap: { [key: string]: Node } = Object.fromEntries(
  nodes.map((n) => [n.id, n])
);

const App: React.FC = () => {
  const sketchRef = useRef<HTMLDivElement>(null);
  const [alpha, setAlpha] = useState(1.0); // siła depozytu
  const [beta, setBeta] = useState(2.0);   // (niewykorzystane teraz, ale zostawione)
  const [rho, setRho] = useState(0.5);     // współczynnik odparowania

  useEffect(() => {
    const pInst = new p5((s: any) => {
      // ===== zmienne singleton dla sketch’a =====
      let edges: Edge[] = [];
      let pheromones = new Map<string, number>();
      let bestPath: string[] = [];
      let gruntorIndex = 0;
      let gruntorProgress = 0;
      const gruntorSpeed = 10;
      let scoutCounts: { [key: string]: number } = {};
      let animatedScoutAnts: { path: string[]; index: number; progress: number }[] = [];
      const scoutAnts = 100;
      let allPaths: string[][] = [];
      const edgeMap = new Map<string, number>();

      // nowość: najbliższy sąsiad BG1
      let nearestNeighbor: string;
      let nearestKey: string;

      function generateAllEdges(): Edge[] {
        const list: Edge[] = [];
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i], b = nodes[j];
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            list.push({ from: a.id, to: b.id, dist: d });
            list.push({ from: b.id, to: a.id, dist: d });
          }
        }
        for (let e of list) {
          edgeMap.set(`${e.from}-${e.to}`, e.dist);
        }
        return list;
      }

      function initializePheromones() {
        for (let e of edges) {
          pheromones.set(`${e.from}-${e.to}`, 1.0);
        }
      }

      function generateThreePaths(): string[][] {
        const paths: string[][] = [];
        for (let i = 0; i < 3; i++) {
          const path = ["BG1"];
          const unvisited = new Set(nodes.map((n) => n.id));
          unvisited.delete("BG1");
          while (unvisited.size > 1) {
            const curr = path[path.length - 1];
            const opts = [...unvisited].filter((x) => x !== curr && x !== "BST");
            if (!opts.length) break;
            const nxt = opts[Math.floor(Math.random() * opts.length)];
            path.push(nxt);
            unvisited.delete(nxt);
          }
          if (!path.includes("BST")) path.push("BST");
          paths.push(path);
        }
        return paths;
      }

      s.setup = () => {
        s.createCanvas(1000, 1500);
        s.frameRate(60);

        // 1) krawędzie + dystanse
        edges = generateAllEdges();
        // 2) feromony
        initializePheromones();
        // 3) drogi
        allPaths = generateThreePaths();

        // 4) przygotowanie scoutów
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

        // 5) wybór bestPath
        let maxSum = -1;
        for (let p of allPaths) {
          let sum = 0;
          for (let i = 0; i < p.length - 1; i++) {
            sum += scoutCounts[`${p[i]}-${p[i + 1]}`] || 0;
          }
          if (sum > maxSum) {
            maxSum = sum;
            bestPath = p;
          }
        }

        // 6) wyliczenie najbliższego węzła od BG1
        let minD = Infinity;
        nearestNeighbor = "";
        for (let n of nodes) {
          if (n.id === "BG1") continue;
          const d = Math.hypot(
            nodeMap["BG1"].x - n.x,
            nodeMap["BG1"].y - n.y
          );
          if (d < minD) {
            minD = d;
            nearestNeighbor = n.id;
          }
        }
        nearestKey = `BG1-${nearestNeighbor}`;
      };

      s.draw = () => {
        // ==== 0) odparowanie feromonu ====
        for (let key of pheromones.keys()) {
          pheromones.set(key, pheromones.get(key)! * (1 - rho));
        }
        // depozyt feromonu na bestPath
        for (let i = 0; i < bestPath.length - 1; i++) {
          const key = `${bestPath[i]}-${bestPath[i + 1]}`;
          const dist = edgeMap.get(key) || 1;
          const deposit = alpha * (1 / dist);
          pheromones.set(key, (pheromones.get(key) || 0) + deposit);
        }

        s.background(10, 20, 30);
        s.textSize(16);

        // ==== 1) rysowanie krawędzi ====
        const maxP = Math.max(...Array.from(pheromones.values()));
        for (let e of edges) {
          const A = nodeMap[e.from], B = nodeMap[e.to];
          const ph = pheromones.get(`${e.from}-${e.to}`) || 0;
          const inten = s.map(ph, 0, maxP, 50, 255);
          const isBest =
            bestPath.includes(e.from) &&
            bestPath.includes(e.to) &&
            Math.abs(bestPath.indexOf(e.from) - bestPath.indexOf(e.to)) === 1;
          s.stroke(isBest ? [0, 200, 255, inten] : [100, 255, 100, inten]);
          s.strokeWeight(isBest ? 3 : 1);
          s.line(A.x, A.y, B.x, B.y);
        }

        // ==== 2) węzły ====
        for (let n of nodes) {
          s.fill(255);
          s.noStroke();
          s.ellipse(n.x, n.y, 30, 30);
          s.fill(255);
          s.text(n.name, n.x + 10, n.y);
        }

        // ==== 3) animacja skautów ====
        animatedScoutAnts.forEach((ant, idx) => {
          if (ant.index < ant.path.length - 1) {
            const A = nodeMap[ant.path[ant.index]];
            const B = nodeMap[ant.path[ant.index + 1]];
            const d = Math.hypot(A.x - B.x, A.y - B.y);
            ant.progress += 2;
            if (ant.progress >= d) {
              ant.index++;
              ant.progress = 0;
            }
            const t = (ant.progress + idx * 3) / d;
            const x = s.lerp(A.x, B.x, t % 1);
            const y = s.lerp(A.y, B.y, t % 1);
            s.fill(255, 255, 0);
            s.noStroke();
            s.ellipse(x, y, 6, 6);
          }
        });

        // ==== 4) animacja Gruntora ====
        // gotowość startu: czy któryś scout wszedł już do nearestNeighbor?
        const startReady = animatedScoutAnts.some(
          (ant) => ant.index >= 1 && ant.path[1] === nearestNeighbor
        );

        if (!startReady) {
          // rysuj Gruntora na polu startowym BG1
          const S = nodeMap["BG1"];
          s.fill(0, 200, 0);
          s.noStroke();
          s.ellipse(S.x, S.y, 60, 60);
          s.fill(255);
          s.text("Gruntor", S.x - 20, S.y - 40);
        } else {
          // rusz Gruntor wzdłuż bestPath
          if (bestPath.length > 1 && gruntorIndex < bestPath.length - 1) {
            const A = nodeMap[bestPath[gruntorIndex]];
            const B = nodeMap[bestPath[gruntorIndex + 1]];
            const d = Math.hypot(A.x - B.x, A.y - B.y);
            gruntorProgress += gruntorSpeed / 60;
            if (gruntorProgress >= d) {
              gruntorIndex++;
              gruntorProgress = 0;
            }
            const t = gruntorProgress / d;
            const x = s.lerp(A.x, B.x, t);
            const y = s.lerp(A.y, B.y, t);
            s.fill(0, 200, 0);
            s.noStroke();
            s.ellipse(x, y, 60, 60);
            s.fill(255);
            s.text("Gruntor", x - 20, y - 40);
          }
        }

        // ==== 5) HUD ====
        s.fill(255);
        s.noStroke();
        s.text(
          `α=${alpha.toFixed(2)}  β=${beta.toFixed(2)}  ρ=${rho.toFixed(2)}`,
          20,
          40
        );
        s.text(`Nearest: ${nearestNeighbor}`, 20, 60);
      };
    }, sketchRef.current!);

    return () => pInst.remove();
  }, [alpha, beta, rho]);

  return (
    <div>
      <div style={{ padding: 20 }}>
        <label>α (depozyt): {alpha.toFixed(2)} </label>
        <input
          type="range"
          min="0"
          max="5"
          step="0.1"
          value={alpha}
          onChange={(e) => setAlpha(+e.target.value)}
        />
        <br />
        <label>β (trasa): {beta.toFixed(2)} </label>
        <input
          type="range"
          min="0"
          max="5"
          step="0.1"
          value={beta}
          onChange={(e) => setBeta(+e.target.value)}
        />
        <br />
        <label>ρ (odparowanie): {rho.toFixed(2)} </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={rho}
          onChange={(e) => setRho(+e.target.value)}
        />
        <br />
      </div>
      <div ref={sketchRef}></div>
    </div>
  );
};

export default App;
