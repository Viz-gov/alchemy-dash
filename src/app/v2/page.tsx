"use client";

import React, { useRef, useState, useCallback, useEffect } from 'react';
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  TimeScale,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  TimeScale,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

type RangeSliderProps = {
  min?: number;
  max?: number;
  step?: number;
  defaultLeft?: number;
  defaultRight?: number;
  onChange?: (left: number, right: number) => void;
  minGap?: number;
};

function RangeSlider({
  min = 0,
  max = 100,
  step = 1,
  defaultLeft = 20,
  defaultRight = 80,
  onChange,
  minGap = 0,
}: RangeSliderProps) {
  // Clamp helpers
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const snap = (v: number) => Math.round(v / step) * step;

  const [left, setLeft] = useState(() => clamp(snap(defaultLeft), min, max));
  const [right, setRight] = useState(() => clamp(snap(defaultRight), min, max));
  const trackRef = useRef<HTMLDivElement | null>(null);
  const activeThumb = useRef<"left" | "right" | null>(null);

  // Notify parent
  useEffect(() => { onChange?.(left, right); }, [left, right, onChange]);

  // Convert clientX → value
  const clientXToValue = useCallback((clientX: number) => {
    const track = trackRef.current!;
    const rect = track.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    const raw = min + ratio * (max - min);
    return snap(clamp(raw, min, max));
  }, [min, max, step]);

  // Pointer move handler
  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!activeThumb.current) return;
    const v = clientXToValue(e.clientX);

    if (activeThumb.current === "left") {
      // left cannot go below min, or cross (right - minGap)
      const next = clamp(v, min, right - minGap);
      setLeft(next);
    } else {
      // right cannot go above max, or cross (left + minGap)
      const next = clamp(v, left + minGap, max);
      setRight(next);
    }
  }, [clientXToValue, left, right, min, max, minGap]);

  const stopDragging = useCallback(() => {
    activeThumb.current = null;
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", stopDragging);
  }, [handlePointerMove]);

  const startDragging = (which: "left" | "right") => (e: React.PointerEvent) => {
    activeThumb.current = which;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", stopDragging, { passive: true });
  };

  // Keyboard support
  const onKeyDown = (which: "left" | "right") => (e: React.KeyboardEvent) => {
    const delta = (dir: number, big = false) => dir * (big ? step * 10 : step);
    let next = which === "left" ? left : right;

    switch (e.key) {
      case "ArrowLeft": next -= delta(1); break;
      case "ArrowRight": next += delta(1); break;
      case "PageDown": next -= delta(1, true); break;
      case "PageUp":   next += delta(1, true); break;
      case "Home":     next = which === "left" ? min : left + minGap; break;
      case "End":      next = which === "right" ? max : right - minGap; break;
      default: return;
    }
    e.preventDefault();

    next = snap(next);
    if (which === "left") {
      setLeft(clamp(next, min, right - minGap));
    } else {
      setRight(clamp(next, left + minGap, max));
    }
  };

  // Percent positions for styling
  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  const leftPct = pct(left);
  const rightPct = pct(right);

  return (
    <div className="range-slider">
      <div className="track" ref={trackRef} onPointerDown={(e) => {
        // Clicking the track moves the nearest thumb
        const v = clientXToValue(e.clientX);
        if (Math.abs(v - left) <= Math.abs(v - right)) {
          setLeft(clamp(v, min, right - minGap));
        } else {
          setRight(clamp(v, left + minGap, max));
        }
      }}>
        <div
          className="range"
          style={{ left: `${leftPct}%`, width: `${rightPct - leftPct}%` }}
        />
        {/* Left thumb */}
        <button
          className="thumb"
          style={{ left: `${leftPct}%` }}
          role="slider"
          aria-label="Minimum value"
          aria-valuemin={min}
          aria-valuemax={right - minGap}
          aria-valuenow={left}
          aria-orientation="horizontal"
          onPointerDown={startDragging("left")}
          onKeyDown={onKeyDown("left")}
        />
        {/* Right thumb */}
        <button
          className="thumb"
          style={{ left: `${rightPct}%` }}
          role="slider"
          aria-label="Maximum value"
          aria-valuemin={left + minGap}
          aria-valuemax={max}
          aria-valuenow={right}
          aria-orientation="horizontal"
          onPointerDown={startDragging("right")}
          onKeyDown={onKeyDown("right")}
        />
      </div>

      {/* Styles */}
      <style jsx>{`
        .range-slider {
          width: 100%;
          max-width: 520px;
          padding: 16px 6px;
          user-select: none;
        }
        .track {
          position: relative;
          height: 6px;
          border-radius: 999px;
          background: #374151;
        }
        .range {
          position: absolute;
          height: 100%;
          background: linear-gradient(90deg, #8b5cf6, #3b82f6);
          border-radius: 999px;
        }
        .thumb {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid white;
          background: #111827;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
          touch-action: none;
          cursor: grab;
          transition: all 0.2s ease;
        }
        .thumb:hover {
          transform: translate(-50%, -50%) scale(1.1);
          box-shadow: 0 6px 16px rgba(139, 92, 246, 0.4);
        }
        .thumb:active { 
          cursor: grabbing; 
          transform: translate(-50%, -50%) scale(1.05);
        }
        .thumb:focus-visible {
          outline: 3px solid rgba(139, 92, 246, 0.6);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}

// Analytics Cards Component
const AnalyticsCards = () => {
  return (
    <div className="grid grid-cols-4 gap-6">
      {/* ————— Card 1 ————— */}
      <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-300">TOTAL VOLUME</h3>
          <div className="flex items-center text-green-400 text-sm">
            <span className="mr-1">▲</span>
            +12.4%
          </div>
        </div>
        <div className="text-3xl font-bold text-white mb-4">$2.4B</div>
        <div className="h-16">
          <Chart
            type="line"
            data={{
              labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
              datasets: [{
                label: 'Volume',
                data: [2.1, 2.3, 2.8, 2.5, 2.9, 2.7, 2.4],
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderWidth: 2,
                pointBackgroundColor: 'transparent',
                pointBorderColor: 'transparent',
                pointRadius: 0,
                fill: true,
                tension: 0.4,
              }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { x: { display: false }, y: { display: false } },
              elements: { point: { radius: 0 } },
            }}
          />
        </div>
      </div>

      {/* ————— Card 2 ————— */}
      <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-300">ACTIVE USERS</h3>
          <div className="flex items-center text-green-400 text-sm">
            <span className="mr-1">▲</span>
            +8.7%
          </div>
        </div>
        <div className="text-3xl font-bold text-white mb-4">847.2K</div>
        <div className="h-16">
          <Chart
            type="line"
            data={{
              labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
              datasets: [{
                label: 'Users',
                data: [820, 835, 845, 840, 850, 848, 847],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 2,
                pointBackgroundColor: 'transparent',
                pointBorderColor: 'transparent',
                pointRadius: 0,
                fill: true,
                tension: 0.4,
              }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { x: { display: false }, y: { display: false } },
              elements: { point: { radius: 0 } },
            }}
          />
        </div>
      </div>

      {/* ————— Card 3 ————— */}
      <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-300">TRANSACTION COUNT</h3>
          <div className="flex items-center text-red-400 text-sm">
            <span className="mr-1">▼</span>
            -2.1%
          </div>
        </div>
        <div className="text-3xl font-bold text-white mb-4">156.8M</div>
        <div className="h-16">
          <Chart
            type="line"
            data={{
              labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
              datasets: [{
                label: 'Transactions',
                data: [158, 157, 156, 155, 154, 155, 156],
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderWidth: 2,
                pointBackgroundColor: 'transparent',
                pointBorderColor: 'transparent',
                pointRadius: 0,
                fill: true,
                tension: 0.4,
              }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { x: { display: false }, y: { display: false } },
              elements: { point: { radius: 0 } },
            }}
          />
        </div>
      </div>

      {/* ————— Card 4 ————— */}
      <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-300">AVG GAS PRICE</h3>
          <div className="flex items-center text-green-400 text-sm">
            <span className="mr-1">▲</span>
            +15.3%
          </div>
        </div>
        <div className="text-3xl font-bold text-white mb-4">23.4 Gwei</div>
        <div className="h-16">
          <Chart
            type="line"
            data={{
              labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
              datasets: [{
                label: 'Gas Price',
                data: [20, 22, 25, 23, 26, 24, 23],
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderWidth: 2,
                pointBackgroundColor: 'transparent',
                pointBorderColor: 'transparent',
                pointRadius: 0,
                fill: true,
                tension: 0.4,
              }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { x: { display: false }, y: { display: false } },
              elements: { point: { radius: 0 } },
            }}
          />
        </div>
      </div>

      {/* ————— Card 5 ————— */}
      <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-300">BLOCK TIME</h3>
          <div className="flex items-center text-green-400 text-sm">
            <span className="mr-1">▲</span>
            +3.2%
          </div>
        </div>
        <div className="text-3xl font-bold text-white mb-4">12.1s</div>
        <div className="h-16">
          <Chart
            type="line"
            data={{
              labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
              datasets: [{
                label: 'Block Time',
                data: [11.8, 11.9, 12.0, 12.1, 12.2, 12.1, 12.1],
                borderColor: '#06b6d4',
                backgroundColor: 'rgba(6, 182, 212, 0.1)',
                borderWidth: 2,
                pointBackgroundColor: 'transparent',
                pointBorderColor: 'transparent',
                pointRadius: 0,
                fill: true,
                tension: 0.4,
              }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { x: { display: false }, y: { display: false } },
              elements: { point: { radius: 0 } },
            }}
          />
        </div>
      </div>

      {/* ————— Card 6 ————— */}
      <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-300">NETWORK HASH</h3>
          <div className="flex items-center text-red-400 text-sm">
            <span className="mr-1">▼</span>
            -1.8%
          </div>
        </div>
        <div className="text-3xl font-bold text-white mb-4">847.2 TH/s</div>
        <div className="h-16">
          <Chart
            type="line"
            data={{
              labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
              datasets: [{
                label: 'Hash Rate',
                data: [850, 848, 845, 843, 840, 842, 847],
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderWidth: 2,
                pointBackgroundColor: 'transparent',
                pointBorderColor: 'transparent',
                pointRadius: 0,
                fill: true,
                tension: 0.4,
              }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { x: { display: false }, y: { display: false } },
              elements: { point: { radius: 0 } },
            }}
          />
        </div>
      </div>

      {/* ————— Card 7 ————— */}
      <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-300">MEMPOOL SIZE</h3>
          <div className="flex items-center text-green-400 text-sm">
            <span className="mr-1">▲</span>
            +22.7%
          </div>
        </div>
        <div className="text-3xl font-bold text-white mb-4">12.4K</div>
        <div className="h-16">
          <Chart
            type="line"
            data={{
              labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
              datasets: [{
                label: 'Mempool',
                data: [10, 11, 13, 15, 18, 16, 12],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 2,
                pointBackgroundColor: 'transparent',
                pointBorderColor: 'transparent',
                pointRadius: 0,
                fill: true,
                tension: 0.4,
              }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { x: { display: false }, y: { display: false } },
              elements: { point: { radius: 0 } },
            }}
          />
        </div>
      </div>

      {/* ————— Card 8 ————— */}
      <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-300">VALIDATORS</h3>
          <div className="flex items-center text-green-400 text-sm">
            <span className="mr-1">▲</span>
            +5.9%
          </div>
        </div>
        <div className="text-3xl font-bold text-white mb-4">847.2K</div>
        <div className="h-16">
          <Chart
            type="line"
            data={{
              labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
              datasets: [{
                label: 'Validators',
                data: [800, 810, 820, 830, 840, 845, 847],
                borderColor: '#f43f5e',
                backgroundColor: 'rgba(244, 63, 94, 0.1)',
                borderWidth: 2,
                pointBackgroundColor: 'transparent',
                pointBorderColor: 'transparent',
                pointRadius: 0,
                fill: true,
                tension: 0.4,
              }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { x: { display: false }, y: { display: false } },
              elements: { point: { radius: 0 } },
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default function V2Page() {
  const globeRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number | null>(null);

  // Fixed start date: January 1, 2020
  const fixedStartDate = new Date(2020, 0, 1);
  // End date: today's date
  const today = new Date();
  
  const [startDate, setStartDate] = useState(fixedStartDate.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

  // Calculate total days for slider
  const totalDays = Math.round((today.getTime() - fixedStartDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Convert dates to slider values (0 to totalDays)
  const startDays = Math.round((new Date(startDate).getTime() - fixedStartDate.getTime()) / (1000 * 60 * 60 * 24));
  const endDays = Math.round((new Date(endDate).getTime() - fixedStartDate.getTime()) / (1000 * 60 * 60 * 24));

  // Handle slider changes
  const handleSliderChange = (left: number, right: number) => {
    const newStartDate = new Date(fixedStartDate.getTime() + left * 24 * 60 * 60 * 1000);
    const newEndDate = new Date(fixedStartDate.getTime() + right * 24 * 60 * 60 * 1000);
    
    setStartDate(newStartDate.toISOString().split('T')[0]);
    setEndDate(newEndDate.toISOString().split('T')[0]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  };

  // Initialize 3D Globe
  useEffect(() => {
    if (!globeRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111827); // Changed from 0x000000 (black) to 0x111827 (gray-900)
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 10);
    camera.position.set(4, 0, 0);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(globeRef.current.clientWidth, globeRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    globeRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 1.5;
    controls.maxDistance = 3;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    controls.update();

    // World texture and sphere (restored working version)
    const loader = new THREE.TextureLoader();
    const texture = loader.load('/world.jpg');
    const geometry = new THREE.SphereGeometry(1, 64, 32);
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.y = Math.PI * -0.5; // Look at Europe initially
    scene.add(mesh);

    // Atmosphere effect (restored)
    const atmosphereShader = {
      uniforms: {},
      vertexShader: [
        "varying vec3 vNormal;",
        "void main() {",
        "vNormal = normalize( normalMatrix * normal );",
        "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
        "}"
      ].join("\n"),
      fragmentShader: [
        "varying vec3 vNormal;",
        "void main() {",
        "float intensity = pow( 0.8 - dot( vNormal, vec3( 0, 0, 1.0 ) ), 12.0 );",
        "gl_FragColor = vec4( 1.0, 1.0, 1.0 ) * intensity;",
        "}"
      ].join("\n")
    };

    const atmosphereGeometry = new THREE.SphereGeometry(1.07, 40, 30);
    const atmosphereMaterial = new THREE.ShaderMaterial({
      uniforms: atmosphereShader.uniforms,
      vertexShader: atmosphereShader.vertexShader,
      fragmentShader: atmosphereShader.fragmentShader,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true
    });

    const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    atmosphereMesh.scale.set(1.1, 1.1, 1.1);
    scene.add(atmosphereMesh);

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (globeRef.current && renderer.domElement) {
        globeRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-black">
      {/* Moving Text Header */}
      <div className="fixed top-0 left-0 right-0 bg-gray-900/90 backdrop-blur-sm border-b border-gray-700/50 z-50 overflow-hidden">
        <div className="whitespace-nowrap animate-scroll">
          <span className="inline-block text-green-400 font-mono text-sm px-4 py-2">
            V2 • ALCH • $2,847.32 ▲ +2.4% • TECH • $1,234.56 ▼ -1.2% • INNOV • $567.89 ▲ +5.7% • FUTURE • $890.12 ▲ +3.1% • DIGITAL • $456.78 ▼ -0.8% • NEXT • $789.01 ▲ +4.2% • VISION • $345.67 ▲ +1.9% • BREAKTHROUGH • $678.90 ▲ +6.3% • REVOLUTION • $234.56 ▼ -2.1% • PARADIGM • $789.01 ▲ +3.8% • FRONTIER • $567.89 ▲ +2.7%
          </span>
        </div>
      </div>

      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-purple-900/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]"></div>
      </div>
      
      <div className="relative py-16 pt-24">
        <div className="px-8">
          
          {/* 🔍 wireframe overlay (turn off later) */}
          <div className="pointer-events-none absolute inset-0
                          [background:linear-gradient(to_right,rgba(168,85,247,.12)_1px,transparent_1px),
                                      linear-gradient(to_bottom,rgba(168,85,247,.08)_1px,transparent_1px)]
                          bg-[length:64px_1px,1px_64px]"></div>

          {/* 2-column hero layout */}
          <div className="flex gap-10 items-stretch">
            {/* LEFT: title + subtext + date controls */}
            <aside className="w-[600px] flex-shrink-0 flex flex-col justify-between outline outline-1 outline-purple-500/30 rounded-xl p-2">
              {/* Title and subtext at top */}
              <div className="space-y-6">
                <div>
                  <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 mb-3 drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]">
                    Chain Dashboard
                  </h1>
                  <p className="text-xl text-gray-300 max-w-2xl">
                    Monitor and analyze blockchain networks with real-time data and comprehensive insights
                  </p>
                </div>
              </div>

              {/* Date range card - expanded to full width and positioned at bottom */}
              <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 w-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Date Range</h3>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => {
                        const weekAgo = new Date();
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        const newStartDate = weekAgo.toISOString().split('T')[0];
                        const newEndDate = today.toISOString().split('T')[0];
                        setStartDate(newStartDate);
                        setEndDate(newEndDate);
                        
                        // Update slider values
                        const startDays = Math.round((weekAgo.getTime() - fixedStartDate.getTime()) / (1000 * 60 * 60 * 24));
                        const endDays = Math.round((today.getTime() - fixedStartDate.getTime()) / (1000 * 60 * 60 * 24));
                        handleSliderChange(startDays, endDays);
                      }}
                      className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-purple-500 rounded-lg text-gray-300 hover:text-white transition-all"
                    >
                      Past Week
                    </button>
                    <button 
                      onClick={() => {
                        const monthAgo = new Date();
                        monthAgo.setMonth(monthAgo.getMonth() - 1);
                        const newStartDate = monthAgo.toISOString().split('T')[0];
                        const newEndDate = today.toISOString().split('T')[0];
                        setStartDate(newStartDate);
                        setEndDate(newEndDate);
                        
                        // Update slider values
                        const startDays = Math.round((monthAgo.getTime() - fixedStartDate.getTime()) / (1000 * 60 * 60 * 24));
                        const endDays = Math.round((today.getTime() - fixedStartDate.getTime()) / (1000 * 60 * 60 * 24));
                        handleSliderChange(startDays, endDays);
                      }}
                      className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-purple-500 rounded-lg text-xs"
                    >
                      Past Month
                    </button>
                    <button 
                      onClick={() => {
                        const ytd = new Date(today.getFullYear(), 0, 1);
                        const newStartDate = ytd.toISOString().split('T')[0];
                        const newEndDate = today.toISOString().split('T')[0];
                        setStartDate(newStartDate);
                        setEndDate(newEndDate);
                        
                        // Update slider values
                        const startDays = Math.round((ytd.getTime() - fixedStartDate.getTime()) / (1000 * 60 * 60 * 24));
                        const endDays = Math.round((today.getTime() - fixedStartDate.getTime()) / (1000 * 60 * 60 * 24));
                        handleSliderChange(startDays, endDays);
                      }}
                      className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-purple-500 rounded-lg text-gray-300 hover:text-white transition-all"
                    >
                      YTD
                    </button>
                    <button 
                      onClick={() => {
                        const newStartDate = fixedStartDate.toISOString().split('T')[0];
                        const newEndDate = today.toISOString().split('T')[0];
                        setStartDate(newStartDate);
                        setEndDate(newEndDate);
                        
                        // Update slider values
                        const startDays = 0;
                        const endDays = Math.round((today.getTime() - fixedStartDate.getTime()) / (1000 * 60 * 60 * 24));
                        handleSliderChange(startDays, endDays);
                      }}
                      className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-purple-500 rounded-lg text-gray-300 hover:text-white transition-all"
                    >
                      All Time
                    </button>
                  </div>
                </div>

                {/* Date Input Fields */}
                <div className="flex items-center justify-between mb-6">
                  <div className="relative">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      min={fixedStartDate.toISOString().split('T')[0]}
                      max={endDate}
                      className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all text-sm"
                    />
                  </div>
                  
                  <div className="text-gray-400 text-sm">to</div>
                  
                  <div className="relative">
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                      max={today.toISOString().split('T')[0]}
                      className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Range Slider */}
                <div className="mb-4 flex justify-start">
                  <RangeSlider
                    min={0}
                    max={totalDays}
                    step={1}
                    defaultLeft={startDays}
                    defaultRight={endDays}
                    onChange={handleSliderChange}
                    minGap={1}
                  />
                </div>
                
                {/* Range info */}
                <div className="text-left text-sm text-gray-400">
                  Range: {Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                </div>
              </div>
            </aside>

            {/* RIGHT: the 8 analytics cards */}
            <main className="flex-1 outline outline-1 outline-sky-500/30 rounded-xl p-2">
              <AnalyticsCards />
            </main>
          </div>

          {/* BELOW the hero grid: globe or other sections */}
          <div className="mt-16">
            {/* Three column layout: Left Card | Globe | Right Card */}
            <div className="grid gap-8 items-start" style={{ gridTemplateColumns: '600px 1fr 1fr' }}>
              {/* Left Card */}
              <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 outline outline-1 outline-purple-500/30 aspect-square">
                {/* Empty card for now */}
              </div>

              {/* Center Globe */}
              <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 outline outline-1 outline-green-500/30 aspect-square">
                <div className="flex justify-center items-center h-full">
                  <div ref={globeRef} className="w-full h-full rounded-xl overflow-hidden" />
                </div>
              </div>

              {/* Right Card */}
              <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 outline outline-1 outline-orange-500/30 aspect-square">
                {/* Empty card for now */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
