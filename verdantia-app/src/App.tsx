import { useEffect, useRef } from "react";
import p5 from "p5";

const nodes = [
  { id: "MR1", name: "Najwyższe Mrowisko", x: 150, y: 350 },
  { id: "BG1", name: "Bagna Koralowe", x: 180, y: 1250 },
  { id: "RC1", name: "Rzeka Dwóch Cieni", x: 450, y: 800 },
  { id: "LB1", name: "Labirynt Pięciu Dolin", x: 500, y: 700 },
  { id: "BST", name: "Baszta Zmierzchu", x: 870, y: 240 },
  { id: "CT1", name: "Zamek Główny", x: 830, y: 1370 },
];

function App() {
  const sketchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let antPath: string[] = [];
    let antIndex = 0;
    let edges: [string, string][] = [];
    let p: p5;

    const sketch = (s: p5) => {
      s.setup = () => {
        s.createCanvas(1000, 1500);
        s.frameRate(1);
        generateEdges();
        generateAntPath();
      };

      function generateEdges() {
        const maxEdges = 10;
        const shuffled = [...nodes].sort(() => Math.random() - 0.5);
        edges = [];

        for (let i = 0; i < shuffled.length; i++) {
          const from = shuffled[i].id;
          const others = nodes.filter(n => n.id !== from);
          const to = others[Math.floor(Math.random() * others.length)].id;
          if (!edges.find(e => (e[0] === from && e[1] === to) || (e[0] === to && e[1] === from))) {
            edges.push([from, to]);
          }
          if (edges.length >= maxEdges) break;
        }
      }

      function generateAntPath() {
        antPath = ["BG1", "RC1", "LB1", "BST"]; // najprostsza trasa (dla animacji Gruntora)
        antIndex = 0;
      }

      s.draw = () => {
        s.background(10, 20, 30);
        s.textSize(16);
        s.stroke(255);
        s.fill(255);

        for (let [fromId, toId] of edges) {
          const from = nodes.find(n => n.id === fromId)!;
          const to = nodes.find(n => n.id === toId)!;
          s.line(from.x, from.y, to.x, to.y);
        }

        for (let node of nodes) {
          s.fill(255);
          s.ellipse(node.x, node.y, 30, 30);
          s.text(node.name, node.x + 10, node.y);
        }

        // Mrówki – ślady feromonu
        for (let i = 0; i < antIndex; i++) {
          const node = nodes.find(n => n.id === antPath[i])!;
          s.fill(0, 255, 0, 100 + i * 30);
          s.ellipse(node.x, node.y, 40, 40);
        }

        // Gruntor – bohater
        if (antIndex < antPath.length) {
          const node = nodes.find(n => n.id === antPath[antIndex])!;
          s.fill(0, 200, 0);
          s.ellipse(node.x, node.y, 60, 60);
          s.text("Gruntor", node.x - 20, node.y - 40);
          antIndex++;
        } else {
          s.fill(255, 0, 0);
          s.text("🎉 Liliana uratowana!", 400, 100);
        }
      };
    };

    p = new p5(sketch, sketchRef.current!);

    return () => p.remove();
  }, []);

  return <div ref={sketchRef}></div>;
}

export default App;
